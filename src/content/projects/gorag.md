---
title: goRAG
summary: Planned — a retrieval-augmented generation backend in Go. Nothing committed yet.
language: Go
stars: 0
status: planned
repo: https://github.com/Miraddo/goRAG
order: 40
featured: false
tags: [go, ai, vector-search, backend]
---

Nothing is built yet. The repository is a placeholder, and this entry exists to
state the intent rather than to imply an implementation.

The plan is a retrieval-augmented generation backend written in Go rather than
assembled from a Python framework: document ingestion, embedding, a vector
index, and an HTTP surface small enough to read in one sitting.

The reason for doing it at all is that a RAG pipeline is four understandable
steps, and wrapping them in a framework hides which one is slow.
