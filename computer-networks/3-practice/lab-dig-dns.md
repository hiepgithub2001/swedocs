# Lab — Resolve a name by hand with `dig`

> **Builds:** [DNS](../1-knowledge/application-layer/dns.md) — the hierarchy, record types,
> caching/TTLs, recursive vs iterative resolution. **Tools:** `dig` (install: `dnsutils` /
> `bind-utils`). **Time:** ~15 min. **OS:** Linux/macOS (Windows: use WSL).

## Goal
Stop taking name→IP resolution on faith. You'll watch a real lookup, read every field of
the answer, see caching with your own eyes, and walk the full root → TLD → authoritative
delegation chain.

## 1. The simplest lookup
```console
$ dig example.com +short
93.184.216.34
```
That one line is what [every web request](../1-knowledge/fundamentals/web-request-end-to-end.md)
does first. Now get the full answer:
```console
$ dig example.com
```
Read the sections:
- **QUESTION** — what you asked (`example.com. IN A`).
- **ANSWER** — `example.com. 3600 IN A 93.184.216.34`. The `3600` is the **TTL** (seconds it
  may be cached). `IN` = Internet class, `A` = IPv4 address record.
- **Query time** — note it (e.g. `24 msec`).

## 2. See caching
Run the same command **twice in a row** and compare `Query time`:
```console
$ dig example.com | grep "Query time"
;; Query time: 24 msec      ← cold: resolver walked the tree
$ dig example.com | grep "Query time"
;; Query time: 0 msec       ← warm: served from the resolver's cache
```
**That's the entire reason DNS scales.** Watch the TTL count *down* on repeated queries — when
it hits 0 the resolver re-fetches.

## 3. Different record types
```console
$ dig example.com AAAA +short     # IPv6 address
$ dig google.com MX +short        # mail servers
$ dig example.com NS +short       # authoritative nameservers
$ dig example.com TXT +short      # text (SPF, domain verification)
```
Each maps the name to a *different kind* of thing — DNS is more than an address book.

## 4. Walk the delegation chain yourself
This is the payoff — watch the **iterative** resolution from the root down:
```console
$ dig +trace example.com
```
Read the output top to bottom:
1. It queries a **root** server → gets a referral to the **`.com`** nameservers.
2. Queries a `.com` server → referral to **example.com's** authoritative servers.
3. Queries the authoritative server → the final **A record**.

You just did, by hand, exactly what your resolver does on a cold lookup — the
[hierarchy diagram](../1-knowledge/application-layer/dns.md) made real.

## 5. Pick your resolver
```console
$ dig @1.1.1.1 example.com +short    # ask Cloudflare's resolver
$ dig @8.8.8.8 example.com +short    # ask Google's resolver
```
The `@server` overrides your default resolver — useful for debugging "is it *my* DNS that's
broken?"

## Exercises
1. Find the TTL of `github.com`'s A record and watch it decrement on repeated `dig`s.
2. Use `dig +trace` on your favorite site — how many delegation steps? Which CA-style chain
   of nameservers?
3. Compare `dig yourbank.com MX` — who hosts their email? (Often Google or Microsoft.)
4. Add an entry to `/etc/hosts` and confirm `getent hosts` returns it *without* any DNS query
   (the OS checks the hosts file first).

## What you proved
- Names are resolved through a **delegated hierarchy**, not one big server.
- **Caching + TTLs** make a planet-scale lookup feel instant.
- DNS stores **many record types**, and you can target any **resolver** — the building blocks
  behind every connection you make.

## References
- [DNS knowledge doc](../1-knowledge/application-layer/dns.md)
- `man dig`
