---
title: protobuf is a contract, not a serialiser
summary: Draft. Field numbers are the API. Everything else is negotiable.
date: 2026-09-01
tags: [go, protobuf, grpc, architecture]
kind: note
draft: true
---

Protocol buffers get introduced as "a faster JSON". That framing causes most of
the mistakes.

The wire format keys on **field numbers**, not names. Renaming a field is free.
Renumbering one is a breaking change that will not fail to compile, will not
fail to serialise, and will silently be decoded as a different field by anything
running the old schema.

Rules that follow directly, and that no tutorial seems to state plainly:

- Never reuse a field number. `reserved` exists for exactly this.
- Never change a field's type in a way that changes its wire type.
- `optional` versus unset matters again in proto3 — know which you are relying on.
- A new field must be safe to receive as absent, because old senders will not
  send it.

The reason to care: a schema is the only part of a distributed system that
every service agrees on. Treating it as a serialisation detail rather than the
contract is how you get an outage that nothing in CI could have caught.
