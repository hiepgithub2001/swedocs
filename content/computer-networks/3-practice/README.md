# Computer Networks · Part 3 — Practice

**Practice = see the packets yourself.**

Networking feels abstract until you watch a real packet fly. Each lab uses a small,
free, local tool (or a few lines of code) to make one concept visible — a DNS lookup
you can read, a TCP handshake you can capture, a route you can trace hop by hop.
Mostly CLI tools (`dig`, `curl`, `traceroute`, `tcpdump`/Wireshark) + a little
🐍 Python sockets — free, local, no cloud needed.

> 🧩 The goal is **observation**: don't just read that TCP does a 3-way handshake —
> capture the three packets and point at them.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## A. See the layers (start here)
- ✅ [Resolve a name by hand with `dig`](./lab-dig-dns.md)
  — watch DNS recursion, records, and TTLs. Mirrors [DNS](../1-knowledge/application-layer/dns.md).
- ✅ [Trace a route across the Internet](./lab-traceroute.md)
  — every hop between you and a server. Mirrors [routing](../1-knowledge/network-layer/routing-and-forwarding.md).

## B. Capture real traffic
- ✅ [Capture a TCP handshake](./lab-tcp-handshake.md)
  — see SYN, SYN-ACK, ACK with `tcpdump`/Wireshark. Mirrors [TCP](../1-knowledge/transport-layer/tcp.md).
- ✅ [Watch an HTTPS request with `curl -v`](./lab-curl-https.md)
  — DNS → TCP → TLS → HTTP, all in one trace.

## C. Write the code & talk to services
- ✅ [A TCP echo server & client (Python sockets)](./lab-tcp-sockets.md)
  — `socket`, `bind`, `listen`, `accept`. Mirrors [ports & sockets](../1-knowledge/transport-layer/ports-and-udp.md).
- ✅ [Talk to any service by hand with `netcat`](./lab-netcat.md)
  — speak HTTP raw, build a chat, scan a port. Mirrors [ports & UDP](../1-knowledge/transport-layer/ports-and-udp.md).

## D. Measure & manipulate
- ✅ [Measure throughput, latency & the cost of distance](./lab-iperf-throughput.md)
  — `iperf3` + `tc`: watch latency/loss crush throughput. Mirrors [latency vs bandwidth](../1-knowledge/fundamentals/latency-bandwidth-throughput.md) & [congestion control](../1-knowledge/transport-layer/congestion-control.md).
- ✅ [See NAT and a firewall in action](./lab-nat-firewall.md)
  — your private vs public IP, DHCP leases, allow/deny rules. Mirrors [NAT & DHCP](../1-knowledge/network-layer/nat-and-dhcp.md) & [firewalls](../1-knowledge/security/network-attacks-and-defenses.md).
