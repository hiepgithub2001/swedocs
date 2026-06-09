# Computer Networks · Part 1 — Knowledge

Academic docs, taught **top-down**: we start at the application layer (the part you
already use) and descend one layer at a time to the wire. Each topic follows the
[knowledge template](../_TEMPLATE.md) and leads with three beginner aids —
a **top-down hook**, a **worked example**, and the **essential terminology**.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

> 📚 Read in order. Each layer below exists to serve the layer **above** it, so the
> list runs top (closest to you) to bottom (closest to the wire).

## Fundamentals — the big picture first
- ✅ [What is a network? The Internet, top-down](./fundamentals/what-is-a-network.md)
- ✅ [Protocol layers & encapsulation](./fundamentals/protocol-layers.md)
- ✅ [What happens when you load a web page (end-to-end)](./fundamentals/web-request-end-to-end.md)
- ✅ [Latency, bandwidth & throughput](./fundamentals/latency-bandwidth-throughput.md)

## Application layer — what programs say to each other
- ✅ [HTTP — the web's request/response protocol](./application-layer/http.md)
- ✅ [DNS — turning names into addresses](./application-layer/dns.md)
- ⬜ [Email, WebSockets & other app protocols](./application-layer/other-protocols.md)

## Transport layer — process-to-process delivery
- ✅ [Ports, sockets & multiplexing (and UDP)](./transport-layer/ports-and-udp.md)
- ✅ [TCP — reliable, ordered byte streams](./transport-layer/tcp.md)
- ✅ [Congestion control](./transport-layer/congestion-control.md)

## Network layer — host-to-host across the world
- ✅ [IP addressing, subnets & CIDR](./network-layer/ip-addressing.md)
- ✅ [Routing & forwarding](./network-layer/routing-and-forwarding.md)
- ✅ [NAT, private addresses & DHCP](./network-layer/nat-and-dhcp.md)

## Link layer — getting across one hop
- ✅ [Ethernet, MAC addresses, switches & ARP](./link-layer/ethernet-and-arp.md)

## Network security
- ✅ [TLS & HTTPS — how the web gets encrypted](./security/tls-https.md)
