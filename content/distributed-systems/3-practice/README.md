# Distributed Systems · Part 3 — Practice

**Practice = implement the algorithm.**

Distributed-systems theory clicks when you *code* it. Each lab implements one core
algorithm in a few dozen lines of 🐍 Python — clocks you can watch increment, a leader
election you can trigger, a quorum you can break, a CRDT that converges no matter the
order. Free, local, single process simulating many nodes — no cluster required.

> 🧩 The goal is **the mechanism**: write the smallest thing that exhibits the real
> behavior — a causal violation a Lamport clock catches, a split-brain a quorum prevents.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## A. Time & order (start here)
- ✅ [Implement Lamport & vector clocks](./lab-logical-clocks.md)
  — watch them order events & detect concurrency. Mirrors [logical clocks](../1-knowledge/time-order/logical-clocks.md).

## B. Agreement
- ✅ [Build a Raft leader election](./lab-raft-election.md)
  — terms, votes, timeouts, split votes. Mirrors [consensus & Raft](../1-knowledge/consensus/consensus-and-raft.md).
- ✅ [A quorum read/write simulator](./lab-quorums.md)
  — tune N/R/W, induce stale reads & split-brain. Mirrors [quorums](../1-knowledge/replication/quorums-and-replication.md).

## C. Conflict-free replication
- ✅ [Implement a CRDT (G-Counter & LWW-set)](./lab-crdt.md)
  — merge replicas in any order, always converge. Mirrors [eventual consistency & CRDTs](../1-knowledge/replication/eventual-consistency-crdts.md).
