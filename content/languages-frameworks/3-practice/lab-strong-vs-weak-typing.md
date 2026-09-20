# Lab: Strong vs. Weak Typing — Watch a Bug Hide

> **Goal:** run the *same* expressions in Python (strong) and JavaScript (weak) and watch weak
> typing silently coerce types — turning a bug into a "valid" result — while strong typing surfaces
> it. Then catch dynamic-typing bugs *statically*.
>
> **Builds:** [Type systems](../1-knowledge/language-design/type-systems.md). Python 3 + Node (both
> installed).

## Setup
```bash
mkdir typing-lab && cd typing-lab
python3 --version && node --version
```

## Step 1 — The same expression, two worldviews
Create `coerce.py`:
```python
print("5" + 1)    # ?
```
```bash
python3 coerce.py
```
Expected — **strong** typing refuses to guess:
```
TypeError: can only concatenate str (not "int") to str
```
Now `coerce.js`:
```javascript
console.log("5" + 1);   // ?
console.log("5" - 1);   // ?
console.log([] + []);   // ?
console.log([] + {});   // ?
```
```bash
node coerce.js
```
Expected — **weak** typing coerces to make *something* happen:
```
51
4
                 (empty string)
[object Object]
```
`"5" + 1` → string concat `"51"`; `"5" - 1` → numeric `4`. Same two operands, opposite type
decisions — and **no error**. That silence is the danger.

## Step 2 — How weak typing hides a real bug
Imagine reading a quantity from a form (always a **string**) and adding it. Create `bug.js`:
```javascript
function addQuantity(cartTotal, qty) {
  return cartTotal + qty;          // qty came from an <input> → it's a string!
}
console.log(addQuantity(10, "5"));   // expected 15...
```
```bash
node bug.js          # 105   ← "10"+"5" string-concatenated, not added
```
The bug **ships silently** — no crash, just a wrong number deep in a cart total. The
[type system](../1-knowledge/language-design/type-systems.md) coerced `10` to `"10"` and concatenated.

The Python equivalent would have **thrown immediately** at the `+`, surfacing the bug in the first
test run instead of in production.

## Step 3 — Dynamic + strong still finds it late
Python is *strong* (won't coerce) but *dynamic* (checks at runtime). Create `late.py`:
```python
def add_quantity(cart_total, qty):
    return cart_total + qty

def checkout(use_it):
    if use_it:
        return add_quantity(10, "5")     # TypeError — but only if this branch runs
    return 0

print(checkout(False))    # 0  — bug dormant, never executed
print(checkout(True))     # 💥 TypeError here
```
```bash
python3 late.py
```
`checkout(False)` runs clean; the bug only fires when execution *reaches* the bad call — the
runtime-checking cost of [dynamic typing](../1-knowledge/language-design/type-systems.md).

## Step 4 — Shift the error earlier with gradual typing
Add type hints and reason about them statically (no runtime needed). Create `typed.py`:
```python
def add_quantity(cart_total: int, qty: int) -> int:
    return cart_total + qty

add_quantity(10, "5")     # a static checker flags: Argument 2 expected "int", got "str"
```
If `mypy` is available, see it catch the bug *without running the code*:
```bash
python3 -m pip install --quiet mypy 2>/dev/null && python3 -m mypy typed.py || \
  echo "(mypy not installed — but a checker/IDE would flag the str-for-int here)"
```
Expected (with mypy): `error: Argument 2 to "add_quantity" has incompatible type "str"; expected "int"`.
That's **static** checking bolted onto a **dynamic** language — the [gradual typing](../1-knowledge/language-design/type-systems.md)
middle ground (the same idea as TypeScript over JavaScript).

## Exercises
1. Predict, then run: in JS, `1 + "2" + 3`, `true + 1`, `null == undefined`, `NaN === NaN`. Explain
   each via coercion rules.
2. Add `"use strict"` to a JS file — does it stop the `"10"+"5"` bug? (No — strict mode isn't a type
   checker. What *would*? TypeScript.)
3. Find the two orthogonal dials for Python, JS, and (from the docs) Rust on the static/dynamic ×
   strong/weak grid.

## What you proved
- **Weak typing** coerces silently — convenient, but it converts bugs into plausible-looking results.
- **Strong typing** rejects nonsense; **static** typing rejects it *before* running, **dynamic** only
  when the line executes.
- Gradual typing (hints + mypy / TypeScript) is how dynamic languages reclaim "catch it early" —
  exactly the industry trend in [type systems](../1-knowledge/language-design/type-systems.md).

## References
- [Type systems](../1-knowledge/language-design/type-systems.md) · [Compilation & execution](../1-knowledge/fundamentals/compilation-and-execution.md)
