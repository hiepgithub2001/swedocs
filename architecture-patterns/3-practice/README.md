# Architecture & Patterns · Part 3 — Practice

**Practice = implement the pattern.**

Design patterns click when you *write* the smallest version that shows the payoff: a branch that
disappears into a Strategy, a publisher that no longer knows its subscribers, behavior you can
stack like middleware, a database you can swap in one line. Each lab is a few dozen lines of
🐍 Python — free, local, no dependencies (one optional `pytest`).

> 🧩 The goal is **the intent, not the boilerplate**: write the thing that exhibits the real
> benefit — adding behavior with zero edits, testing logic with zero I/O.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## A. Choosing & adding behavior (start here)
- ✅ [Refactor an if/else mess into Strategy + Factory](./lab-strategy-factory.md)
  — prove a new behavior needs zero edits. Mirrors [behavioral](../1-knowledge/design-patterns/behavioral-patterns.md) + [creational](../1-knowledge/design-patterns/creational-patterns.md) patterns.

## B. Decoupling collaborators
- ✅ [Build an in-process event bus (Observer)](./lab-observer-event-bus.md)
  — a publisher that knows nobody. Mirrors [behavioral patterns](../1-knowledge/design-patterns/behavioral-patterns.md); seeds [event-driven](../../system-design/1-knowledge/patterns/event-driven.md).
- ✅ [Composable middleware with Decorator](./lab-decorator-middleware.md)
  — stack logging/timing/auth as layers. Mirrors [structural patterns](../1-knowledge/design-patterns/structural-patterns.md).

## C. Protecting the core
- ✅ [Ports & adapters — swap a DB without touching the core](./lab-hexagonal-port-adapter.md)
  — test logic with zero I/O. Mirrors [hexagonal architecture](../1-knowledge/architectural-styles/layered-hexagonal-clean.md) + [DI](../1-knowledge/architectural-styles/dependency-injection.md).
