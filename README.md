# miraddo.com

Personal site of Milad Poshtdari. Astro, static output, no client framework.

Live: https://miraddo.com

## Run it

```bash
npm install
npm run dev      # http://localhost:4321 — drafts visible
npm run build    # -> dist/
npm run preview  # serve the production build locally
npm run check    # astro check (types + templates)
npm test         # node --test over the graph and wikilink logic
```

## Where things live

| What | Where |
|---|---|
| Identity, links, stack, certs, timeline, NOW | `src/lib/site.ts` |
| Projects | `src/content/projects/*.md` |
| Social card generator | `deploy/make-og.mjs` |
| Notes (Zettelkasten) | `src/content/notes/*.md` |
| Design tokens and all styling | `src/styles/global.css` |
| Link graph, backlinks, related | `src/lib/notes.ts` |
| Wikilink parsing | `src/lib/remark-wikilink.mjs` |
| Pure graph logic (unit tested) | `src/lib/graph.ts` |
| Tests | `test/` |

## Writing a note

Create `src/content/notes/my-note.md`:

```markdown
---
title: The claim this note makes
summary: One line for the index and RSS.
date: 2026-09-01
tags: [go, systems]
kind: note        # or: article
draft: false
---

Body. Link other notes with [[some-slug]] or [[some-slug|custom text]].
```

- `draft: true` renders in `npm run dev` only, never in the production build.
- Wikilinks resolve by filename **or** by note title, matched case- and
  punctuation-insensitively. `src/lib/notes.ts` (the graph) and
  `src/lib/remark-wikilink.mjs` (the rendered links) must accept the same
  aliases — if they drift, the graph counts an edge the page shows as unwritten.
- Wikilinks inside fenced or inline code are ignored, so examples in a note
  about the system do not become edges.
- A wikilink to a note that does not exist yet renders dimmed instead of 404ing,
  and shows up under "Linked but unwritten" on `/notes`.
- Backlinks, outbound links, and related-by-tag are computed at build time.
  Never write them by hand.
- The SYSTEM MAP graph on `/notes` unlocks automatically at 12 published notes.
  Change `GRAPH_THRESHOLD` in `src/lib/notes.ts` to move that line.

## Deploy

```bash
./deploy/deploy.sh
```

Builds, checks internal links (fatal) and external links (non-fatal), uploads a
timestamped release, swaps the `current` symlink atomically, prunes to the last
five releases, and verifies the live URLs. No restart, no reload, no downtime.

`deploy.sh` gates on `astro check` and the test suite before it builds, stamps
the release id into every page, and verifies after activation that the live HTML
carries **that** stamp — a 200 alone cannot prove the swap worked, because a
failed swap serves the previous release with a perfectly healthy 200.

Roll back:

```bash
npm run rollback            # previous release
npm run rollback -- --list  # what is available
```

`rollback.sh` orders releases by name (`YYYYmmdd-HHMMSS` sorts chronologically)
rather than by mtime — `tar -xz` rewrites mtimes from the local build, so mtime
order is not deploy order. It resolves "previous" relative to what `current`
actually points at, so consecutive rollbacks keep going back, and it exits 1
loudly when there is no candidate rather than silently doing nothing.

**Do not replace `/opt/miraddo/current`'s parent directory.** Caddy bind-mounts
`/opt/miraddo`, and a bind mount is pinned to the inode it had at container
start. Swapping the mounted directory itself leaves Caddy serving a deleted
inode and every URL 404s until the container is recreated. Only the symlink
inside the mount may move, and it must stay **relative** — `/opt/miraddo` does
not exist inside the container.

Edits to `deploy/caddy-miraddo.conf` must be applied to
`/opt/fluentdeutsch/Caddyfile` and picked up with a graceful reload:

```bash
ssh -i ~/.ssh/fluentx root@65.109.219.238 "docker exec fluentdeutsch-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile"
```

Only a change to the compose **volumes** needs the container recreated, and then
with `docker compose -f docker-compose.prod.yml up -d --no-deps caddy` — without
`--no-deps`, Compose restarts the whole FluentDeutsch stack.

Regenerate the social card after changing the name, role, or palette:

```bash
node deploy/make-og.mjs
```

## Invariants worth knowing

- **The two wikilink resolvers must agree.** `src/lib/graph.ts` resolves links
  for the graph; `src/lib/remark-wikilink.mjs` resolves them for the rendered
  HTML. They build their alias sets independently, so if they drift, a page
  shows a link as "not written yet" while the connections panel at the foot of
  the same page links to it. `test/wikilink.test.mjs` asserts the two sets are
  identical, including for notes in subdirectories.
- **`summary` is required** on every note. It is the meta description, the
  social-card subtitle, the index subtitle and the RSS description at once.
- **Nothing on `/now/` is relative.** A "last updated N days ago" computed at
  build time freezes into static HTML and keeps claiming freshness forever, so
  the page shows absolute dates only.

## Project status values

`planned` · `active` · `wip` · `stable` · `live` · `archived`

`planned` means the repository exists but holds **no implementation**. It is a
separate state from `wip` on purpose: the site must never imply working code
that is not there.

## Infrastructure

- Host: Hetzner, `65.109.219.238`
- Proxy: Caddy, config at `/opt/fluentdeutsch/Caddyfile`, shared with
  fluentdeutsch.com and tale.miraddo.com
- Files: `/opt/miraddo` mounted read-only at `/srv/miraddo-root`; Caddy serves
  `/srv/miraddo-root/current`, a relative symlink into `releases/`
- Fonts are self-hosted in `public/fonts/` — no Google Fonts request, so no
  third-party render-blocking hop and no visitor IPs leaving the origin
- Cloudflare prepends a **managed robots.txt** ahead of `public/robots.txt` in
  production. If the served file does not match the repo, that is why.
- TLS: `tls internal` at the origin; Cloudflare in **Full** mode in front.
  Public ACME is not used because the Cloudflare proxy blocks the challenge.
