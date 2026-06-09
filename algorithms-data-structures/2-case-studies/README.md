# Algorithms & Data Structures · Part 2 — Case Studies

Structures and algorithms **composed** to solve real problems — because the art isn't knowing each
structure, it's combining the right ones for the query you have. Each follows the
[shared doc template](../../_TEMPLATE.md) and builds on the [Part 1 knowledge docs](../1-knowledge/).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## Composing structures for O(1)
- ✅ [Designing an LRU cache](./lru-cache.md)
  — [hash map](../1-knowledge/data-structures/hash-tables.md) + [doubly linked list](../1-knowledge/data-structures/linked-lists-stacks-queues.md) = O(1) get *and* put.

## Matching the structure to the query
- ✅ [Autocomplete with a trie](./autocomplete-trie.md)
  — [trie](../1-knowledge/data-structures/trees-and-heaps.md) for prefixes + [heap](../1-knowledge/data-structures/trees-and-heaps.md) for top-k.

## Algorithms on weighted graphs
- ✅ [Shortest paths in a map](./shortest-path-maps.md)
  — weighted [graph](../1-knowledge/data-structures/graphs.md) + [Dijkstra/A*](../1-knowledge/algorithms/graph-algorithms.md).

> 💡 The throughline: no single structure is "best" — each case *combines* structures so each covers
> another's weakness. Choosing and composing them is the real skill.
