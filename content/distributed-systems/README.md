# Distributed Systems

Why is it so hard for a handful of computers to *agree* on anything? This area is the
**theory and algorithms** beneath distributed computing — the formal reasons coordination
is hard (partial failure, no global clock) and the classic algorithms that tame it
(logical clocks, consensus, quorums, CRDTs).

Every section in this knowledge base is organized into **3 parts**:

| Part | Folder | What it contains |
| --- | --- | --- |
| 1️⃣ **Knowledge** | [`1-knowledge/`](./1-knowledge/) | Academic docs — the models, impossibility results & algorithms |
| 2️⃣ **Case Study** | [`2-case-studies/`](./2-case-studies/) | How real systems (Dynamo, Raft/etcd, Spanner) apply the theory |
| 3️⃣ **Practice** | [`3-practice/`](./3-practice/) | Hands-on labs — **implement the algorithm** (clocks, Raft, quorums, a CRDT) |

Open each part's `README.md` for its catalog.

> **Scope — and how it differs from [System Design](../system-design/).** System Design is
> the *applied* "how to build scalable systems" view: it already covers
> [CAP](../system-design/1-knowledge/fundamentals/cap-theorem.md),
> [consistency models](../system-design/1-knowledge/fundamentals/consistency-models.md),
> [replication](../system-design/1-knowledge/data-storage/replication.md),
> [sharding](../system-design/1-knowledge/data-storage/sharding.md), and
> [consistent hashing](../system-design/1-knowledge/building-blocks/consistent-hashing.md).
> **This area does not repeat them** — it derives the *theory underneath*: the failure and
> timing models those results assume, and the consensus/quorum/CRDT algorithms they rely on.
> Where the two meet, we link to System Design rather than re-explain.

> **Status:** 🚧 in progress — 1️⃣ Knowledge being written first.

---

## 1️⃣ Knowledge — [catalog »](./1-knowledge/)
The foundations: **why distributed systems are hard** (partial failure, asynchrony, no
global clock) and **failure models**; **logical time & ordering** (Lamport & vector
clocks, causality); **consensus** (Raft, state-machine replication) and **atomic commit**
(2PC); and **replication theory** (quorums) and **eventual consistency** (CRDTs).

## 2️⃣ Case Study — [catalog »](./2-case-studies/)
The theory in famous real systems: **Amazon Dynamo** (quorums + vector clocks + eventual
consistency), **Raft in etcd** (consensus that runs Kubernetes), and **Google Spanner**
(TrueTime and external consistency).

## 3️⃣ Practice — [catalog »](./3-practice/)
Runnable labs where you **implement the algorithm** — Lamport and vector clocks, a Raft
leader election, a quorum read/write simulator, and a CRDT — in a few dozen lines of
🐍 Python. Free, local, no cluster required.
