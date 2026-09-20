---
collection: Book summaries
---

# Design Patterns

> Gamma, Helm, Johnson & Vlissides ("the Gang of Four"), 1994. Twenty-three
> named solutions that gave the industry a shared language — and a generation
> of over-engineered code written by people who read the catalogue and skipped
> the first chapter.

<!--
  Provenance: this summary is a machine-written distillation, not the author's
  words and not reviewed by them. It is a map, and a map is wrong in the places
  that matter most. Check anything you are about to bet on against the book.
-->

| | |
| --- | --- |
| **Authors** | Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides |
| **Published** | 1994 (C++ and Smalltalk) |
| **Shape** | Two chapters of principles, then 23 patterns in a rigid template |
| **Read it for** | Chapter 1, the two principles, and the intent sections |
| **Skip it if** | You intend to read it as a list of things to add to your code |

## The argument in one paragraph

Experienced designers reuse **solutions**, not just code: the same arrangements
of objects recur, and naming them makes them teachable and discussable. Each
pattern is presented the same way — intent, motivation, applicability,
structure, participants, consequences, implementation, known uses — because the
consequences and the applicability are the part that matters. Two principles
run underneath all twenty-three:

> **Program to an interface, not an implementation.**
> **Favour object composition over class inheritance.**

## The catalogue, in three families

| Creational | Structural | Behavioural |
| --- | --- | --- |
| Abstract Factory | Adapter | Chain of Responsibility |
| Builder | Bridge | Command |
| Factory Method | Composite | Interpreter |
| Prototype | Decorator | Iterator |
| Singleton | Facade | Mediator |
| | Flyweight | Memento |
| | Proxy | Observer |
| | | State |
| | | Strategy |
| | | Template Method |
| | | Visitor |

**Creational** patterns decide *who makes the object*; **structural** patterns
decide *how objects are composed*; **behavioural** patterns decide *how
responsibility and control flow are divided*.

## The ones that earned their keep

- **Strategy** — swap an algorithm at runtime. Half the "plugin" systems you
  have used are this, and in a language with first-class functions it is one
  parameter.
- **Observer** — the foundation of every event system, UI binding, and pub/sub
  API. Also the source of the hardest debugging in any codebase that uses it
  heavily, because control flow becomes invisible.
- **Decorator** — wrap to add behaviour without subclassing. Middleware,
  streams, and HTTP client interceptors are all this.
- **Adapter** and **Facade** — the two ways to tame someone else's API.
- **Composite** and **Iterator** — trees and traversal, now so absorbed into
  standard libraries that nobody calls them patterns.
- **Command** — undo stacks, job queues, and the entire idea of reifying an
  action as a value.
- **Template Method** — the inheritance one that still occasionally beats
  composition, in frameworks where the subclass is the extension point.

And the one to be careful with: **Singleton**. Global mutable state with a
polite name — it defeats testing, hides dependencies, and in a concurrent
program it is a race waiting for a schedule. The book lists it without the
warnings later experience supplied.

## The criticism, which the authors partly share

- **Language gaps, not universal truths.** Peter Norvig's observation is the
  famous one: 16 of the 23 patterns are invisible or trivial in a language with
  first-class functions, macros, or multiple dispatch. A pattern is partly a
  workaround for what your language cannot say.
- **The catalogue invited cargo-culting.** Readers learned the structures and
  went looking for places to apply them, producing `AbstractFactoryFactory`
  jokes that were not entirely jokes. The book's own applicability sections warn
  against exactly this, and are the most-skipped pages in it.
- **The authors would change the set.** In a later retrospective they suggested
  dropping some (Singleton, Interpreter) and adding others; Gamma has said the
  useful unit is the *pattern language* — how they combine — rather than the
  list.

## Ideas worth stealing

| Idea | What it means | Where it bites |
| --- | --- | --- |
| **Program to an interface** | Depend on the shape, not the class | `new PostgresClient()` in a domain service |
| **Composition over inheritance** | Assemble behaviour; don't inherit it | The five-deep class hierarchy nobody can flatten |
| **Encapsulate what varies** | Find the axis of change and hide it | A conditional that grows a branch per customer |
| **Consequences, not just structure** | Every pattern costs indirection | Four classes where one function was needed |
| **Named designs** | A shared word ends a long argument | "It's a decorator" |

## How to read it

Read chapter 1 and the two principles. Then read only the **Intent**,
**Applicability**, and **Consequences** of each pattern — perhaps an hour — and
treat the C++ code as archaeology. Come back to the full entry when you have a
problem that matches an intent. Reading it cover to cover, applying as you go,
is how the cargo cult happened.

## Where it touches this knowledge base

- [Patterns overview](../architecture-patterns/1-knowledge/design-patterns/patterns-overview.md)
- [Creational patterns](../architecture-patterns/1-knowledge/design-patterns/creational-patterns.md)
- [Structural patterns](../architecture-patterns/1-knowledge/design-patterns/structural-patterns.md)
- [Behavioral patterns](../architecture-patterns/1-knowledge/design-patterns/behavioral-patterns.md)
- [Lab: strategy & factory](../architecture-patterns/3-practice/lab-strategy-factory.md) and [lab: observer event bus](../architecture-patterns/3-practice/lab-observer-event-bus.md)
- [Programming paradigms](../languages-frameworks/1-knowledge/fundamentals/programming-paradigms.md) — Norvig's objection, from the language side

## If you liked this

[Patterns of Enterprise Application Architecture](../book-patterns-of-enterprise-application-architecture/README.md)
does the same job one level up, for applications rather than objects.
[Refactoring](../book-refactoring/README.md) is the other half: patterns are
where you are going, refactorings are how you get there.
