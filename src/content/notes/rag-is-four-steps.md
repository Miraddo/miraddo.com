---
title: RAG is four steps and a framework hides which one is slow
summary: Draft. The reasoning behind goRAG — not yet an implementation.
date: 2026-09-01
tags: [go, ai, vector-search, architecture]
kind: note
draft: true
---

Retrieval-augmented generation is: chunk, embed, retrieve, prompt.

Four steps. Each has one or two decisions that determine the quality of the
whole thing:

1. **Chunk** — size and overlap. Too small and you lose context; too large and
   retrieval returns mush.
2. **Embed** — which model, and the fact that you must use the *same* one for
   documents and for queries.
3. **Retrieve** — the index, the distance metric, how many results, and whether
   you rerank.
4. **Prompt** — how retrieved context is placed, and what happens when nothing
   relevant was found.

A framework will do all four in one call. That is genuinely useful right up to
the first time it is slow or wrong, at which point the question "which step?"
has no obvious answer because all four are behind one abstraction.

That is the argument for writing it out in Go instead: not that Go is better at
this, but that four visible steps are debuggable and one opaque call is not. The
same reasoning as [[why-i-write-c|writing C to understand the layer below]].

Nothing is committed yet. This note is the design, not a description of code.
