# Operating Systems

Every section in this knowledge base is organized into **3 parts**:

| Part | Folder | What it contains |
| --- | --- | --- |
| 1️⃣ **Knowledge** | [`1-knowledge/`](./1-knowledge/) | Academic docs — concepts, theory, definitions |
| 2️⃣ **Case Study** | [`2-case-studies/`](./2-case-studies/) | How real kernels & subsystems are built, explained in detail |
| 3️⃣ **Practice** | [`3-practice/`](./3-practice/) | Hands-on labs — write the code that *is* the OS concept |

Open each part's `README.md` for its catalog.

> **Status:** 1️⃣ Knowledge is written (24 topics ✅). 2️⃣ Case Studies and 3️⃣ Practice are
> scaffolded with catalogs and templates — topics are listed but not yet written (⬜).

---

## 1️⃣ Knowledge — [catalog »](./1-knowledge/)
Theory and concepts: fundamentals (kernel, syscalls, interrupts), processes &
scheduling, concurrency & synchronization, memory & virtual memory, storage &
file systems, virtualization & containers, and protection.

## 2️⃣ Case Study — [catalog »](./2-case-studies/)
How real systems are built end-to-end: the Linux **CFS/EEVDF** scheduler, Linux
**virtual memory**, **ext4** journaling, **container** internals (namespaces +
cgroups), and the classic **xv6** teaching kernel.

## 3️⃣ Practice — [catalog »](./3-practice/)
Runnable labs where you **write the code that is the concept** — a shell with
`fork`/`exec`, a thread pool, a `malloc` allocator, a page-replacement simulator,
the dining philosophers, and a container built from raw Linux namespaces & cgroups.
Mostly 🐧 Linux + C/Python, free and local.
