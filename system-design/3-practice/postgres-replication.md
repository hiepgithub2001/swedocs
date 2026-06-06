# Practice Lab: PostgreSQL Primary–Replica Replication

> Set up streaming replication between two PostgreSQL instances and watch writes on the
> primary appear on a read-only replica.

## Goal
See leader–follower replication in action: write to the primary, read from the replica,
and confirm the replica rejects writes (it's read-only).

## Prerequisites
- Docker + Docker Compose. (Uses the Bitnami Postgres image, which wires up replication
  via env vars.)

## Setup
Create `docker-compose.yml`:
```yaml
services:
  primary:
    image: bitnami/postgresql:16
    ports: [ "5432:5432" ]
    environment:
      POSTGRESQL_REPLICATION_MODE: master
      POSTGRESQL_REPLICATION_USER: repl
      POSTGRESQL_REPLICATION_PASSWORD: replpass
      POSTGRESQL_USERNAME: app
      POSTGRESQL_PASSWORD: apppass
      POSTGRESQL_DATABASE: appdb
  replica:
    image: bitnami/postgresql:16
    ports: [ "5433:5432" ]
    depends_on: [ primary ]
    environment:
      POSTGRESQL_REPLICATION_MODE: slave
      POSTGRESQL_REPLICATION_USER: repl
      POSTGRESQL_REPLICATION_PASSWORD: replpass
      POSTGRESQL_MASTER_HOST: primary
      POSTGRESQL_MASTER_PORT_NUMBER: 5432
      POSTGRESQL_PASSWORD: apppass
```

```bash
docker compose up -d
sleep 15   # let the replica sync
```

## Steps
```bash
# 1. Write on the PRIMARY
docker compose exec primary psql -U app -d appdb -c \
  "CREATE TABLE t(id int); INSERT INTO t VALUES (1),(2),(3);"

# 2. Read on the REPLICA — the rows replicated over
docker compose exec replica psql -U app -d appdb -c "SELECT * FROM t;"

# 3. Try to WRITE on the replica — it refuses (read-only)
docker compose exec replica psql -U app -d appdb -c "INSERT INTO t VALUES (4);"
```

## Expected result
- Step 2: the replica returns rows 1, 2, 3 — replicated from the primary.
- Step 3: error — `cannot execute INSERT in a read-only transaction`. Replicas serve
  reads only.

## Teardown
```bash
docker compose down -v
```

## Notes
- This is **asynchronous** replication — under load you'd see small **replication lag**
  between writing on the primary and seeing it on the replica.
- Related knowledge: [Replication](../1-knowledge/data-storage/replication.md).
