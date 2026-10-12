# Part II — Distributed data

> What changes when data lives on many machines, for scale, for fault
> tolerance and for latency. Replication copies data, and partitioning splits
> it. Transactions, the failure modes of networks and clocks, and consensus
> decide what you can still promise.

Part II covers **shared-nothing** systems: independent nodes that cooperate
only over an ordinary network. They aren't always the best choice (a single
machine can outperform a 100-core cluster on some jobs), but they're the ones
that need the most care from the application developer.

| | |
| --- | --- |
| [Replication](./01-replication.md) | Single-leader, multi-leader and leaderless replication, replication lag, quorums, concurrent writes |
| [Partitioning](./02-partitioning.md) | Key-range versus hash partitioning, hot spots, secondary indexes, rebalancing, request routing |
| [Transactions](./03-transactions.md) | What ACID really means, isolation levels, lost updates, write skew, serializability (serial execution, 2PL, SSI) |
| [The trouble with distributed systems](./04-trouble-with-distributed-systems.md) | Unreliable networks and clocks, process pauses, quorums, fencing tokens, system models |
| [Consistency and consensus](./05-consistency-and-consensus.md) | Linearizability, CAP, causality, Lamport timestamps, total order broadcast, 2PC, consensus, ZooKeeper |

Related reference docs: [replication](../../system-design/1-knowledge/data-storage/replication.md),
[sharding](../../system-design/1-knowledge/data-storage/sharding.md),
[CAP](../../system-design/1-knowledge/fundamentals/cap-theorem.md),
[quorums](../../distributed-systems/1-knowledge/replication/quorums-and-replication.md),
[logical clocks](../../distributed-systems/1-knowledge/time-order/logical-clocks.md),
[2PC](../../distributed-systems/1-knowledge/consensus/atomic-commit-2pc.md),
[Raft](../../distributed-systems/1-knowledge/consensus/consensus-and-raft.md).

---

Previous: [Encoding and evolution](../1-foundations/04-encoding-and-evolution.md) ·
Next: [Replication](./01-replication.md)
