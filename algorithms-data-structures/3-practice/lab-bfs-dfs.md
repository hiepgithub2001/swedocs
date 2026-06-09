# Lab: BFS & DFS — Traverse a Graph and Solve a Maze

> **Goal:** implement the two [graph traversals](../1-knowledge/algorithms/graph-algorithms.md) — BFS
> (queue) and DFS (stack/recursion) — then use BFS to find the **shortest path through a maze** and
> *feel* why BFS gives shortest paths and DFS doesn't.
>
> **Builds:** [Graph algorithms](../1-knowledge/algorithms/graph-algorithms.md) ·
> [Graphs](../1-knowledge/data-structures/graphs.md). Pure Python 3 — no install.

## Setup
```bash
mkdir traversal-lab && cd traversal-lab
```

## Step 1 — A graph as an adjacency list
Create `traverse.py`:
```python
graph = {
    "A": ["B", "C"],
    "B": ["A", "D", "E"],
    "C": ["A", "F"],
    "D": ["B"],
    "E": ["B", "F"],
    "F": ["C", "E"],
}
```

## Step 2 — BFS (queue, level by level)
```python
from collections import deque

def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()          # FIFO → explore nearest first
        order.append(node)
        for nbr in graph[node]:
            if nbr not in visited:
                visited.add(nbr)        # mark on enqueue (avoid revisits/cycles)
                queue.append(nbr)
    return order

print("BFS:", bfs(graph, "A"))          # A, then its neighbors, then theirs...
```

## Step 3 — DFS (recursion / stack, deep first)
```python
def dfs(graph, start, visited=None, order=None):
    if visited is None: visited, order = set(), []
    visited.add(start); order.append(start)
    for nbr in graph[start]:
        if nbr not in visited:
            dfs(graph, nbr, visited, order)    # go deep before siblings
    return order

print("DFS:", dfs(graph, "A"))
```
```bash
python3 traverse.py
# BFS: ['A', 'B', 'C', 'D', 'E', 'F']   (breadth — level by level)
# DFS: ['A', 'B', 'D', 'E', 'F', 'C']   (depth — dives down each branch)
```
Same graph, same start — the **queue vs. stack** is the *only* difference, and it changes the order
completely.

## Step 4 — BFS finds the SHORTEST path (track parents)
Create `maze.py` — a grid maze where `1` = wall, `0` = open; find the shortest path top-left →
bottom-right:
```python
from collections import deque

maze = [
    [0, 0, 1, 0],
    [1, 0, 1, 0],
    [0, 0, 0, 0],
    [0, 1, 1, 0],
]

def shortest_path(maze):
    rows, cols = len(maze), len(maze[0])
    start, goal = (0, 0), (rows - 1, cols - 1)
    queue = deque([start]); parent = {start: None}
    while queue:
        r, c = queue.popleft()
        if (r, c) == goal:                          # BFS reaches goal via fewest steps
            path = []
            while (r, c) is not None:
                path.append((r, c)); (r, c) = parent[(r, c)]
            return path[::-1]
        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:  # 4-neighbors
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and maze[nr][nc] == 0 and (nr, nc) not in parent:
                parent[(nr, nc)] = (r, c)
                queue.append((nr, nc))
    return None

print("shortest path:", shortest_path(maze))
print("steps:", len(shortest_path(maze)) - 1)
```
```bash
python3 maze.py
# shortest path: [(0,0),(0,1),(1,1),(2,1),(2,2),(2,3),(3,3)]
# steps: 6
```
Because BFS expands in order of distance, the **first** time it reaches the goal is guaranteed
shortest. Try the same with DFS and you'll get *a* path — but not necessarily the shortest.

## Step 5 — Detect a cycle with DFS
Add to `traverse.py`: in a *directed* graph, a back-edge to a node still on the recursion stack means
a cycle (the basis of detecting circular dependencies and validating a
[DAG](../1-knowledge/data-structures/graphs.md)):
```python
def has_cycle(graph):
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in graph}
    def visit(n):
        color[n] = GRAY                      # on the current path
        for nbr in graph[n]:
            if color[nbr] == GRAY: return True       # back-edge → cycle
            if color[nbr] == WHITE and visit(nbr): return True
        color[n] = BLACK; return False
    return any(color[n] == WHITE and visit(n) for n in graph)

print("cycle?", has_cycle({"A": ["B"], "B": ["C"], "C": ["A"]}))   # True
print("cycle?", has_cycle({"A": ["B"], "B": ["C"], "C": []}))      # False
```

## Exercises
1. Make `shortest_path` also return the number of nodes explored; compare BFS vs. a DFS version on
   the maze — DFS often explores more and finds a longer path.
2. Add diagonal moves to the maze. How does the shortest path change?
3. Turn the unweighted BFS into **Dijkstra** by giving cells weights and using a
   [heap](../1-knowledge/data-structures/trees-and-heaps.md) (`heapq`) instead of a deque — the
   [shortest-path-in-maps](../2-case-studies/shortest-path-maps.md) upgrade.
4. Run `has_cycle` on a package-dependency graph of your choosing.

## What you proved
- BFS and DFS differ *only* by **queue vs. stack** — yet that determines traversal order and which
  problems they solve.
- **BFS finds shortest paths** in unweighted graphs (expands by distance); DFS is for
  exploration/cycles/ordering — the [graph-algorithms](../1-knowledge/algorithms/graph-algorithms.md) split.
- A **visited/parent set** is mandatory — it prevents infinite loops on cycles and reconstructs the
  path.

## References
- [Graph algorithms](../1-knowledge/algorithms/graph-algorithms.md) · [Graphs](../1-knowledge/data-structures/graphs.md) · [Trees & heaps](../1-knowledge/data-structures/trees-and-heaps.md)
- Case study: [shortest paths in maps](../2-case-studies/shortest-path-maps.md)
