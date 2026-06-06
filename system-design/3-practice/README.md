# System Design · Part 3 — Practice

Hands-on labs. Each lab gives you a **simple setup** and **full step-by-step flows** to
test a concept and see it work. There are two tracks:

- **🐳 Local track** — Docker on your laptop. Free, fast, great for understanding the
  raw concept. Each follows the [practice template](./_TEMPLATE.md).
- **☁️ AWS track** — the same concepts on managed AWS services, the way you'd run them
  in production. See [`aws/`](./aws/) — **read [setup-and-costs](./aws/setup-and-costs.md)
  first** and always tear down.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## 🐳 Local labs (Docker)
- ✅ [Load balancing with Nginx (round-robin across 3 nodes)](./load-balancing-nginx.md)
- ✅ [Caching with Redis (cache-aside, measure latency)](./caching-redis.md)
- ✅ [Rate limiting with Redis (token bucket)](./rate-limiting-redis.md)
- ✅ [PostgreSQL primary–replica replication](./postgres-replication.md)
- ✅ [Sharding data across multiple databases](./sharding-demo.md)
- ✅ [Message queue with Kafka (producer/consumer)](./kafka-pubsub.md)
- ✅ [Consistent hashing (visualize key distribution)](./consistent-hashing-lab.md)
- ✅ [API gateway with Nginx (routing + rate limit)](./api-gateway-nginx.md)

## ☁️ AWS track — [full catalog »](./aws/)
- ✅ [Setup, cost safety & teardown](./aws/setup-and-costs.md)
- ✅ [Load balancing → Application Load Balancer](./aws/load-balancing-alb.md)
- ✅ [Caching → ElastiCache for Redis](./aws/caching-elasticache.md)
- ✅ [Object storage + CDN → S3 + CloudFront](./aws/object-storage-s3-cloudfront.md)
- ✅ [Queues & pub/sub → SQS + SNS](./aws/queue-sqs-sns.md)
- ✅ [Replication → RDS read replica & Multi-AZ](./aws/rds-replication.md)
- ✅ [Partitioning → DynamoDB partition keys](./aws/dynamodb-partitioning.md)
- ✅ [API gateway + rate limiting → API Gateway + Lambda](./aws/api-gateway-lambda.md)

## What each lab contains
1. **Goal** — the concept you'll prove
2. **Prerequisites** — Docker / AWS / tools needed
3. **Setup** — copy-paste commands / compose file
4. **Steps** — run it, send traffic, observe behavior
5. **Expected result** — what success looks like
6. **Teardown** — clean up (especially important on AWS to avoid charges)
