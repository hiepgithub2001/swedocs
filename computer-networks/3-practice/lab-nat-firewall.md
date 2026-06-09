# Lab — See NAT and a firewall in action

> **Builds:** [NAT, private addresses & DHCP](../1-knowledge/network-layer/nat-and-dhcp.md),
> [IP addressing](../1-knowledge/network-layer/ip-addressing.md), and
> [firewalls](../1-knowledge/security/network-attacks-and-defenses.md). **Tools:** `ip`, `curl`,
> your router's admin page, and `nft`/`ufw` (Linux) for the firewall part. **Time:** ~20 min.

## Goal
Make two invisible-but-everywhere mechanisms concrete: see your **two identities** (the private
IP your OS knows vs the public IP the world sees) that prove [NAT](../1-knowledge/network-layer/nat-and-dhcp.md)
is rewriting your packets, and watch a [firewall](../1-knowledge/security/network-attacks-and-defenses.md)
allow/deny traffic.

## 1. Your private address (what your OS sees)
```console
$ ip addr show          # Linux   (macOS: ifconfig | Windows: ipconfig)
inet 192.168.1.5/24 ... wlan0
```
That `192.168.x.x/24` is a [private address](../1-knowledge/network-layer/ip-addressing.md) —
reusable, **not routable on the Internet**. Your whole LAN uses this range. Note the `/24`: it
defines your [subnet](../1-knowledge/network-layer/ip-addressing.md).

## 2. Your public address (what the world sees)
```console
$ curl -s ifconfig.me ; echo
203.0.113.7
```
Totally different number! That's your router's single [public IP](../1-knowledge/network-layer/nat-and-dhcp.md).
**Every device in your home shows the *same* public IP here** — try it on your phone (on the same
Wi-Fi). One public address, many devices: that's [NAT/PAT](../1-knowledge/network-layer/nat-and-dhcp.md)
multiplexing by port, proven in two commands.

## 3. Find your gateway and trace the boundary
```console
$ ip route | grep default
default via 192.168.1.1 dev wlan0      ← your default gateway = the NAT router
```
`192.168.1.1` is the [router that does NAT](../1-knowledge/network-layer/nat-and-dhcp.md). It's
[hop 1 in any traceroute](./lab-traceroute.md) and the last private-side address before your
packets get rewritten and sent out.

## 4. See the DHCP lease that configured all this
Your IP, gateway, and DNS were handed to you by [DHCP](../1-knowledge/network-layer/nat-and-dhcp.md):
```console
# Linux (systemd):
$ resolvectl status | grep -A3 "Link"          # DNS servers you were given
# or inspect a lease file:
$ cat /var/lib/dhcp/dhclient.leases 2>/dev/null # lease: IP, router, DNS, expiry
```
Your **router's admin page** (usually `http://192.168.1.1`) shows the **DHCP client list** and
the **NAT translation table** — open it and watch entries appear as devices connect and browse.

## 5. Watch a firewall allow vs deny (Linux)
Firewalls express the [default-deny + allowlist](../1-knowledge/security/network-attacks-and-defenses.md)
idea. With `ufw` (uncomplicated firewall) on a **test machine**:
```console
$ sudo ufw status verbose          # current policy
# Start a listener and confirm it's reachable locally:
$ nc -l 9000 &                     # (see the netcat lab)
$ nc -zv 127.0.0.1 9000            # succeeds

# Now block the port and test from another machine on your LAN:
$ sudo ufw deny 9000
$ # from another host:  nc -zv <this-host-ip> 9000   → now refused/timed out
$ sudo ufw delete deny 9000        # clean up
```
You just changed *who can reach a service* without touching the service itself — the essence of
a [firewall](../1-knowledge/security/network-attacks-and-defenses.md).

## 6. Why you can't be reached from outside (the NAT firewall effect)
From a machine **outside** your network, try to connect to your public IP on some port:
```console
$ nc -zv 203.0.113.7 9000      # from outside → almost certainly fails
```
There's **no [NAT table](../1-knowledge/network-layer/nat-and-dhcp.md) entry** for an unsolicited
inbound connection, so the router has nowhere to send it. This is why home devices are
incidentally shielded — and why hosting a server from home needs **port forwarding** (a manual
NAT rule). Add one in your router's admin page and re-test to see it succeed.

## Exercises
1. Check `ifconfig.me` from your laptop and phone on the same Wi-Fi — confirm the **identical
   public IP** (NAT) but **different private IPs** (DHCP).
2. Open your router's NAT/connection table and watch entries appear/expire as you load sites.
3. Set up a **port-forward** rule and reach a home service from outside — then remove it.
4. Compare your public IP on Wi-Fi vs on mobile data — different networks, different
   [public addresses](../1-knowledge/network-layer/nat-and-dhcp.md) (and mobile is often
   [CGNAT](../1-knowledge/network-layer/nat-and-dhcp.md)).

## What you proved
- You have **two addresses** — private (OS) and public (world) — because **NAT rewrites your
  packets** at the router.
- **DHCP** silently configured your IP, gateway, and DNS.
- A **firewall** controls reachability independently of the service, and **NAT itself acts like
  a default-deny firewall** for inbound connections.

## References
- [NAT, private addresses & DHCP](../1-knowledge/network-layer/nat-and-dhcp.md) ·
  [IP addressing](../1-knowledge/network-layer/ip-addressing.md) ·
  [Firewalls & defenses](../1-knowledge/security/network-attacks-and-defenses.md)
- `man ip`, `man ufw`
