# Part II — Concurrency

> Shared memory turns independent instruction streams into a protocol-design problem: who may change state, and who must wait?

Dialogues 25 and 34 introduce and review this part. Their warning is practical: plausible-looking threaded code can hide failures that depend on an uncommon interleaving. Reason about state and ordering before choosing a synchronization primitive.

| Source chapter | Read here |
| --- | --- |
| 26 | [Threads and interleavings](./26-threads.md) |
| 27 | [The thread API](./27-thread-api.md) |
| 28 | [Building locks](./28-locks.md) |
| 29 | [Concurrent data structures](./29-concurrent-data-structures.md) |
| 30 | [Condition variables](./30-condition-variables.md) |
| 31 | [Semaphores](./31-semaphores.md) |
| 32 | [Concurrency bugs](./32-concurrency-bugs.md) |
| 33 | [Event-based concurrency](./33-event-loops.md) |

Locks establish exclusive access. Condition variables coordinate waiting for predicates. Semaphores count available permits. They are related, but substituting one for another without understanding the state transition can introduce lost wakeups or deadlock.

The source's closing discussion points toward higher-level parallel work organization, including MapReduce, rather than insisting every application hand-manage low-level threads. Event loops offer a different organization of concurrency, not immunity from blocking or shared-state problems.

---

Previous: [VAX/VMS](../2-memory/23-vax-vms.md) · Next: [Threads](./26-threads.md)
