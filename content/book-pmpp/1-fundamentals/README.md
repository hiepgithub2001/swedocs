# Part I — Fundamental concepts

> Enough CUDA to write a correct kernel, and enough hardware to know why it
> is slow: threads and grids, how SMs schedule warps, the memory hierarchy,
> tiling, coalescing, and the six-item optimization checklist that the rest
> of the book applies pattern by pattern.

| | |
| --- | --- |
| [Heterogeneous data parallel computing](./02-data-parallel-computing.md) | Data parallelism, host and device, `cudaMalloc`/`cudaMemcpy`, kernels, grids, blocks, thread indices |
| [Multidimensional grids and data](./03-multidimensional-grids.md) | 2D and 3D grids, row-major flattening, boundary guards, image blur, naive matrix multiply |
| [Compute architecture and scheduling](./04-compute-architecture.md) | SMs, block scheduling, barriers, transparent scalability, warps, SIMD, divergence, latency hiding, occupancy |
| [Memory architecture and data locality](./05-memory-architecture.md) | Arithmetic intensity, the roofline, registers and shared memory, tiled matrix multiply, boundary checks |
| [Performance considerations](./06-performance-considerations.md) | DRAM bursts, coalescing, corner turning, banks and channels, thread coarsening, the optimization checklist |

```mermaid
flowchart LR
    C2["2 · write a kernel"] --> C3["3 · map threads<br/>to 2D/3D data"] --> C4["4 · how warps run"] --> C5["5 · keep data on chip"] --> C6["6 · move bytes efficiently"]
    C4 -.->|"divergence, occupancy"| CHK(["Optimization checklist"])
    C5 -.->|"tiling"| CHK
    C6 -.->|"coalescing, coarsening"| CHK
```

---

Previous: [Introduction](../01-introduction.md) ·
Next: [Heterogeneous data parallel computing](./02-data-parallel-computing.md)
