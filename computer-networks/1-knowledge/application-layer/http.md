# HTTP — the web's request/response protocol

> HTTP is the language a browser and a web server use to talk: the client sends a
> **request** ("GET me this URL"), the server sends back a **response** (a status code +
> the content). It's plain text, stateless, and the foundation of the entire web and most
> APIs.

## Top-down: where you already meet this
Every web page, every "Sign in" button, every mobile-app screen that loads data is HTTP
underneath. It's the **top of the stack** — the very first thing your application actually
*says* once the network has built it a pipe. We start the layered tour here because it's
the layer you already have intuition for: a request goes out, a response comes back. Every
layer below exists only to carry these messages.

## Problem
A browser on your laptop and a server in a data center need a shared, simple convention
for "ask for a resource, get a resource" — one that's easy to implement, easy to debug,
works for HTML and images and JSON alike, and can evolve for decades. HTTP is that
convention: dead-simple text messages with a tiny set of rules.

## Core concepts

**Request / response.** HTTP is strictly **client-initiated**: the client sends one
request, the server sends one response. The server never speaks first.

```mermaid
sequenceDiagram
    participant Browser
    participant Server
    Browser->>Server: GET /index.html HTTP/1.1<br/>Host: example.com
    Server-->>Browser: 200 OK<br/>Content-Type: text/html<br/><br/>&lt;html&gt;…&lt;/html&gt;
```

**Anatomy of a request:**
```
GET /search?q=cats HTTP/1.1      ← method · path+query · version   (the "request line")
Host: example.com                ← headers (metadata): which site,
User-Agent: Mozilla/5.0            who's asking, what formats I accept…
Accept: text/html
                                 ← a blank line separates headers from body
(body — empty for GET)
```

**Anatomy of a response:**
```
HTTP/1.1 200 OK                  ← version · status code · reason   (the "status line")
Content-Type: text/html          ← headers: what this is, how big,
Content-Length: 1256               caching rules, cookies…
Cache-Control: max-age=3600
                                 ← blank line
<html>…</html>                   ← body (the actual content)
```

**Methods (verbs)** — what you want to *do* to the resource:

| Method | Means | Safe? | Idempotent? |
| --- | --- | --- | --- |
| `GET` | Fetch a resource | ✅ (read-only) | ✅ |
| `POST` | Submit data / create | ❌ | ❌ |
| `PUT` | Replace a resource | ❌ | ✅ |
| `PATCH` | Partially update | ❌ | ❌ |
| `DELETE` | Remove a resource | ❌ | ✅ |
| `HEAD` | Like GET but headers only | ✅ | ✅ |

*Safe* = doesn't change server state; *idempotent* = doing it twice == doing it once
(matters for safe retries after a timeout).

**Status codes** — the response's verdict, grouped by first digit:

| Class | Meaning | Common examples |
| --- | --- | --- |
| **1xx** | Informational | `101 Switching Protocols` (WebSocket upgrade) |
| **2xx** | Success | `200 OK`, `201 Created`, `204 No Content` |
| **3xx** | Redirect | `301 Moved Permanently`, `304 Not Modified` (cache hit) |
| **4xx** | **Client** error | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `429 Too Many Requests` |
| **5xx** | **Server** error | `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable` |

Mnemonic: **4xx = you messed up, 5xx = the server messed up.**

**Stateless — and how cookies fix it.** HTTP itself remembers *nothing* between requests;
each is independent. That's great for scaling (any server can handle any request) but
means "who is logged in?" needs help. **Cookies** solve it: the server sends
`Set-Cookie: session=abc123`, the browser sends `Cookie: session=abc123` on every later
request, and the server looks up the session. Statelessness is a deliberate design win,
patched with cookies/tokens where state is needed.

**The versions matter a lot for performance:**

| Version | Transport | Big idea | Pain it solved |
| --- | --- | --- | --- |
| **HTTP/1.1** | 1 TCP conn, one request at a time | text, keep-alive (reuse the connection) | reconnecting per request |
| **HTTP/2** | 1 TCP conn, **multiplexed** | many requests in parallel over one connection, binary framing, header compression | "head-of-line" blocking at the HTTP level |
| **HTTP/3** | **QUIC over UDP** | drops TCP entirely; faster handshake, no TCP head-of-line blocking | TCP's per-connection loss stalling *all* streams |

See [the end-to-end walkthrough](../fundamentals/web-request-end-to-end.md) for where these
handshakes fit, and [TCP](../transport-layer/tcp.md) for the head-of-line problem HTTP/3
escapes.

**REST** — not a protocol but a *style* of using HTTP for APIs: treat things as
**resources** (`/users/42`), use the **methods** for actions (`GET` to read, `DELETE` to
remove), return JSON, lean on status codes. Most web APIs you'll touch are "RESTish."

## Essential terminology

| Term | Meaning |
| --- | --- |
| **Resource** | A thing identified by a URL (a page, an image, a user record). |
| **Method / verb** | The action: `GET`, `POST`, `PUT`, `DELETE`… |
| **Status code** | 3-digit result of a request (200, 404, 500…). |
| **Header** | A `Key: Value` metadata line (content type, cookies, caching…). |
| **Body / payload** | The actual content (HTML, JSON, image bytes). |
| **Stateless** | The server keeps no memory between requests by default. |
| **Cookie** | A small token the server sets and the browser echoes back, to carry state. |
| **Idempotent** | Repeating the request has the same effect as doing it once (safe to retry). |
| **Keep-alive** | Reusing one TCP connection for many requests instead of reconnecting. |

## Example
A real request/response captured with `curl -v https://example.com` (trimmed):
```http
> GET / HTTP/1.1
> Host: example.com
> User-Agent: curl/8.4.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Content-Type: text/html; charset=UTF-8
< Content-Length: 1256
< Cache-Control: max-age=604800
< Date: Mon, 09 Jun 2026 01:00:00 GMT
<
< <!doctype html><html>…</html>
```
Lines with `>` are what your client *sent*, `<` are what the server *replied*. That's the
entire protocol — readable text. Try it yourself in the
[curl lab](../../3-practice/lab-curl-https.md).

## Common tools
| Tool | What it is | Use it for |
| --- | --- | --- |
| `curl -v` | Command-line HTTP client | sending any request, seeing raw headers |
| Browser DevTools → Network | Per-request inspector | headers, status, timing, payloads |
| Postman / `httpie` | Friendlier API clients | testing REST APIs by hand |
| `nginx` / `Caddy` | Web servers / reverse proxies | serving & routing HTTP |
| Wireshark | Packet capture | seeing HTTP/2 frames & HTTP inside TLS (with keys) |

## Trade-offs
- ✅ **Simple & debuggable:** plain text you can read and type by hand; universal support.
- ✅ **Stateless scales:** any server can serve any request → easy horizontal scaling.
- ⚠️ **Verbose:** text headers repeat on every request (HTTP/2 compresses them).
- ⚠️ **Statelessness is extra work:** sessions/auth must be bolted on (cookies, tokens).
- ⚠️ **Request/response only:** the server can't push unprompted — real-time needs
  WebSockets or Server-Sent Events on top.

## Real-world examples
- **Every REST API** (Stripe, GitHub, Twitter) is HTTP requests returning JSON + status codes.
- **`301`/`302` redirects** route `http://` → `https://` and old URLs → new ones.
- **`429 Too Many Requests`** is how APIs rate-limit you; `503` is what you see when a
  service is overloaded.
- **HTTP/2 multiplexing** is why modern sites load dozens of resources fast over one
  connection; **HTTP/3** (used by Google, Cloudflare, Facebook) speeds up flaky mobile networks.

## References
- Kurose & Ross, *Top-Down Approach* — Ch. 2.2 (HTTP)
- [MDN — HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- RFC 9110 (HTTP semantics), RFC 9114 (HTTP/3)
- [High Performance Browser Networking — HTTP/2](https://hpbn.co/http2/)
