# What is System Design

> The process of defining the architecture, components, interfaces, and data flow
> of a system to satisfy a set of requirements.

## Problem
Writing code that works on one machine for one user is easy. Building a system that
serves **millions of users**, stays **available** during failures, responds
**quickly**, and can **grow** over time is hard. System design is the discipline of
making the high-level decisions — *what are the pieces, how do they talk, where does
the data live* — before and while you write the code.

## Core concepts

**Two altitudes of design**
- **High-Level Design (HLD)** — the big boxes: services, databases, caches, queues,
  load balancers, and how requests flow between them.
- **Low-Level Design (LLD)** — the inside of a box: classes, schemas, APIs,
  algorithms.

**A typical request path**
```mermaid
flowchart LR
    User --> DNS --> LB[Load Balancer]
    LB --> S1[Service A]
    LB --> S2[Service A]
    S1 --> Cache[(Cache)]
    S1 --> DB[(Database)]
    S1 --> Q[Message Queue] --> W[Worker]
```

**The questions every design must answer**
1. **Functional requirements** — what must it *do*? (post a tweet, send a message)
2. **Non-functional requirements** — how *well*? (scale, latency, availability)
3. **Constraints** — budget, team, existing tech, regulations.

## Example — sketching an HLD
Asked to "design a link shortener," you start at the **high level**: a client hits a load
balancer → an API service writes `code → url` to a datastore; reads go through a cache;
clicks are redirected. Only *then* do you zoom into **low-level** details (the code-gen
algorithm, the table schema). The skill is starting with the boxes and arrows, stating
requirements + trade-offs, before any code. See it built in the
[URL shortener project](../../3-practice/project-url-shortener.md).

## Common tools
| Tool | Use it for |
| --- | --- |
| **Excalidraw**, **draw.io**, **Mermaid** | sketching architecture diagrams (HLD/LLD) |
| **C4 model** | a structured way to diagram systems at 4 zoom levels |
| The standard "building blocks" | load balancer, cache, queue, database, CDN, object store — the vocabulary every design is assembled from |
| **System Design Primer**, *DDIA* | the canonical learning references |

## Trade-offs
There is no "correct" design — only trade-offs. Every choice trades one property for
another (e.g. consistency vs availability, cost vs performance, simplicity vs
flexibility). The job is to pick the trade-offs that match the requirements, and to
**state them explicitly**.

## Real-world examples
- A startup with 100 users may run a single server + one database. That is a *good*
  design for its scale — adding queues and caches would be wasted complexity.
- The same product at 100M users needs sharding, caching, CDNs, and async
  processing. Designs evolve with scale.

## References
- *Designing Data-Intensive Applications* — Martin Kleppmann
- [System Design Primer](https://github.com/donnemartin/system-design-primer)
