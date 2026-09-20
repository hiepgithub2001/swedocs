# Lab: Ports & Adapters — Swap a Database Without Touching the Core

> **Goal:** build a domain use case behind a **port**, give it two **adapters** (in-memory and
> file-based), and prove you can swap persistence — and unit-test the logic with **no I/O** —
> without changing a line of business code.
>
> **Builds:** [Hexagonal/Clean architecture](../1-knowledge/architectural-styles/layered-hexagonal-clean.md) ·
> [Dependency injection](../1-knowledge/architectural-styles/dependency-injection.md) ·
> [SOLID — Dependency Inversion](../1-knowledge/fundamentals/solid-principles.md). Pure Python.

## Setup
```bash
mkdir hexagonal-lab && cd hexagonal-lab
```

## Step 1 — The domain core (no I/O, no framework)
Create `core.py` — the entity, the port, and the use case. None of it imports a database:
```python
from dataclasses import dataclass
from typing import Protocol, Optional

@dataclass
class Task:
    id: str
    title: str
    done: bool = False

class TaskRepository(Protocol):          # PORT — owned by the core, expresses what it needs
    def save(self, task: Task) -> None: ...
    def get(self, id: str) -> Optional[Task]: ...

class CompleteTask:                       # USE CASE — pure policy
    def __init__(self, repo: TaskRepository):
        self.repo = repo
    def __call__(self, task_id: str) -> Task:
        task = self.repo.get(task_id)
        if task is None:
            raise KeyError(f"no task {task_id}")
        if task.done:
            raise ValueError("already done")     # a business rule, in the core
        task.done = True
        self.repo.save(task)
        return task
```

## Step 2 — Two adapters implementing the port
Create `adapters.py`:
```python
import json, os
from typing import Optional
from core import Task, TaskRepository

class InMemoryRepo:                       # adapter A — for tests & demos
    def __init__(self): self._db: dict[str, Task] = {}
    def save(self, task): self._db[task.id] = task
    def get(self, id): return self._db.get(id)

class JsonFileRepo:                        # adapter B — real persistence
    def __init__(self, path): self.path = path
    def _load(self): 
        return json.load(open(self.path)) if os.path.exists(self.path) else {}
    def save(self, task):
        data = self._load(); data[task.id] = task.__dict__
        json.dump(data, open(self.path, "w"))
    def get(self, id):
        row = self._load().get(id)
        return Task(**row) if row else None
```
Note: adapters hold **zero business logic** — just translation to/from storage.

## Step 3 — Wire at the composition root and run
Create `main.py`:
```python
from core import Task, CompleteTask
from adapters import InMemoryRepo, JsonFileRepo
import sys

repo = JsonFileRepo("tasks.json") if "--file" in sys.argv else InMemoryRepo()
repo.save(Task("t1", "write the lab"))

complete = CompleteTask(repo)             # inject the chosen adapter
print(complete("t1"))
```
Run both ways — **same use-case code, different storage**:
```bash
python3 main.py
python3 main.py --file && cat tasks.json
```
Expected:
```
Task(id='t1', title='write the lab', done=True)
```
and with `--file`, a `tasks.json` containing the completed task. You swapped persistence by
changing **one line at the composition root** — Dependency Inversion in action.

## Step 4 — Test the rule with no infrastructure
Create `test_core.py`:
```python
from core import Task, CompleteTask
from adapters import InMemoryRepo

def test_completing_marks_done():
    repo = InMemoryRepo(); repo.save(Task("t1", "x"))
    assert CompleteTask(repo)("t1").done is True

def test_double_complete_rejected():
    repo = InMemoryRepo(); repo.save(Task("t1", "x", done=True))
    try: CompleteTask(repo)("t1"); assert False
    except ValueError: pass
```
Run:
```bash
python3 -m pytest -q    # or: python3 -m unittest
```
The tests touch **no disk, no DB** — they inject `InMemoryRepo`. That speed and isolation is the
whole point of the port. Compare with the [refactoring case study](../2-case-studies/refactoring-to-hexagonal.md),
which does this to a real tangled service.

## Step 5 — Prove the core never knew
Search the core for any storage dependency:
```bash
grep -E "json|sqlite|open\(|import os" core.py || echo "core has zero I/O imports ✅"
```
Expected:
```
core has zero I/O imports ✅
```
That emptiness *is* the architecture: details depend on the core, never the reverse.

## Exercises
1. Add a `SqliteRepo` adapter. How much of `core.py` changed? (Answer: nothing.)
2. Add an `EmailNotifier` **port** + adapter so completing a task notifies someone; inject a
   `SpyNotifier` in tests to assert it was called.
3. Introduce a driving adapter: a tiny CLI or Flask route that calls `CompleteTask`. Note the
   core still doesn't import Flask.
4. Break the boundary on purpose — put a `json.dump` inside the use case — and articulate which
   guarantees you just lost.

## What you proved
- A port lets the core declare *what it needs* without knowing *who provides it*.
- Adapters are swappable and individually testable; the use case is testable in milliseconds.
- [Dependency injection](../1-knowledge/architectural-styles/dependency-injection.md) at a single
  composition root is what makes the swap a one-line change — the practical heart of
  [hexagonal architecture](../1-knowledge/architectural-styles/layered-hexagonal-clean.md).

## References
- [Hexagonal/Clean architecture](../1-knowledge/architectural-styles/layered-hexagonal-clean.md) · [Dependency injection](../1-knowledge/architectural-styles/dependency-injection.md) · [SOLID](../1-knowledge/fundamentals/solid-principles.md)
- Case study: [refactoring to hexagonal](../2-case-studies/refactoring-to-hexagonal.md)
