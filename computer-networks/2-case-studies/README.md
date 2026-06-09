# Computer Networks · Part 2 — Case Studies

How real networked systems work end-to-end: the requirements, the path a packet
takes, the protocols in play, and the trade-offs. Each follows the
[shared doc template](../../_TEMPLATE.md) and builds on the
[Part 1 knowledge docs](../1-knowledge/).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## The web, for real
- ✅ [Loading `https://example.com` — every layer, every packet](./loading-a-web-page.md)
  — the capstone: the whole stack as one continuous packet-level story.
- ✅ [How a CDN cuts latency](./cdn.md)
  — DNS + anycast + caching + handshake locality, working together.

## Real-time & scale
- ✅ [A video call over a flaky network (WebRTC)](./video-call.md)
  — why real-time media chooses UDP, NAT traversal, jitter & loss handling.

## When it breaks
- ✅ [Anatomy of a real outage (BGP & DNS)](./anatomy-of-an-outage.md)
  — how one routing change can erase a company from the Internet.
