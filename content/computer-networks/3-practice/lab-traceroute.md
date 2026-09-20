# Lab — Trace a route across the Internet

> **Builds:** [routing & forwarding](../1-knowledge/network-layer/routing-and-forwarding.md)
> — hop-by-hop forwarding, next hops, the TTL mechanism, crossing AS boundaries. **Tools:**
> `traceroute` (Linux/macOS) or `tracert` (Windows); `mtr` for live stats. **Time:** ~15 min.

## Goal
See, with your own eyes, the actual chain of routers a packet crosses to reach a server —
and watch latency grow hop by hop. The abstract "packets walk themselves across the world"
becomes a concrete list of machines.

## 1. Trace a path
```console
$ traceroute example.com           # Linux/macOS   (Windows: tracert example.com)
 1  192.168.1.1      1.0 ms      ← your home router (default gateway)
 2  10.20.0.1        9.4 ms      ← ISP edge
 3  72.14.215.85    12.1 ms      ← ISP core
 4  108.170.245.1   18.7 ms      ← peering into another network (AS boundary)
 5  142.250.x.x     22.0 ms
 6  93.184.216.34   24.3 ms      ← destination reached
```
Each numbered line is **one router** that forwarded your packet. Hop 1 is *always* your
[default gateway](../1-knowledge/network-layer/nat-and-dhcp.md). The last is the server.

## 2. How it works (the clever trick)
`traceroute` exploits the **TTL** (Time To Live) field. It sends a packet with `TTL=1`; the
*first* router decrements it to 0, drops it, and replies "time exceeded" — revealing itself.
Then `TTL=2` reveals the second router, and so on. You're weaponizing the same loop-prevention
counter described in the [routing doc](../1-knowledge/network-layer/routing-and-forwarding.md).

```
TTL=1 → router 1 says "expired, I'm 192.168.1.1"
TTL=2 → router 2 says "expired, I'm 10.20.0.1"
TTL=3 → ... until a packet finally reaches the destination
```

## 3. Spot the interesting features
- **Latency jumps:** a big increase between two hops often means a long physical distance
  (e.g. crossing an ocean) or entering a new network (AS). Find the biggest jump in your trace.
- **`* * *` lines:** some routers refuse to reply ("I won't admit I exist") — normal; the trace
  continues past them.
- **Asymmetry:** the return path can differ from the outbound one — [BGP picks paths by
  policy](../1-knowledge/network-layer/routing-and-forwarding.md), not symmetry.

## 4. Live, continuous view with `mtr`
```console
$ mtr example.com        # press q to quit
```
`mtr` reruns traceroute continuously and shows **per-hop loss % and latency** updating live —
the best tool for "which hop is dropping my packets?"

## 5. Compare destinations
```console
$ traceroute google.com          # likely few hops — Google peers everywhere
$ traceroute <a server abroad>   # more hops, higher latency
```
Servers reached via a nearby [CDN](../2-case-studies/cdn.md) show **fewer hops and lower
latency** — you can literally see the CDN's edge node a few hops away instead of an ocean away.

## Exercises
1. Trace to a server on another continent. How many hops? Where's the transoceanic latency jump?
2. Run `mtr` to a site for 60 s — is any hop losing packets?
3. Trace the same site twice — does the path change? (Routing can shift.)
4. Compare hop count to a big CDN-backed site (cloudflare.com) vs a small self-hosted site.

## What you proved
- A packet's journey is **many independent per-hop forwarding decisions**, not one planned route.
- **TTL** both prevents loops *and* makes the path observable.
- **Distance and AS boundaries** dominate latency — the motivation for [CDNs](../2-case-studies/cdn.md).

## References
- [Routing & forwarding knowledge doc](../1-knowledge/network-layer/routing-and-forwarding.md)
- `man traceroute`, `man mtr`
