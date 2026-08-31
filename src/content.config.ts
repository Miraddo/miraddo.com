import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ── Projects ───────────────────────────────────────────────────────
// Rendered as the manifest table on the homepage and /projects.
const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    language: z.string(),
    stars: z.number().default(0),
    // 'planned' means the repository exists but has no implementation yet.
    // It is a distinct state from 'wip' precisely so the site never implies
    // code that is not there.
    status: z.enum(['planned', 'active', 'stable', 'wip', 'live', 'archived']).default('active'),
    repo: z.string().url().optional(),
    url: z.string().url().optional(),
    order: z.number().default(50),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    started: z.string().optional(),
  }),
});

// ── Notes ──────────────────────────────────────────────────────────
// The Zettelkasten. Atomic notes that link to each other with [[wikilinks]].
// `links` is derived at build time from the body; anything declared here is
// merged in, so a note can point at something it never mentions in prose.
const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().default(''),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // 'note' = short atomic thought, 'article' = long-form piece.
    kind: z.enum(['note', 'article']).default('note'),
    draft: z.boolean().default(false),
    links: z.array(z.string()).default([]),
  }),
});

export const collections = { projects, notes };
