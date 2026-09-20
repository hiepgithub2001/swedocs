# Lab: Implement a Hash Table

> **Goal:** build a [hash table](../1-knowledge/data-structures/hash-tables.md) from scratch —
> buckets, a hash function, **collision chaining**, and **resizing** — so the "O(1) magic" of every
> `dict` becomes concrete and demystified.
>
> **Builds:** [Hash tables](../1-knowledge/data-structures/hash-tables.md) ·
> [Big-O](../1-knowledge/fundamentals/big-o-complexity.md). Pure Python 3 — no install.

## Setup
```bash
mkdir hashtable-lab && cd hashtable-lab
```

## Step 1 — Buckets + a hash → index
Create `hashtable.py`. Start with a fixed array of buckets, each a list (chaining):
```python
class HashTable:
    def __init__(self, capacity=8):
        self.capacity = capacity
        self.size = 0
        self.buckets = [[] for _ in range(capacity)]   # each bucket = list of (key, value)

    def _index(self, key):
        return hash(key) % self.capacity                # hash → bucket index, O(1)
```

## Step 2 — put / get / delete with chaining
Collisions (two keys → same bucket) just append to that bucket's list:
```python
    def put(self, key, value):
        bucket = self.buckets[self._index(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)               # update existing
                return
        bucket.append((key, value))                    # new key (collision → chained)
        self.size += 1
        if self.size / self.capacity > 0.7:            # load factor too high?
            self._resize(self.capacity * 2)

    def get(self, key):
        for k, v in self.buckets[self._index(key)]:
            if k == key:
                return v
        raise KeyError(key)

    def delete(self, key):
        bucket = self.buckets[self._index(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket.pop(i); self.size -= 1; return
        raise KeyError(key)
```

## Step 3 — Resize to keep buckets short (amortized O(1))
When the **load factor** crosses 0.7, double capacity and **re-hash everything** (indices change
because they depend on `capacity`):
```python
    def _resize(self, new_capacity):
        old = [pair for bucket in self.buckets for pair in bucket]
        self.capacity = new_capacity
        self.buckets = [[] for _ in range(new_capacity)]
        self.size = 0
        for k, v in old:
            self.put(k, v)                             # re-insert → new indices
```

## Step 4 — Use it
Create `try_it.py`:
```python
from hashtable import HashTable
h = HashTable()
for i in range(20):
    h.put(f"key{i}", i)            # triggers at least one resize
print("get key5 :", h.get("key5"))      # 5
print("size     :", h.size)             # 20
print("capacity :", h.capacity)         # grew from 8 (resized)
h.delete("key5")
print("after del:", end=" ")
try: h.get("key5")
except KeyError: print("key5 gone ✅")
```
```bash
python3 try_it.py
```
Expected:
```
get key5 : 5
size     : 20
capacity : 32
after del: key5 gone ✅
```
Capacity grew 8 → 16 → 32 as the load factor crossed 0.7 — that's the amortized-O(1) resize at work.

## Step 5 — See collisions and why O(1) is *average*
Force everything into one bucket with a deliberately terrible hash:
```python
class BadHashTable(HashTable):
    def _index(self, key):
        return 0                    # ALL keys collide → one giant bucket
```
Now `get` must scan that whole chain — **O(n)**, the worst case. Add this to `try_it.py`, time
1000 puts+gets on `HashTable` vs `BadHashTable`, and watch the bad one crawl. **A good hash function
is the whole game.**

## Exercises
1. Count the longest bucket chain after inserting 1000 keys with the good hash — it should stay tiny
   (a few), proving uniform distribution keeps ops O(1).
2. Implement `__contains__` and `keys()`. What's the complexity of iterating all keys? (O(n + capacity).)
3. Switch chaining to **open addressing** (on collision, probe `index+1, +2, …`). What new problem
   does deletion create? (Tombstones.)
4. Lower the resize threshold to 0.3 and raise it to 0.95 — observe the space/time trade-off in chain
   lengths and resize frequency.

## What you proved
- A hash table is just *buckets + a hash function + a collision strategy + resizing* — no magic.
- **Average O(1)** depends on a good hash (uniform spread) and a bounded load factor (via resize);
  a bad hash collapses it to **O(n)** — exactly the average-vs-worst-case from the
  [hash tables](../1-knowledge/data-structures/hash-tables.md) doc.
- Resizing's occasional O(n) rehash is what keeps *amortized* insert O(1).

## References
- [Hash tables](../1-knowledge/data-structures/hash-tables.md) · [Big-O & complexity](../1-knowledge/fundamentals/big-o-complexity.md) · [Linked lists (the chains)](../1-knowledge/data-structures/linked-lists-stacks-queues.md)
