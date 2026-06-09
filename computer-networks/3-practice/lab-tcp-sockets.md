# Lab — A TCP echo server & client (Python sockets)

> **Builds:** [ports, sockets & multiplexing](../1-knowledge/transport-layer/ports-and-udp.md)
> and [TCP](../1-knowledge/transport-layer/tcp.md) — `socket`, `bind`, `listen`, `accept`,
> `connect`, and the byte-stream (not message) nature of TCP. **Tools:** Python 3 (stdlib only).
> **Time:** ~30 min.

## Goal
Write the two ends of a TCP connection yourself. You'll see that the
[socket API](../1-knowledge/transport-layer/ports-and-udp.md) is the same handle the whole
Internet is built on — and you'll hit the classic beginner trap that **TCP is a byte stream,
not messages.**

## 1. The server
`server.py` — listens on a port, echoes back whatever it receives:
```python
import socket

HOST, PORT = "127.0.0.1", 50007

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:   # TCP socket
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT))        # claim the port  (the "well-known" side)
    s.listen()                  # become a listening server
    print(f"listening on {HOST}:{PORT}")
    conn, addr = s.accept()     # BLOCKS until a client connects
    with conn:
        print(f"connected by {addr}")     # addr = client's (ip, ephemeral_port)
        while True:
            data = conn.recv(1024)        # read up to 1024 bytes
            if not data:                  # b"" means the client closed
                break
            conn.sendall(data)            # echo it straight back
```
`AF_INET` = IPv4, `SOCK_STREAM` = TCP. The `bind`/`listen`/`accept` trio is exactly the
server side from the [ports doc](../1-knowledge/transport-layer/ports-and-udp.md).

## 2. The client
`client.py`:
```python
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect(("127.0.0.1", 50007))    # triggers the TCP 3-way handshake
    s.sendall(b"hello, sockets")
    reply = s.recv(1024)
    print("server echoed:", reply.decode())
```
`connect()` is where the [3-way handshake](../1-knowledge/transport-layer/tcp.md) fires.

## 3. Run it
```console
$ python3 server.py          # terminal 1
listening on 127.0.0.1:50007

$ python3 client.py          # terminal 2
server echoed: hello, sockets
```
You just moved bytes through a TCP connection you built. While the server runs, in a third
terminal confirm the listening port:
```console
$ ss -tlnp | grep 50007
LISTEN 0  ... 127.0.0.1:50007 ...   python3
```
That's *your* program in the [socket table](../1-knowledge/transport-layer/ports-and-udp.md).

## 4. Prove TCP is a byte stream, not messages
Change the client to send two quick messages:
```python
    s.sendall(b"hello ")
    s.sendall(b"world")
    print(s.recv(1024))     # often prints b"hello world" — ONE recv, BOTH sends
```
The two `sendall`s frequently arrive in a **single** `recv`. TCP guarantees the *bytes* and
their *order* — it does **not** preserve your message boundaries. This is the #1 socket
gotcha: real protocols ([HTTP](../1-knowledge/application-layer/http.md) with
`Content-Length`, newlines, length prefixes) must frame their own messages.

## 5. (Optional) Watch your own handshake
Run `sudo tcpdump -i lo 'tcp port 50007'` in another terminal, then run the client — you'll
see the **SYN / SYN-ACK / ACK** for *your* connection (the [handshake lab](./lab-tcp-handshake.md),
on loopback).

## Exercises
1. Make the server handle **multiple** clients (loop on `accept()`, or use a thread per
   connection) — now your ephemeral-port intuition matters: each client gets a distinct
   [4-tuple](../1-knowledge/transport-layer/ports-and-udp.md).
2. Send a 100 KB payload and count how many `recv()` calls it takes — observe the stream
   arriving in chunks.
3. Convert it to **UDP** (`SOCK_DGRAM`, no `listen`/`accept`/`connect`) and notice messages now
   *do* keep boundaries — but can be lost or reordered. That's the
   [UDP vs TCP](../1-knowledge/transport-layer/ports-and-udp.md) trade-off, felt firsthand.
4. Kill the server mid-connection and see what exception the client gets (connection reset).

## What you proved
- The **socket API** (`bind`/`listen`/`accept`/`connect`) is the real, simple interface to the
  network — the same one browsers and servers use.
- `connect()` triggers a genuine **TCP handshake**.
- **TCP delivers bytes, not messages** — framing is the application's job.

## References
- [Ports, sockets & UDP](../1-knowledge/transport-layer/ports-and-udp.md), [TCP](../1-knowledge/transport-layer/tcp.md)
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/)
- Python [`socket` docs](https://docs.python.org/3/library/socket.html)
