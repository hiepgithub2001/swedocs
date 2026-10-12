# Part I-A — Virtualizing the CPU

> Let programs run directly, retain control of the machine, and decide which ready program gets the next slice.

The source's Part I is *Virtualization*. This distillation separates its CPU and memory sequences into two navigable parts without changing chapter order. Dialogues 3 and 11 introduce and review the CPU illusion; their lessons are folded into this index and the substantive chapters.

A process needs saved state, controlled kernel entry and a way for the kernel to regain control. Those are mechanisms. Responsiveness, completion time and resource shares are policy goals. A scheduler cannot optimize all of them independently of the workload.

| Source chapter | Read here |
| --- | --- |
| 4 | [The process abstraction](./04-process.md) |
| 5 | [The process API](./05-process-api.md) |
| 6 | [Limited direct execution](./06-limited-direct-execution.md) |
| 7 | [Scheduling metrics and baseline policies](./07-scheduling.md) |
| 8 | [Multi-level feedback queues](./08-mlfq.md) |
| 9 | [Proportional-share scheduling](./09-proportional-share.md) |
| 10 | [Multiprocessor scheduling](./10-multiprocessor-scheduling.md) |

The closing dialogue's general lesson is that mechanisms establish what is possible; policies choose among possibilities. Workload assumptions determine whether a policy's benefits survive contact with real jobs.

---

Previous: [Introduction](../02-introduction.md) · Next: [The process](./04-process.md)
