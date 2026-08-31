---
title: How the notes work
summary: Atomic notes, wikilinks, computed backlinks, and a system map that stays hidden until it earns its place.
date: 2026-08-31
tags: [meta, notes, zettelkasten]
kind: note
draft: true
---

Notes here are atomic: one idea per note, titled as a claim rather than a topic.

Linking is done with double brackets — `[[colophon]]` points at
[[colophon|the colophon]], and `[[some-slug|any label]]` sets the display text.

Three things are derived at build time:

- **Links out** — what this note points at.
- **Linked from** — what points here. Never written by hand.
- **Related by tag** — notes sharing vocabulary but not yet linked. This is the
  list that suggests the next link worth making.

The system map on the notes index stays hidden until there are twelve notes. A
graph of three dots does not read as a second brain; it reads as an abandoned
site.

This note is a draft, so it renders in `astro dev` and is excluded from the
production build. Delete it once the real notes start.
