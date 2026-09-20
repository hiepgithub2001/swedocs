# Lab: Refactor an if/else Mess into Strategy + Factory

> **Goal:** turn a branching pricing function into pluggable [Strategy](../1-knowledge/design-patterns/behavioral-patterns.md)
> objects selected by a [Factory](../1-knowledge/design-patterns/creational-patterns.md), and
> *prove* adding a new behavior needs **zero edits** to existing code.
>
> **Builds:** [Behavioral patterns](../1-knowledge/design-patterns/behavioral-patterns.md) ·
> [Creational patterns](../1-knowledge/design-patterns/creational-patterns.md) ·
> [SOLID — Open/Closed](../1-knowledge/fundamentals/solid-principles.md). Pure Python, no deps.

## Setup
```bash
mkdir strategy-lab && cd strategy-lab
python3 --version    # any 3.8+
```

## Step 1 — Start with the smell
Create `pricing.py`:
```python
def discount_rate(customer_type: str) -> float:
    if customer_type == "regular": return 0.0
    elif customer_type == "vip":   return 0.10
    elif customer_type == "staff": return 0.30
    else: raise ValueError(customer_type)

def price(amount, customer_type):
    return round(amount * (1 - discount_rate(customer_type)), 2)

if __name__ == "__main__":
    for t in ("regular", "vip", "staff"):
        print(t, price(100, t))
```
Run it:
```bash
python3 pricing.py
```
Expected:
```
regular 100.0
vip 90.0
staff 70.0
```
**The problem:** every new customer type edits `discount_rate` — it's *closed to extension,
open to modification*, exactly backwards from [OCP](../1-knowledge/fundamentals/solid-principles.md).

## Step 2 — Extract a Strategy interface
Each pricing rule becomes its own object behind one contract. Replace `pricing.py` with:
```python
from typing import Protocol

class DiscountStrategy(Protocol):
    def rate(self) -> float: ...

class Regular: 
    def rate(self): return 0.0
class Vip:
    def rate(self): return 0.10
class Staff:
    def rate(self): return 0.30

def price(amount, strategy: DiscountStrategy):
    return round(amount * (1 - strategy.rate()), 2)
```
`price` no longer branches — it depends only on the `rate()` contract.

## Step 3 — Add a Factory to choose the strategy
Append:
```python
STRATEGIES = {"regular": Regular, "vip": Vip, "staff": Staff}

def make_strategy(customer_type: str) -> DiscountStrategy:
    try:    return STRATEGIES[customer_type]()
    except KeyError: raise ValueError(customer_type)

if __name__ == "__main__":
    for t in ("regular", "vip", "staff"):
        print(t, price(100, make_strategy(t)))
```
Run — same output as Step 1. Behavior unchanged, structure transformed.

## Step 4 — Prove Open/Closed: add a behavior without editing old code
In a *separate* file `loyalty.py` (simulating a new module/plugin):
```python
from pricing import STRATEGIES, price, make_strategy

class Loyalty:                       # brand-new strategy
    def rate(self): return 0.15

STRATEGIES["loyalty"] = Loyalty      # register — no edit to pricing.py's classes/price()

print("loyalty", price(100, make_strategy("loyalty")))
```
```bash
python3 loyalty.py
```
Expected:
```
loyalty 85.0
```
You added a customer type **without touching** `price`, the other strategies, or any `if`. That's
the win — and it's exactly how the [plugin architecture](../2-case-studies/plugin-architecture.md)
case study registers behaviors.

## Step 5 (bonus) — Collapse to functions
In Python a Strategy with one method is often just a function. Note that
`STRATEGIES = {"vip": lambda: 0.10, ...}` and `price(amount, strat)` calling `strat()` works
identically — proof that the *pattern is the intent*, not the class boilerplate.

## Exercises
1. Add a `TieredDiscount` strategy that takes a percentage in its constructor (parameterized
   strategy) — register two instances (`silver` 5%, `gold` 12%).
2. Make `make_strategy` fall back to `Regular` for unknown types instead of raising; write a test.
3. Combine strategies: a `Stacked([Vip(), Loyalty()])` that sums rates (capped at 50%). Which
   pattern did you just use? (Hint: [Decorator/Composite](../1-knowledge/design-patterns/structural-patterns.md).)

## What you proved
- A `switch`/`if` over "kinds of behavior" is a Strategy waiting to be extracted.
- A Factory centralizes the one place that knows concrete classes, so callers stay decoupled.
- Together they deliver [Open/Closed](../1-knowledge/fundamentals/solid-principles.md): new
  behavior is *additive*, never invasive.

## References
- [Behavioral patterns](../1-knowledge/design-patterns/behavioral-patterns.md) · [Creational patterns](../1-knowledge/design-patterns/creational-patterns.md) · [SOLID](../1-knowledge/fundamentals/solid-principles.md)
