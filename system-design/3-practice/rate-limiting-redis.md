# Practice Lab: Rate Limiting with Redis (Token Bucket)

> Implement a distributed token-bucket rate limiter in Redis and watch it reject
> requests past the limit.

## Goal
Allow N requests per window per client; return `429` when exceeded. See the limit hold
even though counters live in shared Redis (so it works across many app instances).

## Prerequisites
- Docker + Docker Compose.

## Setup
Create `app.py` (fixed-window counter via atomic INCR — simple and correct):
```python
import redis
from flask import Flask, request
app = Flask(__name__)
r = redis.Redis(host="redis", port=6379)

LIMIT = 5        # requests
WINDOW = 10      # seconds

@app.get("/")
def index():
    client = request.remote_addr
    key = f"rl:{client}"
    count = r.incr(key)            # atomic increment
    if count == 1:
        r.expire(key, WINDOW)      # start the window on first hit
    if count > LIMIT:
        return {"error": "rate limited"}, 429
    return {"ok": True, "count": count}
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
# Fire 8 requests quickly. First 5 -> 200, next 3 -> 429.
for i in $(seq 1 8); do
  curl -s -o /dev/null -w "%{http_code}\n" localhost:5000/
done

# Wait for the window to reset, then it works again
sleep 10
curl -s -w "\n%{http_code}\n" localhost:5000/
```

## Expected result
- First 5 requests return `200` with an increasing count.
- Requests 6–8 return `429`.
- After 10s the window resets and requests succeed again.

## Teardown
```bash
docker compose down
```

## Notes
- Because the counter is in Redis, running multiple app replicas still shares one limit.
- For burst tolerance, implement **token bucket** (store `tokens` + `last_refill`) via a
  Lua script for atomicity.
- Related knowledge: [Rate limiting](../1-knowledge/building-blocks/rate-limiting.md) ·
  [Rate limiter case study](../2-case-studies/rate-limiter.md).
