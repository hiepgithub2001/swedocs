# Consistent Hashing

> A hashing technique that maps both data and nodes onto a ring, so that adding or
> removing a node moves only a small fraction of keys instead of remapping everything.

## Problem
To spread data across N servers, the naive approach is `server = hash(key) % N`. It
works until N changes: add or remove one server and **almost every key** remaps to a
different server, causing a massive cache miss storm or data reshuffle.

## Core concepts

**The ring** — imagine a circle of hash values 0 … 2³²−1. Hash each **node** to a
point on the ring. To place a **key**, hash it and walk clockwise to the first node.

```mermaid
flowchart LR
    K[key] -->|hash, walk clockwise| N[First node on ring owns it]
```

**Why it helps** — when a node is added or removed, only the keys between it and the
previous node move. On average just **K/N keys** relocate (K = keys, N = nodes),
instead of nearly all of them.

**Virtual nodes** — one physical node is placed at *many* points on the ring (e.g.
100–200 virtual nodes each). This:
- Smooths out **uneven distribution** (without it, some nodes get far more keys).
- Spreads a failed node's load across *many* remaining nodes, not just its neighbor.
- Lets you weight bigger machines (give them more virtual nodes).

## Example — adding a node moves few keys
Distribute 10,000 keys over 3 nodes, then add a 4th:
- **`hash(key) % N`:** going from `%3` to `%4` changes the result for **~75%** of keys → a
  near-total reshuffle (cache-miss storm).
- **Consistent hashing:** only the keys that now fall to the new node's ring segment move —
  **~25% (≈ K/N)**. Everyone else stays put.

Virtual nodes keep each node's share even (~25% each). You can measure both in a few lines of
Python — it underpins the [key-value store case study](../../2-case-studies/key-value-store.md).

## Common tools
| Tool | Uses consistent hashing for |
| --- | --- |
| **Apache Cassandra**, **DynamoDB** | partitioning data across nodes (with virtual nodes) |
| **libketama / libmemcached** | spreading keys across Memcached servers |
| **Envoy** (`ring_hash`), **HAProxy** | sticky/affinity load balancing |
| **Google Maglev**, **"consistent hashing with bounded loads"** | LB variants that also cap per-node overload |

## Trade-offs
- Adds implementation complexity vs simple modulo, but is essential for systems where
  membership changes often (caches, distributed DBs).
- Virtual nodes fix balance but use more memory/metadata.
- Doesn't by itself solve **hot keys** (one popular key still lands on one node) —
  needs replication of that key.

## Real-world examples
- **Amazon DynamoDB** and **Apache Cassandra** use consistent hashing to partition
  data across nodes.
- **Memcached client libraries** and **CDNs** use it to pick a cache server so adding
  capacity doesn't flush the whole cache.

## References
- Karger et al., *Consistent Hashing and Random Trees* (1997)
- [Amazon Dynamo paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
