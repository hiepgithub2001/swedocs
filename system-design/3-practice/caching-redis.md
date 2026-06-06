# Practice Lab: Caching with Redis (Cache-Aside)

> Measure how a cache turns a slow data source into fast responses, using the
> cache-aside pattern.

## Goal
Build a tiny API backed by a deliberately "slow" data source. Add Redis cache-aside and
measure the latency difference between a cache miss and a cache hit.

## Prerequisites
- Docker + Docker Compose.

## Setup
Create `app.py`:
```python
import time, redis, json
from flask import Flask
app = Flask(__name__)
cache = redis.Redis(host="redis", port=6379)

def slow_db_lookup(item_id):
    time.sleep(1)               # pretend the DB is slow
    return {"id": item_id, "name": f"Item {item_id}"}

@app.get("/items/<item_id>")
def get_item(item_id):
    cached = cache.get(item_id)          # 1. check cache
    if cached:
        return {"source": "cache", "data": json.loads(cached)}
    data = slow_db_lookup(item_id)       # 2. miss -> read source
    cache.setex(item_id, 30, json.dumps(data))  # 3. populate (TTL 30s)
    return {"source": "db", "data": data}
```

Create `docker-compose.yml`:
```yaml
services:
  redis: { image: redis:7-alpine }
  app:
    image: python:3.12-slim
    working_dir: /app
    volumes: [ "./app.py:/app/app.py" ]
    command: sh -c "pip install flask redis -q && flask run --host 0.0.0.0"
    ports: [ "5000:5000" ]
    depends_on: [ redis ]
```

```bash
docker compose up -d
```

## Steps
```bash
# First call -> cache miss (slow, ~1s, source: db)
time curl -s localhost:5000/items/42

# Second call -> cache hit (fast, source: cache)
time curl -s localhost:5000/items/42

# Inspect the key in Redis
docker compose exec redis redis-cli get 42
docker compose exec redis redis-cli ttl 42
```

## Expected result
- First request: `"source":"db"`, ~1000 ms.
- Second request: `"source":"cache"`, a few ms.
- `ttl 42` shows the countdown; after 30s the next read is a miss again.

## Teardown
```bash
docker compose down
```

## Notes
- Try changing `setex` TTL and observe staleness vs freshness.
- Related knowledge: [Caching strategies](../1-knowledge/building-blocks/caching.md).
