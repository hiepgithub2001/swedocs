# Part II — Running programs on a system

> How source files become a running process, and what the operating system does
> for it: the linker that joins the pieces, the exceptions and signals that
> interrupt it, and the virtual memory that gives it a private address space.

| | |
| --- | --- |
| [Linking](./01-linking.md) | Object files, symbol resolution, static and shared libraries, relocation, PIC |
| [Exceptional control flow](./02-exceptional-control-flow.md) | Exceptions, processes, `fork`/`exec`/`wait`, signals, and the races they cause |
| [Virtual memory](./03-virtual-memory.md) | Page tables, TLBs, memory mapping, copy-on-write, `malloc`, GC, memory bugs |

---

Previous: [The memory hierarchy](../1-program-structure/05-memory-hierarchy.md) ·
Next: [Linking](./01-linking.md)
