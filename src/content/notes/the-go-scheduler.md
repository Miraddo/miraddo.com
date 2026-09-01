---
title: Goroutines are cheap, not free
summary: Draft. The G-M-P model, and why "just spawn a goroutine" eventually stops being free.
date: 2026-09-01
tags: [go, systems, performance]
kind: article
draft: true
---

Go's scheduler is usually described as "goroutines are cheap". True, and the
word doing the work is *cheap*, not *free*.

## G, M, P

Three things, and the names are worth learning properly:

- **G**, a goroutine. A stack (starting small and growing), a program counter,
  and scheduling state.
- **M**, an OS thread. The thing the kernel actually schedules.
- **P**, a processor: the right to execute Go code. There are `GOMAXPROCS` of
  them, and a P owns a local run queue of Gs.

An M must hold a P to run Go code. That indirection is the whole design: it lets
the runtime multiplex many Gs onto few Ms, and lets a blocked M hand its P to
another M so work continues.

## Where the cost actually is

A goroutine's initial stack is small, but it is not zero, and it grows by
copying. A million goroutines is a real memory number, and stack growth is a
real copy.

More importantly, blocking in a syscall detaches the P from the M. The runtime
then needs another M to pick that P up. Under a workload that is mostly blocking
syscalls, you get thread churn that no amount of "goroutines are cheap" reasoning
predicts.

## The practical rule

Unbounded `go func()` in a request path is a queue with no limit and no
backpressure. Bound it, a worker pool, a semaphore, anything with a number in
it. The number is the point: it forces you to know what the system can take.

The same instinct applies one layer down, where
[[sockets-are-not-the-bottom|a socket is not the bottom]].
