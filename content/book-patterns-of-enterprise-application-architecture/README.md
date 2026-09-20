---
collection: Book summaries
---

# Patterns of Enterprise Application Architecture

> Martin Fowler, 2002. The catalogue that named the machinery inside every ORM,
> web framework, and layered application you have ever used.

<!--
  Provenance: this summary is a machine-written distillation, not the author's
  words and not reviewed by them. It is a map, and a map is wrong in the places
  that matter most. Check anything you are about to bet on against the book.
-->

| | |
| --- | --- |
| **Author** | Martin Fowler (with contributions from several others) |
| **Published** | 2002 |
| **Shape** | ~530 pages: narrative chapters, then ~50 patterns with worked code |
| **Read it for** | Knowing what your framework is doing, and why it chose that |
| **Skip it if** | You will never touch persistence, and never wonder why Hibernate behaves as it does |

## The argument in one paragraph

Enterprise applications share a small set of recurring problems — getting
domain logic out of the UI, mapping objects to relational tables, keeping a
unit of work consistent, moving data across process boundaries — and a small
set of recurring answers, each with different costs. Name them, describe the
trade-offs, and architecture conversations stop being arguments about taste.
The book's real gift is a **vocabulary for layering**, and an honest table of
when each option stops scaling.

## The three choices that structure everything

**1. How is the domain logic organised?**

| Pattern | Shape | Good for |
| --- | --- | --- |
| **Transaction Script** | One procedure per user action | Simple logic; stays honest, scales badly with complexity |
| **Table Module** | One class per table, operating on record sets | Middle ground; suits tabular data and reporting |
| **Domain Model** | Objects with behaviour, mirroring the business | Complex, changing rules — and the mapping cost that comes with them |

Fowler's own guidance: complexity of the domain decides, and the curve crosses
sooner than people think. A Transaction Script app that grew rules for five
years is the most common legacy shape there is.

**2. How do objects meet the database?**

- **Active Record** — the row knows how to save itself. Rails, Django, and
  every "model" you have seen. Cheap until the domain model and the table stop
  matching.
- **Data Mapper** — a separate layer moves data between objects and tables.
  Hibernate, SQLAlchemy, Entity Framework. More machinery, and the only option
  that lets the domain model be shaped by the domain.
- **Unit of Work** — track what changed in a business transaction and write it
  once, in order. This is what a "session" is.
- **Identity Map** — one in-memory object per database row per transaction, so
  you cannot get two conflicting copies.
- **Lazy Load** — fetch when touched, with the N+1 query problem as the price.
- **Repository** — query the collection, not the database.

Read those six together and an ORM stops being magic: it is Data Mapper +
Identity Map + Unit of Work + Lazy Load, and every confusing behaviour you have
debugged is one of them doing its job.

**3. How do layers talk?**

Service Layer, DTO, Remote Facade, and the **first law of distributed objects**:

> Don't distribute your objects.

A chatty interface that is fine in-process becomes a disaster across a network,
so remote boundaries need coarse-grained calls — the same argument that
microservice books re-derive twenty years later.

## Other patterns still in daily use

Optimistic and Pessimistic Offline Lock (how to handle two users editing the
same record across web requests); Coarse-Grained Lock; Front Controller; Page
Controller; **Model-View-Controller** described precisely; Template View;
Two-Step View; Special Case (the null object with a name); **Money** (never use
a float, and here is the class); Registry; Gateway; Plugin; Value Object;
Separated Interface; Record Set.

## Ideas worth stealing

| Idea | What it means | Where it bites |
| --- | --- | --- |
| **Domain logic has a shape** | Script, module, or model — pick deliberately | Business rules spread through controllers |
| **Active Record vs Data Mapper** | Coupling the model to the schema is a decision | The domain class that gained a `save()` and a lifecycle |
| **Unit of Work** | One consistent write per business transaction | Partial saves and half-written state |
| **Identity Map** | One object per row, per transaction | Two copies of the same customer disagreeing |
| **Lazy load costs** | Convenience buys you N+1 queries | The list page that issues 400 selects |
| **Offline locking** | Concurrency across requests, not threads | Last-write-wins clobbering a colleague's edit |
| **Don't distribute objects** | Remote calls must be coarse | A chatty API turned into a chatty service |
| **Money is a type** | Currency and rounding are domain rules | `float` balances, and a cent that disappears |

## What has aged, and what hasn't

The Java/.NET framing of 2002, the EJB discussion, and the presentation
patterns are period pieces — modern front ends made Page Controller and
Two-Step View largely irrelevant, and event-driven and CQRS-style designs sit
outside the book's world. Fowler has since written much of the follow-up online
rather than in a second edition.

The persistence and concurrency patterns, though, are exactly as relevant as
they were, because the problem did not change: objects are graphs, tables are
sets, and something has to bridge them. Reading this book is the fastest way to
stop being surprised by your ORM.

## How to read it

Read the narrative chapters (part one) end to end — they are short and they
frame the choices. Then read Domain Logic, Data Source Architectural Patterns,
Object-Relational Behavioral Patterns, and the concurrency chapter. Use the
rest as a reference; the pattern summaries on Fowler's site are enough for
recall.

## Where it touches this knowledge base

- [MVC, MVP, MVVM](../architecture-patterns/1-knowledge/architectural-styles/mvc-mvp-mvvm.md)
- [Layered, hexagonal, clean](../architecture-patterns/1-knowledge/architectural-styles/layered-hexagonal-clean.md)
- [SQL vs NoSQL](../system-design/1-knowledge/data-storage/sql-vs-nosql.md) and [indexing](../system-design/1-knowledge/data-storage/indexing.md)
- [Consistency models](../system-design/1-knowledge/fundamentals/consistency-models.md) — where offline locking meets the real rules
- [REST](../system-design/1-knowledge/communication/rest.md) — coarse-grained boundaries, thirty years on

## If you liked this

[Domain-Driven Design](../book-domain-driven-design/README.md) is what to do once Domain
Model wins. [Design Patterns](../book-design-patterns/README.md) is the same catalogue
approach one level down.
