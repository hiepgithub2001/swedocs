# System Design · Part 3 — Practice

Hands-on labs. Each lab gives you a **simple local setup** (usually Docker) and
**full step-by-step flows** to test a concept and see it work. Each follows the
[practice template](./_TEMPLATE.md).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## Labs
- ⬜ [Load balancing with Nginx (round-robin across 3 nodes)](./load-balancing-nginx.md)
- ⬜ [Caching with Redis (cache-aside, measure latency)](./caching-redis.md)
- ⬜ [Rate limiting with Redis (token bucket)](./rate-limiting-redis.md)
- ⬜ [PostgreSQL primary–replica replication](./postgres-replication.md)
- ⬜ [Sharding data across multiple databases](./sharding-demo.md)
- ⬜ [Message queue with Kafka (producer/consumer)](./kafka-pubsub.md)
- ⬜ [Consistent hashing (visualize key distribution)](./consistent-hashing-lab.md)
- ⬜ [API gateway with Nginx (routing + rate limit)](./api-gateway-nginx.md)

## What each lab contains
1. **Goal** — the concept you'll prove
2. **Prerequisites** — Docker / tools needed
3. **Setup** — copy-paste commands / compose file
4. **Steps** — run it, send traffic, observe behavior
5. **Expected result** — what success looks like
6. **Teardown** — clean up
