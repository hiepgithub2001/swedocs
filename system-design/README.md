# System Design — Catalog

The catalog of system design knowledge. Topics are grouped from fundamentals →
building blocks → patterns → real-world case studies. Check items off as we write
them.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

---

## 1. Fundamentals
- ⬜ [What is system design](./fundamentals/what-is-system-design.md)
- ⬜ [Scalability: vertical vs horizontal](./fundamentals/scalability.md)
- ⬜ [Latency, throughput & response time](./fundamentals/latency-throughput.md)
- ⬜ [Availability, reliability & fault tolerance](./fundamentals/availability-reliability.md)
- ⬜ [CAP theorem](./fundamentals/cap-theorem.md)
- ⬜ [Consistency models (strong, eventual, causal)](./fundamentals/consistency-models.md)
- ⬜ [Back-of-the-envelope estimation](./fundamentals/estimation.md)
- ⬜ [SLA, SLO, SLI](./fundamentals/sla-slo-sli.md)

## 2. Building Blocks
- ⬜ [DNS & how a request travels](./building-blocks/dns-request-lifecycle.md)
- ⬜ [Load balancers (L4/L7, algorithms)](./building-blocks/load-balancers.md)
- ⬜ [Reverse proxies & API gateways](./building-blocks/proxies-gateways.md)
- ⬜ [Caching (client, CDN, server, cache strategies)](./building-blocks/caching.md)
- ⬜ [Content Delivery Networks (CDN)](./building-blocks/cdn.md)
- ⬜ [Message queues & pub/sub](./building-blocks/message-queues.md)
- ⬜ [Rate limiting](./building-blocks/rate-limiting.md)
- ⬜ [Consistent hashing](./building-blocks/consistent-hashing.md)

## 3. Data & Storage
- ⬜ [SQL vs NoSQL: choosing a database](./data-storage/sql-vs-nosql.md)
- ⬜ [Database replication](./data-storage/replication.md)
- ⬜ [Database sharding & partitioning](./data-storage/sharding.md)
- ⬜ [Indexing & query performance](./data-storage/indexing.md)
- ⬜ [Object & blob storage](./data-storage/object-storage.md)
- ⬜ [Search engines (inverted index, Elasticsearch)](./data-storage/search.md)
- ⬜ [Data warehouse vs data lake](./data-storage/warehouse-lake.md)

## 4. Communication
- ⬜ [REST API design](./communication/rest.md)
- ⬜ [gRPC & RPC](./communication/grpc.md)
- ⬜ [GraphQL](./communication/graphql.md)
- ⬜ [WebSockets & long polling](./communication/realtime.md)
- ⬜ [Synchronous vs asynchronous communication](./communication/sync-vs-async.md)

## 5. Architecture Patterns
- ⬜ [Monolith vs microservices](./patterns/monolith-vs-microservices.md)
- ⬜ [Event-driven architecture](./patterns/event-driven.md)
- ⬜ [CQRS & event sourcing](./patterns/cqrs-event-sourcing.md)
- ⬜ [Saga pattern (distributed transactions)](./patterns/saga.md)
- ⬜ [Circuit breaker & bulkhead](./patterns/resilience-patterns.md)

## 6. Reliability & Operations
- ⬜ [Redundancy & failover](./reliability/redundancy-failover.md)
- ⬜ [Monitoring, logging & observability](./reliability/observability.md)
- ⬜ [Disaster recovery & backups](./reliability/disaster-recovery.md)
- ⬜ [Capacity planning](./reliability/capacity-planning.md)

## 7. Case Studies
- ⬜ [Design a URL shortener](./case-studies/url-shortener.md)
- ⬜ [Design a rate limiter](./case-studies/rate-limiter.md)
- ⬜ [Design a news feed (Twitter/Facebook)](./case-studies/news-feed.md)
- ⬜ [Design a chat system (WhatsApp)](./case-studies/chat-system.md)
- ⬜ [Design a notification system](./case-studies/notification-system.md)
- ⬜ [Design a video streaming service (YouTube)](./case-studies/video-streaming.md)
- ⬜ [Design a ride-sharing service (Uber)](./case-studies/ride-sharing.md)

---

## How we write a topic
Each topic file should cover:
1. **Problem** — what it solves / why it matters
2. **Core concepts** — the key ideas, with a Mermaid diagram where useful
3. **Trade-offs** — pros, cons, when to use / avoid
4. **Real-world examples** — how big systems apply it
5. **References** — links to go deeper
