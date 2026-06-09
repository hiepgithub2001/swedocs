# Languages & Frameworks

Why do Python, Rust, Go, and JavaScript *feel* so different — and how do you learn a new language
fast? This area is about the **concepts that transfer across every language**: the axes each one
takes a position on — [paradigm](./1-knowledge/fundamentals/programming-paradigms.md),
[execution model](./1-knowledge/fundamentals/compilation-and-execution.md),
[type system](./1-knowledge/language-design/type-systems.md),
[memory management](./1-knowledge/language-design/memory-management.md), and
[concurrency model](./1-knowledge/language-design/concurrency-models.md) — plus what separates a
[library from a framework](./1-knowledge/frameworks/library-vs-framework.md). Learn the axes once,
and every new language becomes "which choices did *this* one make?"

Every section in this knowledge base is organized into **3 parts**:

| Part | Folder | What it contains |
| --- | --- | --- |
| 1️⃣ **Knowledge** | [`1-knowledge/`](./1-knowledge/) | Academic docs — the design axes every language varies on |
| 2️⃣ **Case Study** | [`2-case-studies/`](./2-case-studies/) | Real languages through the lens — Rust, Go, JavaScript |
| 3️⃣ **Practice** | [`3-practice/`](./3-practice/) | Hands-on labs — run the concepts in Python & Node |

Open each part's `README.md` for its catalog.

> **Scope — concepts over syntax.** This area deliberately does **not** teach any one language's
> syntax (the most superficial, least transferable part). It teaches the dimensions that explain
> *why* languages differ and that make the next one easy. It links to neighbours where they go
> deeper: OS-level [threads & scheduling](../operating-systems/) and distributed
> [coordination](../distributed-systems/) underlie [concurrency](./1-knowledge/language-design/concurrency-models.md);
> [Inversion of Control](../architecture-patterns/1-knowledge/architectural-styles/dependency-injection.md)
> in [Architecture & Patterns](../architecture-patterns/) underlies
> [frameworks](./1-knowledge/frameworks/library-vs-framework.md).

> **Status:** 🚧 in progress.

---

## 1️⃣ Knowledge — [catalog »](./1-knowledge/)
The axes: **fundamentals** ([what makes a language](./1-knowledge/fundamentals/what-makes-a-language.md),
[paradigms](./1-knowledge/fundamentals/programming-paradigms.md),
[compilation & execution](./1-knowledge/fundamentals/compilation-and-execution.md)); **language
design** ([type systems](./1-knowledge/language-design/type-systems.md),
[memory management](./1-knowledge/language-design/memory-management.md),
[concurrency models](./1-knowledge/language-design/concurrency-models.md)); and **frameworks**
([library vs. framework & IoC](./1-knowledge/frameworks/library-vs-framework.md)).

## 2️⃣ Case Study — [catalog »](./2-case-studies/)
Each language is a memorable point in the design space: **Rust** (memory safety without a GC via
ownership), **Go** (approachable concurrency via goroutines & channels), **JavaScript** (thousands
of connections on one thread via the event loop).

## 3️⃣ Practice — [catalog »](./3-practice/)
Runnable labs that make the concepts concrete — one problem in three paradigms, threads vs. async
vs. processes, weak-vs-strong typing hiding a bug, and a garbage collector reclaiming a reference
cycle — in 🐍 Python and Node (both already installed). Free, local, no extra packages.
