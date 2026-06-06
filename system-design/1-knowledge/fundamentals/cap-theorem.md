# CAP Theorem

> In a distributed system, when a network partition happens, you must choose between
> **Consistency** and **Availability** — you cannot have both.

## Problem
Once data lives on more than one machine, the network between them can fail
(a **partition**). When that happens, a node that can't reach its peers must decide:
refuse to answer (stay consistent) or answer with possibly-stale data (stay
available). CAP names this unavoidable choice.

## Core concepts

The three properties:
- **C — Consistency**: every read sees the most recent write (all nodes agree).
- **A — Availability**: every request gets a (non-error) response.
- **P — Partition tolerance**: the system keeps working despite dropped/delayed
  messages between nodes.

**The real statement:** in a distributed system partitions *will* happen, so **P is
mandatory**. The actual choice is **C vs A during a partition**.

```mermaid
flowchart TB
    P{Network partition occurs} --> CP[CP: stay consistent<br/>reject some requests]
    P --> AP[AP: stay available<br/>serve stale data]
```

**CP systems** — prefer correctness; become unavailable on a partition.
- Examples: traditional RDBMS clusters, HBase, ZooKeeper, etcd.
- Use when wrong data is unacceptable (banking, inventory, locks).

**AP systems** — prefer uptime; allow temporary inconsistency, reconcile later.
- Examples: Cassandra, DynamoDB, Riak.
- Use when availability matters more than perfect freshness (shopping carts, feeds,
  metrics).

**When there's no partition** you get both C and A — CAP only forces a choice
*during* a partition.

## Trade-offs
- CAP is a **simplification**. In practice it's a spectrum, not a binary — see
  **PACELC**: *if Partition, choose A or C; Else (normal operation), choose Latency
  or Consistency.* Even without partitions you trade latency for consistency.
- "Choosing AP" doesn't mean giving up consistency forever — it usually means
  **eventual consistency** (see [consistency models](./consistency-models.md)).

## Real-world examples
- **DynamoDB / Cassandra** (AP) power shopping carts and feeds where staying up beats
  momentary staleness.
- **etcd / ZooKeeper** (CP) store cluster config and leader-election state where a
  split-brain wrong answer would be catastrophic.

## References
- Eric Brewer, *CAP Twelve Years Later*
- [PACELC theorem](https://en.wikipedia.org/wiki/PACELC_theorem)
