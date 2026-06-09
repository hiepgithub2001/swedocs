# How a CDN cuts latency

> A **Content Delivery Network** is a fleet of servers spread across the globe that cache
> content close to users. It's the single most important piece of real-world web
> performance engineering — and it's a direct, practical application of nearly every
> [knowledge doc](../1-knowledge/) in this area: latency physics, DNS, TCP/TLS handshakes,
> routing, and caching.

## The scenario
Your origin server lives in Virginia. A user in Sydney loads your site. Without help, *every*
byte — HTML, images, JavaScript, video — crosses the Pacific, and each
[round-trip](../1-knowledge/fundamentals/latency-bandwidth-throughput.md) costs ~230 ms. The
[cold-load handshake tax](../1-knowledge/fundamentals/web-request-end-to-end.md) (DNS + TCP +
TLS + HTTP ≈ 3–4 RTTs) becomes ~800 ms *before the page even starts rendering*. A CDN makes
that same page load in tens of milliseconds. How?

## Requirements
- **Cut latency** for users far from the origin — the hard physical limit is distance.
- **Offload the origin** — serve millions of requests without melting one server.
- **Stay correct** — don't serve stale or wrong content; handle updates and invalidation.
- **Survive failures & attacks** — absorb traffic spikes and DDoS.

## How it works — end to end

The core idea: **put a cache a few milliseconds from the user, and answer from there.**

```mermaid
flowchart LR
    U["👤 User in Sydney"] -->|"~5 ms"| E["🟢 CDN edge (Sydney PoP)<br/>cached copy"]
    E -. "cache MISS only:<br/>~230 ms, once" .-> O["🏢 Origin (Virginia)"]
    E -->|"~5 ms, cached"| U
```

**1 · DNS sends you to the *nearest* edge.** When you resolve `cdn.example.com`, the CDN's
[DNS](../1-knowledge/application-layer/dns.md) (often via **anycast** or geo-aware responses)
returns the IP of the **edge PoP** (Point of Presence) closest to *you* — Sydney, not
Virginia. DNS is doing load-balancing and geo-routing, exactly as its
[knowledge doc](../1-knowledge/application-layer/dns.md) describes.

**2 · The handshakes happen locally.** Your [TCP](../1-knowledge/transport-layer/tcp.md) and
[TLS](../1-knowledge/security/tls-https.md) handshakes now terminate at the Sydney edge ~5 ms
away, not across the ocean. The 3–4 RTT setup tax shrinks from ~800 ms to ~20 ms — **this is
the biggest win**, and it's pure latency math from
[latency vs bandwidth](../1-knowledge/fundamentals/latency-bandwidth-throughput.md).

**3 · Cache hit → instant.** If the edge already has the file (a **cache HIT**), it serves it
immediately. Static assets (images, CSS, JS, video segments) are cached per their HTTP
[`Cache-Control`](../1-knowledge/application-layer/http.md) headers and TTLs.

**4 · Cache miss → fetch once, then cache.** On a **MISS**, the edge fetches from the origin
*once* (paying the long RTT a single time), stores it, and serves every subsequent Sydney user
from the local copy. One slow trip amortized over thousands of fast ones.

## Deep dives

**Anycast — one IP, many locations.** CDNs announce the *same* IP prefix from hundreds of
locations via [BGP](../1-knowledge/network-layer/routing-and-forwarding.md). The Internet's own
routing then delivers each user to the *topologically nearest* PoP automatically — no
per-user logic. This is routing ([knowledge doc](../1-knowledge/network-layer/routing-and-forwarding.md))
used as a load-balancing superpower. You can see it: `traceroute` to a CDN-hosted site from two
countries hits *different* machines at the *same* IP.

**The cache hierarchy & invalidation.** Edges are backed by larger regional caches, backed by
the origin — a tree that shields the origin from load. The hard part is **invalidation**: when
content changes, stale copies must be purged or versioned. CDNs solve it with short TTLs,
explicit **purge** APIs, and **cache-busting** URLs (`app.a1b2c3.js`) so a new deploy gets a
new, uncached name. ("There are only two hard things in computer science…")

**Connection reuse to the origin.** The edge keeps warm, pooled
[TCP/TLS connections](../1-knowledge/transport-layer/tcp.md) to the origin, so even cache
misses skip repeated handshakes. It also speaks modern protocols (HTTP/2, HTTP/3) to users
even if the origin is older — the [layering](../1-knowledge/fundamentals/protocol-layers.md)
dividend.

## Trade-offs & failure modes
- ✅ **Massive latency reduction** for global users (the handshake-locality win), **origin
  offload**, and built-in **DDoS absorption** (attack traffic hits the distributed edge, not
  your one server).
- ✅ **Cheaper bandwidth** at scale and **TLS termination** handled for you.
- ⚠️ **Staleness:** the central difficulty — a bad cache config serves outdated content; purges
  and versioning are essential discipline.
- ⚠️ **Dynamic / personalized content** (a logged-in dashboard) can't be cached the same way —
  CDNs handle it with pass-through, edge compute, or caching only the static shell.
- ⚠️ **The CDN becomes a dependency:** a CDN outage (e.g. the 2021 Fastly and Cloudflare
  incidents) can take down large swaths of the web at once.
- ⚠️ **Cache-key subtleties** (query strings, cookies, `Vary` headers) cause hard-to-debug
  "why is the wrong content cached?" bugs.

## See it yourself
- `traceroute` a CDN site (cloudflare.com) — note how *few* hops and how *low* the latency,
  versus a small self-hosted site (the [traceroute lab](../3-practice/lab-traceroute.md)).
- `curl -I https://<cdn-site>` and look for cache headers like `cf-cache-status: HIT`,
  `x-cache: Hit from cloudfront`, or `age:` — the cache, exposed.
- `dig <cdn-site>` from different resolvers/locations and watch the **IP change** — geo/anycast
  routing in action.

## References
- [Latency vs bandwidth](../1-knowledge/fundamentals/latency-bandwidth-throughput.md) ·
  [DNS](../1-knowledge/application-layer/dns.md) ·
  [Routing/BGP](../1-knowledge/network-layer/routing-and-forwarding.md)
- [Cloudflare — What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
- [How Anycast works (Cloudflare)](https://www.cloudflare.com/learning/cdn/glossary/anycast-network/)
- [High Performance Browser Networking (Ilya Grigorik)](https://hpbn.co/)
