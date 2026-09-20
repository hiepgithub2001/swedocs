# Computer Networks

How do two programs on opposite sides of the planet talk to each other? This area
answers that, **top-down** — we start from things you already use every day (a web
page, a chat message) and peel back one layer at a time until we reach the wires.

Every section in this knowledge base is organized into **3 parts**:

| Part | Folder | What it contains |
| --- | --- | --- |
| 1️⃣ **Knowledge** | [`1-knowledge/`](./1-knowledge/) | Academic docs — concepts, theory, definitions, explained top-down |
| 2️⃣ **Case Study** | [`2-case-studies/`](./2-case-studies/) | How real networked systems work end-to-end |
| 3️⃣ **Practice** | [`3-practice/`](./3-practice/) | Hands-on labs — write the code & run the tools that *are* the concept |

Open each part's `README.md` for its catalog.

> **Why top-down?** Networking is taught two ways. *Bottom-up* starts at the
> electrical signal and builds toward the browser — by the time anything is useful
> you've forgotten why you started. *Top-down* (the [Kurose & Ross](https://gaia.cs.umass.edu/kurose_ross/)
> approach) starts at the **application you already understand** and asks, at each
> step, "okay, but how does *that* actually happen?" Every layer exists to serve the
> one above it, so we meet them in that order. This area is built top-down on purpose.

> **Status:** 🚧 in progress — 1️⃣ Knowledge being written first, top-down.

---

## 1️⃣ Knowledge — [catalog »](./1-knowledge/)
The five layers, from the top down: **application** (HTTP, DNS), **transport**
(TCP, UDP, ports), **network** (IP, routing, NAT), and **link** (Ethernet, MAC,
switches, ARP) — plus the fundamentals that tie them together and a chapter on
**network security** (TLS). Each topic leads with a top-down hook, a worked
example, and the **essential terminology** spelled out.

## 2️⃣ Case Study — [catalog »](./2-case-studies/)
How real networked systems are built end-to-end: what *actually* happens when you
load a web page, how a CDN cuts latency, and how a video call survives a flaky
network.

## 3️⃣ Practice — [catalog »](./3-practice/)
Runnable labs where you **see the packets yourself** — read a capture in Wireshark,
write a TCP socket, watch a DNS lookup, trace a route across the Internet. Mostly
local CLI tools (`dig`, `curl`, `tcpdump`, `traceroute`) + a little Python — free,
no cloud needed.
