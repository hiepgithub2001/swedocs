# WebSockets & Real-Time Communication

> Techniques for pushing data from server to client in near real-time, instead of the
> client always having to ask: polling, long polling, SSE, and WebSockets.

## Problem
Plain HTTP is request/response — the server can't initiate. For chat, live feeds,
notifications, dashboards, and multiplayer, the server needs to **push** updates as
they happen. Several techniques bridge that gap with different trade-offs.

## Core concepts

**Short polling** — client asks "anything new?" on a timer.
- Simple; wasteful (most responses are empty), and updates lag by the interval.

**Long polling** — client requests; server **holds** the connection open until it has
data (or times out), then the client immediately reconnects.
- Near real-time over plain HTTP; more efficient than short polling, but lots of
  reconnects and held connections.

**Server-Sent Events (SSE)** — a single long-lived HTTP connection over which the
**server streams** events to the client.
- ✅ Simple, auto-reconnect, works over HTTP. ⚠️ **one-way** (server→client), text only.

**WebSockets** — a persistent, **full-duplex** TCP connection (starts as HTTP, then
"upgrades").
- ✅ True bidirectional, low overhead per message, low latency. ⚠️ Stateful
  connections complicate load balancing/scaling; need a pub/sub backplane to fan out
  across servers.

```mermaid
flowchart LR
    subgraph WebSocket
      C1[Client] <-->|full-duplex| S1[Server]
    end
    subgraph SSE
      C2[Client] <--|server stream only| S2[Server]
    end
```

## Trade-offs
- Pick the **simplest** that meets the need: notifications/feeds → **SSE**; chat,
  gaming, collaborative editing → **WebSockets**; occasional updates → **long polling**.
- Persistent connections are **stateful** → scaling needs sticky routing + a shared
  pub/sub (Redis, Kafka) so a message reaches whichever server holds the user's socket.

## Real-world examples
- **Slack, WhatsApp Web, Figma, multiplayer games** use WebSockets.
- **Stock tickers / live scores** often use SSE.

## References
- [MDN: WebSockets](https://developer.mozilla.org/docs/Web/API/WebSockets_API)
- [MDN: Server-Sent Events](https://developer.mozilla.org/docs/Web/API/Server-sent_events)
