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
single-partition lookup**, and accept denormalization instead of joins.

```mermaid
flowchart LR
    Q["Query: recent msgs<br/>in channel 42"] --> P["Partition<br/>(channel 42, bucket 2026-06)"]
    P --> M["sorted by message_id ▼<br/>m_103 · m_102 · m_101 …"]
    M --> R["read top N = one<br/>contiguous range, one node"]
```

This scaled to trillions of messages. (Later they swapped Cassandra for **ScyllaDB** — same data model,
a faster C++ reimplementation — to cut tail latency and node count. Same *family*, so no
remodeling.)

**The lesson.** It wasn't "SQL bad, NoSQL good." It was: *huge volume + a single simple
access pattern + scale-out across data centers → wide-column*, and the right data model
matters more than the product. Orders and payments at the same company would still
belong in SQL.

> 📄 **Deep-dive:** [How Cassandra works & how it handles heavy writes](./cassandra.md) —
> the masterless ring, the LSM write path, and the techniques for write-heavy workloads.

## Common tools
| Tool | Family | Sweet spot |
| --- | --- | --- |
| **PostgreSQL**, **MySQL** | Relational | transactions, joins, the default choice |
| **MongoDB** | Document | flexible/nested data, fast iteration |
| **Cassandra / ScyllaDB** | Wide-column | massive writes, time-series, multi-DC |
| **DynamoDB** | Key-value/document | serverless scale, predictable latency |
| **Redis** | Key-value (in-mem) | cache, sessions, counters, queues |
| **Neo4j** | Graph | relationship-heavy queries |

## Common real-world patterns
You rarely use one database alone. These are the combinations teams actually run. Most
of them fit one picture — **SQL as the source of truth, with derived stores hanging off
it**:

![Reference architecture: SQL primary as source of truth with Redis cache, read replicas, search/analytics via CDC, and an outbox to an event bus](images/sql-nosql-architecture.png)

**1. SQL as system of record + Redis cache-aside.** The default web-app stack.
Postgres/MySQL holds the truth; Redis caches hot reads. On a read, check Redis → miss →
read SQL → write it back to Redis. On write, update SQL and invalidate/update the cache.
Takes read load off the primary and cuts latency. → see [caching](../building-blocks/caching.md).

```mermaid
sequenceDiagram
    participant A as App
    participant R as Redis (cache)
    participant D as SQL primary
    A->>R: GET key
    alt cache hit
        R-->>A: value
    else cache miss
        R-->>A: nil
        A->>D: SELECT …
        D-->>A: row
        A->>R: SET key (write-back, with TTL)
    end
    Note over A,D: on write: UPDATE SQL, then invalidate/update key
```

**2. SQL primary + read replicas.** Scale *reads* by streaming the primary's changes to
N read-only replicas; send writes to the primary, reads to replicas. Buys a lot of
headroom before you ever need NoSQL — but introduces **replication lag** (a read right
after a write may be stale), so route read-your-own-writes back to the primary.

**3. SQL system of record + search/analytics engine.** Transactions live in SQL;
full-text search and faceted queries go to **Elasticsearch/OpenSearch**, and heavy
analytics to a column store / warehouse (**ClickHouse, BigQuery, Snowflake**). You sync
SQL → engine via **CDC** (change data capture, e.g. Debezium). SQL stays the source of
truth; the engine is a derived, rebuildable index.

**4. Polyglot persistence.** Pick a store per workload (the e-commerce example above):
SQL for orders, document for catalog, KV for cart/sessions, graph for recommendations.
Each service owns its store.

**5. Write-heavy / time-series → wide-column or TSDB.** Metrics, logs, feeds, IoT,
chat go to **Cassandra/ScyllaDB** or a time-series DB (**InfluxDB, TimescaleDB** — the
latter is Postgres with a time-series extension, a nice "stay in SQL" option).

**6. CQRS — write one shape, read another.** Write to a normalized SQL model, then
project the data into a denormalized read store (Redis, a document DB, or a wide-column
table) shaped exactly for your queries. Common for feeds/timelines: fan-out a post into
each follower's precomputed list so the read is a single lookup.

```mermaid
flowchart LR
    W[Write: create post] --> S[(SQL: normalized<br/>source of truth)]
    S -->|project / fan-out| RS[(Read store:<br/>per-user timeline)]
    RS --> Q[Read: GET my feed<br/>single lookup]
```

**7. Outbox / event-driven sync.** To keep two stores consistent without distributed
transactions, write the row **and** an "event" row in the *same* SQL transaction, then a
relay publishes those events (to Kafka, another DB, the cache). Avoids the dual-write
problem where one store updates and the other silently doesn't.

**8. SQL with JSON columns — the hybrid.** Postgres `jsonb` (and MySQL JSON) let you keep
relational integrity for the structured parts and a flexible schemaless column for the
rest. Often removes the *need* for a separate document DB until you truly need scale-out.

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
