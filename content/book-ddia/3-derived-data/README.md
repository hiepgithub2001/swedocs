# Part III — Derived data

> Real applications combine many data systems, each holding its own view of
> the same facts. Part III is about integrating them: batch and stream
> processing, logs, change data capture, and the author's case for building
> applications around dataflow, correctly and ethically.

The part rests on one distinction:

- A **system of record** (source of truth) holds the authoritative version,
  with each fact stored once.
- **Derived data** (caches, indexes, materialized views, models) is the output
  of transforming it, and can be **recreated** if it's lost.

Being explicit about which is which makes a confusing architecture clear. A
database isn't inherently either: it depends on how you use it.

| | |
| --- | --- |
| [Batch processing](./01-batch-processing.md) | Unix pipes, MapReduce and HDFS, batch joins, the philosophy of immutable inputs, Spark and Flink, Pregel |
| [Stream processing](./02-stream-processing.md) | Message brokers versus logs, CDC, event sourcing, time and windows, stream joins, exactly-once |
| [The future of data systems](./03-future-of-data-systems.md) | Data integration, unbundling databases, end-to-end correctness, timeliness versus integrity, auditing, ethics |

Related reference docs: [message queues](../../system-design/1-knowledge/building-blocks/message-queues.md),
[CQRS and event sourcing](../../system-design/1-knowledge/patterns/cqrs-event-sourcing.md),
[event-driven architecture](../../system-design/1-knowledge/patterns/event-driven.md),
and the [CDC-to-search project](../../system-design/3-practice/project-cdc-search.md).

---

Previous: [Consistency and consensus](../2-distributed-data/05-consistency-and-consensus.md) ·
Next: [Batch processing](./01-batch-processing.md)
