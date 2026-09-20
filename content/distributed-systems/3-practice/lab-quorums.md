# Lab — A quorum read/write simulator

> **Builds:** [quorums & replication](../1-knowledge/replication/quorums-and-replication.md) — the
> `R + W > N` rule and the consistency/availability dial. **Tools:** Python 3 (stdlib). **Time:**
> ~20 min. **Purpose:** *see* that `R+W>N` guarantees fresh reads, and `R+W≤N` lets stale reads
> slip through.

## Goal
Simulate N replicas with tunable R and W. Watch the **quorum overlap** deliver fresh reads when
`R+W>N`, and watch stale reads appear when it doesn't.

## 1. The replicated store
```python
import random

class QuorumStore:
    def __init__(self, n): self.replicas = [None]*n   # each holds (value, version)

    def write(self, value, version, W):
        targets = random.sample(range(len(self.replicas)), W)   # write to W random replicas
        for r in targets: self.replicas[r] = (value, version)
        return targets

    def read(self, R):
        nodes = random.sample(range(len(self.replicas)), R)     # read from R random replicas
        seen = [self.replicas[r] for r in nodes]
        # return the value with the highest version among those read
        fresh = max((s for s in seen if s), key=lambda s: s[1], default=None)
        return fresh, nodes
```

## 2. Test the rule: R + W > N → always fresh
```python
N = 3
store = QuorumStore(N)
store.write("v1", 1, W=2)              # old value on 2 replicas
store.write("v2", 2, W=2)             # NEW value on 2 replicas

R, W = 2, 2                            # R+W = 4 > 3  → overlap guaranteed
stale = 0
for _ in range(10000):
    (val, ver), _ = store.read(R)
    if ver != 2: stale += 1
print(f"R={R}, W={W}, N={N}:  stale reads = {stale}/10000")   # → 0  ✅ always fresh
```
Because any 2-of-3 read set and the 2-of-3 write set must share a replica, the read **always** sees
version 2. That overlap *is* the [consistency guarantee](../1-knowledge/replication/quorums-and-replication.md).

## 3. Break it: R + W ≤ N → stale reads appear
```python
R, W = 1, 1                            # R+W = 2 ≤ 3  → no overlap guaranteed
stale = 0
for _ in range(10000):
    store = QuorumStore(N)
    store.write("v2", 2, W=W)          # new value on just 1 replica
    (val, ver), _ = store.read(R) if store.read(R)[0] else ((None,0),None)
    if not val or ver != 2: stale += 1
print(f"R={R}, W={W}, N={N}:  stale/missed reads ≈ {stale}/10000")  # → large (~2/3) ❌
```
With W=1, R=1 there's no guaranteed overlap, so a read often hits a replica that never got the
write — **stale**. Fast and highly available, but [eventually consistent](../1-knowledge/replication/eventual-consistency-crdts.md).

## Exercises
1. Sweep R and W from 1..N and print a grid of stale-read rates — visualize the `R+W>N` boundary.
2. Add a "dead" replica (always unavailable) and show that **W=N stalls writes** but a majority
   quorum keeps working — the availability cost of strong settings.
3. Add **read repair**: on a read that sees disagreement, write the newest value back to the stale
   replicas; show staleness decaying over repeated reads.

## What you proved
- **`R + W > N` guarantees overlap → fresh reads** (strong consistency); `R+W≤N` permits stale
  reads (eventual).
- The same N-replica cluster gives **strong or eventual consistency depending only on R/W** — the
  tunable dial Cassandra/Dynamo expose per query.

## References
- [Quorums & replication (knowledge)](../1-knowledge/replication/quorums-and-replication.md)
- [Dynamo case study](../2-case-studies/dynamo.md)
