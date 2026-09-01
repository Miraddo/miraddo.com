// HEAD-check every external URL the site links to.
//
//   node deploy/check-external.mjs
//
// Non-fatal by design: the network is not the build's business, and a flaky
// third party should not block a deploy. It exits 0 and prints a report.
// Pass --strict to make dead links fail (useful in CI).
//
// This exists because deploy/check-links.mjs only walks internal links, so a
// dead profile URL or a project marked `live` whose domain stopped answering
// could sit on the site indefinitely without anything noticing.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const STRICT = process.argv.includes('--strict');
const UA = 'Mozilla/5.0 (compatible; miraddo-linkcheck/1.0)';

const targets = new Map(); // url -> Set(page)

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.html')) collect(full);
  }
}

function collect(file) {
  const html = readFileSync(file, 'utf8');
  // Anchors only. <link rel="canonical"> and friends are metadata, not
  // navigation, the 404 page's own canonical would otherwise report as dead.
  for (const [, href] of html.matchAll(/<a[^>]*\shref="(https?:\/\/[^"]+)"/g)) {
    if (!targets.has(href)) targets.set(href, new Set());
    targets.get(href).add(relative(DIST, file));
  }
}

async function probe(url) {
  const attempt = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'User-Agent': UA },
        signal: controller.signal,
      });
      return res.status;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    // Some hosts reject HEAD outright; fall back to GET before believing a failure.
    const status = await attempt('HEAD');
    return status >= 400 ? await attempt('GET') : status;
  } catch {
    try {
      return await attempt('GET');
    } catch (err) {
      return err?.name === 'AbortError' ? 'timeout' : 'unreachable';
    }
  }
}

walk(DIST);

const results = await Promise.all(
  [...targets.keys()].map(async (url) => ({ url, status: await probe(url) })),
);

const broken = results.filter((r) => typeof r.status !== 'number' || r.status >= 400);

for (const { url, status } of results.sort((a, b) => a.url.localeCompare(b.url))) {
  const ok = typeof status === 'number' && status < 400;
  console.log(`    ${ok ? 'ok  ' : 'DEAD'} ${String(status).padEnd(11)} ${url}`);
}

if (broken.length > 0) {
  console.log(`\n    ${broken.length} external link(s) not answering:`);
  for (const { url, status } of broken) {
    console.log(`      ${url}  (${status})`);
    for (const page of targets.get(url)) console.log(`        linked from ${page}`);
  }
  if (STRICT) process.exit(1);
} else {
  console.log('    all external links answer');
}
