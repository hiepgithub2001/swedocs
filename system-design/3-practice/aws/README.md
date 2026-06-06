# System Design · Part 3 — Practice · AWS Track

The local Docker labs teach a concept on your laptop for free. This **AWS track**
implements the same concepts with **managed AWS services** — the way you'd actually run
them in production.

> ⚠️ **These labs use real AWS resources and can cost money.** Read
> [setup-and-costs](./setup-and-costs.md) first, stay in the **Free Tier** where
> possible, set a **billing alarm**, and **always run the teardown** at the end.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## Labs (concept → AWS service)
- ✅ [Setup, cost safety & teardown discipline](./setup-and-costs.md)
- ✅ [Load balancing → Application Load Balancer (ALB)](./load-balancing-alb.md)
- ✅ [Caching → ElastiCache for Redis](./caching-elasticache.md)
- ✅ [Object storage + CDN → S3 + CloudFront](./object-storage-s3-cloudfront.md)
- ✅ [Queues & pub/sub → SQS + SNS](./queue-sqs-sns.md)
- ✅ [Replication → RDS Multi-AZ & read replicas](./rds-replication.md)
- ✅ [Partitioning → DynamoDB partition keys](./dynamodb-partitioning.md)
- ✅ [API gateway + rate limiting → API Gateway + Lambda](./api-gateway-lambda.md)

## How concepts map to AWS

| Concept (Knowledge) | AWS managed service |
| --- | --- |
| Load balancer | Elastic Load Balancing (ALB / NLB) |
| Caching | ElastiCache (Redis / Memcached) |
| CDN | CloudFront |
| Object storage | S3 |
| Message queue | SQS |
| Pub/Sub | SNS / EventBridge |
| Relational DB + replication | RDS / Aurora |
| Key-value / partitioning | DynamoDB |
| API gateway | API Gateway |
| Compute | EC2 / ECS / Lambda |
| DNS | Route 53 |
| Monitoring | CloudWatch |
