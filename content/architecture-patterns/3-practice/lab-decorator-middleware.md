# Lab: Composable Middleware with the Decorator Pattern

> **Goal:** build a request pipeline where cross-cutting concerns (logging, timing, auth, retry)
> are **stackable wrappers** around a handler — the [Decorator pattern](../1-knowledge/design-patterns/structural-patterns.md)
> and exactly how web middleware works.
>
> **Builds:** [Structural patterns — Decorator](../1-knowledge/design-patterns/structural-patterns.md) ·
> [Coupling & cohesion](../1-knowledge/fundamentals/coupling-and-cohesion.md). Pure Python.

## Setup
```bash
mkdir decorator-lab && cd decorator-lab
```

## Step 1 — The handler and the temptation to cram
A handler with concerns jammed inside it:
```python
# messy.py
import time
def handle(request):
    print(f"LOG  {request}")                 # logging
    start = time.time()                       # timing
    if request.get("user") != "admin":        # auth
        return {"status": 403}
    result = {"status": 200, "echo": request} # the actual work
    print(f"TIME {time.time()-start:.4f}s")
    return result
```
Logging, timing, and auth drown the one line that matters. They're **cross-cutting** — they
recur on every handler. We want them as reusable layers, not copy-paste.

## Step 2 — Define the contract and the core handler
Create `middleware.py`. A handler is just `Callable[[dict], dict]`:
```python
from typing import Callable
Handler = Callable[[dict], dict]

def app(request: dict) -> dict:               # the pure core — one job
    return {"status": 200, "echo": request}
```

## Step 3 — Write decorators (same shape in, same shape out)
Each wraps a handler and returns a handler — so they **compose**:
```python
import time

def with_logging(next_: Handler) -> Handler:
    def h(req):
        print(f"LOG  → {req}")
        resp = next_(req)
        print(f"LOG  ← {resp['status']}")
        return resp
    return h

def with_timing(next_: Handler) -> Handler:
    def h(req):
        t = time.perf_counter()
        try:    return next_(req)
        finally: print(f"TIME {(time.perf_counter()-t)*1e3:.2f}ms")
    return h

def require_admin(next_: Handler) -> Handler:
    def h(req):
        if req.get("user") != "admin":
            return {"status": 403}
        return next_(req)                      # short-circuits: never calls inner handler
    return h
```

## Step 4 — Stack them
Append to `middleware.py`:
```python
pipeline = with_logging(with_timing(require_admin(app)))
#          outermost ───────────────────────────► innermost

if __name__ == "__main__":
    print("ADMIN:", pipeline({"user": "admin", "path": "/x"}))
    print("GUEST:", pipeline({"user": "guest", "path": "/x"}))
```
Run:
```bash
python3 middleware.py
```
Expected (order shows the layers nesting in, then out):
```
LOG  → {'user': 'admin', 'path': '/x'}
TIME 0.01ms
LOG  ← 200
ADMIN: {'status': 200, 'echo': {'user': 'admin', 'path': '/x'}}
LOG  → {'user': 'guest', 'path': '/x'}
TIME 0.00ms
LOG  ← 403
GUEST: {'status': 403}
```
Note the guest request is **stopped at `require_admin`** — `app` never runs — yet logging and
timing still wrap it. Each concern is one isolated, reusable layer.

## Step 5 — Reorder and observe
Swap to `pipeline = require_admin(with_logging(with_timing(app)))` and rerun. Now a guest is
rejected *before* logging — so you get no log line for it. **Order matters** in a decorator
stack: it's the difference between "log all requests" and "log only authorized ones." This is the
real reason frameworks document middleware ordering.

## Exercises
1. Write `with_retry(times)` that re-invokes the inner handler on exception. Place it correctly
   in the stack so timing measures *all* attempts.
2. Build a `compose(*mw)` helper so you can write `compose(with_logging, with_timing,
   require_admin)(app)` instead of nesting by hand.
3. Convert one decorator to a *class* with `__call__` (stateful — e.g. count requests). Same
   pattern, object form.
4. Compare to Python's `@decorator` syntax — rewrite `with_logging` as an `@`-decorator and note
   it's the identical idea.

## What you proved
- Decorator adds behavior by **wrapping**, keeping the same interface, so layers stack freely.
- Cross-cutting concerns become reusable, independently testable units instead of copy-paste.
- It's literally how Express/Django/ASGI middleware works — and why their **order** is part of
  the contract. Same composition appears in the [plugin architecture](../2-case-studies/plugin-architecture.md).

## References
- [Structural patterns — Decorator](../1-knowledge/design-patterns/structural-patterns.md) · [Coupling & cohesion](../1-knowledge/fundamentals/coupling-and-cohesion.md)
