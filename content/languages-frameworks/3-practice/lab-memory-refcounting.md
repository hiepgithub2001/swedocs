# Lab: Watch a Garbage Collector Work — Reference Counting & Cycles

> **Goal:** make Python's [memory management](../1-knowledge/language-design/memory-management.md)
> *visible* — watch reference counts rise and fall, trigger immediate frees, then build a reference
> **cycle** that refcounting can't reclaim and watch the tracing collector clean it up.
>
> **Builds:** [Memory management](../1-knowledge/language-design/memory-management.md) ·
> [Rust ownership case study](../2-case-studies/rust-ownership.md). Pure Python 3 (CPython).

## Setup
```bash
mkdir memory-lab && cd memory-lab
python3 --version    # CPython (refcounting is a CPython implementation detail)
```

## Step 1 — See reference counts change
CPython frees an object the instant its reference count hits 0. Create `refcount.py`:
```python
import sys

a = []                          # one reference: `a`
print(sys.getrefcount(a))       # 2  (the extra 1 is getrefcount's own argument)

b = a                           # second reference
print(sys.getrefcount(a))       # 3

del b                           # drop one
print(sys.getrefcount(a))       # 2
```
```bash
python3 refcount.py     # 2 / 3 / 2
```
Each name binding is a reference; `getrefcount` always reads one high because the value is passed to
it. This counting is the [reference-counting GC](../1-knowledge/language-design/memory-management.md).

## Step 2 — Prove free happens *immediately* at zero
Create `prompt.py` — a `__del__` fires the moment the count reaches 0:
```python
class Tracked:
    def __init__(self, name): self.name = name
    def __del__(self): print(f"freed {self.name}")

x = Tracked("A")
print("before reassign")
x = Tracked("B")          # "A" now has 0 refs → freed RIGHT HERE
print("after reassign")
```
```bash
python3 prompt.py
```
Expected — note `freed A` prints *between* the two lines, deterministically:
```
before reassign
freed A
after reassign
```
This **promptness** is refcounting's big advantage over tracing GC (no waiting for a collection).

## Step 3 — Build a cycle refcounting can't free
Two objects referencing each other never reach count 0, even with no outside references. Create
`cycle.py`:
```python
import gc

class Node:
    def __del__(self): print(f"freed {self.name}")
    def __init__(self, name): self.name = name; self.ref = None

gc.disable()                    # turn OFF the cyclic collector to expose the leak
a = Node("A"); b = Node("B")
a.ref = b; b.ref = a            # A → B → A : a cycle
del a, b                        # drop both external refs...
print("deleted a, b — but nothing freed (each still referenced by the other)")
print("collected by cyclic GC:", gc.collect())   # NOW the tracing collector reclaims them
```
```bash
python3 cycle.py
```
Expected — no `freed` prints after `del` (refcounts stuck at 1 via the cycle), then the tracing
collector finds and frees them:
```
deleted a, b — but nothing freed (each still referenced by the other)
freed A
freed B
collected by cyclic GC: 4
```
(`gc.collect()` returns the *number of objects* it reclaimed — the two `Node`s plus their internal
`__dict__`s, so >2; the exact count varies by Python version. The point is it's non-zero.)
**This is why CPython has *two* mechanisms:** refcounting for the common case + a tracing
[garbage collector](../1-knowledge/language-design/memory-management.md) as backup for cycles.

## Step 4 — Contrast with ownership (no GC at all)
There's nothing to run here — it's the conceptual payoff. In [Rust](../2-case-studies/rust-ownership.md),
the same two-objects-referencing-each-other situation is caught **at compile time**: you cannot
casually create that cycle of mutable references, because ownership/borrowing forbids it. No runtime
collector, no `gc.collect()`, no pause — the safety moved from *runtime* (Python's GC) to *compile
time* (Rust's borrow checker). Same goal (no leaks, no use-after-free), opposite strategy.

## Exercises
1. Re-run `cycle.py` **without** `gc.disable()`. The cycle is collected automatically (eventually) —
   you just don't control *when*. That timing non-determinism is the tracing-GC trade-off.
2. Use `gc.get_count()` before/after creating many objects to watch generational thresholds.
3. Break the cycle manually (`a.ref = None` before `del`) and confirm refcounting alone frees them,
   no cyclic GC needed.
4. Why is `__del__` on objects in a cycle historically risky? (Order of finalization.)

## What you proved
- CPython frees most objects **immediately** via reference counting (prompt, simple).
- **Reference cycles** defeat refcounting, so a **tracing collector** backs it up — at the cost of
  non-deterministic timing (GC pauses).
- Ownership languages ([Rust](../2-case-studies/rust-ownership.md)) get the same safety with **no GC**
  by deciding frees at compile time — the core [memory-management](../1-knowledge/language-design/memory-management.md)
  trade-off, made concrete.

## References
- [Memory management](../1-knowledge/language-design/memory-management.md) · [Rust ownership](../2-case-studies/rust-ownership.md)
- Python [`gc` module docs](https://docs.python.org/3/library/gc.html)
