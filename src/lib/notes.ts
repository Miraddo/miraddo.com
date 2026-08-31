import { getCollection, type CollectionEntry } from 'astro:content';

export type Note = CollectionEntry<'notes'>;

/**
 * The graph panel stays hidden until the collection is big enough to have a
 * shape. A graph of three dots does not read as a second brain, it reads as
 * an abandoned site. Below this count /notes renders the list only.
 */
export const GRAPH_THRESHOLD = 12;

/** [[slug]] or [[slug|display text]] */
const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

/**
 * URL-safe form of an arbitrary string. Used for tag paths, and as a *fallback*
 * when matching wikilink targets — never as the canonical note identifier,
 * because collection ids come from Astro's loader, not from here. Slugifying an
 * id would silently break any filename containing `_`, `--`, or non-ASCII.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Tags go straight into a URL path, so they must be slugged or the build dies. */
export const tagSlug = (tag: string): string => slugify(tag);

/**
 * Wikilinks inside fenced or inline code are examples, not links. Scanning the
 * raw body without stripping them turns documentation into graph edges and
 * publishes phantom entries under "Linked but unwritten".
 */
function stripCode(body: string): string {
  return body
    .replace(/^ {0,3}(```+|~~~+)[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

/** Every wikilink target found in a note body, trimmed but NOT slugified. */
export function extractWikilinks(body: string | undefined): string[] {
  if (!body) return [];
  const out = new Set<string>();
  for (const match of stripCode(body).matchAll(WIKILINK)) {
    const target = (match[1] ?? '').trim();
    if (target) out.add(target);
  }
  return [...out];
}

/** Published, non-draft notes, newest first. Drafts show in dev only. */
export async function getNotes(): Promise<Note[]> {
  const all = await getCollection('notes');
  const visible = import.meta.env.DEV ? all : all.filter((n) => !n.data.draft);
  return visible.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export interface GraphNode {
  id: string;
  title: string;
  kind: 'note' | 'article';
  tags: string[];
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface NoteGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** slug -> slugs it points at (only links that resolve to a real note) */
  outbound: Map<string, string[]>;
  /** slug -> slugs pointing at it */
  inbound: Map<string, string[]>;
  /** slugs mentioned by a note but not yet written */
  orphans: string[];
}

/**
 * Build the link graph. Only links that resolve to an existing published note
 * become edges; unresolved targets are reported separately as `orphans` so
 * they can be surfaced as "notes worth writing" rather than silently dropped.
 */
export async function buildGraph(notes?: Note[]): Promise<NoteGraph> {
  const all = notes ?? (await getNotes());

  // Resolve a wikilink target against the REAL collection ids. Exact match
  // wins; a slugified match is the fallback so `[[How this site is built]]`
  // still finds `how-this-site-is-built`. Never the other way round — that is
  // what made ids with `_` or non-ASCII unlinkable.
  const lookup = new Map<string, string>();
  for (const note of all) {
    lookup.set(note.id, note.id);
    lookup.set(note.id.toLowerCase(), note.id);
    lookup.set(slugify(note.id), note.id);
    lookup.set(slugify(note.data.title), note.id);
  }
  const resolve = (raw: string): string | undefined =>
    lookup.get(raw) ?? lookup.get(raw.toLowerCase()) ?? lookup.get(slugify(raw));

  const outbound = new Map<string, string[]>();
  const inbound = new Map<string, string[]>();
  const edges: GraphEdge[] = [];
  const orphanSet = new Set<string>();
  const seenEdge = new Set<string>();

  for (const note of all) {
    const targets = [...new Set([...note.data.links.map((l) => l.trim()), ...extractWikilinks(note.body)])];
    const resolved = new Set<string>();

    for (const target of targets) {
      const id = resolve(target);
      if (!id) {
        orphanSet.add(slugify(target));
        continue;
      }
      if (id === note.id) continue;
      resolved.add(id);

      // Dedupe edge AND backlink together. Guarding only the edge let a note
      // that named the same target in both frontmatter and prose push a
      // duplicate inbound entry, inflating the backlink list and node degree.
      const key = `${note.id}->${id}`;
      if (seenEdge.has(key)) continue;
      seenEdge.add(key);
      edges.push({ source: note.id, target: id });
      inbound.set(id, [...(inbound.get(id) ?? []), note.id]);
    }
    outbound.set(note.id, [...resolved]);
  }

  const nodes: GraphNode[] = all.map((n) => ({
    id: n.id,
    title: n.data.title,
    kind: n.data.kind,
    tags: n.data.tags,
    degree: (outbound.get(n.id)?.length ?? 0) + (inbound.get(n.id)?.length ?? 0),
  }));

  return { nodes, edges, outbound, inbound, orphans: [...orphanSet].sort() };
}

/** Notes that link *to* this one. */
export function backlinksFor(graph: NoteGraph, id: string, all: Note[]): Note[] {
  const ids = new Set(graph.inbound.get(id) ?? []);
  return all.filter((n) => ids.has(n.id));
}

/** Notes this one links *out* to. */
export function outboundFor(graph: NoteGraph, id: string, all: Note[]): Note[] {
  const ids = new Set(graph.outbound.get(id) ?? []);
  return all.filter((n) => ids.has(n.id));
}

/**
 * Related notes for the foot of a page. Direct links rank above shared tags,
 * because an explicit connection is a stronger signal than a coincidence of
 * vocabulary. Already-linked notes are excluded so the section adds something.
 */
export function relatedFor(graph: NoteGraph, note: Note, all: Note[], limit = 4): Note[] {
  const linked = new Set([
    ...(graph.outbound.get(note.id) ?? []),
    ...(graph.inbound.get(note.id) ?? []),
    note.id,
  ]);
  const tags = new Set(note.data.tags);
  if (tags.size === 0) return [];

  return all
    .filter((n) => !linked.has(n.id))
    .map((n) => ({ n, score: n.data.tags.filter((t) => tags.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.n.data.date.valueOf() - a.n.data.date.valueOf())
    .slice(0, limit)
    .map((x) => x.n);
}

/**
 * Tag -> notes, sorted by frequency then alphabetically. Each entry carries a
 * URL-safe `slug`: tags are author-written and go straight into a route, so a
 * tag containing a slash or a space would otherwise abort the whole build with
 * an opaque "Missing parameter: tag".
 */
export function tagIndex(notes: Note[]): { tag: string; slug: string; notes: Note[] }[] {
  const map = new Map<string, Note[]>();
  for (const note of notes) {
    for (const tag of note.data.tags) {
      map.set(tag, [...(map.get(tag) ?? []), note]);
    }
  }

  const seen = new Map<string, string>();
  return [...map.entries()]
    .map(([tag, list]) => {
      const slug = tagSlug(tag);
      if (!slug) throw new Error(`Tag "${tag}" slugs to an empty string — rename it.`);
      const clash = seen.get(slug);
      if (clash && clash !== tag) {
        throw new Error(`Tags "${clash}" and "${tag}" both slug to "${slug}" — rename one.`);
      }
      seen.set(slug, tag);
      return { tag, slug, notes: list };
    })
    .sort((a, b) => b.notes.length - a.notes.length || a.tag.localeCompare(b.tag));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
