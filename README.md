# swedocs — Software Knowledge Base

A living knowledge base where we write and share documentation about software
engineering knowledge. Each top-level folder is a **knowledge area**; inside each
area a `README.md` acts as the **catalog** (index) for that area.

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

## How to use this repo

- Browse a knowledge area's folder and open its `README.md` catalog.
- Each topic is a Markdown file — write freely, keep it practical.
- Use diagrams with [Mermaid](https://mermaid.js.org/) (renders on GitHub).
- Edit on a branch and open a Pull Request so others can review.
