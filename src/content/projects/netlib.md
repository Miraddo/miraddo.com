---
title: netlib
summary: Network libraries in C. Sockets, protocols, and the layer most people import instead of understand.
language: C
stars: 7
status: active
repo: https://github.com/Miraddo/netlib
order: 10
featured: true
tags: [c, networking, systems]
---

Most developers reach for an HTTP client and never look underneath it. `netlib` is
what happens when you look underneath it: socket handling, protocol framing, and
the small, unglamorous pieces that every network library is built from, written
in C so nothing is hidden.

It is a learning project in the sense that all good systems code is a learning
project. It is not a toy: the goal is code that would survive review.
