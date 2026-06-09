# Languages & Frameworks · Part 2 — Case Studies

Real languages seen *through* the design axes: each one is a memorable, extreme point in the space,
chosen to make one axis click. Each follows the [shared doc template](../../_TEMPLATE.md) and builds
on the [Part 1 knowledge docs](../1-knowledge/).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## Memory — safety without a garbage collector
- ✅ [Rust — ownership & borrowing](./rust-ownership.md)
  — memory & thread safety enforced at compile time, no GC. Applies [memory management](../1-knowledge/language-design/memory-management.md) + [type systems](../1-knowledge/language-design/type-systems.md).

## Concurrency — making it approachable
- ✅ [Go — goroutines & channels (CSP)](./go-concurrency.md)
  — cheap concurrency, "share memory by communicating." Applies [concurrency models](../1-knowledge/language-design/concurrency-models.md).
- ✅ [JavaScript — the single-threaded event loop](./javascript-event-loop.md)
  — thousands of connections on one thread, no locks. Applies [concurrency models](../1-knowledge/language-design/concurrency-models.md).

> 💡 Read together, Go and JS are two answers to "concurrency without races": Go *avoids sharing*
> via channels; JS *avoids parallelism* via one thread + an event loop. Rust shows the third path —
> let sharing happen, but prove it safe at compile time.
