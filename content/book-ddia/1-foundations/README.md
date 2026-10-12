# Part I — Foundations of data systems

> The ideas that apply whether your data sits on one machine or a thousand:
> what "reliable", "scalable" and "maintainable" really mean, how data models
> shape your thinking, how storage engines lay bytes on disk, and how
> encodings let old and new code share data.

| | |
| --- | --- |
| [Reliable, scalable and maintainable applications](./01-reliable-scalable-maintainable.md) | Faults versus failures, load parameters, percentiles, and operability, simplicity and evolvability |
| [Data models and query languages](./02-data-models.md) | Relational versus document versus graph, the history behind them, declarative queries, Cypher, SPARQL and Datalog |
| [Storage and retrieval](./03-storage-and-retrieval.md) | Logs, hash indexes, SSTables and LSM-trees, B-trees, OLTP versus OLAP, column storage |
| [Encoding and evolution](./04-encoding-and-evolution.md) | JSON, Thrift, Protocol Buffers and Avro, backward and forward compatibility, and data flowing through databases, services and messages |

Related reference docs: [scalability](../../system-design/1-knowledge/fundamentals/scalability.md),
[SLAs, SLOs and SLIs](../../system-design/1-knowledge/fundamentals/sla-slo-sli.md),
[SQL versus NoSQL](../../system-design/1-knowledge/data-storage/sql-vs-nosql.md),
[indexing](../../system-design/1-knowledge/data-storage/indexing.md),
[gRPC](../../system-design/1-knowledge/communication/grpc.md).

---

Previous: [Overview](../README.md) ·
Next: [Reliable, scalable and maintainable applications](./01-reliable-scalable-maintainable.md)
