# System Design · Part 1 — Knowledge

Academic docs: concepts, theory, and definitions. Each topic follows the
[shared doc template](../../_TEMPLATE.md).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## Fundamentals
- ✅ [What is system design](./fundamentals/what-is-system-design.md)
- ✅ [Scalability: vertical vs horizontal](./fundamentals/scalability.md)
- ✅ [Latency, throughput & response time](./fundamentals/latency-throughput.md)
- ✅ [Availability, reliability & fault tolerance](./fundamentals/availability-reliability.md)
- ✅ [CAP theorem](./fundamentals/cap-theorem.md)
- ✅ [Consistency models (strong, eventual, causal)](./fundamentals/consistency-models.md)
- ✅ [Back-of-the-envelope estimation](./fundamentals/estimation.md)
- ✅ [SLA, SLO, SLI](./fundamentals/sla-slo-sli.md)

## Building Blocks
- ✅ [DNS & the lifecycle of a request](./building-blocks/dns-request-lifecycle.md)
- ✅ [Load balancers (L4/L7, algorithms)](./building-blocks/load-balancers.md)
- ✅ [Reverse proxies & API gateways](./building-blocks/proxies-gateways.md)
- ✅ [Caching strategies](./building-blocks/caching.md)
- ✅ [Content Delivery Networks (CDN)](./building-blocks/cdn.md)
- ✅ [Message queues & pub/sub](./building-blocks/message-queues.md)
- ✅ [Rate limiting](./building-blocks/rate-limiting.md)
- ✅ [Consistent hashing](./building-blocks/consistent-hashing.md)
- ✅ [Authentication & authorization](./building-blocks/authentication-authorization.md) — sessions vs JWT, OAuth2/OIDC, where auth lives, RBAC/ABAC

## Data & Storage
- ✅ [SQL vs NoSQL](./data-storage/sql-vs-nosql.md)
  - ✅ [Apache Cassandra — deep-dive](./data-storage/cassandra.md) *(wide-column NoSQL example)*
- ✅ [Database replication](./data-storage/replication.md)
- ✅ [Sharding & partitioning](./data-storage/sharding.md)
- ✅ [Indexing & query performance](./data-storage/indexing.md)
- ✅ [Object & blob storage](./data-storage/object-storage.md)
- ✅ [Search engines (inverted index)](./data-storage/search.md)

## Communication
- ✅ [REST API design](./communication/rest.md)
- ✅ [gRPC & RPC](./communication/grpc.md)
- ✅ [GraphQL](./communication/graphql.md)
- ✅ [WebSockets & long polling](./communication/realtime.md)
- ✅ [Sync vs async communication](./communication/sync-vs-async.md)

## Architecture Patterns
- ✅ [Monolith vs microservices](./patterns/monolith-vs-microservices.md)
- ✅ [Event-driven architecture](./patterns/event-driven.md)
- ✅ [CQRS & event sourcing](./patterns/cqrs-event-sourcing.md)
- ✅ [Saga pattern](./patterns/saga.md)
- ✅ [Circuit breaker & bulkhead](./patterns/resilience-patterns.md)

## Reliability & Operations
- ✅ [Redundancy & failover](./reliability/redundancy-failover.md)
- ✅ [Monitoring, logging & observability](./reliability/observability.md)
- ✅ [Disaster recovery & backups](./reliability/disaster-recovery.md)
- ✅ [Capacity planning](./reliability/capacity-planning.md)
