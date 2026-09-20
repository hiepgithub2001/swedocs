# Lab: Build an In-Process Event Bus (Observer)

> **Goal:** implement a tiny pub/sub event bus so a publisher can notify many subscribers
> **without knowing who they are** — the [Observer pattern](../1-knowledge/design-patterns/behavioral-patterns.md)
> and the in-process seed of [event-driven architecture](../../system-design/1-knowledge/patterns/event-driven.md).
>
> **Builds:** [Behavioral patterns — Observer](../1-knowledge/design-patterns/behavioral-patterns.md) ·
> [Coupling & cohesion](../1-knowledge/fundamentals/coupling-and-cohesion.md). Pure Python.

## Setup
```bash
mkdir observer-lab && cd observer-lab
```

## Step 1 — See the coupling you're removing
A naive `OrderService` that hard-calls everyone it must inform:
```python
# tight.py
class OrderService:
    def __init__(self, email, inventory, analytics):
        self.email, self.inventory, self.analytics = email, inventory, analytics
    def place(self, order):
        # ... save order ...
        self.email.send(order)            # OrderService must know every consumer,
        self.inventory.reserve(order)     # import them, and be edited for each new one
        self.analytics.track(order)
```
Adding a "loyalty points" reaction means editing `OrderService` again — high
[coupling](../1-knowledge/fundamentals/coupling-and-cohesion.md).

## Step 2 — Build the event bus
Create `bus.py`:
```python
from collections import defaultdict
from typing import Callable

class EventBus:
    def __init__(self):
        self._subs: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, event: str, handler: Callable):
        self._subs[event].append(handler)

    def publish(self, event: str, payload):
        for handler in list(self._subs[event]):   # copy: handlers may subscribe/unsubscribe
            handler(payload)
```
That's the entire Observer: a subject (`publish`) and a list of observers per event.

## Step 3 — Decouple the publisher from subscribers
Create `app.py`:
```python
from bus import EventBus

bus = EventBus()

class OrderService:
    def __init__(self, bus): self.bus = bus
    def place(self, order):
        print(f"order {order} saved")
        self.bus.publish("order_placed", order)   # fire-and-forget; knows nobody

# subscribers register themselves — OrderService is unaware they exist
bus.subscribe("order_placed", lambda o: print(f"  📧 email for {o}"))
bus.subscribe("order_placed", lambda o: print(f"  📦 reserve stock for {o}"))
bus.subscribe("order_placed", lambda o: print(f"  📊 analytics for {o}"))

OrderService(bus).place("#1001")
```
Run:
```bash
python3 app.py
```
Expected:
```
order #1001 saved
  📧 email for #1001
  📦 reserve stock for #1001
  📊 analytics for #1001
```

## Step 4 — Prove the decoupling
Add a brand-new reaction **without touching `OrderService`** — append to `app.py`:
```python
bus.subscribe("order_placed", lambda o: print(f"  ⭐ loyalty points for {o}"))
OrderService(bus).place("#1002")
```
Run again — `#1002` now also prints the loyalty line. The publisher never changed: new behavior
is added purely by subscribing. This is precisely how the
[plugin architecture](../2-case-studies/plugin-architecture.md) hooks work.

## Step 5 — Feel the failure mode
Add a subscriber that throws, *before* the others:
```python
def broken(o): raise RuntimeError("handler bug")
bus.subscribe("order_placed", broken)
OrderService(bus).place("#1003")   # 💥 one bad observer breaks the whole publish
```
Observe that the exception stops later handlers. This is the classic Observer hazard — see the
exercises.

## Exercises
1. Make `publish` resilient: catch per-handler exceptions, log them, and continue to the rest.
   What did you trade away by swallowing errors?
2. Add `unsubscribe(event, handler)` and return an unsubscribe function from `subscribe`.
3. Make handlers run on a background thread/queue. You've just turned a synchronous Observer into
   an **asynchronous** one — the conceptual jump to a real
   [message queue](../../system-design/1-knowledge/building-blocks/message-queues.md).
4. Add wildcard subscriptions (`subscribe("*", ...)`) that see every event.

## What you proved
- Observer cuts the publisher's knowledge of consumers to zero — new reactions are additive.
- That decoupling is the same idea as event-driven systems, just in one process and synchronous.
- The cost is real: hidden control flow, ordering surprises, and one bad observer affecting
  others — the trade-offs named in the [behavioral patterns](../1-knowledge/design-patterns/behavioral-patterns.md) doc.

## References
- [Behavioral patterns](../1-knowledge/design-patterns/behavioral-patterns.md) · [Coupling & cohesion](../1-knowledge/fundamentals/coupling-and-cohesion.md)
- Scale-up: [event-driven architecture](../../system-design/1-knowledge/patterns/event-driven.md) · [message queues](../../system-design/1-knowledge/building-blocks/message-queues.md)
