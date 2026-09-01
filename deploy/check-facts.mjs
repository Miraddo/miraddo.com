// Compare the facts asserted on the site against the GitHub API.
//
//   node deploy/check-facts.mjs           # report drift
//   node deploy/check-facts.mjs --strict  # fail on drift
//
// Non-fatal by default: the network is not the build's business and GitHub
// rate-limits unauthenticated callers. It exists because the first version of
// this site described three repositories as working software when they held a
// README and nothing else, and because the public repo count is asserted in
// prose and goes stale the moment a repo is created.
//
// It checks what the site claims, not what the repos contain:
//   - site.publicRepos against the real count
//   - each project's stars and language against the API
//   - projects marked `planned` really are empty, and non-planned ones are not
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const STRICT = process.argv.includes('--strict');
const OWNER = 'Miraddo';
const drift = [];

// Unauthenticated GitHub allows 60 requests an hour, which this script can
// exhaust in one run. Borrow the gh CLI's token when it is available; fall
// back to anonymous (and a graceful "rate-limited" skip) when it is not.
const token = (() => {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
})();

const UA = {
  'User-Agent': 'miraddo-factcheck/1.0',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const api = async (path) => {
  const res = await fetch(`https://api.github.com${path}`, { headers: UA });
  if (res.status === 403 || res.status === 429) throw new Error('rate-limited');
  if (!res.ok) return null;
  return res.json();
};

/** Frontmatter is simple and flat here; a full YAML parser would be overkill. */
const frontmatter = (source) => {
  const block = source.split(/^---\s*$/m)[1] ?? '';
  const out = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*([a-zA-Z_]+):\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
};

try {
  // ── public repo count ────────────────────────────────────────────
  const user = await api(`/users/${OWNER}`);
  const siteTs = readFileSync('src/lib/site.ts', 'utf8');
  const claimed = Number(siteTs.match(/publicRepos:\s*(\d+)/)?.[1]);

  if (user && Number.isFinite(claimed) && user.public_repos !== claimed) {
    drift.push(
      `site.publicRepos says ${claimed}, GitHub says ${user.public_repos}` +
        ` — update src/lib/site.ts`,
    );
  }

  // ── per-project stars, language, and emptiness ───────────────────
  const dir = 'src/content/projects';
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const fm = frontmatter(readFileSync(join(dir, file), 'utf8'));
    if (!fm.repo) continue;

    const name = fm.repo.replace(/\/+$/, '').split('/').pop();
    const repo = await api(`/repos/${OWNER}/${name}`);
    if (!repo) {
      drift.push(`${file}: repo ${fm.repo} does not resolve`);
      continue;
    }

    const stars = Number(fm.stars ?? 0);
    if (repo.stargazers_count !== stars) {
      drift.push(`${file}: stars ${stars} -> ${repo.stargazers_count}`);
    }

    const tree = await api(`/repos/${OWNER}/${name}/git/trees/HEAD?recursive=1`);
    const files = tree?.tree?.filter((t) => t.type === 'blob') ?? [];
    const codeFiles = files.filter((t) => !/\.(md|txt)$/i.test(t.path));
    const isPlanned = fm.status === 'planned';
    // A repo whose declared language IS prose is expected to hold only prose;
    // flagging it every run would train the reader to ignore this check.
    const isProse = /^(markdown|text|html)$/i.test(fm.language ?? '');

    // The defect this was written for: describing an empty repository as
    // working software.
    if (!isPlanned && !isProse && codeFiles.length === 0) {
      drift.push(
        `${file}: status "${fm.status}" but the repo has no code files` +
          ` (${files.length} file(s), all docs) — should this be "planned"?`,
      );
    }
    if (isPlanned && codeFiles.length > 0) {
      drift.push(`${file}: marked "planned" but the repo now has ${codeFiles.length} code file(s)`);
    }
  }
} catch (err) {
  console.log(`    skipped: ${err.message}`);
  process.exit(0);
}

if (drift.length === 0) {
  console.log('    site facts match GitHub');
} else {
  console.log(`    ${drift.length} fact(s) drifted from GitHub:`);
  for (const line of drift) console.log(`      ${line}`);
  if (STRICT) process.exit(1);
}
