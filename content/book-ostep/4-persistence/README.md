# Part III-A — Persistence

> A file is a promise implemented by device requests, allocation structures and a recovery protocol.

Dialogues 35 and 45 introduce persistence and review the file-system designs. Their lessons are folded into the chapters: storage behavior constrains software design, and a completed-looking update must be examined at the point a failure can interrupt it.

| Source chapter | Read here |
| --- | --- |
| 36 | [I/O devices](./36-io-devices.md) |
| 37 | [Hard disks](./37-hard-disks.md) |
| 38 | [RAID](./38-raid.md) |
| 39 | [Files and directories](./39-files-directories.md) |
| 40 | [File-system implementation](./40-file-system-implementation.md) |
| 41 | [Locality and FFS](./41-ffs.md) |
| 42 | [Crash consistency](./42-crash-consistency.md) |
| 43 | [Log-structured file systems](./43-lfs.md) |
| 44 | [Data integrity](./44-data-integrity.md) |

Locality improves mechanical-disk performance. Redundancy makes specified faults recoverable. Journaling constrains partial updates. Checksums detect specified kinds of corruption. These solve different problems; none is a substitute for all the others.

The original's HDD-oriented designs are retained as mechanisms with explicit physical assumptions. The supplied PDF also includes a flash-SSD appendix; that remains after the main text, in the compilation's actual order.

---

Previous: [Event loops](../3-concurrency/33-event-loops.md) · Next: [I/O devices](./36-io-devices.md)
