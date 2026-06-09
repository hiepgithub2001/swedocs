# Lab — Implement Lamport & vector clocks

> **Builds:** [logical clocks](../1-knowledge/time-order/logical-clocks.md) — happens-before,
> Lamport ordering, vector-clock concurrency detection. **Tools:** Python 3 (stdlib). **Time:**
> ~25 min. **Purpose:** *see* the difference — a Lamport clock orders events; a vector clock also
> tells you when two events are concurrent (a conflict).

## Goal
Implement both clocks for 3 simulated nodes exchanging messages, then prove the key fact: vector
clocks **detect concurrency** that Lamport clocks **can't**.

## 1. Lamport clocks
```python
class LamportNode:
    def __init__(self): self.t = 0
    def event(self):                      # local event: tick
        self.t += 1; return self.t
    def send(self):                       # tick, attach timestamp
        self.t += 1; return self.t
    def recv(self, ts):                   # max(local, received) + 1
        self.t = max(self.t, ts) + 1; return self.t
```
The one guarantee: if event A *happens-before* B, then `L(A) < L(B)`. But the converse fails —
`L(A) < L(B)` does **not** mean A caused B.

## 2. Vector clocks
```python
class VectorNode:
    def __init__(self, i, n): self.i, self.v = i, [0]*n
    def event(self): self.v[self.i] += 1; return list(self.v)
    def send(self):  self.v[self.i] += 1; return list(self.v)
    def recv(self, vec):                  # element-wise max, then bump self
        self.v = [max(a, b) for a, b in zip(self.v, vec)]
        self.v[self.i] += 1; return list(self.v)

def relation(a, b):
    if all(x <= y for x, y in zip(a, b)) and a != b: return "a → b (a before b)"
    if all(x >= y for x, y in zip(a, b)) and a != b: return "b → a (b before a)"
    if a == b: return "equal"
    return "CONCURRENT (conflict!)"       # neither dominates
```

## 3. Run a scenario with a real concurrent pair
```python
A, B = VectorNode(0, 2), VectorNode(1, 2)
a1 = A.event()                  # A: [1,0]
msg = A.send()                  # A: [2,0] → send to B
b1 = B.recv(msg)                # B: [2,1]  (causally after a1)
b2 = B.event()                  # B: [2,2]
a2 = A.event()                  # A: [3,0]  ← concurrent with b1/b2 (A never saw them)

print(relation(msg, b1))        # a → b   (send before receive) ✅
print(relation(a2, b2))         # CONCURRENT (conflict!) ✅
```
`a2 = [3,0]` and `b2 = [2,2]`: neither dominates → **provably concurrent**. A Lamport clock would
just give them two numbers and *imply a false order*. That's the whole reason vector clocks exist.

## Exercises
1. Build the same scenario with Lamport clocks and show you **cannot** tell `a2` and `b2` apart
   from genuinely-ordered events — the limitation, demonstrated.
2. Add a 3rd node and a message chain A→B→C; verify C's vector reflects A's event (causality is
   transitive).
3. Use vector clocks to implement "detect conflicting writes to a key" — the
   [Dynamo](../2-case-studies/dynamo.md) conflict check.

## What you proved
- A **Lamport clock orders** causally-related events with one integer — but can't detect concurrency.
- A **vector clock detects concurrency** (and thus conflicts) by comparing per-node vectors.
- This is the foundation of conflict detection in
  [eventually-consistent stores](../1-knowledge/replication/eventual-consistency-crdts.md).

## References
- [Logical clocks (knowledge)](../1-knowledge/time-order/logical-clocks.md)
- Lamport (1978) — *Time, Clocks, and the Ordering of Events*
