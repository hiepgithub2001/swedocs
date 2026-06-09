# Lab: Measure Big-O Empirically

> **Goal:** stop taking [Big-O](../1-knowledge/fundamentals/big-o-complexity.md) on faith — *time*
> O(1), O(log n), O(n), and O(n²) code as the input grows and watch the curves diverge exactly as
> theory predicts.
>
> **Builds:** [Big-O & complexity](../1-knowledge/fundamentals/big-o-complexity.md). Pure Python 3
> (built-in `time`) — no install.

## Setup
```bash
mkdir bigo-lab && cd bigo-lab
```

## Step 1 — A timing harness
Create `measure.py`:
```python
import time

def timed(fn, n):
    data = list(range(n))
    t = time.perf_counter()
    fn(data, n)
    return time.perf_counter() - t

def report(label, fn, sizes):
    print(f"\n{label}")
    prev = None
    for n in sizes:
        t = timed(fn, n)
        ratio = f"  (×{t/prev:.1f} vs prev)" if prev else ""
        print(f"  n={n:>8}: {t*1000:8.2f} ms{ratio}")
        prev = t
```

## Step 2 — O(1): constant — size shouldn't matter
```python
def constant(data, n):
    return data[n // 2]            # one index — O(1)
```

## Step 3 — O(n): linear — 10× input ≈ 10× time
```python
def linear(data, n):
    return sum(data)               # one pass — O(n)
```

## Step 4 — O(n²): quadratic — 10× input ≈ 100× time
```python
def quadratic(data, n):
    count = 0
    for i in range(n):
        for j in range(n):         # nested loops over input — O(n²)
            count += 1
    return count
```

## Step 5 — O(log n): logarithmic — 10× input ≈ +constant work
```python
def logarithmic(data, n):
    steps = 0
    while n > 1:
        n //= 2                    # halving — O(log n)
        steps += 1
    return steps
```

## Step 6 — Run them and read the ratios
Append:
```python
if __name__ == "__main__":
    report("O(1) constant",    constant,    [1000, 10_000, 100_000, 1_000_000])
    report("O(log n) log",     logarithmic, [1000, 10_000, 100_000, 1_000_000])
    report("O(n) linear",      linear,      [1000, 10_000, 100_000, 1_000_000])
    report("O(n^2) quadratic", quadratic,   [1000, 2000, 4000, 8000])   # small n — it explodes
```
```bash
python3 measure.py
```
Read the **×ratios**, not absolute ms:
- **O(1)** & **O(log n)**: ratio ≈ 1 — barely moves as n grows 10×.
- **O(n)**: ratio ≈ 10 each time n grows 10× — linear.
- **O(n²)**: ratio ≈ **4** each time n *doubles* (2² = 4) — quadruples per doubling. Note we had to
  use *small* sizes or it would take minutes — that's the lesson.

## Step 7 — Prove the duplicate-finder gap (from the Big-O doc)
Create `dups.py` and time the two approaches on the *same* data:
```python
import time, random
def slow(a):                                   # O(n^2)
    for i in range(len(a)):
        for j in range(i+1, len(a)):
            if a[i] == a[j]: return True
    return False
def fast(a):                                   # O(n) with a set
    seen = set()
    for x in a:
        if x in seen: return True
        seen.add(x)
    return False

a = random.sample(range(10_000_000), 20_000)   # 20k distinct → worst case (scan all)
for name, fn in [("O(n^2)", slow), ("O(n)", fast)]:
    t = time.perf_counter(); fn(a); print(f"{name}: {(time.perf_counter()-t)*1000:.1f} ms")
```
```bash
python3 dups.py     # O(n^2) is dramatically slower — often 100×+
```

## Exercises
1. Plot the numbers (paste into a spreadsheet) — see the quadratic curve bend sharply upward.
2. Add an `O(n log n)` function (sort the list) and place its growth between linear and quadratic.
3. Find the n where `quadratic` exceeds 1 second. That ceiling is *why* O(n²) "doesn't scale."
4. Time list `.insert(0, x)` (O(n)) vs `collections.deque.appendleft` (O(1)) over many ops — see
   [arrays vs. deque](../1-knowledge/data-structures/linked-lists-stacks-queues.md).

## What you proved
- Growth *rate*, not raw speed, decides scalability — the O(n²) ratio quadruples per doubling while
  O(log n) barely moves.
- An accidental nested loop (O(n²)) is the classic scaling bug; a [hash set](../1-knowledge/data-structures/hash-tables.md)
  drops it to O(n) — visible in the timings.
- Big-O predicts the *shape*; measuring confirms it and reveals the constants Big-O hides.

## References
- [Big-O & complexity](../1-knowledge/fundamentals/big-o-complexity.md) · [Hash tables](../1-knowledge/data-structures/hash-tables.md)
