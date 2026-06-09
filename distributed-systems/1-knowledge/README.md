# Distributed Systems · Part 1 — Knowledge

Academic docs: the **models, impossibility results, and algorithms** of distributed
computing. Each topic follows the [shared doc template](../../_TEMPLATE.md) and leads with a
top-down hook, a worked example, and the essential terminology.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

> 📚 Read in order: first *why it's hard*, then how we reason about *time*, then how nodes
> *agree*, then how we *replicate* without agreement.

> 🔗 This area is the theory beneath [System Design](../../system-design/). It does **not**
> repeat [CAP](../../system-design/1-knowledge/fundamentals/cap-theorem.md),
> [consistency models](../../system-design/1-knowledge/fundamentals/consistency-models.md), or
> [replication architecture](../../system-design/1-knowledge/data-storage/replication.md) —
> it derives the foundations they assume.

## Fundamentals — why it's hard
- ✅ [Why distributed systems are hard](./fundamentals/why-distributed-is-hard.md)
- ✅ [Failure models & the FLP impossibility](./fundamentals/failure-models.md)

## Time & order — reasoning without a global clock
- ✅ [Logical clocks: happens-before, Lamport & vector clocks](./time-order/logical-clocks.md)

## Consensus — getting nodes to agree
- ✅ [Consensus & Raft (state-machine replication)](./consensus/consensus-and-raft.md)
- ✅ [Atomic commit & two-phase commit (2PC)](./consensus/atomic-commit-2pc.md)

## Replication theory — agreement-free and weakly consistent
- ✅ [Quorums & replication protocols](./replication/quorums-and-replication.md)
- ✅ [Eventual consistency & CRDTs](./replication/eventual-consistency-crdts.md)
