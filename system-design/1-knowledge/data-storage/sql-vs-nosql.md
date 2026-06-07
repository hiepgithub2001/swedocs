# SQL vs NoSQL

> SQL (relational) databases store structured data in tables with a fixed schema and
> strong guarantees; NoSQL databases trade some of those guarantees for flexibility
> and horizontal scale.

## Problem
The database is usually the hardest part to scale and the most expensive to get
wrong. Choosing the right *type* up front — based on your data shape, access patterns,
and consistency needs — saves painful migrations later.

## Core concepts

**SQL / relational** (PostgreSQL, MySQL)
- Structured tables, fixed schema, relationships via joins.
- **ACID** transactions (Atomic, Consistent, Isolated, Durable).
- Powerful ad-hoc queries (SQL), strong consistency.
- Scales **up** easily; scales **out** with more effort (replicas, sharding).

**NoSQL** — a family, not one thing:
| Type | Example | Shape | Good for |
| --- | --- | --- | --- |
| Key-value | Redis, DynamoDB | key → blob | caching, sessions, simple lookups |
| Document | MongoDB | JSON documents | flexible/nested data, catalogs |
| Wide-column | Cassandra, HBase | rows with dynamic columns | huge write volume, time-series |
| Graph | Neo4j | nodes + edges | relationships, social graphs |

NoSQL often favors **BASE** (Basically Available, Soft state, Eventual consistency)
and is built to scale **out** across many nodes.

```mermaid
flowchart TB
    Q{Your data?}
    Q -->|relational, transactions| SQL[(SQL: Postgres/MySQL)]
    Q -->|flexible/nested| Doc[(Document: Mongo)]
    Q -->|massive scale, simple access| KV[(KV / Wide-col)]
    Q -->|relationships| G[(Graph)]
```

## Example — picking per workload (polyglot persistence)
One e-commerce app uses several stores, each matched to its access pattern:
- **Orders & payments** → **PostgreSQL** (need ACID transactions, joins).
- **Product catalog** (varied, nested attributes) → **MongoDB** (flexible documents).
- **Shopping cart / sessions** → **Redis** or **DynamoDB** (simple key lookups, huge scale).
- **"Customers who bought…" recommendations** → a **graph DB** (relationships).

There's no single "best" database — you choose per workload. Modeled in the
[scalable web service](../../3-practice/project-scalable-web-service.md) (SQL) and
[key-value store case study](../../2-case-studies/key-value-store.md) (NoSQL).

## A real problem — Discord's chat messages
A concrete case where the *type* of database had to change as scale grew.

**The workload.** Discord stores chat messages. The dominant query is dead simple:
*"give me the most recent messages in this channel"* (and scroll back). By 2017 they
were storing **billions** of messages, growing fast; by 2022, **trillions**. Writes are
constant (every message), reads are heavy and bursty (everyone in a busy channel reads
the same recent messages).

**Attempt 1 — MongoDB (document).** It worked at first, but the working set stopped
fitting in RAM. The read/write pattern thrashed the cache, latencies became spiky and
unpredictable, and scaling it further was painful. The data shape was fine for a
document store; the **access pattern at scale** was the problem.

**Why not just PostgreSQL/MySQL?** The message table would be enormous and
write-heavy, the query never needs joins or multi-row transactions, and they needed
easy **scale-out across many nodes and data centers**. A single relational primary
becomes the bottleneck; this is the textbook case to leave SQL.

**Attempt 2 — Cassandra (wide-column).** They modeled the data *around the query*:

```
partition key  = channel_id  (+ a time "bucket" so partitions don't grow forever)
clustering key = message_id   (time-ordered, so "recent N" is a fast range read)
```

That's the core NoSQL move: **pick the partition/clustering keys so your main query is a
single-partition lookup**, and accept denormalization instead of joins. This scaled to
trillions of messages. (Later they swapped Cassandra for **ScyllaDB** — same data model,
a faster C++ reimplementation — to cut tail latency and node count. Same *family*, so no
remodeling.)

**The lesson.** It wasn't "SQL bad, NoSQL good." It was: *huge volume + a single simple
access pattern + scale-out across data centers → wide-column*, and the right data model
matters more than the product. Orders and payments at the same company would still
belong in SQL.

## Common tools
| Tool | Family | Sweet spot |
| --- | --- | --- |
| **PostgreSQL**, **MySQL** | Relational | transactions, joins, the default choice |
| **MongoDB** | Document | flexible/nested data, fast iteration |
| **Cassandra / ScyllaDB** | Wide-column | massive writes, time-series, multi-DC |
| **DynamoDB** | Key-value/document | serverless scale, predictable latency |
| **Redis** | Key-value (in-mem) | cache, sessions, counters, queues |
| **Neo4j** | Graph | relationship-heavy queries |

## Trade-offs
- **SQL** — consistency, joins, mature tooling; harder horizontal scaling, rigid
  schema.
- **NoSQL** — horizontal scale, flexible schema, high write throughput; weaker
  consistency, limited joins, you model around **access patterns** (and often
  denormalize/duplicate data).
- **Default to SQL** unless you have a concrete reason (scale, data shape, write
  volume) to go NoSQL. "Polyglot persistence" — using both — is common.

## Real-world examples
- **PostgreSQL** for orders/payments (need ACID).
- **Cassandra** for time-series/metrics and feeds (write-heavy, scale-out).
- **Redis** for sessions and caching; **MongoDB** for flexible product catalogs.

## References
- *Designing Data-Intensive Applications* — Ch. 2 & 3
- [Amazon Dynamo paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
