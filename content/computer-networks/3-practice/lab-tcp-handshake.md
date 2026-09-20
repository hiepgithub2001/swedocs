# Lab — Capture a TCP handshake

> **Builds:** [TCP](../1-knowledge/transport-layer/tcp.md) — the 3-way handshake, SYN/ACK
> flags, sequence numbers, connection teardown. **Tools:** `tcpdump` (or Wireshark) + `curl`.
> **Time:** ~20 min. **Note:** capturing needs `sudo` (raw packet access).

## Goal
Turn the [3-way handshake diagram](../1-knowledge/transport-layer/tcp.md) into three real
packets you captured yourself. You'll see SYN → SYN-ACK → ACK happen *before* any data, then
watch the data flow and the connection close.

## 1. Start capturing, then make a request
In **terminal 1**, start the capture (filter to one host to cut noise):
```console
$ sudo tcpdump -n -i any 'tcp and host example.com'
```
In **terminal 2**, trigger one connection:
```console
$ curl -s https://example.com > /dev/null
```
Switch back to terminal 1. `Ctrl-C` the capture.

## 2. Read the handshake
The first three lines are the handshake (trimmed):
```
IP 192.168.1.5.51000 > 93.184.216.34.443: Flags [S],  seq 1001            ← 1. SYN
IP 93.184.216.34.443 > 192.168.1.5.51000: Flags [S.], seq 5001, ack 1002  ← 2. SYN-ACK
IP 192.168.1.5.51000 > 93.184.216.34.443: Flags [.],  ack 5002            ← 3. ACK
IP 192.168.1.5.51000 > 93.184.216.34.443: Flags [P.], seq 1002, length 517 ← then: data (TLS)
```
Decode the flags:

| `tcpdump` flag | Meaning |
| --- | --- |
| `[S]` | **SYN** — open request |
| `[S.]` | **SYN-ACK** — `.` is the ACK bit set too |
| `[.]` | bare **ACK** |
| `[P.]` | **PSH+ACK** — data being pushed |
| `[F.]` | **FIN** — closing |
| `[R]` | **RST** — abrupt reset |

**Point at it:** three control packets, *then* `length > 0` data. That gap is the **1-RTT
setup tax** the [TCP doc](../1-knowledge/transport-layer/tcp.md) describes — latency you pay
before sending a single byte.

## 3. Follow the sequence numbers
- Client SYN: `seq 1001` → "my byte numbering starts here."
- Server SYN-ACK: `ack 1002` → "got your SYN (1001+1), expecting 1002 next"; `seq 5001` → its
  own numbering.
- Client ACK: `ack 5002` → "got your SYN too." Now both sides agree → **ESTABLISHED**.

(Modern `tcpdump` shows *relative* seq numbers like `seq 1` by default; add nothing — the
+1 accounting is the same idea.)

## 4. Watch the close
At the end of the capture you'll see `[F.]` (FIN) packets in both directions, each ACKed —
the graceful 4-way teardown. A `[R]` (RST) instead means an abrupt reset.

## 5. Prettier view in Wireshark (optional)
Open Wireshark → capture on your interface → filter `tcp.port == 443` → run the `curl` again.
Right-click any packet → **Follow → TCP Stream** to see the whole conversation. Wireshark
colors the handshake and labels `[SYN]`, `[SYN, ACK]`, `[ACK]` explicitly.

## Exercises
1. Count the packets between the final handshake ACK and the first FIN — that's your whole
   HTTPS exchange.
2. Capture a connection to a **slow/distant** server and measure the time gap between SYN and
   SYN-ACK — that's one RTT, your [latency](../1-knowledge/fundamentals/latency-bandwidth-throughput.md) to it.
3. Trigger a refused connection (`curl http://localhost:9999`) and find the `[R]` (RST) packet.
4. Compare an `http://` (port 80) capture vs `https://` (443): the HTTPS one has TLS data you
   can't read — see the [TLS lab](./lab-curl-https.md).

## What you proved
- TCP really does open with **SYN → SYN-ACK → ACK** before any data — you have the packets.
- **Sequence/ACK numbers** are how both sides agree on a starting point and detect loss.
- The handshake is a **measurable round-trip of latency**, not free.

## References
- [TCP knowledge doc](../1-knowledge/transport-layer/tcp.md)
- `man tcpdump`; [Wireshark TCP analysis](https://wiki.wireshark.org/TCP)
