import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import remarkWikilink from '../src/lib/remark-wikilink.mjs';
import { aliasesFor, slugify as slugifyTs } from '../src/lib/graph.ts';

/** Minimal mdast paragraph so the plugin has something to visit. */
const para = (value) => ({
  type: 'root',
  children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
});

const run = (value, opts) => {
  const tree = para(value);
  remarkWikilink(opts)(tree);
  return tree.children[0].children;
};

test('a wikilink to a real note becomes a link', () => {
  const [, link] = run('see [[colophon]] here');
  assert.equal(link.type, 'link');
  assert.equal(link.url, '/notes/colophon/');
});

test('a wikilink resolves by title as well as by filename', () => {
  const [, link] = run('see [[How this site is built]] here');
  assert.equal(link.type, 'link');
  assert.equal(link.url, '/notes/colophon/');
});

test('a label sets the display text without changing the target', () => {
  const [, link] = run('see [[colophon|the colophon]] here');
  assert.equal(link.url, '/notes/colophon/');
  assert.equal(link.children[0].value, 'the colophon');
});

test('an unresolved target becomes a structured span, never raw HTML', () => {
  const [, missing] = run('see [[definitely-not-a-note]] here');
  assert.notEqual(missing.type, 'html', 'raw HTML would bypass escaping');
  assert.equal(missing.data.hName, 'span');
  assert.match(missing.data.hProperties.class, /wikilink-missing/);
});

test('angle brackets in a label are carried as text, not markup', () => {
  const [, missing] = run('see [[ghost|a < b & "q"]] here');
  assert.equal(missing.children[0].type, 'text');
  assert.equal(missing.children[0].value, 'a < b & "q"');
});

test('text either side of a wikilink is preserved exactly', () => {
  const parts = run('before [[colophon]] after');
  assert.equal(parts[0].value, 'before ');
  assert.equal(parts[2].value, ' after');
});

test('multiple wikilinks in one paragraph all resolve', () => {
  const parts = run('[[colophon]] and [[colophon|again]]');
  const links = parts.filter((p) => p.type === 'link');
  assert.equal(links.length, 2);
});

test('drafts resolve in dev but not in a production build', () => {
  const [, dev] = run('see [[template]] here', { includeDrafts: true });
  assert.equal(dev.type, 'link', 'drafts get pages in dev');

  const [, prod] = run('see [[template]] here', { includeDrafts: false });
  assert.notEqual(prod.type, 'link', 'linking to a draft in prod would 404');
});

test('the two resolvers agree (renderer accepts exactly the graph aliases)', async () => {
  // The graph (graph.ts) and the renderer (remark-wikilink.mjs) build their
  // alias sets independently. If they drift, a page shows a link as unwritten
  // that the connections panel shows as live. This asserts they cannot.
  const { linkableSlugs } = await import('../src/lib/remark-wikilink.mjs');

  const dir = mkdtempSync(join(tmpdir(), 'miraddo-notes-'));
  try {
    mkdirSync(join(dir, 'go'), { recursive: true });
    writeFileSync(join(dir, 'flat_note.md'), '---\ntitle: A Flat Note\ndraft: false\n---\nbody\n');
    writeFileSync(join(dir, 'go', 'nested.md'), '---\ntitle: Nested One\ndraft: false\n---\nbody\n');

    const rendererAliases = linkableSlugs(true, dir);

    const graphAliases = aliasesFor([
      { id: 'flat_note', data: { title: 'A Flat Note', tags: [], links: [], kind: 'note', date: new Date() } },
      { id: 'go/nested', data: { title: 'Nested One', tags: [], links: [], kind: 'note', date: new Date() } },
    ]);

    assert.deepEqual(
      [...rendererAliases.keys()].sort(),
      [...graphAliases.keys()].sort(),
      'renderer and graph alias sets diverged',
    );
    for (const [alias, id] of graphAliases) {
      assert.equal(rendererAliases.get(alias), id, `alias "${alias}" resolves differently`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('slugify is byte-identical across the two implementations', async () => {
  const { slugify: slugifyMjs } = await import('../src/lib/remark-wikilink.mjs');
  for (const s of ['Hello World', 'Go & C: notes!', 'under_score', '  trim  ', '---', 'a--b', 'ÄÖÜ ok']) {
    assert.equal(slugifyMjs(s), slugifyTs(s), `diverged on ${JSON.stringify(s)}`);
  }
});
