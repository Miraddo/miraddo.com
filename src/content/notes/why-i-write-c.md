---
title: Why write C when the job is Go
summary: Draft. Not nostalgia — every abstraction is a promise someone else made.
date: 2026-09-01
tags: [c, go, systems]
kind: note
draft: true
---

I write Go for work and C for understanding. That is not a hierarchy, it is a
division of labour.

Go's value is that it hides the right things: memory, scheduling, the socket
lifecycle. That is exactly why the hidden parts stay hidden. You can ship
correct Go for years without ever forming a model of what a goroutine costs or
what a `[]byte` actually is.

C removes the hiding. Not because manual memory management is virtuous, but
because it makes the cost of every decision visible at the point you make it.
An hour in C changes how you read [[the-go-scheduler|Go's scheduler]] and how
you think about [[sockets-are-not-the-bottom|what a socket really is]].

The failure mode this guards against is the one on my GitHub profile: shipping
code you cannot explain. A tool that makes me faster is welcome. A tool that
makes me faster at producing code I could not defend in review is not.
