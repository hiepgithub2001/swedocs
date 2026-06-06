# AWS Lab: Caching with ElastiCache for Redis

> Stand up a managed Redis cluster and use it as a cache-aside store from an EC2 app —
> the managed version of the [Redis caching lab](../caching-redis.md).

> ⚠️ Costs: ElastiCache nodes bill per hour; pick `cache.t3.micro`. Tear down when done.

## Goal
Connect to a managed Redis endpoint and confirm cache-aside behavior (slow miss → fast
hit), without running/operating Redis yourself.

## Prerequisites
- AWS CLI; a VPC; an EC2 instance (`t3.micro`) in the same VPC to act as the client
  (ElastiCache is **not** publicly reachable — you connect from inside the VPC).

## Setup
1. **Create a Redis cluster** (single node for the lab):
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id lab-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --security-group-ids <sg-id>
```
2. The SG must allow inbound **TCP 6379** from your EC2 instance's SG.
3. Get the endpoint:
```bash
aws elasticache describe-cache-clusters --cache-cluster-id lab-redis \
  --show-cache-node-info \
  --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" --output text
```

## Steps
From the EC2 instance (same VPC):
```bash
sudo dnf install -y redis6           # redis-cli
REDIS=<endpoint-from-above>

redis-cli -h $REDIS set item:42 '{"id":42,"name":"Item 42"}' EX 30
redis-cli -h $REDIS get item:42
redis-cli -h $REDIS ttl item:42
```
Or point the [caching-redis lab](../caching-redis.md) app at `$REDIS` instead of a local
container and compare miss vs hit latency.

## Expected result
- `get item:42` returns the cached JSON; `ttl` counts down from 30 and the key expires.
- Reads from the managed endpoint are single-digit milliseconds within the VPC.

## Teardown
```bash
aws elasticache delete-cache-cluster --cache-cluster-id lab-redis
# also terminate the client EC2 instance if it was just for this lab
```

## Notes
- ElastiCache gives you managed failover, replicas, and backups — the operational work
  you'd otherwise do yourself.
- Same patterns apply: cache-aside, TTLs, eviction (LRU), watch for hot keys/stampedes.
- Related: [Caching strategies](../../1-knowledge/building-blocks/caching.md).
