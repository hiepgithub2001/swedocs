# Practice Lab: Sharding Data Across Databases

> Split data across two database shards by a shard key and route reads/writes to the
> right shard — the core technique behind horizontally-scaled databases.

## What you'll learn
- How **horizontal partitioning (sharding)** spreads data across independent databases.
- How a **shard key + routing function** decides where each row lives.
- Why **cross-shard queries** are hard, and why **`% N`** routing breaks when you add a
  shard.
- The hands-on version of [Sharding & partitioning](../1-knowledge/data-storage/sharding.md).

⏱️ ~15 minutes · 💰 free · 🐳 Docker + Python

## Lab architecture
```mermaid
flowchart LR
    App --> R{router: hash(user_id) % 2}
    R -->|even| S0[(shard0 :5440)]
    R -->|odd| S1[(shard1 :5441)]
```

## Prerequisites
- Docker + Docker Compose, Python 3, ports `5440`/`5441` free.

## Setup

**1. `docker-compose.yml`** — two independent Postgres shards:
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
# same table on BOTH shards
for p in 5440 5441; do
  PGPASSWORD=pass psql -h localhost -p $p -U postgres -d shard \
    -c "CREATE TABLE users(id int primary key, name text);"
done
```

**2. `router.py`** — the shard router:
```python
import psycopg2
SHARDS = {0: 5440, 1: 5441}
def conn(port):
    return psycopg2.connect(host="localhost", port=port, user="postgres",
                            password="pass", dbname="shard")
def shard_for(user_id):
    return user_id % 2                       # routing function (hash-based)
def put(user_id, name):
    s = shard_for(user_id); c = conn(SHARDS[s]); cur = c.cursor()
    cur.execute("INSERT INTO users VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (user_id, name))
    c.commit(); print(f"user {user_id} -> shard {s}")
def get(user_id):
    s = shard_for(user_id); c = conn(SHARDS[s]); cur = c.cursor()
    cur.execute("SELECT * FROM users WHERE id=%s", (user_id,))
    print(f"shard {s}: {cur.fetchone()}")
```

## Run it
```bash
pip install psycopg2-binary -q
python -c "import router; [router.put(i, f'user{i}') for i in range(1,7)]"

# Verify each shard holds only its half
echo '--- shard0 (even) ---'; PGPASSWORD=pass psql -h localhost -p 5440 -U postgres -d shard -c "SELECT id FROM users ORDER BY id;"
echo '--- shard1 (odd)  ---'; PGPASSWORD=pass psql -h localhost -p 5441 -U postgres -d shard -c "SELECT id FROM users ORDER BY id;"

python -c "import router; router.get(3); router.get(4)"
```

## What to observe & why
- Even IDs land on **shard0**, odd IDs on **shard1** — the router sends each row to the
  shard its key hashes to, so each shard stores only **half** the data and handles half
  the write load. That's how you scale **writes** beyond one machine (which replication
  alone can't do).
- `get(3)` reads from shard1 and `get(4)` from shard0 — reads use the **same** routing
  function as writes, so a single-key lookup hits exactly one shard.

## Sample expected output
```
user 1 -> shard 1
user 2 -> shard 0
...
--- shard0 (even) ---  id: 2,4,6
--- shard1 (odd)  ---  id: 1,3,5
shard 1: (3, 'user3')
shard 0: (4, 'user4')
```

## Experiments to try
1. **Cross-shard query pain:** write a "list ALL users sorted by id" — you must query
   **both** shards and merge in app code (scatter-gather). Notice there's no single
   `ORDER BY` across shards.
2. **The `% N` resharding problem:** add a `shard2` and change `% 2` to `% 3`. Recompute
   `shard_for` for ids 1–6 and count how many now map to a *different* shard — most of
   them. This is why modulo sharding is painful to grow and why real systems use
   **consistent hashing** (see [that lab](./consistent-hashing-lab.md)).
3. **Bad shard key:** route by `len(name) % 2` or a low-cardinality field and watch data
   pile onto one shard (a **hot shard**).

## Common pitfalls
- **Cross-shard JOINs/transactions** are hard — you lose single-DB ACID across shards and
  may need a [saga](../1-knowledge/patterns/saga.md).
- **Choosing the shard key is the critical decision** — it must spread load evenly and
  keep data you query together on one shard.
- **Celebrity/hot keys** still overload a single shard even with good hashing.

## Teardown
```bash
docker compose down -v
```

## In the real world (common production pattern)
- Most teams **start with one database + read replicas** and only shard when writes/data
  outgrow a single primary — sharding adds real complexity, so it's a deliberate step.
- **Managed/auto-sharding datastores:** **MongoDB**, **Cassandra**, **DynamoDB** shard
  automatically by a partition key (you just pick a good key). **Vitess** shards MySQL
  behind a router (used by YouTube, Slack); **Citus** shards Postgres.
- **Routing layer:** a proxy/router (or the client driver) maps shard key → shard, often
  with **consistent hashing** so adding capacity moves few keys.
- **Each shard is itself replicated** (sharding for scale + replication for availability).
- **ID design matters:** e.g. [Instagram embeds the shard id in its 64-bit
  IDs](../2-case-studies/companies/instagram.md) so an ID tells you its shard.

## Connect to theory
- Concept: [Sharding & partitioning](../1-knowledge/data-storage/sharding.md)
- Pairs with: [consistent hashing lab](./consistent-hashing-lab.md) (better resharding),
  [replication lab](./postgres-replication.md) (availability per shard).
- Managed equivalent: [DynamoDB partitioning lab](./aws/dynamodb-partitioning.md).
