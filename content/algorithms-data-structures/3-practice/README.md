# Algorithms & Data Structures · Part 3 — Practice

**Practice = implement it and measure it.**

Algorithms click when you build them and *watch* the complexity: time an O(n²) loop exploding, grow
a hash table's buckets, see BFS find the shortest maze path, watch memoization collapse exponential
recursion. Each lab is 🐍 Python with no dependencies — run it, predict the output, then explain why.

> 🧩 The goal is **intuition through implementation**: the structures stop being abstractions once
> you've coded the buckets and timed the curves.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## A. Complexity (start here)
- ✅ [Measure Big-O empirically](./lab-big-o-measure.md)
  — time O(1)/O(log n)/O(n)/O(n²) and watch them diverge. Mirrors [Big-O](../1-knowledge/fundamentals/big-o-complexity.md).

## B. Data structures
- ✅ [Implement a hash table](./lab-implement-hashtable.md)
  — buckets, chaining, resize; see why O(1) is *average*. Mirrors [hash tables](../1-knowledge/data-structures/hash-tables.md).

## C. Algorithms
- ✅ [BFS & DFS — traverse a graph and solve a maze](./lab-bfs-dfs.md)
  — queue vs. stack; BFS finds shortest paths. Mirrors [graph algorithms](../1-knowledge/algorithms/graph-algorithms.md).
- ✅ [Dynamic programming — coin change two ways](./lab-dynamic-programming.md)
  — memoization vs. tabulation, exponential → linear. Mirrors [dynamic programming](../1-knowledge/algorithms/dynamic-programming.md).
