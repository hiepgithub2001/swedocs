# Lab: A TDD Kata — Build a String Calculator Test-First

> **Goal:** experience the [TDD](../1-knowledge/testing/test-doubles-and-tdd.md) rhythm —
> **red → green → refactor** — by growing a small function one failing test at a time, and *feel*
> how tests-first shapes the code.
>
> **Builds:** [Test doubles & TDD](../1-knowledge/testing/test-doubles-and-tdd.md) ·
> [Testing fundamentals](../1-knowledge/testing/testing-fundamentals.md). Pure Python 3 (built-in
> `unittest` — no install).

## The kata
Write `add(numbers: str) -> int` that sums a comma-separated string:
`""` → 0, `"5"` → 5, `"1,2,3"` → 6. We'll grow it **test-first**, never writing code without a
failing test demanding it.

## Setup
```bash
mkdir tdd-lab && cd tdd-lab
touch calculator.py
```

## Step 1 — 🔴 RED: write a failing test first
Create `test_calculator.py`:
```python
import unittest
from calculator import add

class TestAdd(unittest.TestCase):
    def test_empty_string_is_zero(self):
        self.assertEqual(add(""), 0)
```
Run it — it **must fail** (the function doesn't exist yet). That's the point:
```bash
python3 -m unittest      # ImportError / fail — RED
```

## Step 2 — 🟢 GREEN: simplest code that passes
In `calculator.py`, write the *minimum* — don't anticipate:
```python
def add(numbers):
    return 0          # simplest thing that makes the test pass
```
```bash
python3 -m unittest      # OK — GREEN
```
Yes, it's "wrong" in general — but it's correct *for every test we have*. TDD forbids writing more.

## Step 3 — 🔴→🟢 Drive real behavior, one test at a time
Add a test for a single number:
```python
    def test_single_number(self):
        self.assertEqual(add("5"), 5)
```
RED. Now generalize *just enough*:
```python
def add(numbers):
    return int(numbers) if numbers else 0
```
GREEN. Add the multi-number case:
```python
    def test_two_numbers(self):
        self.assertEqual(add("1,2"), 3)
```
RED → make it pass:
```python
def add(numbers):
    if not numbers:
        return 0
    return sum(int(n) for n in numbers.split(","))   # handles "5" and "1,2,3" both
```
```bash
python3 -m unittest -v    # all GREEN
```

## Step 4 — 🔵 REFACTOR (tests stay green)
The empty check is now redundant — `"".split(",")` → `[""]` would break, but we can simplify with a
guard and tidy names. Refactor with confidence, because the tests catch any mistake:
```python
def add(numbers: str) -> int:
    if not numbers:
        return 0
    return sum(int(token) for token in numbers.split(","))
```
Run tests again — still green. **That safety to change is the entire payoff of TDD.**

## Step 5 — Extend by the same loop
Add `test_ignores_whitespace` (`" 1 , 2 "` → 3): watch it go RED, then make it green with
`int(token.strip())`. You now have the rhythm.

## Exercises
1. TDD a new rule: numbers > 1000 are ignored (`"2,1001,3"` → 5). Test first!
2. TDD an error: a negative number raises `ValueError("no negatives: -3")`. Use
   `assertRaises`.
3. Reflect: did writing the test first change *how* you designed `add`'s signature? (Most people
   find it does — you design from the caller's view.)
4. Re-run with `pytest` if available (`pip install pytest && pytest -q`) — same tests, nicer output.

## What you proved
- The **red-green-refactor** loop keeps you writing only needed code, fully covered.
- A green suite makes refactoring *safe* — you changed the implementation in Step 4 with zero fear.
- Tests-first nudges you to design from the **caller's** perspective — the design benefit of
  [TDD](../1-knowledge/testing/test-doubles-and-tdd.md).

## References
- [Test doubles & TDD](../1-knowledge/testing/test-doubles-and-tdd.md) · [Testing fundamentals](../1-knowledge/testing/testing-fundamentals.md)
