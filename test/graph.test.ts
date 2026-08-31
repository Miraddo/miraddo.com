import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  tagSlug,
  stripCode,
  extractWikilinks,
  buildGraph,
  tagIndex,
  relatedFor,
  type NoteLike,
} from '../src/lib/graph.ts';

const note = (id: string, over: Partial<NoteLike['data']> & { body?: string } = {}): NoteLike => {
  const { body, ...data } = over;
  return {
    id,
    body,
    data: {
      title: data.title ?? id,
      tags: data.tags ?? [],
      links: data.links ?? [],
      kind: data.kind ?? 'note',
      date: data.date ?? new Date('2026-01-01'),
    },
  };
};

test('slugify collapses runs and trims edges', () => {
  assert.equal(slugify('  Hello   World  '), 'hello-world');
  assert.equal(slugify('Go & C: notes!'), 'go-c-notes');
  assert.equal(slugify('already-slugged'), 'already-slugged');
  assert.equal(slugify('under_score'), 'under-score');
  assert.equal(slugify('---'), '');
});

test('tagSlug makes a tag safe to put in a URL path', () => {
  assert.equal(tagSlug('probe/slash'), 'probe-slash');
  assert.equal(tagSlug('Mixed Case'), 'mixed-case');
});

test('stripCode removes fenced and inline code', () => {
  const body = ['before', '```go', '[[fenced]]', '```', 'and `[[inline]]` too', 'after'].join('\n');
  const out = stripCode(body);
  assert.ok(!out.includes('[[fenced]]'), 'fenced wikilink survived');
  assert.ok(!out.includes('[[inline]]'), 'inline wikilink survived');
  assert.ok(out.includes('before') && out.includes('after'));
});

test('extractWikilinks ignores code and handles labels and anchors', () => {
  const body = 'See [[alpha]], [[beta|the beta note]], [[gamma#section]].\n```\n[[nope]]\n```';
  assert.deepEqual(extractWikilinks(body).sort(), ['alpha', 'beta', 'gamma']);
  assert.deepEqual(extractWikilinks(undefined), []);
});

test('buildGraph resolves by id, lowercased id, slugified id and title', () => {
  const notes = [
    note('target', { title: 'The Target Note' }),
    note('a', { body: '[[target]]' }),
    note('b', { body: '[[TARGET]]' }),
    note('c', { body: '[[The Target Note]]' }),
  ];
  const g = buildGraph(notes);
  assert.deepEqual(g.inbound.get('target')!.sort(), ['a', 'b', 'c']);
  assert.equal(g.orphans.length, 0);
});

test('buildGraph resolves notes in subdirectories', () => {
  const notes = [note('go/scheduler', { title: 'Scheduler' }), note('a', { body: '[[go/scheduler]]' })];
  const g = buildGraph(notes);
  assert.deepEqual(g.outbound.get('a'), ['go/scheduler']);
  assert.equal(g.orphans.length, 0);
});

test('a target named in both frontmatter and prose produces ONE edge and ONE backlink', () => {
  const notes = [note('target'), note('a', { links: ['target'], body: 'also [[target]]' })];
  const g = buildGraph(notes);
  assert.equal(g.edges.filter((e) => e.source === 'a' && e.target === 'target').length, 1);
  assert.deepEqual(g.inbound.get('target'), ['a']);
  assert.equal(g.nodes.find((n) => n.id === 'target')!.degree, 1);
});

test('self-links are ignored and unresolved targets become orphans', () => {
  const g = buildGraph([note('a', { body: '[[a]] and [[ghost]]' })]);
  assert.deepEqual(g.outbound.get('a'), []);
  assert.deepEqual(g.orphans, ['ghost']);
});

test('buildGraph copes with an empty collection', () => {
  const g = buildGraph([]);
  assert.deepEqual(g.nodes, []);
  assert.deepEqual(g.edges, []);
  assert.deepEqual(g.orphans, []);
});

test('tagIndex sorts by frequency then name, and slugs each tag', () => {
  const idx = tagIndex([
    note('a', { tags: ['go', 'systems'] }),
    note('b', { tags: ['go'] }),
    note('c', { tags: ['Mixed Case'] }),
  ]);
  assert.equal(idx[0].tag, 'go');
  assert.equal(idx[0].notes.length, 2);
  assert.equal(idx.find((t) => t.tag === 'Mixed Case')!.slug, 'mixed-case');
});

test('tagIndex refuses two tags that collapse to the same slug', () => {
  assert.throws(
    () => tagIndex([note('a', { tags: ['Go Lang'] }), note('b', { tags: ['go-lang'] })]),
    /both slug to "go-lang"/,
  );
});

test('tagIndex refuses a tag that slugs to nothing', () => {
  assert.throws(() => tagIndex([note('a', { tags: ['---'] })]), /slugs to an empty string/);
});

test('relatedFor excludes already-linked notes and notes with no shared tag', () => {
  const notes = [
    note('a', { tags: ['go'], body: '[[b]]' }),
    note('b', { tags: ['go'] }),
    note('c', { tags: ['go'] }),
    note('d', { tags: ['rust'] }),
  ];
  const g = buildGraph(notes);
  const related = relatedFor(g, notes[0], notes).map((n) => n.id);
  assert.deepEqual(related, ['c'], 'b is linked, d shares no tag');
});

test('relatedFor returns nothing for an untagged note', () => {
  const notes = [note('a'), note('b', { tags: ['go'] })];
  assert.deepEqual(relatedFor(buildGraph(notes), notes[0], notes), []);
});
