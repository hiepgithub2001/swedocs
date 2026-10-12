# Part III-B — Distribution

> A remote file still looks like a file, but communication failure and cached copies make its promises different.

The source keeps its distributed-systems introduction inside *Persistence*. This separate navigation group preserves chapters 46–50 in their original sequence; dialogues 46 and 50 become the framing here rather than separate dialogue chapters.

| Source chapter | Read here |
| --- | --- |
| 47 | [Communication and RPC](./47-distributed-systems.md) |
| 48 | [Sun's NFS](./48-nfs.md) |
| 49 | [The Andrew File System](./49-afs.md) |

The comparison is specifically the source's **NFSv2** and **AFSv2** designs. Stateless requests make server recovery easier; callbacks and whole-file caching reduce repeated server work but introduce recovery obligations for remembered cache state. Cache consistency is a protocol guarantee, not a synonym for application correctness.

The closing dialogue explicitly treats this as an introduction. It does not supply a consensus algorithm or a complete modern distributed-storage architecture. Continue with the [Distributed Systems reference](../../distributed-systems/README.md) for those subjects.

---

Previous: [Data integrity](../4-persistence/44-data-integrity.md) · Next: [Distributed systems](./47-distributed-systems.md)
