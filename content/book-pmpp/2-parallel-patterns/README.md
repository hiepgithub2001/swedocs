# Part II — Parallel patterns

> Six primitive patterns that recur in almost every parallel program. Each
> chapter also introduces one new hardware feature or optimization, so by the
> end the whole checklist from chapter 6 has been applied for real.

| | Pattern | What it teaches |
| --- | --- | --- |
| [Convolution](./07-convolution.md) | weighted sum of a neighbourhood | constant memory, input tiles larger than output tiles, halo cells, caching |
| [Stencil](./08-stencil.md) | sparse 3D neighbourhood, iterated | thread coarsening along z, register tiling |
| [Parallel histogram](./09-histogram.md) | data-dependent output | race conditions, atomics, privatization, aggregation |
| [Reduction](./10-reduction.md) | many values → one | reduction trees, control and memory divergence, hierarchical reduction |
| [Prefix sum (scan)](./11-prefix-sum.md) | running totals | work efficiency, Kogge-Stone vs Brent-Kung, single-pass scan |
| [Merge](./12-merge.md) | two sorted lists → one | data-dependent input ranges, co-rank, circular buffers |

```mermaid
flowchart LR
    CONV["7 · Convolution<br/>tiling with halos"] --> STEN["8 · Stencil<br/>coarsening, register tiling"]
    HIST["9 · Histogram<br/>atomics, privatization"] --> RED["10 · Reduction<br/>divergence"]
    RED --> SCAN["11 · Scan<br/>work efficiency"]
    SCAN --> MERGE["12 · Merge<br/>dynamic inputs"]
    SCAN -.->|"used by"| SORT(["13 · Sorting"])
    MERGE -.->|"used by"| SORT
    HIST -.->|"privatized queues"| BFS(["15 · Graph traversal"])
    CONV -.->|"basis of"| CNN(["16 · Deep learning"])
```

---

Previous: [Performance considerations](../1-fundamentals/06-performance-considerations.md) ·
Next: [Convolution](./07-convolution.md)
