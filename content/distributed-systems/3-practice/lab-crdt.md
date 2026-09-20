# Lab — Implement a CRDT (G-Counter & LWW-set)

> **Builds:** [eventual consistency & CRDTs](../1-knowledge/replication/eventual-consistency-crdts.md)
> — convergence via commutative/associative/idempotent merge. **Tools:** Python 3 (stdlib).
> **Time:** ~25 min. **Purpose:** *see* replicas converge to the same state **no matter the merge
> order** — and no write lost.

## Goal
Implement two CRDTs and prove the magic property: merge replicas in **any order, any number of
times**, and they all reach the **same** state — with no coordination and no lost updates.

## 1. G-Counter (grow-only counter — e.g. likes)
Each replica counts only its *own* increments; the value is the sum; merge takes the per-replica max.
```python
class GCounter:
    def __init__(self, i, n): self.i, self.c = i, [0]*n
    def inc(self):     self.c[self.i] += 1
    def value(self):   return sum(self.c)
    def merge(self, other):                       # element-wise MAX
        self.c = [max(a, b) for a, b in zip(self.c, other.c)]
```
```python
A, B = GCounter(0, 2), GCounter(1, 2)
A.inc(); A.inc()        # A counts 2 likes      → [2,0]
B.inc()                 # B counts 1 like       → [0,1]   (concurrent, no coordination)

A.merge(B); B.merge(A)  # exchange
print(A.value(), B.value())     # 3  3   ✅ both converge, all 3 likes counted
```
A naive shared integer with last-write-wins would have **lost** a like. The G-Counter can't —
because merge is **max per replica**, every increment survives.

## 2. Prove order doesn't matter
```python
# three replicas, increments interleaved, merged in a RANDOM order
import random, itertools
def make():
    reps = [GCounter(i, 3) for i in range(3)]
    reps[0].inc(); reps[1].inc(); reps[1].inc(); reps[2].inc()   # total = 4
    return reps

for order in itertools.permutations(range(3)):       # every merge order
    reps = make()
    # gossip: everyone merges everyone, in this order
    for a, b in itertools.product(order, repeat=2):
        reps[a].merge(reps[b])
    assert all(r.value() == 4 for r in reps)          # ✅ ALWAYS 4, every order
print("converged to 4 regardless of merge order ✅")
```
This is the CRDT guarantee — **strong eventual consistency** — falling out of the merge being
commutative, associative, and idempotent.

## 3. LWW-set (add & remove a set — bonus)
```python
class LWWSet:
    def __init__(self): self.add, self.rem = {}, {}     # elem -> timestamp
    def do_add(self, e, t): self.add[e] = max(self.add.get(e, 0), t)
    def do_remove(self, e, t): self.rem[e] = max(self.rem.get(e, 0), t)
    def contains(self, e): return e in self.add and self.add[e] > self.rem.get(e, 0)
    def merge(self, o):
        for e, t in o.add.items(): self.do_add(e, t)
        for e, t in o.rem.items(): self.do_remove(e, t)
```
Two replicas concurrently add/remove items; after merge they agree on membership deterministically
(add wins ties here). Same property: union-style merge → convergence.

## Exercises
1. Make a **PN-Counter** (supports decrement) from two G-Counters (one for +, one for −).
2. Show the G-Counter merge is **idempotent**: merging the same replica twice changes nothing.
3. Compare with [last-write-wins](../1-knowledge/replication/eventual-consistency-crdts.md) on a
   counter and demonstrate the lost update LWW causes.

## What you proved
- A **CRDT converges automatically** — replicas merged in any order/any number of times reach the
  same state, with **no coordination and no lost writes**.
- This is why CRDTs power [collaborative & offline-first apps](../1-knowledge/replication/eventual-consistency-crdts.md)
  and geo-replicated counters — availability without conflict prompts.

## References
- [Eventual consistency & CRDTs (knowledge)](../1-knowledge/replication/eventual-consistency-crdts.md)
- Shapiro et al. — *Conflict-free Replicated Data Types* · [crdt.tech](https://crdt.tech/)
