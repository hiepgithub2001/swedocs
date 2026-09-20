# swedocs — Software Knowledge Base

A working knowledge base for software engineering. Each part below is a
**knowledge area**, and each area opens with a catalog of what it contains.

## Structure — 3 parts per area

Every knowledge area is organized into the same three parts:

1. **Knowledge** (`1-knowledge/`) — academic docs: concepts, theory, definitions
2. **Case Study** (`2-case-studies/`) — real-world application designs in detail
3. **Practice** (`3-practice/`) — hands-on labs: full steps to test a concept with a simple setup

## Knowledge areas

The areas are ordered as a **beginner-first learning path** — each tier builds on
the ones before it. Start at the top and work down; jump around once you have the
foundations.

### Tier 1 — Foundations (write & reason about code)

| Area | Status | Description |
| --- | --- | --- |
| [Languages & Frameworks](./languages-frameworks/) | 🚧 In progress | The axes every language varies on: paradigms, type systems, memory, concurrency, frameworks |
| [Algorithms & Data Structures](./algorithms-data-structures/) | 🚧 In progress | The CS bedrock: Big-O, arrays/lists/hash/trees/graphs, sorting, recursion, dynamic programming |
| [Best Practices](./best-practices/) | 🚧 In progress | Craft & process: testing, version control, code review, secure coding, documentation |

### Tier 2 — How the machine works underneath

| Area | Status | Description |
| --- | --- | --- |
| [Operating Systems](./operating-systems/) | 🚧 In progress | Kernels, processes, memory, concurrency, file systems |
| [Computer Networks](./computer-networks/) | 🚧 In progress | The Internet top-down: HTTP, DNS, TCP/UDP, IP, routing, Ethernet, TLS |

### Tier 3 — Designing real applications

| Area | Status | Description |
| --- | --- | --- |
| [Architecture & Patterns](./architecture-patterns/) | 🚧 In progress | Application-level design: SOLID, GoF patterns, hexagonal/clean architecture, DDD |
| [DevOps & Infrastructure](./devops-infrastructure/) | 🚧 In progress | CI/CD, containers, orchestration, IaC, cloud & observability |

### Tier 4 — Building at scale (capstone)

| Area | Status | Description |
| --- | --- | --- |
| [Distributed Systems](./distributed-systems/) | 🚧 In progress | The theory beneath the design: partial failure, logical time, consensus (Raft/Paxos), quorums, CRDTs |
| [System Design](./system-design/) | 🚧 In progress | Designing scalable, reliable distributed systems |

## Book summaries — a second shelf

Alongside the knowledge areas there is a second collection: one entry per real,
published book. Each carries `collection: Book summaries` in its README
frontmatter, which is what puts it on its own tab in the reader.

| Book | What it is |
| --- | --- |
| [A Philosophy of Software Design](./book-a-philosophy-of-software-design/) | John Ousterhout, 2018 (2nd edition 2021). One claim — that complexity is the only real problem — followed further than anyone else bothers to follow it |
| [Accelerate](./book-accelerate/) | Nicole Forsgren, Jez Humble & Gene Kim, 2018. The book that made "does this practice actually help?" an empirical question |
| [Building Microservices](./book-building-microservices/) | Sam Newman, 2015 — 2nd edition 2021. The unusual architecture book that spends most of its length on what the style costs you |
| [Clean Architecture](./book-clean-architecture/) | Robert C. Martin, 2017. One rule — source-code dependencies point inward, toward policy — stated at book length, with the SOLID principles rebuilt on top of it |
| [Clean Code](./book-clean-code/) | Robert C. Martin, 2008. The most influential and most argued-with book about code style ever written. Read it for the vocabulary, and read the criticism alongside it |
| [Code Complete](./book-code-complete/) | Steve McConnell, 1993 — 2nd edition 2004. The encyclopedia of construction: everything about writing code, with citations, from an era that measured things |
| [Database Internals](./book-database-internals/) | Alex Petrov, 2019. Two halves — how one node stores data, and how many nodes agree about it — written for the engineer who wants to know what is under the query planner |
| [Design Patterns](./book-design-patterns/) | Gamma, Helm, Johnson & Vlissides ("the Gang of Four"), 1994. Twenty-three named solutions that gave the industry a shared language — and a generation of over-engineered code written by people who read the catalogue and skipped the first chapter |
| [Designing Data-Intensive Applications](./book-designing-data-intensive-applications/) | Martin Kleppmann, 2017. The rare book that is both the best introduction and the best reference for its subject. If you read one book on this shelf, this one |
| [Domain-Driven Design](./book-domain-driven-design/) | Eric Evans, 2003. The book that said the hard part is not the technology but agreeing what the words mean — and then built a design method on that |
| [Fundamentals of Software Architecture — Distilled](./book-fundamentals-of-architecture/) | Mark Richards & Neal Ford, *Fundamentals of Software Architecture* (O'Reilly, 2020), rewritten as a short book: every core idea, in order, with diagrams, for an engineer who is good at code and new to architecture |
| [Patterns of Enterprise Application Architecture](./book-patterns-of-enterprise-application-architecture/) | Martin Fowler, 2002. The catalogue that named the machinery inside every ORM, web framework, and layered application you have ever used |
| [Peopleware](./book-peopleware/) | Tom DeMarco & Timothy Lister, 1987 — 3rd edition 2013. "The major problems of our work are not so much technological as sociological in nature." |
| [Refactoring](./book-refactoring/) | Martin Fowler, 1999 — 2nd edition 2018, in JavaScript. The book that turned "clean it up" from an instinct into a procedure with names and steps |
| [Release It!](./book-release-it/) | Michael T. Nygard, 2007 — 2nd edition 2018. A catalogue of the ways production kills software, written by someone who was there when it happened |
| [Site Reliability Engineering](./book-site-reliability-engineering/) | Beyer, Jones, Petoff & Murphy (eds.), Google, 2016. The book that turned "keep it up" into an engineering discipline with a budget |
| [Team Topologies](./book-team-topologies/) | Matthew Skelton & Manuel Pais, 2019. Conway's law, turned from a warning into a design tool: choose the teams you want the architecture to have |
| [The Mythical Man-Month](./book-the-mythical-man-month/) | Frederick P. Brooks Jr., 1975 — anniversary edition 1995. Fifty years old and still the most accurate book about why software is late |
| [The Pragmatic Programmer](./book-the-pragmatic-programmer/) | Andrew Hunt & David Thomas, 1999 — 20th Anniversary Edition, 2019. A book of habits rather than rules, written by two people who have clearly been on call |

These are summaries and analysis written in our own words — no book's text is
reproduced. They are machine-written distillations: useful as maps, wrong in
the places that matter most, and no substitute for the book itself.

## How to read this

Start at an area's catalog and follow it down. Every area is arranged the same
way — theory, then a worked system, then something to build — so you can enter
at whichever of the three you learn from best.

Areas cross-reference each other freely: a caching chapter in System Design
links to the memory hierarchy in Operating Systems, and those links work in
both directions. Follow them. The connections are most of the point.
