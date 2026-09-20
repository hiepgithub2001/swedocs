# IP addressing, subnets & CIDR

> Every device on the Internet has an **IP address** — the number the network actually uses
> to deliver packets. This doc explains what those numbers mean, how they're split into a
> **network part** and a **host part**, and how **subnets / CIDR** group them so routers
> can find anything on the planet without a list of every device.

## Top-down: where you already meet this
[DNS](../application-layer/dns.md) handed us `93.184.216.34` for `example.com`, and
[TCP](../transport-layer/tcp.md) opened a connection "to that IP." But what *is* that
number, and how does a router 5,000 km away know which direction to send a packet stamped
with it? We've reached the **network layer** — the layer whose one job is host-to-host
delivery across the whole Internet, and whose addressing scheme makes worldwide routing
possible. Everything above trusted "the IP gets there"; here's how.

## Problem
A packet must be deliverable to *any* of ~20 billion devices, by routers that obviously
can't store a route to each one individually. We need an addressing scheme that (a) uniquely
identifies every interface, and (b) lets routers reason about **groups** of addresses at
once, so a router can say "anything starting with `93.184.*` → go that way" instead of
memorizing billions of entries. That grouping is the whole point of subnets and CIDR.

## Core concepts

**An IPv4 address = 32 bits = four bytes.** Written as four 0–255 numbers ("dotted decimal"):
```
        192   .   168   .    1   .   5
     11000000 10101000 00000001 00000101     ← the same 32 bits the computer sees
```
There are only ~4.3 billion IPv4 addresses — and we ran out, which is why
[NAT](./nat-and-dhcp.md) and **IPv6** exist (below).

**Network part + host part.** An address splits into a **prefix** that identifies the
*network* and a suffix that identifies the *host* within it — like a street name + house
number. Routers care almost entirely about the **network part**: "which network is this
on?" Only the final router on that network cares about the host part.

**CIDR notation — the `/N`.** `192.168.1.0/24` means "the first **24 bits** are the network
part; the remaining 8 are for hosts." The `/N` is just *how many leading bits are fixed*.

```
192.168.1.0/24
└─────┬────┘ └┬┘
 network (24 bits, fixed)   host (8 bits → 256 addresses: .0–.255)
```

| CIDR | Network bits | Host bits | # addresses | Typical use |
| --- | --- | --- | --- | --- |
| `/8` | 8 | 24 | 16,777,216 | a huge block (`10.0.0.0/8`) |
| `/16` | 16 | 16 | 65,536 | a large org / campus |
| `/24` | 24 | 8 | 256 | a typical home/office subnet |
| `/32` | 32 | 0 | 1 | one exact host |

**A subnet** is one such block — a group of addresses sharing a prefix, usually on one local
network. The **subnet mask** (e.g. `255.255.255.0` = `/24`) is the older way to write the
same split: the 1-bits mark the network part.

**Why grouping enables routing.** Because addresses are allocated in prefixes, a backbone
router needs only *one* entry like `93.184.216.0/24 → next hop X` to reach all 256 of those
hosts. Routers even merge adjacent prefixes (**aggregation/supernetting**), keeping the
global routing table to ~1 million entries instead of billions. Subnetting is what makes
[routing](./routing-and-forwarding.md) tractable.

**Special / reserved ranges worth knowing:**

| Range | Meaning |
| --- | --- |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | **Private** — usable inside a LAN, not routable on the Internet (your home network). See [NAT](./nat-and-dhcp.md). |
| `127.0.0.0/8` (esp. `127.0.0.1`) | **Loopback** — "this machine itself" (`localhost`). |
| `169.254.0.0/16` | **Link-local** — self-assigned when DHCP fails. |
| `.0` (network) / `.255` (broadcast) in a `/24` | reserved: the network ID and the broadcast address. |

**IPv6 — the long-term fix.** IPv4's ~4.3 billion addresses ran out. **IPv6** uses **128
bits** (`2606:2800:220:1:248:1893:25c8:1946`) — about 3.4×10³⁸ addresses, enough to never
worry again. It restores **end-to-end addressing** (every device gets a real public address,
no NAT needed) and streamlines the header. Adoption is gradual; the two run side by side
("dual stack").

## Essential terminology

| Term | Meaning |
| --- | --- |
| **IP address** | The 32-bit (IPv4) / 128-bit (IPv6) number identifying a network interface. |
| **IPv4 / IPv6** | The two versions: 32-bit (dotted decimal) vs 128-bit (hex, colons). |
| **Network part / host part** | Prefix identifying the network vs suffix identifying the host. |
| **Subnet** | A block of addresses sharing a prefix, usually one local network. |
| **CIDR (`/N`)** | "First N bits are the network part" — the modern way to size a block. |
| **Subnet mask** | Older notation for the same split (`255.255.255.0` = `/24`). |
| **Prefix / aggregation** | A shared leading-bit pattern; merging prefixes shrinks routing tables. |
| **Private address** | Reusable, non-Internet-routable ranges for LANs (10./172.16./192.168.). |
| **Loopback** | `127.0.0.1` — the host talking to itself. |

## Example
Is `192.168.1.200` on the same subnet as my laptop `192.168.1.5/24`? Mask off the host bits
(the last 8, since `/24`) and compare the network parts:
```
192.168.1.5    /24  → network = 192.168.1.0
192.168.1.200  /24  → network = 192.168.1.0   ✅ same network → talk directly (one hop)

192.168.2.50   /24  → network = 192.168.2.0   ❌ different network → send via the router
```
This *exact* check is what your OS does for **every** outgoing packet: "same subnet → deliver
locally over the [link layer](../link-layer/ethernet-and-arp.md); otherwise → hand it to my
default gateway (router)." See your own answer with `ip route`.

## Common tools
| Tool | What it is | Use it for |
| --- | --- | --- |
| `ip addr` / `ifconfig` | Interface config | your addresses & their `/N` prefixes |
| `ip route` | Routing table | which subnet goes locally vs to the gateway |
| `ipcalc` | Subnet calculator | breaking down any CIDR (range, mask, hosts) |
| `ping` / `ping6` | Reachability | testing v4 vs v6 connectivity |
| `whois` | Registry lookup | who owns a given IP block |

## Trade-offs
- ✅ Prefix-based addressing makes **global routing scalable** — group, don't enumerate.
- ✅ Subnetting lets an org carve its space to match its structure (per-floor, per-team VLANs).
- ⚠️ **IPv4 exhaustion** forced NAT, which broke true end-to-end connectivity (and complicates
  peer-to-peer, gaming, VoIP).
- ⚠️ **IPv6** fixes scarcity but adoption is slow — decades of dual-stack complexity.
- ⚠️ Subnet sizing is a planning trade-off: too small and you run out of hosts; too large and
  you waste address space and bloat broadcast domains.

## Real-world examples
- **Your home router** hands your devices `192.168.1.x` (private) and NATs them onto one
  public IP from your ISP. See [NAT & DHCP](./nat-and-dhcp.md).
- **Cloud VPCs** (AWS/GCP) are literally you choosing CIDR blocks (`10.0.0.0/16`) and carving
  subnets per availability zone.
- **`/32` in a firewall rule** means "this one exact host"; **`0.0.0.0/0`** means "everything."
- **Mobile carriers** are heavily IPv6 now (not enough IPv4 for every phone), tunneling to
  IPv4 where needed.

## References
- Kurose & Ross, *Top-Down Approach* — Ch. 4.3 (IP, addressing, CIDR)
- [Cloudflare — What is a subnet?](https://www.cloudflare.com/learning/network-layer/what-is-a-subnet/)
- [Practical Networking — subnetting series](https://www.practicalnetworking.net/)
- RFC 4632 (CIDR), RFC 1918 (private addresses), RFC 8200 (IPv6)
