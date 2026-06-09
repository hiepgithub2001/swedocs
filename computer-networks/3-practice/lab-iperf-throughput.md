# Lab — Measure throughput, latency & the cost of distance

> **Builds:** [latency, bandwidth & throughput](../1-knowledge/fundamentals/latency-bandwidth-throughput.md)
> and [congestion control](../1-knowledge/transport-layer/congestion-control.md) — the
> bandwidth/latency/throughput distinction, the bandwidth-delay product, and how loss/latency
> drag real throughput below the line rate. **Tools:** `iperf3`, `ping`, and `tc` (Linux, for
> the impairment exercise). **Time:** ~25 min.

## Goal
Stop confusing "fast internet." You'll **measure** the three numbers separately, then *inflict*
latency and loss on a link and watch [throughput collapse](../1-knowledge/fundamentals/latency-bandwidth-throughput.md) —
proving with your own data that latency, not bandwidth, often rules.

## 1. Measure latency (ping)
```console
$ ping -c 5 example.com
64 bytes from ... time=24.3 ms
...
rtt min/avg/max/mdev = 23.1/24.6/26.0/1.1 ms
```
`avg` is your [RTT](../1-knowledge/fundamentals/latency-bandwidth-throughput.md); `mdev` is
**jitter** (variation). Ping a *distant* host and a *nearby* one — the gap is pure
[propagation delay](../1-knowledge/fundamentals/latency-bandwidth-throughput.md) (distance ÷
speed of light), which **no bandwidth upgrade can fix**.

## 2. Measure throughput (iperf3)
`iperf3` needs a server and a client. Run both locally first (loopback), or use a public iperf3
server / a second machine on your LAN.
```console
# terminal 1 — server:
$ iperf3 -s
# terminal 2 — client (10-second TCP test):
$ iperf3 -c 127.0.0.1
[ ID] Interval     Transfer     Bitrate
[  5] 0.00-10.00s  45.2 GBytes  38.8 Gbits/sec    ← loopback: no real network, huge
```
On loopback there's no real link, so you measure your CPU, not a network. Re-run against a
**LAN machine** (`iperf3 -c 192.168.1.x`) for a real number — that's
[throughput](../1-knowledge/fundamentals/latency-bandwidth-throughput.md), the data you
*actually* get, always ≤ the link's [bandwidth](../1-knowledge/fundamentals/latency-bandwidth-throughput.md).

## 3. The headline experiment — make latency/loss crush throughput
This is the payoff. On Linux you can add artificial delay/loss to your loopback or a test
interface with `tc` (traffic control), then watch iperf3 react. **(Run on a test box; this
shapes real traffic.)**
```console
# Add 100 ms of delay to outgoing traffic on the loopback interface:
$ sudo tc qdisc add dev lo root netem delay 100ms
$ iperf3 -c 127.0.0.1         # throughput PLUMMETS vs step 2

# Now add 2% packet loss on top:
$ sudo tc qdisc change dev lo root netem delay 100ms loss 2%
$ iperf3 -c 127.0.0.1         # collapses further — loss triggers TCP backoff

# Clean up (remove the impairment):
$ sudo tc qdisc del dev lo root
```
**What you're seeing:** [TCP's congestion control](../1-knowledge/transport-layer/congestion-control.md)
reacts to delay (it must wait a full RTT for ACKs before sending more — the
[bandwidth-delay product](../1-knowledge/fundamentals/latency-bandwidth-throughput.md) caps
in-flight data) and to loss (it **halves `cwnd`** on every drop, the
[AIMD sawtooth](../1-knowledge/transport-layer/congestion-control.md)). Same link capacity,
far less throughput — because of *latency and loss*, not bandwidth.

## 4. Watch the congestion window live
While a longer transfer runs, in another terminal:
```console
$ ss -ti dst 127.0.0.1 | grep -A1 cwnd
   ... cwnd:42 ... rtt:100/5 ...     ← cwnd grows on success, drops on loss
```
You're watching `cwnd` from the [congestion-control doc](../1-knowledge/transport-layer/congestion-control.md)
breathe in real time.

## 5. (Optional) Compare congestion algorithms
```console
$ sysctl net.ipv4.tcp_available_congestion_control     # what's installed (cubic, bbr, reno…)
$ iperf3 -c <host> -C cubic
$ iperf3 -c <host> -C bbr        # on a lossy link, BBR often wins (it ignores loss as a signal)
```
This directly demonstrates why [BBR](../1-knowledge/transport-layer/congestion-control.md) was
built for lossy/wireless links.

## Exercises
1. With `tc`, find the loss % at which throughput drops by half. Surprisingly small, right?
2. Add only **delay** (no loss) and increase it 50→200→500 ms — plot throughput vs RTT. That's
   the BDP limit in action.
3. Compare `iperf3` over Wi-Fi vs Ethernet on the same machine — which has more jitter (step 1)?
4. Run a **UDP** test (`iperf3 -c host -u -b 100M`) and watch *loss* get reported directly —
   UDP doesn't back off, so it just drops.

## What you proved
- **Latency, bandwidth, and throughput are three different numbers** — you measured each.
- Adding **delay and loss tanks throughput** even with the same capacity — the
  [latency-bound](../1-knowledge/fundamentals/latency-bandwidth-throughput.md) reality.
- **TCP congestion control** is visibly reacting (`cwnd`), and algorithm choice matters.

## References
- [Latency, bandwidth & throughput](../1-knowledge/fundamentals/latency-bandwidth-throughput.md) ·
  [Congestion control](../1-knowledge/transport-layer/congestion-control.md)
- `man iperf3`, `man tc-netem`
