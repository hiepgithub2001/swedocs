# Algorithms & Data Structures

The bedrock of computer science: how to **structure data** so operations are fast, and the
**algorithms** that solve recurring problems efficiently. This is what lets you tell, *before*
writing code, whether an approach will scale to a million users or fall over at a thousand — the
[complexity](./1-knowledge/fundamentals/big-o-complexity.md) reasoning every senior engineer uses
and every technical interview tests.

Every section in this knowledge base is organized into **3 parts**:

| Part | Folder | What it contains |
| --- | --- | --- |
| 1️⃣ **Knowledge** | [`1-knowledge/`](./1-knowledge/) | Academic docs — complexity, the core structures & algorithms |
| 2️⃣ **Case Study** | [`2-case-studies/`](./2-case-studies/) | Real designs — LRU cache, autocomplete, map routing |
| 3️⃣ **Practice** | [`3-practice/`](./3-practice/) | Hands-on labs — measure Big-O, build a hash table, BFS/DFS, DP |

Open each part's `README.md` for its catalog.

> **Scope — the why & the how, not a reference dump.** This area teaches *when and why* to reach
> for each structure/algorithm (the judgment), with one worked example each — not an exhaustive
> catalogue of every variant. Where these ideas power real systems we link out:
> [database indexes](./1-knowledge/data-structures/trees-and-heaps.md) →
> [System Design](../system-design/1-knowledge/data-storage/indexing.md), graph routing →
> [Networks](../computer-networks/1-knowledge/network-layer/routing-and-forwarding.md), cache
> eviction → [OS page replacement](../operating-systems/1-knowledge/memory/page-replacement.md).

> **Status:** 🚧 in progress.

---

## 1️⃣ Knowledge — [catalog »](./1-knowledge/)
The foundation: **complexity** ([Big-O](./1-knowledge/fundamentals/big-o-complexity.md)); the core
**data structures** ([arrays & strings](./1-knowledge/data-structures/arrays-and-strings.md),
[linked lists/stacks/queues](./1-knowledge/data-structures/linked-lists-stacks-queues.md),
[hash tables](./1-knowledge/data-structures/hash-tables.md),
[trees & heaps](./1-knowledge/data-structures/trees-and-heaps.md),
[graphs](./1-knowledge/data-structures/graphs.md)); and the essential **algorithms**
([sorting & searching](./1-knowledge/algorithms/sorting-and-searching.md),
[recursion & divide-and-conquer](./1-knowledge/algorithms/recursion-and-divide-and-conquer.md),
[dynamic programming](./1-knowledge/algorithms/dynamic-programming.md),
[graph algorithms](./1-knowledge/algorithms/graph-algorithms.md)).

## 2️⃣ Case Study — [catalog »](./2-case-studies/)
Structures composed to solve real problems: an **LRU cache** (hash map + doubly linked list = O(1)),
**autocomplete** (trie + heap), and **shortest paths in a map** (weighted graph + Dijkstra/A*).

## 3️⃣ Practice — [catalog »](./3-practice/)
Runnable labs that make it concrete: **measure Big-O** curves empirically, **build a hash table**
(chaining + resize), implement **BFS/DFS** and solve a maze, and solve **coin-change** with DP two
ways. 🐍 Python, no dependencies.
