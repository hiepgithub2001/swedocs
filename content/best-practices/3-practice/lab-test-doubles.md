# Lab: Test Doubles — Stub, Mock, Spy & Fake

> **Goal:** test a class that depends on slow/external collaborators by replacing them with
> [test doubles](../1-knowledge/testing/test-doubles-and-tdd.md) — and feel the difference between
> a **stub** (controls input), a **mock** (verifies interaction), and a **fake** (real-ish impl).
>
> **Builds:** [Test doubles & TDD](../1-knowledge/testing/test-doubles-and-tdd.md). Pure Python 3
> (built-in `unittest.mock` — no install).

## The system under test
A `SignupService` that depends on a user store, an email sender, and a clock — none of which we
want to really hit in a unit test. Create `signup.py`:
```python
class SignupService:
    def __init__(self, users, mailer, clock):     # dependencies injected = testable seams
        self.users, self.mailer, self.clock = users, mailer, clock

    def register(self, email):
        if self.users.exists(email):
            raise ValueError("already registered")
        self.users.save(email, created_at=self.clock.now())
        self.mailer.send_welcome(email)
        return True
```

## Setup
```bash
mkdir doubles-lab && cd doubles-lab
# create signup.py (above) and test_signup.py (below)
```

## Step 1 — STUB: control what a dependency returns
A stub feeds canned inputs so you can test a branch. Here, stub `users.exists` to return `True`:
```python
import unittest
from unittest.mock import Mock
from signup import SignupService

class TestSignup(unittest.TestCase):
    def test_rejects_duplicate(self):
        users = Mock()
        users.exists.return_value = True            # STUB: force the "already exists" path
        svc = SignupService(users, Mock(), Mock())
        with self.assertRaises(ValueError):
            svc.register("a@b.com")
```
You tested the duplicate path **without a database** — the stub controlled the input.

## Step 2 — MOCK: verify an interaction happened
Sometimes the behavior *is* the side effect ("did we send the welcome email?"). Assert the call:
```python
    def test_sends_welcome_on_success(self):
        users = Mock(); users.exists.return_value = False
        mailer = Mock()
        SignupService(users, mailer, Mock()).register("a@b.com")
        mailer.send_welcome.assert_called_once_with("a@b.com")   # MOCK: verify the interaction
```
This checks *behavior* (the email was sent), not a return value.

## Step 3 — Control the clock (determinism)
Time makes tests flaky. Stub `clock.now()` so the test is deterministic and assert what was saved:
```python
    def test_saves_with_timestamp(self):
        users = Mock(); users.exists.return_value = False
        clock = Mock(); clock.now.return_value = "2026-06-09T00:00:00"
        SignupService(users, Mock(), clock).register("a@b.com")
        users.save.assert_called_once_with("a@b.com", created_at="2026-06-09T00:00:00")
```
```bash
python3 -m unittest -v      # all three green, in milliseconds, no DB / email / real clock
```

## Step 4 — FAKE: a working stand-in (and why it's often better)
Mocks verify calls but couple the test to *how* code works. A **fake** — a real, in-memory
implementation — tests *behavior* more robustly. Add to `test_signup.py`:
```python
class FakeUsers:                       # a real-ish implementation, in memory
    def __init__(self): self._db = {}
    def exists(self, email): return email in self._db
    def save(self, email, created_at): self._db[email] = created_at

class TestWithFake(unittest.TestCase):
    def test_second_signup_same_email_fails(self):
        users = FakeUsers()
        svc = SignupService(users, Mock(), Mock(now=lambda: "t"))
        svc.register("a@b.com")                          # first succeeds
        with self.assertRaises(ValueError):
            svc.register("a@b.com")                      # second rejected — real behavior, no mocking gymnastics
```
Notice the fake let you test a *sequence* (register twice) naturally — awkward with pure mocks.

## Exercises
1. Add a test: if `mailer.send_welcome` raises, does `register` leave a half-created user? (Reveals a
   real design question — should it roll back?)
2. Replace the `FakeUsers` `Mock()` mailer with a `SpyMailer` that records every email sent, then
   assert on the recorded list. (That's a **spy**.)
3. Discuss: which tests would survive a refactor of `register`'s internals — the mock-based or the
   fake-based ones? (Fakes test behavior, so they're more robust.)

## What you proved
- **Stubs** control inputs (force a code path); **mocks** verify interactions (a call happened);
  **fakes** are lightweight real implementations that test behavior most robustly; **spies** record
  for later assertions.
- [Dependency injection](../../architecture-patterns/1-knowledge/architectural-styles/dependency-injection.md)
  is what makes all of this possible — no seams, no doubles.
- Prefer **fakes/stubs** over heavy mocking to avoid [over-mocking](../1-knowledge/testing/test-doubles-and-tdd.md)
  tests that pass while reality breaks.

## References
- [Test doubles & TDD](../1-knowledge/testing/test-doubles-and-tdd.md) · [Dependency injection](../../architecture-patterns/1-knowledge/architectural-styles/dependency-injection.md)
- Python [`unittest.mock` docs](https://docs.python.org/3/library/unittest.mock.html)
