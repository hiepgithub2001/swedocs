# Lab: One Problem, Three Paradigms

> **Goal:** solve the *same* problem three ways — imperative, object-oriented, functional — and
> *feel* how the [paradigm](../1-knowledge/fundamentals/programming-paradigms.md) changes the
> shape of the code (and where state lives), not just the syntax.
>
> **Builds:** [Programming paradigms](../1-knowledge/fundamentals/programming-paradigms.md) ·
> [What makes a language](../1-knowledge/fundamentals/what-makes-a-language.md). Pure Python 3.

## The problem
Given a list of transactions, compute the **total of all deposits over $100**.
```python
txns = [("deposit", 50), ("deposit", 150), ("withdraw", 200), ("deposit", 500)]
# expected answer: 650  (150 + 500)
```

## Setup
```bash
mkdir paradigms-lab && cd paradigms-lab
python3 --version    # 3.x
```

## Step 1 — Imperative (describe the steps, mutate state)
Create `imperative.py`:
```python
txns = [("deposit", 50), ("deposit", 150), ("withdraw", 200), ("deposit", 500)]

total = 0                              # mutable accumulator
for kind, amount in txns:              # step through, one at a time
    if kind == "deposit" and amount > 100:
        total += amount                # mutate
print(total)
```
```bash
python3 imperative.py     # 650
```
Note the *how*: an explicit loop and a variable you keep changing.

## Step 2 — Object-oriented (model it as objects with behavior)
Create `oo.py`:
```python
class Transaction:
    def __init__(self, kind, amount):
        self.kind, self.amount = kind, amount
    def is_large_deposit(self):                 # behavior lives with the data
        return self.kind == "deposit" and self.amount > 100

class Ledger:
    def __init__(self, txns):
        self.txns = [Transaction(k, a) for k, a in txns]
    def large_deposit_total(self):
        return sum(t.amount for t in self.txns if t.is_large_deposit())

raw = [("deposit", 50), ("deposit", 150), ("withdraw", 200), ("deposit", 500)]
print(Ledger(raw).large_deposit_total())        # 650
```
State is now *encapsulated* in objects; the rule (`is_large_deposit`) belongs to `Transaction`.

## Step 3 — Functional (compose transformations, no mutation)
Create `functional.py`:
```python
from functools import reduce
txns = [("deposit", 150), ("withdraw", 200), ("deposit", 500), ("deposit", 50)]

is_large_deposit = lambda t: t[0] == "deposit" and t[1] > 100

total = sum(amount for kind, amount in filter(is_large_deposit, txns))   # declarative pipeline
# or, fully point-free with reduce:
total2 = reduce(lambda acc, t: acc + t[1], filter(is_large_deposit, txns), 0)
print(total, total2)                              # 650 650
```
No mutable accumulator, no loop you manage — you *describe* the transformation (filter → sum). This
is the style that scales to [concurrency](../1-knowledge/language-design/concurrency-models.md):
pure, no shared mutable state.

## Step 4 — Compare
Run all three; all print `650`. Same answer, three worldviews:

| Version | Where's the state? | You wrote… |
| --- | --- | --- |
| Imperative | A mutable `total` you update | The exact steps |
| OO | Encapsulated in objects | A domain model + a query |
| Functional | None (immutable, no accumulator) | A transformation pipeline |

## Exercises
1. Add a second rule ("withdrawals over $100 too"). Which version absorbed the change most cleanly?
2. Rewrite the functional version using a list comprehension instead of `filter`. Is it more
   "Pythonic"? (Python's idiom blends functional + imperative.)
3. Express it **declaratively** with SQL against an in-memory `sqlite3` table — note you state only
   *what*, never *how*.
4. Which version would you choose for a 10,000-line accounting system, and why? (Hint: OO models
   domains; FP eases testing/concurrency.)

## What you proved
- Syntax is the shallow difference; the **paradigm** changes where state lives and how you express
  intent — the point of [what makes a language](../1-knowledge/fundamentals/what-makes-a-language.md).
- Most real Python mixes all three — choosing the clearest style per piece is the skill.

## References
- [Programming paradigms](../1-knowledge/fundamentals/programming-paradigms.md) · [What makes a language](../1-knowledge/fundamentals/what-makes-a-language.md)
