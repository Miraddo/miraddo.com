// Pure Zettelkasten logic: no Astro imports, no filesystem, no I/O.
//
// Split out of notes.ts so it can be unit tested with `node --test`. Anything
// here operates on plain objects; notes.ts is the thin adapter that fetches the
// real collection and hands it over.

export interface NoteLike {
  id: string;
  body?: string;
  data: {
    title: string;
    tags: string[];
    links: string[];
    kind: 'note' | 'article';
    date: Date;
  };
}

/** [[slug]], [[slug#anchor]], [[slug|display text]] */
const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

/**
 * URL-safe form of an arbitrary string. Used for tag paths, and as a *fallback*
 * when matching wikilink targets, never as the canonical note identifier,
 * because collection ids come from Astro's loader, not from here.
 *
 * Must stay byte-identical to the copy in remark-wikilink.mjs: the two
 * resolvers have to agree, or the graph counts an edge the page renders as
 * unwritten. `test/wikilink.test.mjs` asserts they do.
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
export function stripCode(body: string): string {
  return body
    .replace(/^ {0,3}(```+|~~~+)[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

/** Every wikilink target in a body, trimmed but NOT slugified. */
export function extractWikilinks(body: string | undefined): string[] {
  if (!body) return [];
  const out = new Set<string>();
  for (const match of stripCode(body).matchAll(WIKILINK)) {
    const target = (match[1] ?? '').trim();
    if (target) out.add(target);
  }
  return [...out];
}

/**
 * Every alias a wikilink may use to reach a note: its id, the lowercased id,
 * the slugified id, and the slugified title. remark-wikilink.mjs builds the
 * same set from disk and must stay in agreement.
 */
export function aliasesFor(notes: NoteLike[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const note of notes) {
    lookup.set(note.id, note.id);
    lookup.set(note.id.toLowerCase(), note.id);
    lookup.set(slugify(note.id), note.id);
    lookup.set(slugify(note.data.title), note.id);
  }
  return lookup;
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
  outbound: Map<string, string[]>;
  inbound: Map<string, string[]>;
  orphans: string[];
}

/**
 * Build the link graph. Only links that resolve to an existing note become
 * edges; unresolved targets are reported as `orphans` so they surface as
 * "notes worth writing" rather than being silently dropped.
 */
export function buildGraph(all: NoteLike[]): NoteGraph {
  const lookup = aliasesFor(all);
  const resolve = (raw: string): string | undefined =>
    lookup.get(raw) ?? lookup.get(raw.toLowerCase()) ?? lookup.get(slugify(raw));

  const outbound = new Map<string, string[]>();
  const inbound = new Map<string, string[]>();
  const edges: GraphEdge[] = [];
  const orphanSet = new Set<string>();
  const seenEdge = new Set<string>();

  for (const note of all) {
    const targets = [
      ...new Set([...note.data.links.map((l) => l.trim()), ...extractWikilinks(note.body)]),
    ];
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
      // naming the same target in both frontmatter and prose push a duplicate
      // inbound entry, inflating the backlink list and the node degree.
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

/**
 * Tag -> notes, sorted by frequency then alphabetically. Each entry carries a
 * URL-safe `slug`: tags are author-written and go straight into a route, so a
 * tag containing a slash or a space would otherwise abort the whole build with
 * an opaque "Missing parameter: tag".
 */
export function tagIndex<T extends NoteLike>(notes: T[]): { tag: string; slug: string; notes: T[] }[] {
  const map = new Map<string, T[]>();
  for (const note of notes) {
    for (const tag of note.data.tags) {
      map.set(tag, [...(map.get(tag) ?? []), note]);
    }
  }

  const seen = new Map<string, string>();
  return [...map.entries()]
    .map(([tag, list]) => {
      const slug = tagSlug(tag);
      if (!slug) throw new Error(`Tag "${tag}" slugs to an empty string, rename it.`);
      const clash = seen.get(slug);
      if (clash && clash !== tag) {
        throw new Error(`Tags "${clash}" and "${tag}" both slug to "${slug}", rename one.`);
      }
      seen.set(slug, tag);
      return { tag, slug, notes: list };
    })
    .sort((a, b) => b.notes.length - a.notes.length || a.tag.localeCompare(b.tag));
}

/**
 * Related notes for the foot of a page. Direct links rank above shared tags,
 * because an explicit connection is a stronger signal than a coincidence of
 * vocabulary. Already-linked notes are excluded so the section adds something.
 */
export function relatedFor<T extends NoteLike>(graph: NoteGraph, note: T, all: T[], limit = 4): T[] {
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
