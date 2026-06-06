# Practice Lab: Consistent Hashing (Visualize Key Distribution)

> Implement a consistent-hash ring and measure how few keys move when a node is
> added/removed — versus naive modulo hashing.

## Goal
Distribute 10,000 keys across nodes, then add a node and **count how many keys move**.
Compare consistent hashing vs `hash(key) % N`.

## Prerequisites
- Python 3 (no Docker needed).

## Setup
Create `ring.py`:
```python
import hashlib, bisect

def h(s):
    return int(hashlib.md5(str(s).encode()).hexdigest(), 16)

class HashRing:
    def __init__(self, nodes, vnodes=100):
        self.vnodes = vnodes
        self.ring = {}            # hash -> node
        self.sorted = []
        for n in nodes:
            self.add(n)
    def add(self, node):
        for i in range(self.vnodes):
            k = h(f"{node}-{i}")
            self.ring[k] = node
            bisect.insort(self.sorted, k)
    def get(self, key):
        k = h(key)
        idx = bisect.bisect(self.sorted, k) % len(self.sorted)
        return self.ring[self.sorted[idx]]

KEYS = [f"key{i}" for i in range(10000)]

# --- consistent hashing ---
r1 = HashRing(["A", "B", "C"])
before = {k: r1.get(k) for k in KEYS}
r1.add("D")                                  # add a 4th node
after = {k: r1.get(k) for k in KEYS}
moved = sum(1 for k in KEYS if before[k] != after[k])
print(f"consistent hashing: {moved}/{len(KEYS)} keys moved ({moved/100:.1f}%)")

# --- naive modulo for comparison ---
b = {k: h(k) % 3 for k in KEYS}
a = {k: h(k) % 4 for k in KEYS}
moved2 = sum(1 for k in KEYS if b[k] != a[k])
print(f"modulo hashing:     {moved2}/{len(KEYS)} keys moved ({moved2/100:.1f}%)")
```

## Steps
```bash
python ring.py
```

## Expected result
```
consistent hashing: ~2500/10000 keys moved (~25%)   # roughly K/N
modulo hashing:     ~7500/10000 keys moved (~75%)   # almost everything
```
Adding a node to the modulo scheme reshuffles ~3/4 of keys (cache-miss storm);
consistent hashing only moves the keys that now belong to the new node.

## Teardown
Nothing to clean up — it's a single script.

## Notes
- Increase/decrease `vnodes` and print the per-node key counts to see how virtual nodes
  improve **balance**.
- Related knowledge: [Consistent hashing](../1-knowledge/building-blocks/consistent-hashing.md).
