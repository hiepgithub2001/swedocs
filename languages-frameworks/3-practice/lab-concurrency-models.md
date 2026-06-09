# Lab: Concurrency Models Hands-On — Threads vs. Async vs. Processes

> **Goal:** run the *same* workload three ways and watch each [concurrency model](../1-knowledge/language-design/concurrency-models.md)
> shine or fail — async/threads for I/O-bound, processes for CPU-bound — and see the GIL and the
> event loop with your own eyes.
>
> **Builds:** [Concurrency models](../1-knowledge/language-design/concurrency-models.md) ·
> [JS event loop case study](../2-case-studies/javascript-event-loop.md). Python 3 + Node (both
> installed); no extra packages.

## Setup
```bash
mkdir concurrency-lab && cd concurrency-lab
python3 --version && node --version
```

## Step 1 — A baseline: sequential I/O-bound work
"I/O" simulated with `sleep` (the thread/loop is idle, waiting). Create `seq.py`:
```python
import time
def io_task(i): time.sleep(1); return i      # pretend: a 1s network call

t = time.perf_counter()
results = [io_task(i) for i in range(5)]      # one after another
print(f"sequential: {time.perf_counter()-t:.1f}s")   # ~5.0s
```
```bash
python3 seq.py        # sequential: 5.0s
```
Five 1-second waits, done serially = 5s. We're wasting time idling.

## Step 2 — Threads (I/O-bound: helps despite the GIL)
Create `threads.py`:
```python
import time, concurrent.futures as cf
def io_task(i): time.sleep(1); return i

t = time.perf_counter()
with cf.ThreadPoolExecutor(max_workers=5) as ex:
    results = list(ex.map(io_task, range(5)))
print(f"threads: {time.perf_counter()-t:.1f}s")      # ~1.0s
```
```bash
python3 threads.py     # threads: 1.0s
```
~1s! While one thread sleeps on I/O, the GIL is released and others run. **For I/O-bound work,
threads help even in Python.**

## Step 3 — Async (same win, one thread, no locks)
Create `async_io.py`:
```python
import asyncio, time
async def io_task(i): await asyncio.sleep(1); return i

async def main():
    t = time.perf_counter()
    results = await asyncio.gather(*(io_task(i) for i in range(5)))
    print(f"asyncio: {time.perf_counter()-t:.1f}s")   # ~1.0s
asyncio.run(main())
```
```bash
python3 async_io.py    # asyncio: 1.0s
```
Same ~1s — but on a **single thread**, no thread pool, no locks. Each task yields the
[event loop](../2-case-studies/javascript-event-loop.md) at `await`. Scales to thousands of tasks.

## Step 4 — Now make it CPU-bound and watch the difference
Replace the "I/O" with real computation. Create `cpu.py`:
```python
import time, concurrent.futures as cf
def cpu_task(n):                       # real CPU work — no sleeping
    return sum(i*i for i in range(n))

N, COUNT = 5_000_000, 4
def run(executor_cls, label):
    t = time.perf_counter()
    with executor_cls(max_workers=4) as ex:
        list(ex.map(cpu_task, [N]*COUNT))
    print(f"{label}: {time.perf_counter()-t:.2f}s")

run(cf.ThreadPoolExecutor, "threads (CPU-bound)")     # NOT faster — GIL serializes it
run(cf.ProcessPoolExecutor, "processes (CPU-bound)")  # faster — real parallelism across cores
```
```bash
python3 cpu.py
# threads (CPU-bound):   ~X.XXs
# processes (CPU-bound): ~ (noticeably less on a multi-core box)
```
**This is the GIL lesson:** threads give *no* CPU speedup (only one runs Python bytecode at a time),
but **processes** sidestep the GIL and use multiple cores. Match the model to the workload.

## Step 5 — See the JS event loop ordering
Create `loop.js`:
```javascript
console.log("1: sync");
setTimeout(() => console.log("4: timeout (macrotask)"), 0);
Promise.resolve().then(() => console.log("3: promise (microtask)"));
console.log("2: sync");
```
```bash
node loop.js
# 1: sync
# 2: sync
# 3: promise (microtask)
# 4: timeout (macrotask)
```
Synchronous code drains first, then **microtasks before macrotasks** — the
[event-loop ordering](../2-case-studies/javascript-event-loop.md) that trips everyone up.

## Exercises
1. Bump Step 2/3 to 100 tasks. Async barely changes; the thread pool needs more workers. Why?
2. In `async_io.py`, replace one `await asyncio.sleep(1)` with a *blocking* `time.sleep(1)`. Total
   time jumps — you blocked the loop. This is the "don't block the event loop" rule, live.
3. Add a CPU-bound `sum(i*i ...)` inside an async task and watch it stall all others.
4. Summarize the rule of thumb: which model for an API gateway? a video encoder? a chat server?

## What you proved
- **I/O-bound** work → threads *or* async both win (the waiting overlaps); async does it on one
  thread without locks.
- **CPU-bound** work → only **processes** (or a non-GIL language) give real parallelism in Python.
- The JS event loop runs sync → microtasks → macrotasks, concurrency without parallelism — exactly
  the [concurrency-models](../1-knowledge/language-design/concurrency-models.md) theory.

## References
- [Concurrency models](../1-knowledge/language-design/concurrency-models.md) · [JS event loop](../2-case-studies/javascript-event-loop.md) · [Go concurrency](../2-case-studies/go-concurrency.md)
