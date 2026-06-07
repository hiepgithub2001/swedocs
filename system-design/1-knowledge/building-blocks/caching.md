# Caching Strategies

> A cache is a fast, temporary store of frequently accessed data, placed close to the
> consumer to cut latency and reduce load on the source of truth.

## Problem
Databases and downstream services are slow and expensive relative to memory. If the
same data is read often, recomputing or refetching it every time wastes time and
capacity. Caching trades a little staleness for a lot of speed.

## Core concepts

**Where caches live (every layer)**
- Browser / client cache → CDN → reverse-proxy cache → application cache (in-memory) →
  distributed cache (Redis/Memcached) → database buffer cache.

**Read strategies**
- **Cache-aside (lazy loading)** — app checks cache; on miss, reads DB and populates
  cache. Most common. Cache only holds what's actually requested.
- **Read-through** — the cache library fetches from DB on a miss transparently.

**Write strategies**
- **Write-through** — write to cache *and* DB synchronously. Cache always fresh,
  writes slower.
- **Write-back (write-behind)** — write to cache, flush to DB async. Fast writes, risk
  of data loss if cache dies before flush.
- **Write-around** — write straight to DB, skip cache. Avoids caching write-only data.

```mermaid
flowchart LR
    App -->|1 read| Cache{Hit?}
    Cache -->|hit| App
    Cache -->|miss| DB[(Database)]
    DB -->|2 populate| Cache
```

**Eviction policies** — when full, what to drop: **LRU** (least recently used, common),
LFU, FIFO, TTL-based expiry.

**The classic problems**
- **Stale data** — cache and DB disagree → use TTLs and/or invalidation on write.
- **Cache stampede / thundering herd** — a hot key expires and thousands of requests
  hit the DB at once → mitigate with locks, request coalescing, or staggered TTLs.
- **Hot keys** — one key gets disproportionate traffic → replicate or shard it.

## Example — cache-aside in practice
A product page reads `product:42`. With **cache-aside** (the most common pattern):

```python
def get_product(pid):
    key = f"product:{pid}"
    cached = redis.get(key)
    if cached:                       # HIT — ~0.5 ms
        return json.loads(cached)
    row = db.query("SELECT ... WHERE id=%s", pid)   # MISS — ~20 ms
    redis.setex(key, 300, json.dumps(row))          # populate, TTL 300 s
    return row
```
With a 95% hit rate, average read latency ≈ `0.95 × 0.5ms + 0.05 × 20ms ≈ 1.5 ms`
(vs 20 ms uncached) **and** ~95% fewer DB queries. On update, invalidate:
`db.update(...); redis.delete("product:42")`.

Hands-on: [caching practice project](../../3-practice/project-scalable-web-service.md).

## Common tools
| Tool | Type | Use it for |
| --- | --- | --- |
| **Redis** | In-memory data store (rich types, persistence, pub/sub) | the default distributed cache; sessions, leaderboards, rate-limit counters |
| **Memcached** | In-memory KV (simple, multithreaded) | pure, huge-scale string/object caching with minimal features |
| **Caffeine** (Java) / **`functools.lru_cache`** (Python) | In-process cache | per-instance hot data, microcaching |
| **Varnish** / **Nginx `proxy_cache`** | Reverse-proxy HTTP cache | caching rendered pages / API responses at the edge of your app |
| **CDN** (CloudFront, Cloudflare, Fastly) | Edge cache | static assets, media, cacheable API responses (see [CDN](./cdn.md)) |
| **AWS ElastiCache** / GCP **Memorystore** | Managed Redis/Memcached | production cache tier without ops |
| **DynamoDB DAX** | In-memory cache for DynamoDB | microsecond reads in front of DynamoDB |

> Rule of thumb: **Redis** unless you have a specific reason. Reach for Memcached for the
> simplest, largest pure-cache workloads; an in-process cache for per-instance hot data.

## Trade-offs
- More caching = faster + cheaper reads, but more **staleness** and **invalidation
  complexity** ("there are only two hard things… cache invalidation").
- Write-back is fastest but least durable; write-through is safest but slower.

## Real-world examples
- **Reddit** caches rendered listings/comment trees in Memcached to absorb read spikes.
- **Facebook** runs one of the largest Memcached deployments (with leases to fight
  stampedes).
- **Netflix EVCache** (Memcached-based) caches viewing data at massive scale.
- **CDNs** cache static assets at the edge (see [CDN](./cdn.md)).

## References
- [Redis caching patterns](https://redis.io/docs/manual/patterns/)
- [Facebook — Scaling Memcache (NSDI '13)](https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf)
- *Designing Data-Intensive Applications* — Kleppmann
