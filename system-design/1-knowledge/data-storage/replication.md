# Database Replication

> Replication keeps copies of the same data on multiple nodes — for availability,
> read scaling, and durability.

## Problem
A single database is a single point of failure and a single point of capacity. If it
dies you lose the service (and maybe data); if reads exceed its capacity you're stuck.
Replication makes copies so you can survive failures and serve more reads.

## Core concepts

**Leader–follower (primary–replica)**
- All **writes** go to the leader; the leader streams changes to followers.
- **Reads** can be served by followers → scales read-heavy workloads.
- On leader failure, a follower is promoted (**failover**).

```mermaid
flowchart LR
    App -->|writes| L[(Leader)]
    L --> F1[(Follower)]
    L --> F2[(Follower)]
    App -->|reads| F1
    App -->|reads| F2
```

**Synchronous vs asynchronous**
- **Sync** — leader waits for follower(s) to confirm before acking the write. No data
  loss on failover, but slower and stalls if a follower lags.
- **Async** — leader acks immediately, replicates in the background. Fast, but a
  crash can lose the last writes (**replication lag**).
- **Semi-sync** — wait for at least one follower; common compromise.

**Multi-leader** — multiple nodes accept writes (e.g. one per region). Better write
availability/locality, but introduces **write conflicts** that need resolution.

**Leaderless (Dynamo-style)** — any replica accepts reads/writes; uses **quorums**
(W + R > N) to stay consistent. Used by Cassandra, DynamoDB.

## Example — read scaling with a replica
Writes go to the **primary**; you add a **read replica** and send read-only queries there.
A read-heavy app (say 90% reads) now offloads most traffic from the primary:
```sql
-- on primary
INSERT INTO t VALUES (1),(2),(3);
-- on replica (streamed via WAL)
SELECT * FROM t;            -- 1,2,3
INSERT INTO t VALUES (4);   -- ERROR: cannot execute INSERT in a read-only transaction
```
Watch replica lag and read-only behavior in the
[scalable web service project](../../3-practice/project-scalable-web-service.md).

## Common tools
| Tool | Use it for |
| --- | --- |
| **PostgreSQL / MySQL** streaming replication | self-managed primary + read replicas |
| **AWS RDS / Aurora** | managed read replicas + Multi-AZ auto-failover |
| **Patroni + etcd**, **repmgr** | automated leader election / failover for Postgres |
| **Cassandra / DynamoDB** | leaderless, quorum-based replication (multi-DC) |

## Trade-offs
- **Replication lag** breaks read-your-own-writes (you write to leader, read a stale
  follower). Fixes: read from leader for recent writes, or track versions.
- Sync = safe but slow; async = fast but can lose data.
- Multi-leader/leaderless = high availability but conflict handling (last-write-wins,
  vector clocks, CRDTs).

## Real-world examples
- **PostgreSQL/MySQL** streaming replication with read replicas behind the app.
- **Cassandra** quorum reads/writes across replicas in multiple datacenters.

## References
- *Designing Data-Intensive Applications* — Ch. 5 (Replication)
- [PostgreSQL replication docs](https://www.postgresql.org/docs/current/high-availability.html)
