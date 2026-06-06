# Load Balancers

> A load balancer distributes incoming traffic across multiple servers so no single
> one is overwhelmed, and routes around failed nodes.

## Problem
One server can only handle so much, and if it dies the service goes down. To scale
horizontally you put many servers behind a single entry point that spreads the load
and hides failures.

## Core concepts

**Layer 4 (transport) vs Layer 7 (application)**
- **L4** balances by IP/port — fast, protocol-agnostic, no visibility into content.
- **L7** balances by HTTP content — can route by URL path, header, or cookie;
  terminate TLS; do sticky sessions. More features, slightly more overhead.

**Balancing algorithms**
- **Round robin** — rotate through servers in order.
- **Weighted round robin** — bigger servers get more traffic.
- **Least connections** — send to the server with fewest active connections.
- **Least response time** — fastest server wins.
- **IP hash** — same client always lands on the same server (sticky).

```mermaid
flowchart LR
    C[Clients] --> LB[Load Balancer]
    LB --> S1[Server 1]
    LB --> S2[Server 2]
    LB --> S3[Server 3]
    LB -. health checks .-> S1
```

**Health checks** — the LB probes each server; unhealthy ones are removed from
rotation and re-added when they recover.

**Don't make the LB a SPOF** — run load balancers in a redundant pair (active-passive
or active-active), often fronted by DNS or a floating/virtual IP.

## Trade-offs
- **Sticky sessions** simplify stateful apps but hurt even distribution and break when
  a node dies → prefer stateless servers + shared session store.
- **L7** gives smart routing at the cost of more CPU (TLS, parsing).
- Hardware LBs are fast but pricey; software LBs (Nginx, HAProxy, Envoy) and cloud LBs
  (ELB/ALB) are the common default.

## Real-world examples
- **AWS ALB** (L7) routes by path/host to different microservices; **NLB** (L4) handles
  millions of low-latency connections.
- **Envoy** is the data-plane LB inside service meshes (Istio).

## References
- [HAProxy](https://www.haproxy.org/) / [Envoy](https://www.envoyproxy.io/)
- *Designing Data-Intensive Applications*
