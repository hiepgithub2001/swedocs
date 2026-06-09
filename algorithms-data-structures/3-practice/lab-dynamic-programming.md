# Lab: Dynamic Programming — Coin Change Two Ways

> **Goal:** take a problem that's exponential by naive [recursion](../1-knowledge/algorithms/recursion-and-divide-and-conquer.md)
> and make it linear-ish with [dynamic programming](../1-knowledge/algorithms/dynamic-programming.md)
> — implemented **both** top-down (memoization) and bottom-up (tabulation), and *measure* the speedup.
>
> **Builds:** [Dynamic programming](../1-knowledge/algorithms/dynamic-programming.md) ·
> [Recursion](../1-knowledge/algorithms/recursion-and-divide-and-conquer.md). Pure Python 3 — no install.

## The problem
Given coin denominations and a target `amount`, find the **fewest coins** that sum to it (∞ supply of
each). `coins=[1,3,4], amount=6` → **2** (3+3). Greedy ("take the biggest") gives 4+1+1 = 3 — *wrong*,
which is exactly why we need DP.

## Setup
```bash
mkdir dp-lab && cd dp-lab
```

## Step 1 — Naive recursion (correct, exponential)
Create `coins.py`:
```python
def naive(coins, amount):
    if amount == 0: return 0
    if amount < 0:  return float("inf")
    return min((naive(coins, amount - c) + 1 for c in coins), default=float("inf"))

print("naive:", naive([1, 3, 4], 6))      # 2  (correct, but...)
```
It's correct — but it re-solves the same `amount` over and over. Each call branches into `len(coins)`
calls → **exponential**. Try `naive([1,3,4], 30)` and watch it hang.

## Step 2 — Top-down DP (memoization): cache each amount once
Same recursion, one decorator — now each subproblem is solved a single time:
```python
from functools import lru_cache

def top_down(coins, amount):
    @lru_cache(None)                        # the entire DP: remember results per `rem`
    def solve(rem):
        if rem == 0: return 0
        if rem < 0:  return float("inf")
        return min((solve(rem - c) + 1 for c in coins), default=float("inf"))
    result = solve(amount)
    return result if result != float("inf") else -1

print("top-down:", top_down([1, 3, 4], 6))    # 2
print("big:", top_down([1, 3, 4], 30))         # instant now
```
Identical logic to `naive` — the cache is the *only* change, and it collapses exponential into
**O(amount × len(coins))**.

## Step 3 — Bottom-up DP (tabulation): fill a table from 0 up
No recursion — build answers for `0, 1, 2, … amount` in order:
```python
def bottom_up(coins, amount):
    INF = amount + 1
    dp = [0] + [INF] * amount               # dp[a] = fewest coins for amount a; dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)   # recurrence: best of "use coin c"
    return dp[amount] if dp[amount] != INF else -1

print("bottom-up:", bottom_up([1, 3, 4], 6))   # 2
```
- **State:** `dp[a]` = fewest coins for amount `a`. **Recurrence:** `dp[a] = min(dp[a-c] + 1)`.
- Same complexity as top-down, but no recursion overhead and no stack-depth limit.

## Step 4 — Measure the difference
Append:
```python
import time
def timed(fn, *args):
    t = time.perf_counter(); r = fn(*args); return r, (time.perf_counter()-t)*1000

for label, fn, amt in [("naive", naive, 22), ("top_down", top_down, 22), ("bottom_up", bottom_up, 22)]:
    r, ms = timed(fn, [1,3,4], amt)
    print(f"{label:10} amount=22 → {r}  in {ms:.1f} ms")
```
```bash
python3 coins.py
```
Expected — naive is dramatically slower even at amount=22; the two DPs are instant:
```
naive      amount=22 → 6   in  XXX.X ms     ← exponential
top_down   amount=22 → 6   in    0.0 ms
bottom_up  amount=22 → 6   in    0.0 ms
```
(Push naive to amount=30+ and it becomes unusable; the DPs stay instant — that's the whole point.)

## Step 5 — Recover *which* coins (not just the count)
Bottom-up can also reconstruct the choice — track what you picked:
```python
def which_coins(coins, amount):
    INF = amount + 1
    dp = [0] + [INF]*amount
    pick = [None]*(amount+1)
    for a in range(1, amount+1):
        for c in coins:
            if c <= a and dp[a-c] + 1 < dp[a]:
                dp[a] = dp[a-c] + 1; pick[a] = c
    if dp[amount] == INF: return None
    out = []
    while amount > 0:
        out.append(pick[amount]); amount -= pick[amount]
    return out

print("coins used:", which_coins([1,3,4], 6))    # [3, 3]
```

## Exercises
1. Add a memo-hit counter to `top_down` (count cache hits) — quantify how much recomputation the
   cache saved.
2. Solve **"number of *ways* to make the amount"** (count, not minimize) — same DP shape, `+=` instead
   of `min`.
3. Optimize `bottom_up`'s space: do you need the whole table, or just enough history? (For coin
   change you need all of `dp`, but for Fibonacci you need only the last two — discuss.)
4. Implement edit distance (the `diff` algorithm) as a 2-D DP table.

## What you proved
- The leap from exponential to polynomial was **caching overlapping subproblems** — top-down adds a
  cache to recursion; bottom-up fills a table. *Same idea, two forms.*
- The hard part is **defining the state and recurrence**; the code is mechanical once you have them.
- Greedy gives the wrong answer here — DP explores all sub-choices and finds the true optimum, the
  point of [dynamic programming](../1-knowledge/algorithms/dynamic-programming.md).

## References
- [Dynamic programming](../1-knowledge/algorithms/dynamic-programming.md) · [Recursion & divide and conquer](../1-knowledge/algorithms/recursion-and-divide-and-conquer.md) · [Big-O](../1-knowledge/fundamentals/big-o-complexity.md)
