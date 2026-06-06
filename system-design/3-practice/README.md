# System Design · Part 3 — Practice

Hands-on labs. **Each lab is one concept** taught with a **simple setup**, and — where it
makes sense — covers **both how to run it locally (Docker) and how it's done on AWS**, so
you learn the concept *and* both the self-hosted and managed-cloud ways to operate it.

> 🔀 **Mixed by design:** we don't prove the same concept twice (once local, once cloud).
> A lab uses whatever best teaches it — usually a quick **local** setup to see the
> mechanism, plus the **AWS** managed equivalent and when you'd choose it.

> ☁️ Before any AWS steps, read [AWS setup, cost safety & teardown](./aws/setup-and-costs.md).

> Legend: ✅ written · 🚧 in progress · ⬜ not started · 🐳 has local setup · ☁️ has AWS setup

## A. Core building blocks
- ⬜ [Load balancing & health checks](./load-balancing.md) 🐳 Nginx/HAProxy · ☁️ ALB/NLB
- ⬜ [Caching (cache-aside, TTL, eviction, stampede)](./caching.md) 🐳 Redis · ☁️ ElastiCache
- ⬜ [Rate limiting (token bucket, sliding window)](./rate-limiting.md) 🐳 Redis · ☁️ API Gateway/WAF
- ⬜ [API gateway (routing, auth, throttling)](./api-gateway.md) 🐳 Nginx/Kong · ☁️ API Gateway
- ⬜ [CDN & static assets](./cdn-static-assets.md) 🐳 MinIO+Nginx · ☁️ S3 + CloudFront
- ⬜ [Message queues & pub/sub](./messaging.md) 🐳 Kafka/RabbitMQ · ☁️ SQS/SNS/MSK

## B. Data & storage
- ⬜ [SQL replication & failover](./sql-replication.md) 🐳 Postgres primary/replica · ☁️ RDS Multi-AZ
- ⬜ [Sharding & partitioning](./sharding.md) 🐳 Postgres router/Citus · ☁️ DynamoDB/Vitess
- ⬜ [Key-value / NoSQL modeling](./key-value-nosql.md) 🐳 Cassandra/ScyllaDB · ☁️ DynamoDB
- ⬜ [Consistent hashing](./consistent-hashing.md) 🐳 Python sim · ☁️ how Cassandra/DynamoDB use it
- ⬜ [Object storage](./object-storage.md) 🐳 MinIO (S3-compatible) · ☁️ S3
- ⬜ [Indexing & query performance](./indexing.md) 🐳 Postgres `EXPLAIN` · ☁️ RDS Performance Insights
- ⬜ [Full-text search](./search.md) 🐳 OpenSearch · ☁️ OpenSearch Service
- ⬜ [Change data capture (CDC)](./cdc.md) 🐳 Debezium + Kafka · ☁️ DMS / DynamoDB Streams

## C. Reliability & operations
- ⬜ [Observability: metrics, logs, traces](./observability.md) 🐳 Prometheus+Grafana+Jaeger (OTel) · ☁️ CloudWatch/X-Ray
- ⬜ [Autoscaling](./autoscaling.md) 🐳 k8s HPA / compose scale · ☁️ ASG / ECS autoscaling
- ⬜ [Health checks, failover & Multi-AZ](./failover.md) 🐳 keepalived · ☁️ Route 53 health checks / Multi-AZ
- ⬜ [Deployment strategies (blue-green, canary)](./deployments.md) 🐳 Nginx weighted · ☁️ CodeDeploy / ALB weighted
- ⬜ [Containers & orchestration](./containers-orchestration.md) 🐳 Docker → kind/k8s · ☁️ ECS/EKS

## D. Patterns
- ⬜ [Event-driven async processing](./event-driven.md) 🐳 queue + workers · ☁️ SQS + Lambda
- ⬜ [Saga / distributed transactions](./saga.md) 🐳 orchestrator + services · ☁️ Step Functions
- ⬜ [Resilience: circuit breaker, retries, bulkhead](./resilience.md) 🐳 resilience4j/Envoy · ☁️ App Mesh
- ⬜ [Idempotency & exactly-once handling](./idempotency.md) 🐳 dedup store · ☁️ SQS FIFO

## E. End-to-end mini-projects
- ⬜ [Build & deploy a URL shortener](./project-url-shortener.md) 🐳 full stack → ☁️ deploy on AWS
- ⬜ [Build a notification service](./project-notification-service.md) 🐳 local → ☁️ SNS/SQS

---

## What each lab contains
1. **What you'll learn** + ⏱️ time / 💰 cost / tooling badges
2. **Lab architecture** — a diagram
3. **Local setup** — copy-paste Docker setup to see the mechanism (free)
4. **AWS setup** — the managed equivalent + when to choose it (cost + teardown notes)
5. **Run it** — steps to send traffic / trigger behavior
6. **What to observe & why** — the mechanism under the hood
7. **Experiments to try** + **common pitfalls**
8. **In the real world** — the common production pattern (who uses what, at scale)
9. **Connect to theory** — links to the [Knowledge](../1-knowledge/) and
   [Case Study](../2-case-studies/) docs

> Not every lab has both tracks — some concepts are best shown locally (e.g. consistent
> hashing), others only make sense managed (e.g. CloudFront). The badges show which
> apply.
