# Architecture & Patterns

How do you structure code *inside* a service so it stays changeable, testable, and
understandable as it grows? This area is the **application-level design** view: the principles
(coupling/cohesion, SOLID), the reusable [design patterns](./1-knowledge/design-patterns/patterns-overview.md)
that name recurring solutions, and the [architectural styles](./1-knowledge/architectural-styles/layered-hexagonal-clean.md)
(layered, hexagonal/clean, DDD, dependency injection) that keep business logic independent of
frameworks and databases.

Every section in this knowledge base is organized into **3 parts**:

| Part | Folder | What it contains |
| --- | --- | --- |
| 1️⃣ **Knowledge** | [`1-knowledge/`](./1-knowledge/) | Academic docs — principles, the GoF patterns, architectural styles |
| 2️⃣ **Case Study** | [`2-case-studies/`](./2-case-studies/) | Real designs end-to-end — a hexagonal refactor, a plugin system, a DDD domain |
| 3️⃣ **Practice** | [`3-practice/`](./3-practice/) | Hands-on labs — **implement the pattern** in a few dozen lines of Python |

Open each part's `README.md` for its catalog.

> **Scope — and how it differs from [System Design](../system-design/).** System Design owns the
> *distributed / runtime* patterns — [microservices](../system-design/1-knowledge/patterns/monolith-vs-microservices.md),
> [event-driven](../system-design/1-knowledge/patterns/event-driven.md),
> [CQRS & event sourcing](../system-design/1-knowledge/patterns/cqrs-event-sourcing.md),
> [saga](../system-design/1-knowledge/patterns/saga.md), [resilience](../system-design/1-knowledge/patterns/resilience-patterns.md).
> **This area does not repeat them** — it's the *inside-a-service* view: object-oriented design
> principles, the GoF design patterns, and how to keep a codebase's core clean. Where the two
> meet (DDD → service boundaries, Observer → event-driven), we link across rather than re-explain.

> **Status:** 🚧 in progress.

---

## 1️⃣ Knowledge — [catalog »](./1-knowledge/)
The foundations: **fundamentals** (what architecture is, [coupling & cohesion](./1-knowledge/fundamentals/coupling-and-cohesion.md),
[core design principles](./1-knowledge/fundamentals/core-design-principles.md) — DRY/KISS/YAGNI,
[SOLID](./1-knowledge/fundamentals/solid-principles.md)); the **GoF design patterns** grouped as
[creational](./1-knowledge/design-patterns/creational-patterns.md),
[structural](./1-knowledge/design-patterns/structural-patterns.md), and
[behavioral](./1-knowledge/design-patterns/behavioral-patterns.md); and **architectural styles** —
[layered/hexagonal/clean](./1-knowledge/architectural-styles/layered-hexagonal-clean.md),
[domain-driven design](./1-knowledge/architectural-styles/domain-driven-design.md), and
[dependency injection](./1-knowledge/architectural-styles/dependency-injection.md).

## 2️⃣ Case Study — [catalog »](./2-case-studies/)
The ideas applied end-to-end: **refactoring a tangled service to hexagonal**, a **plugin
architecture** (how pytest/VS Code/webpack stay extensible), and **modeling an e-commerce domain
with DDD** (bounded contexts → service seams).

## 3️⃣ Practice — [catalog »](./3-practice/)
Runnable labs where you **implement the pattern** — Strategy + Factory, an Observer event bus,
Decorator middleware, and ports & adapters you can swap — in a few dozen lines of 🐍 Python. Free,
local, no dependencies.
