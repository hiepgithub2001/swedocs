# How Uber Built It — Real-Time Dispatch & Geospatial

> How Uber matches riders and drivers in real time across thousands of cities, and the
> geospatial and architectural ideas that made it scale.

## The challenge
Match millions of riders to nearby drivers in **seconds**, ingest **high-frequency
location** from millions of drivers, compute pricing and ETAs, and stay available across
the globe — with strong correctness (never assign one driver to two riders).

## Key architectural decisions

**1. Monolith → microservices → DOMA**
Uber began as a monolith ("the big API"), then exploded into **thousands of
microservices** as it scaled and teams multiplied. The sprawl created its own problems
(dependency chains, hard-to-trace calls), so Uber introduced **DOMA (Domain-Oriented
Microservice Architecture)** — grouping services into **domains** with well-defined
gateways and layers, getting microservice independence without ungoverned chaos.

**2. H3 — a hexagonal geospatial grid**
The core problem is "find available drivers near this rider, fast, and reason about
supply/demand per area." Uber built and open-sourced **H3**, which tiles the Earth into
**hexagonal cells** at multiple resolutions. Hexagons have **uniform distance to all
neighbors** (unlike squares, whose diagonals differ), which makes proximity queries,
smoothing, and surge zoning clean and consistent.
```mermaid
flowchart LR
    Rider --> C[rider's H3 cell]
    C --> N[this + ring of neighbor cells]
    N --> Avail[available drivers in those cells]
    Avail --> Rank[rank by ETA] --> Offer[offer to best]
```

**3. High-volume location ingestion & dispatch**
Drivers emit location every few seconds → enormous, **ephemeral** write volume. The
real-time dispatch system keeps current state in memory and shards work across nodes.
Uber built **Ringpop** (a gossip + consistent-hashing library) to shard and coordinate
the dispatch service across a cluster with cooperative failure handling, and
**Schemaless** (a scalable datastore built on MySQL) for durable storage.

**4. Streaming data platform**
Uber runs one of the world's largest **Apache Kafka** deployments — trip events, GPS
pings, app events — feeding **Apache Flink** for real-time stream processing (pricing,
ETAs, fraud, dashboards). This event backbone underpins surge and analytics.

**5. Durable workflows with Cadence**
Trips, payments, and driver onboarding are **long-running, multi-step workflows** that
must survive crashes. Uber created **Cadence** (now also Temporal) — a fault-tolerant
workflow engine that persists workflow state as durable, replayable history, so a
multi-step process resumes correctly after failures (a practical realization of the
[saga](../../1-knowledge/patterns/saga.md)/orchestration idea).

**6. Geo-partitioning & resilience**
Services and data are partitioned by **city/region**; failover spans data centers;
regional isolation limits blast radius.

## Lessons
- **Pick the right spatial model** — H3 turned expensive "nearby" queries into cheap
  cell lookups and powered surge.
- **Separate hot ephemeral data** (live location) from durable records (trips).
- **Stream-first** — Kafka + Flink underpin pricing, ETA, and analytics.
- **Durable workflow engines** tame distributed, long-running business processes.
- Microservices need **governance** (DOMA) once you have thousands.

## References
- [Uber H3](https://www.uber.com/blog/h3/)
- [Uber Engineering Blog](https://www.uber.com/blog/engineering/)
- [DOMA](https://www.uber.com/blog/microservice-architecture/) ·
  [Cadence](https://cadenceworkflow.io/)
