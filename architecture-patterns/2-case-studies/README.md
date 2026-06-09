# Architecture & Patterns · Part 2 — Case Studies

The principles and patterns applied end-to-end: where SOLID, the GoF patterns, and the
architectural styles show up in real designs. Each follows the [shared doc template](../../_TEMPLATE.md)
and builds on the [Part 1 knowledge docs](../1-knowledge/).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## Refactoring toward clean boundaries
- ✅ [Refactoring a tangled service to hexagonal](./refactoring-to-hexagonal.md)
  — a god `OrderService` → ports & adapters, made testable. Applies [hexagonal architecture](../1-knowledge/architectural-styles/layered-hexagonal-clean.md) + [DI](../1-knowledge/architectural-styles/dependency-injection.md).

## Designing for extension
- ✅ [A plugin architecture](./plugin-architecture.md)
  — how pytest/VS Code/webpack stay extensible without core edits. Applies [Open/Closed](../1-knowledge/fundamentals/solid-principles.md) + [Factory/Observer/Decorator](../1-knowledge/design-patterns/patterns-overview.md).

## Modeling a complex domain
- ✅ [Modeling an e-commerce domain with DDD](./ddd-ecommerce-domain.md)
  — bounded contexts, aggregates & value objects → natural service seams. Applies [DDD](../1-knowledge/architectural-styles/domain-driven-design.md).

> 💡 Read together: the first tames an existing mess, the second designs for change up front, and
> the third shows where the boundaries *should* fall — three angles on the same goal of low
> [coupling, high cohesion](../1-knowledge/fundamentals/coupling-and-cohesion.md).
