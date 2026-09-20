# Locks, Mutexes & Semaphores

> The primitives that enforce mutual exclusion and coordination: **locks/mutexes** (one
> holder at a time), **semaphores** (a counter gating N resources), and **condition
> variables** (wait until a predicate holds).

## Problem
[Race conditions](./race-conditions.md) happen when threads enter a critical section
together. We need primitives to (a) guarantee only one thread runs the critical section,
and (b) let threads *wait* efficiently for a condition (a queue becoming non-empty) instead
of burning CPU spinning. These primitives must be correct, fast in the common case, and
fair enough to avoid starvation.

## Core concepts

**Mutex (mutual exclusion lock).** `lock()` / `unlock()` around a critical section; only
the holder may proceed, others block. The core operation is **atomic** test-and-set /
compare-and-swap so two threads can't both acquire it.

```c
pthread_mutex_lock(&m);
balance -= amount;          // critical section — exclusive
pthread_mutex_unlock(&m);
```

**Spinlock vs blocking mutex.** A **spinlock** loops ("spins") until the lock frees —
great if the wait is *shorter than a [context switch](../processes-scheduling/context-switching.md)*
(very short critical sections, inside the kernel). A **blocking mutex** parks the thread
(the scheduler runs someone else) — better when waits are long. Spinning wastes CPU;
blocking costs a switch. Real mutexes (Linux **futex**) are hybrid: spin briefly, then sleep.

**Semaphore.** An integer counter with two atomic ops:
- `wait()`/`P` — decrement; if it goes negative, block.
- `post()`/`V` — increment; wake a waiter.

A semaphore initialized to **1** is a mutex (**binary semaphore**); initialized to **N** it
guards N identical resources (a connection pool of size N); used as a **signal** (init 0),
one thread `post()`s to wake another — the basis of producer/consumer.

```mermaid
flowchart LR
    P[Producer] -->|post: items++| S{{semaphore<br/>count = items}}
    S -->|wait: items--| C[Consumer blocks if 0]
```

**Condition variable.** "Sleep until a predicate is true." Always used **with a mutex**
and **in a `while` loop** (to recheck after wakeup — spurious wakeups happen):

```c
pthread_mutex_lock(&m);
while (queue_empty())                 // WHILE, not if
    pthread_cond_wait(&cv, &m);       // atomically unlock+sleep, relock on wake
item = dequeue();
pthread_mutex_unlock(&m);
// producer: lock, enqueue, pthread_cond_signal(&cv), unlock
```

**Higher-level constructs:** a **monitor** bundles data + mutex + condition variables
(Java `synchronized`, Python `with lock:`). **Read-write locks** allow many readers or one
writer. **Atomics** and **lock-free** structures (CAS loops) avoid locks entirely for
simple state.

## Example
The mutex fixing the lost-update race from [race conditions](./race-conditions.md):

```c
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
void *worker(void *_) {
    for (int i = 0; i < 1000000; i++) {
        pthread_mutex_lock(&m);
        counter++;                    // now atomic w.r.t. other threads
        pthread_mutex_unlock(&m);
    }
    return NULL;
}                                     // 4 threads now reliably total 4,000,000
```

For a hot counter, `atomic_fetch_add(&counter, 1)` is faster — no blocking, one CAS.

## Common tools
| Tool | What it is | Use it for |
| --- | --- | --- |
| `pthread_mutex` / `_cond` / `_rwlock` | POSIX primitives | C/C++ synchronization |
| **futex** (`man 2 futex`) | Fast userspace mutex | the kernel primitive most locks build on |
| `sem_t` / `sem_open` | POSIX semaphores | counting resources, cross-process signaling |
| `std::atomic`, `<stdatomic.h>` | Atomics | lock-free counters/flags |
| Helgrind, TSan | Checkers | lock-order & race detection |

## Trade-offs
- ✅ Correctly serialize access to shared state and coordinate threads efficiently.
- ⚠️ Locks add overhead and serialize — coarse locks kill parallelism, fine locks invite
  [deadlock](./deadlock.md) and bugs ("lock granularity" tuning).
- ⚠️ Forgetting to unlock, locking in inconsistent order, or using `if` instead of `while`
  with condition variables = classic, hard bugs.
- ⚠️ **Priority inversion**: low-prio lock holder blocks a high-prio waiter → priority
  inheritance.

## Real-world examples
- **Linux futex** — almost every userspace lock (glibc, Go, Java) is a futex: spin then
  sleep, so uncontended locks never enter the kernel.
- **Connection pools** — a counting semaphore of size N caps concurrent DB connections.
- **Java `synchronized` / `ReentrantLock`** — monitor-style mutual exclusion.

## References
- OSTEP — "Locks," "Condition Variables," "Semaphores"
- `man 2 futex`, `man 7 pthreads`, *The Little Book of Semaphores* — Downey
