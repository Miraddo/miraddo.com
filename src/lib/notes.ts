// Astro adapter over the pure graph logic in graph.ts. Everything that touches
// the content collection lives here; everything testable lives there.
import { getCollection, type CollectionEntry } from 'astro:content';
import {
  buildGraph as buildGraphPure,
  relatedFor as relatedForPure,
  tagIndex as tagIndexPure,
  type NoteGraph,
  type NoteLike,
} from './graph';

export type Note = CollectionEntry<'notes'>;

export { slugify, tagSlug, extractWikilinks, aliasesFor } from './graph';
export type { NoteGraph, GraphNode, GraphEdge } from './graph';

/**
 * The graph panel stays hidden until the collection is big enough to have a
 * shape. A graph of three dots does not read as a second brain, it reads as
 * an abandoned site. Below this count /notes renders the list only.
 */
export const GRAPH_THRESHOLD = 12;

/** Published, non-draft notes, newest first. Drafts show in dev only. */
export async function getNotes(): Promise<Note[]> {
  const all = await getCollection('notes');
  const visible = import.meta.env.DEV ? all : all.filter((n) => !n.data.draft);
  return visible.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function buildGraph(notes?: Note[]): Promise<NoteGraph> {
  return buildGraphPure((notes ?? (await getNotes())) as unknown as NoteLike[]);
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

export function relatedFor(graph: NoteGraph, note: Note, all: Note[], limit = 4): Note[] {
  return relatedForPure(
    graph,
    note as unknown as NoteLike,
    all as unknown as NoteLike[],
    limit,
  ) as unknown as Note[];
}

export function tagIndex(notes: Note[]): { tag: string; slug: string; notes: Note[] }[] {
  return tagIndexPure(notes as unknown as NoteLike[]) as unknown as {
    tag: string;
    slug: string;
    notes: Note[];
  }[];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
