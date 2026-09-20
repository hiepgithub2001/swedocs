# Languages & Frameworks · Part 3 — Practice

**Practice = run the concept.**

Language design clicks when you *see* it behave: the same problem reshaped by each paradigm, threads
that don't speed up CPU work (the GIL), weak typing turning a bug into a plausible number, a garbage
collector reclaiming a cycle refcounting couldn't. Each lab uses 🐍 Python and/or Node — **both
already installed** — with no extra packages.

> 🧩 The goal is **the behavior, observed**: run it, predict the output, then explain *why* the
> language made that choice.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## A. Paradigms (start here)
- ✅ [One problem, three paradigms](./lab-paradigms.md)
  — imperative vs. OO vs. functional, same answer. Mirrors [programming paradigms](../1-knowledge/fundamentals/programming-paradigms.md).

## B. The deep axes
- ✅ [Concurrency models: threads vs. async vs. processes](./lab-concurrency-models.md)
  — I/O-bound vs. CPU-bound, the GIL, the JS event loop. Mirrors [concurrency models](../1-knowledge/language-design/concurrency-models.md).
- ✅ [Strong vs. weak typing — watch a bug hide](./lab-strong-vs-weak-typing.md)
  — Python vs. JS coercion; catch it early with gradual typing. Mirrors [type systems](../1-knowledge/language-design/type-systems.md).
- ✅ [Watch a garbage collector work — refcounting & cycles](./lab-memory-refcounting.md)
  — immediate frees, a cycle the tracing GC reclaims. Mirrors [memory management](../1-knowledge/language-design/memory-management.md).
