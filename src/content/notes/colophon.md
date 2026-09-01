---
title: How this site is built
summary: Astro, static output, a Zettelkasten link layer, and one Caddy site block on a Hetzner box.
date: 2026-08-31
tags: [meta, astro, web]
kind: article
draft: false
---

This site is deliberately boring infrastructure with one interesting part.

## The boring part

[Astro](https://astro.build) with `output: 'static'`. Every page is rendered at
build time into plain HTML. There is no client-side framework, no hydration,
and no JavaScript shipped for the layout, the only script on the site is the
one that is not there.

Content lives in Markdown under `src/content/`, typed by a Zod schema, so a
project with a missing `language` field fails the build instead of rendering a
blank cell.

Deployment tars the build over SSH into a staging directory and swaps it into
place, so a half-finished upload is never served. The server was already running
Caddy for something else; this site needed one more block. Caddy holds the
origin certificate and Cloudflare proxies in front of it in Full mode.

## The interesting part

The notes are a [[zettelkasten-here|Zettelkasten]] rather than a blog. Notes
link to each other with double-bracket wikilinks, backlinks are computed at
build time, and the connections are shown at the foot of every note.

A wikilink to a note that does not exist yet renders dimmed rather than broken,
so an idea can be recorded before it is written.

## Why not a blog

A reverse-chronological list assumes the newest thing is the most useful thing.
For notes about systems work that is rarely true. A note about the Go scheduler
does not get less relevant in March; it gets more connected.
