# Lab — Talk to any service by hand with `netcat`

> **Builds:** [ports, sockets & UDP](../1-knowledge/transport-layer/ports-and-udp.md),
> [HTTP](../1-knowledge/application-layer/http.md), and the insight that application protocols
> are [just text over a connection](../1-knowledge/application-layer/other-protocols.md).
> **Tools:** `nc` (netcat — usually preinstalled; `ncat` from nmap is a good variant). **Time:**
> ~20 min.

## Goal
`netcat` is "the TCP/IP swiss army knife": it opens a raw [TCP or UDP](../1-knowledge/transport-layer/ports-and-udp.md)
connection and pipes your keyboard to it. With it you'll *speak HTTP by hand*, build a two-person
chat, and see the [client/server port model](../1-knowledge/transport-layer/ports-and-udp.md)
with nothing but a terminal.

## 1. Speak HTTP yourself
Prove HTTP is just text. Connect to a web server and type the request manually:
```console
$ nc example.com 80
GET / HTTP/1.1            ← type this
Host: example.com        ← and this
                         ← then press Enter on a BLANK line
HTTP/1.1 200 OK          ← the server responds!
Content-Type: text/html
...
```
You just did, by hand, what your browser does in [step 5 of a page load](../2-case-studies/loading-a-web-page.md).
The blank line is the [HTTP](../1-knowledge/application-layer/http.md) "end of headers" marker —
forget it and the server waits forever.

## 2. A two-terminal chat (client + server)
This makes the [server vs client](../1-knowledge/transport-layer/ports-and-udp.md) roles concrete.

**Terminal 1 — the server** (listen on a port):
```console
$ nc -l 9000           # -l = listen; claims port 9000, waits for a connection
```
**Terminal 2 — the client** (connect to it):
```console
$ nc 127.0.0.1 9000
```
Now type in either window and it appears in the other — a live TCP connection you built. In a
third terminal, confirm the [4-tuple](../1-knowledge/transport-layer/ports-and-udp.md):
```console
$ ss -tnp | grep 9000
ESTAB ... 127.0.0.1:54012  127.0.0.1:9000     ← client ephemeral port ↔ server's 9000
```

## 3. Transfer a file (raw bytes over TCP)
```console
# receiver:
$ nc -l 9000 > received.txt
# sender:
$ nc 127.0.0.1 9000 < bigfile.txt
```
No protocol, no framing — just a [byte stream](../1-knowledge/transport-layer/tcp.md) from one
socket to another. (This is why [TCP doesn't preserve message boundaries](../1-knowledge/transport-layer/tcp.md):
there are none here, just bytes.)

## 4. TCP vs UDP, felt directly
Add `-u` for [UDP](../1-knowledge/transport-layer/ports-and-udp.md):
```console
$ nc -u -l 9000        # server
$ nc -u 127.0.0.1 9000 # client
```
Notice: with UDP there's **no handshake** — the "connection" starts instantly because there
isn't one. That's the [connectionless](../1-knowledge/transport-layer/ports-and-udp.md) nature,
firsthand.

## 5. Check if a port is open
```console
$ nc -zv example.com 443      # -z = scan (don't send data), -v = verbose
Connection to example.com 443 port [tcp/https] succeeded!
$ nc -zv example.com 23       # telnet port — almost certainly closed/filtered
nc: connect to example.com port 23 (tcp) failed: Connection refused
```
"Succeeded" = something is [listening](../1-knowledge/transport-layer/ports-and-udp.md);
"refused/timeout" = nothing there or a [firewall](../1-knowledge/security/network-attacks-and-defenses.md)
is dropping it.

## Exercises
1. Speak [SMTP or another text protocol](../1-knowledge/application-layer/other-protocols.md) by
   hand (`nc smtp.server 25`, then `HELO ...`).
2. Run the chat between two *real* machines on your LAN (use the server's
   [private IP](../1-knowledge/network-layer/ip-addressing.md), not 127.0.0.1).
3. Start `nc -l 9000`, connect, and in a third terminal run `sudo tcpdump 'tcp port 9000'` —
   watch *your* [handshake](./lab-tcp-handshake.md) and data packets.
4. Scan a few ports of a host **you own** with `nc -zv` and compare to `nmap`.

## What you proved
- Application protocols are **just structured text/bytes over a socket** — you spoke HTTP raw.
- The **listen/connect** split and **ephemeral ports** are real and observable.
- **TCP handshakes; UDP doesn't** — you felt the difference.

## References
- [Ports, sockets & UDP](../1-knowledge/transport-layer/ports-and-udp.md) ·
  [Other app protocols](../1-knowledge/application-layer/other-protocols.md)
- `man nc` / `man ncat`
