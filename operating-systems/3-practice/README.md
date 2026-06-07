# Operating Systems · Part 3 — Practice

**Practice = write the code that *is* the OS concept.**

You don't really understand `fork`, paging, or a semaphore until you've written one.
Each lab is a small, self-contained program that implements a single core idea so you
can run it, break it, and watch the behavior. Mostly 🐧 **Linux + C** (with a few in
🐍 Python) — free, local, no cloud needed.

> 🧩 The goal is **mechanism**: build the smallest thing that exhibits the real behavior
> — a context switch you can see, a deadlock you can trigger, a page fault you can count.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## A. Processes & the shell (start here)
- ⬜ [Write a Unix shell](./project-shell.md)
  — `fork` + `exec` + `wait`, pipes, redirection. *Builds:* process creation, file
  descriptors, the parent/child model. Mirrors [process lifecycle](../1-knowledge/processes-scheduling/process-lifecycle.md).
- ⬜ [Observe syscalls with strace](./project-strace-syscalls.md)
  — watch a real program's conversation with the kernel. *Builds:* the syscall boundary,
  user↔kernel transitions.

## B. Concurrency
- ⬜ [Build a thread pool](./project-thread-pool.md)
  — N worker threads pull from a shared queue. *Builds:* mutexes, condition variables,
  the producer-consumer pattern.
- ⬜ [The dining philosophers](./project-dining-philosophers.md)
  — reproduce a deadlock, then fix it. *Builds:* lock ordering, deadlock prevention.

## C. Memory
- ⬜ [Write a `malloc` allocator](./project-allocator.md)
  — a free-list heap allocator over `sbrk`/`mmap`. *Builds:* fragmentation, splitting &
  coalescing, alignment.
- ⬜ [Page-replacement simulator](./project-page-replacement-sim.md)
  — feed a reference string to FIFO / LRU / Optimal, count faults, see Belady's anomaly.
  *Builds:* paging, locality, replacement policy.

## D. Isolation
- ⬜ [A container from scratch](./project-container-from-scratch.md)
  — `clone()` with namespaces + a cgroup + `pivot_root`. *Builds:* exactly what Docker
  does under the hood. Mirrors [container internals](../2-case-studies/container-internals.md).

---

## What each lab contains
1. **What you'll build** — the program + a diagram of the moving parts
2. **Concepts you exercise** — links to the [Knowledge](../1-knowledge/) docs each piece comes from
3. **Build it** — the actual code, small enough to read in full
4. **Run it** — commands to compile and drive it
5. **What to observe & why** — the behavior that proves the concept
6. **Break it** — trigger the failure mode (deadlock, thrash, leak) on purpose
7. **Extend it** — concrete next features
