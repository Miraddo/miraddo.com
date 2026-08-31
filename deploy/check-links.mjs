// Fail the deploy if any internal link points at a page that was not built.
// Cheap insurance: the wikilink system generates links from prose, so a typo
// in a note becomes a 404 that nothing else would catch.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const bad = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.html')) check(full);
  }
}

function check(file) {
  const html = readFileSync(file, 'utf8');
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const target = href.replace(/^\/+/, '');
    const candidates = [
      join(DIST, target),
      join(DIST, target, 'index.html'),
      join(DIST, target.replace(/\/$/, ''), 'index.html'),
    ];
    if (!candidates.some((c) => existsSync(c))) {
      bad.push(`${relative(DIST, file)} -> ${href}`);
    }
  }
}

walk(DIST);

if (bad.length > 0) {
  console.error(`Broken internal links (${bad.length}):`);
  for (const line of [...new Set(bad)].sort()) console.error(`  ${line}`);
  process.exit(1);
}
console.log('    all internal links resolve');
