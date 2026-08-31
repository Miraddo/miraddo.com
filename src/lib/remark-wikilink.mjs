import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { visit } from 'unist-util-visit';

const NOTES_DIR = join(process.cwd(), 'src', 'content', 'notes');
const WIKILINK = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Which notes will actually have a page. Read once per build.
 *
 * Existence on disk is not enough: drafts are excluded from the production
 * build by `getNotes()`, so linking to one would ship a 404. In dev, drafts do
 * get pages, so they count as resolvable there. A wikilink that resolves to
 * nothing renders as a dimmed span rather than a broken link — the idea is
 * recorded without the link rotting.
 */
function linkableSlugs(includeDrafts, notesDir = NOTES_DIR) {
  // alias -> canonical note id. Must accept the same aliases that
  // buildGraph()'s resolver accepts (id, lowercased id, slugified id,
  // slugified title) or the rendered links and the link graph disagree:
  // the graph would count an edge the page renders as "not written yet".
  const aliases = new Map();
  if (!existsSync(notesDir)) return aliases;

  // Recursive: the collection glob is `**/*.md`, so a note may live in a
  // subdirectory and its Astro id is the POSIX-separated path relative to
  // NOTES_DIR. A flat readdir here made every foldered note unlinkable in
  // prose while the graph resolved it happily — the same page then showed a
  // link as dead that the connections panel showed as live.
  const walk = (dir, prefix = '') => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs, `${prefix}${entry.name}/`);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;

      const source = readFileSync(abs, 'utf8');
      const frontmatter = source.split(/^---\s*$/m)[1] ?? '';
      if (!includeDrafts && /^\s*draft:\s*true\s*$/m.test(frontmatter)) continue;

      const id = `${prefix}${entry.name.replace(/\.md$/, '')}`;
      aliases.set(id, id);
      aliases.set(id.toLowerCase(), id);
      aliases.set(slugify(id), id);

      const title = frontmatter.match(/^\s*title:\s*(.+?)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g, '');
      if (title) aliases.set(slugify(title), id);
    }
  };
  walk(notesDir);
  return aliases;
}

/**
 * Exported so a test can assert this alias set matches the one graph.ts builds.
 * `notesDir` is injectable purely so that test can use a fixture directory.
 */
export { linkableSlugs };

/**
 * remark plugin: [[slug]] and [[slug|label]] become internal note links.
 * Runs on text nodes only, so wikilinks inside code blocks are left alone.
 *
 * `includeDrafts` must be passed explicitly by astro.config.mjs. It defaults
 * to false so that any future caller that forgets it fails safe: at worst a
 * link to a draft renders dimmed, never as a 404.
 */
export default function remarkWikilink({ includeDrafts = false } = {}) {
  const aliases = linkableSlugs(includeDrafts);

  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;
      if (!node.value.includes('[[')) return;

      const children = [];
      let cursor = 0;

      for (const match of node.value.matchAll(WIKILINK)) {
        const [raw, rawTarget, hash, label] = match;
        const start = match.index ?? 0;

        if (start > cursor) {
          children.push({ type: 'text', value: node.value.slice(cursor, start) });
        }

        // NB: `raw` above is the whole matched token and drives `cursor`.
        // This is the link target only.
        const target = rawTarget.trim();
        const id =
          aliases.get(target) ?? aliases.get(target.toLowerCase()) ?? aliases.get(slugify(target));
        const text = label ?? target;

        if (id) {
          children.push({
            type: 'link',
            url: `/notes/${id}/${hash ? `#${slugify(hash)}` : ''}`,
            data: { hProperties: { class: 'wikilink' } },
            children: [{ type: 'text', value: text }],
          });
        } else {
          // Emit a structured node, not a raw HTML string: the stringifier then
          // escapes the text for us. Building the span by concatenation meant a
          // `<` in a display label was injected as markup and silently ate the
          // rest of the paragraph.
          children.push({
            type: 'emphasis',
            data: {
              hName: 'span',
              hProperties: { class: 'wikilink wikilink-missing', title: 'Not written yet' },
            },
            children: [{ type: 'text', value: text }],
          });
        }

        cursor = start + raw.length;
      }

      if (cursor === 0) return;
      if (cursor < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}
