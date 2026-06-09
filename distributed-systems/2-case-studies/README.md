# Distributed Systems · Part 2 — Case Studies

The theory in famous real systems: where consensus, quorums, logical time, and CRDTs
show up in production. Each follows the [case-study template](./_TEMPLATE.md) and builds
on the [Part 1 knowledge docs](../1-knowledge/).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## Eventual consistency at scale
- ✅ [Amazon Dynamo — quorums, vector clocks & eventual consistency](./dynamo.md) *(AP)*

## Consensus in production
- ✅ [Raft in etcd — the consensus that runs Kubernetes](./raft-etcd.md) *(CP)*

## Strong consistency at global scale
- ✅ [Google Spanner — TrueTime & external consistency](./spanner.md) *(strong, global)*

> 💡 Read together, the three are the consistency spectrum: Dynamo (AP) ↔ etcd (CP) ↔ Spanner
> (strong + global) — the same [CAP](../../system-design/1-knowledge/fundamentals/cap-theorem.md)
> trade-off, resolved three ways.
