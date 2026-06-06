# System Design · Part 3 — Practice

**Practice = build small working systems that connect the pieces together.**

Instead of isolated single-concept labs, each project builds a scaled-down but *complete*
system — a streaming pipeline, a video service, an event-driven workflow — so you see how
load balancers, queues, caches, stores, and workers **fit together**. Every project mirrors
a real-world pattern or a [Part 2 case study](../2-case-studies/), built **locally first
(🐳 Docker Compose)** and then **deployed/scaled on AWS (☁️)** where it adds value.

> 🧩 The goal is **connection**, not isolated proofs. You'll wire multiple building blocks
> into one running system and watch data flow end-to-end.
> ☁️ Before any AWS steps, read [AWS setup, cost safety & teardown](./aws/setup-and-costs.md).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## A. Streaming & event-driven (start here)
- ✅ [Event-driven order processing](./project-event-driven-orders.md)
  — API → queue → workers → DB → notifications. *Connects:* API gateway, message queue,
  async workers, idempotency, DLQ, eventual consistency.
- ✅ [Real-time streaming data pipeline](./project-streaming-data.md)
  — events → Kafka → stream processor → store → live dashboard. *Connects:* ingestion,
  stream processing, windowing, OLAP store, real-time analytics.
- ✅ [Video streaming (VOD)](./project-video-streaming.md)
  — upload → object storage → transcode workers → HLS segments → CDN → adaptive player.
  *Connects:* object storage, async pipeline, CDN, adaptive bitrate.
- ⬜ [CDC → search index sync](./project-cdc-search.md)
  — Postgres → Debezium → Kafka → OpenSearch. *Connects:* change data capture, streaming,
  search indexing, eventual consistency.

## B. Build-a-product (mini case studies)
- ✅ [URL shortener, end to end](./project-url-shortener.md)
  — write API + key-gen + cache + redirect + async analytics. *Connects:* KV store,
  caching, rate limiting, streaming analytics.
- ✅ [News feed](./project-news-feed.md)
  — post service → fan-out workers → feed cache → feed API. *Connects:* fan-out push/pull,
  caching, queues, ranking.
- ✅ [Real-time chat](./project-chat.md)
  — WebSocket gateway → presence → message store → fan-out. *Connects:* persistent
  connections, pub/sub, presence, session routing.
- ✅ [Multi-channel notification service](./project-notification-service.md)
  — API → per-channel queues → workers → providers, with prefs + dedup. *Connects:*
  fan-out, retries/DLQ, idempotency, priority lanes.
- ✅ [Image upload & processing](./project-image-processing.md)
  — presigned upload → object storage → event → thumbnail workers → CDN. *Connects:*
  object storage, event-driven, CDN.

## C. Scale & resilience (built on the projects above)
- ✅ [Scalable web service](./project-scalable-web-service.md)
  — load balancer → stateless app → cache → replicated DB. *Connects:* load balancing,
  caching, read replicas, health checks, statelessness.
- ✅ [Saga / distributed transaction](./project-saga.md)
  — order + payment + inventory with orchestration + compensation. *Connects:*
  microservices, saga, events, idempotency.
- ⬜ [Make a service resilient](./project-resilience.md)
  — add circuit breaker, retries, rate limiting, graceful degradation to a project.
  *Connects:* resilience patterns, load shedding.

## D. Cross-cutting (apply to any project above)
- ⬜ [Observability: metrics, logs, traces](./cross-observability.md)
  — instrument a project with Prometheus + Grafana + Jaeger (OTel) → CloudWatch / X-Ray.
- ⬜ [Autoscaling & load testing](./cross-autoscaling.md)
  — drive a project with k6, then scale it (compose/k8s HPA → ASG / ECS).

---

## What each project contains
1. **What you'll build** — the mini-system + an architecture diagram of the wired pieces
2. **Concepts you connect** — links to the [Knowledge](../1-knowledge/) and
   [Case Study](../2-case-studies/) docs each piece comes from
3. **Build it locally (🐳)** — a Docker Compose stack wiring the components together
4. **Run the end-to-end flow** — push data in one end, watch it move through every component
5. **Deploy / scale on AWS (☁️)** — the managed equivalent of each component + when to use it
6. **Observe & break it** — see the data flow, then kill a component and watch the system cope
7. **Extend it** — concrete next features that add another building block
8. **Mirrors** — the real-world system / case study this scales down

> Philosophy: a building block only makes sense in context. You'll *set up* Redis, Kafka,
> Postgres, object storage, etc. — but always **as part of a working system**, both locally
> and on AWS.
