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
