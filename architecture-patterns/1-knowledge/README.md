# Architecture & Patterns · Part 1 — Knowledge

Academic docs: the **principles, design patterns, and architectural styles** of application-level
software design. Each topic follows the [shared doc template](../../_TEMPLATE.md) and leads with a
top-down hook, a worked example, and the essential terminology.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

> 📚 Read in order: first the **fundamentals** (what good structure even means), then the
> **design patterns** (named solutions), then the **architectural styles** that organize a whole
> codebase.

> 🔗 This area is the *inside-a-service* view. It does **not** repeat System Design's distributed
> patterns ([microservices](../../system-design/1-knowledge/patterns/monolith-vs-microservices.md),
> [event-driven](../../system-design/1-knowledge/patterns/event-driven.md),
> [CQRS](../../system-design/1-knowledge/patterns/cqrs-event-sourcing.md)) — it links to them
> where the application model meets the system.

## Fundamentals — what "good structure" means
- ✅ [What is software architecture?](./fundamentals/what-is-software-architecture.md)
- ✅ [Coupling & cohesion](./fundamentals/coupling-and-cohesion.md)
- ✅ [SOLID principles](./fundamentals/solid-principles.md)

## Design patterns — named, reusable solutions (GoF)
- ✅ [Patterns overview — the three families & when *not* to use them](./design-patterns/patterns-overview.md)
- ✅ [Creational patterns](./design-patterns/creational-patterns.md) — Factory · Builder · Singleton
- ✅ [Structural patterns](./design-patterns/structural-patterns.md) — Adapter · Decorator · Facade · Proxy
- ✅ [Behavioral patterns](./design-patterns/behavioral-patterns.md) — Strategy · Observer · Command · Template Method

## Architectural styles — organizing a whole codebase
- ✅ [Layered, Hexagonal & Clean architecture](./architectural-styles/layered-hexagonal-clean.md)
- ✅ [Domain-Driven Design (DDD)](./architectural-styles/domain-driven-design.md)
- ✅ [Dependency injection & Inversion of Control](./architectural-styles/dependency-injection.md)
