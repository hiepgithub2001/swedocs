# Languages & Frameworks · Part 1 — Knowledge

Academic docs: the **design axes every programming language varies on**. Each topic follows the
[shared doc template](../../_TEMPLATE.md) and leads with a top-down hook, a worked example, and the
essential terminology.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

> 📚 Read in order: first *what makes a language* (the map), then how it **runs** and what
> **paradigm** you think in, then the four deep design choices (**types, memory, concurrency,
> error handling**), then how you build on top with **frameworks**.

> 🔗 Concepts over syntax. Where these axes meet other areas we link out:
> [Operating Systems](../../operating-systems/) for the threads/scheduling under
> [concurrency](./language-design/concurrency-models.md);
> [Architecture & Patterns](../../architecture-patterns/) for the
> [IoC](../../architecture-patterns/1-knowledge/architectural-styles/dependency-injection.md) under
> [frameworks](./frameworks/library-vs-framework.md).

## Fundamentals — the map
- ✅ [What makes a programming language](./fundamentals/what-makes-a-language.md) — the axes, and why concepts beat syntax
- ✅ [Programming paradigms](./fundamentals/programming-paradigms.md) — imperative · OO · functional · declarative
- ✅ [Compilation & execution](./fundamentals/compilation-and-execution.md) — compiled vs. interpreted vs. VM/JIT

## Language design — the four deep choices
- ✅ [Type systems](./language-design/type-systems.md) — static/dynamic × strong/weak, inference, gradual typing
- ✅ [Memory management](./language-design/memory-management.md) — manual · garbage collection · ownership
- ✅ [Concurrency models](./language-design/concurrency-models.md) — threads · async/event-loop · CSP · actors
- ✅ [Error handling](./language-design/error-handling.md) — exceptions · error values · Result/Option, checked vs. unchecked

## Frameworks — building on top
- ✅ [Library vs. framework](./frameworks/library-vs-framework.md) — Inversion of Control: who calls whom
