// Fail the deploy if any internal link points at a page that was not built.
//
// Cheap insurance: the wikilink system generates links from prose, so a typo
// in a note becomes a 404 that nothing else would catch.
//
// Two rules learned the hard way:
//   1. A directory is NOT a valid target unless it contains index.html. The
//      first version accepted any existing path, so a link to a section root
//      such as /tags/ passed the check and 404'd in production.
//   2. #fragments are resolved: the target page must actually contain an
//      element with that id. Skipping them hid every stale anchor.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const bad = [];
const idCache = new Map();

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.html')) check(full);
  }
}

/** Resolve a site-absolute path to the file that would actually be served. */
function resolveTarget(pathname) {
  const rel = pathname.replace(/^\/+/, '');
  const direct = join(DIST, rel);

  if (existsSync(direct) && statSync(direct).isFile()) return direct;

  // A directory only counts when it has an index document.
  for (const candidate of [join(DIST, rel, 'index.html'), join(DIST, rel.replace(/\/$/, ''), 'index.html')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function idsIn(file) {
  if (!idCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

function check(file) {
  const html = readFileSync(file, 'utf8');
  const from = relative(DIST, file);

  for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const [pathname, fragment] = href.split('#');

    // A bare "#id" is same-page.
    const targetFile = pathname === '' ? file : resolveTarget(pathname.split('?')[0]);

    if (!targetFile) {
      bad.push(`${from} -> ${href}  (no page built)`);
      continue;
    }
    if (fragment && !idsIn(targetFile).has(fragment)) {
      bad.push(`${from} -> ${href}  (no element with id="${fragment}")`);
    }
  }
}

walk(DIST);

if (bad.length > 0) {
  console.error(`Broken internal links (${bad.length}):`);
  for (const line of [...new Set(bad)].sort()) console.error(`  ${line}`);
  process.exit(1);
}
console.log('    all internal links and fragments resolve');
