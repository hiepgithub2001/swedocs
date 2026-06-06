# Practice Lab: Sharding Data Across Databases

> Split data across two database shards by a shard key and route reads/writes to the
> right shard.

## Goal
Run two Postgres shards and a tiny router that sends each record to a shard based on
`hash(key) % 2`. See data land on different shards and reads go to the correct one.

## Prerequisites
- Docker + Docker Compose, Python 3.

## Setup
Create `docker-compose.yml`:
```yaml
services:
  shard0:
    image: postgres:16-alpine
    environment: { POSTGRES_PASSWORD: pass, POSTGRES_DB: shard }
    ports: [ "5440:5432" ]
  shard1:
    image: postgres:16-alpine
    environment: { POSTGRES_PASSWORD: pass, POSTGRES_DB: shard }
    ports: [ "5441:5432" ]
```

```bash
docker compose up -d
sleep 5
# create the same table on both shards
for p in 5440 5441; do
  PGPASSWORD=pass psql -h localhost -p $p -U postgres -d shard \
    -c "CREATE TABLE users(id int primary key, name text);"
done
```

Create `router.py`:
```python
import sys, psycopg2
SHARDS = {0: 5440, 1: 5441}
def conn(port):
    return psycopg2.connect(host="localhost", port=port, user="postgres",
                            password="pass", dbname="shard")
def shard_for(user_id):
    return user_id % 2                      # hash-based routing
def put(user_id, name):
    s = shard_for(user_id); c = conn(SHARDS[s])
    cur = c.cursor()
    cur.execute("INSERT INTO users VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (user_id, name))
    c.commit(); print(f"user {user_id} -> shard {s}")
def get(user_id):
    s = shard_for(user_id); c = conn(SHARDS[s]); cur = c.cursor()
    cur.execute("SELECT * FROM users WHERE id=%s", (user_id,))
    print(f"shard {s}: {cur.fetchone()}")
```

## Steps
```bash
pip install psycopg2-binary -q
python -c "import router; [router.put(i, f'user{i}') for i in range(1,7)]"
# Verify each shard holds only its half
PGPASSWORD=pass psql -h localhost -p 5440 -U postgres -d shard -c "SELECT id FROM users ORDER BY id;"  # even ids
PGPASSWORD=pass psql -h localhost -p 5441 -U postgres -d shard -c "SELECT id FROM users ORDER BY id;"  # odd ids
python -c "import router; router.get(3); router.get(4)"
```

## Expected result
- Even IDs land on shard0, odd IDs on shard1.
- `get(3)` reads from shard1, `get(4)` from shard0 — the router computes the same shard
  for reads and writes.

## Teardown
```bash
docker compose down -v
```

## Notes
- `% N` breaks when you add shards (almost everything remaps) → real systems use
  **consistent hashing** (next lab).
- Cross-shard queries (e.g. "all users") must hit **both** shards and merge.
- Related knowledge: [Sharding & partitioning](../1-knowledge/data-storage/sharding.md).
