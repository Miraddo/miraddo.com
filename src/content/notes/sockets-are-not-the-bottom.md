---
title: A socket is not the bottom
summary: Draft. What netlib is actually for, reading the layer under the client library.
date: 2026-09-01
tags: [c, networking, systems]
kind: note
draft: true
---

Most people's mental model of the network stops at the client library. You call
`http.Get`, something happens, you get bytes. The layer underneath is treated as
weather.

`connect()` returning is not the same as the connection being usable. `write()`
returning the full length does not mean anything was sent, it means the bytes
were copied into a kernel send buffer. `read()` returning fewer bytes than you
asked for is the normal case, not an error case, and the number of times that
single fact causes bugs is hard to overstate.

None of this is obscure. It is just invisible until you write the layer
yourself, which is what [[why-i-write-c|writing C]] is for.

The practical consequence for services: almost every "the network is flaky"
incident is really a timeout, a buffer, or a partial read that someone assumed
was atomic.
