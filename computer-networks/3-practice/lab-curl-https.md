# Lab — Watch an HTTPS request, layer by layer

> **Builds:** the [end-to-end web request](../1-knowledge/fundamentals/web-request-end-to-end.md)
> — DNS → TCP → [TLS](../1-knowledge/security/tls-https.md) → [HTTP](../1-knowledge/application-layer/http.md),
> all in one trace. **Tools:** `curl`, `openssl` (optional). **Time:** ~20 min.

## Goal
See the *entire stack* of a single `https://` request in one command, then break out each
phase's timing. This lab ties the whole knowledge area together on one screen.

## 1. The verbose request
```console
$ curl -v https://example.com 2>&1 | head -40
```
Walk the output — it's the [end-to-end journey](../1-knowledge/fundamentals/web-request-end-to-end.md),
annotated:
```
* Trying 93.184.216.34:443...            ← DNS already resolved the name → IP
* Connected to example.com (...) port 443 ← TCP 3-way handshake done
* TLS connection using TLSv1.3 / TLS_AES_256_GCM_SHA384   ← TLS handshake + cipher
* Server certificate:
*  subject: CN=example.com                ← the cert's domain
*  issuer:  C=US, O=DigiCert Inc, ...      ← the CA that signed it
*  SSL certificate verify ok.             ← chain validated → padlock 🔒
> GET / HTTP/2                            ← now the HTTP request (lines with >)
> Host: example.com
< HTTP/2 200                              ← the response (lines with <)
< content-type: text/html
```
Lines starting `*` are curl's notes on the **connection/TLS**; `>` is what you **sent**
(HTTP); `<` is the **response**. Four layers, one screen.

## 2. Break out the timing of each phase
`curl` can print exactly how long each stage took:
```console
$ curl -w "DNS:        %{time_namelookup}s\nTCP connect: %{time_connect}s\nTLS done:    %{time_appconnect}s\nFirst byte:  %{time_starttransfer}s\nTotal:       %{time_total}s\n" -o /dev/null -s https://example.com
DNS:         0.012s
TCP connect: 0.085s     ← +73 ms: the TCP handshake (one RTT)
TLS done:    0.180s     ← +95 ms: the TLS handshake (another RTT)
First byte:  0.240s     ← +60 ms: HTTP request + server think time
Total:       0.245s
```
These cumulative timings are the [round-trip table](../1-knowledge/fundamentals/web-request-end-to-end.md)
made real: each phase adds ~1 RTT. On a distant server the gaps balloon — proof that
**latency, not bandwidth**, dominates a small request (see
[latency vs bandwidth](../1-knowledge/fundamentals/latency-bandwidth-throughput.md)).

## 3. Inspect the certificate directly
```console
$ openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null \
    | openssl x509 -noout -subject -issuer -dates
subject=CN = example.com
issuer=CN = DigiCert Global G2 TLS RSA SHA256 2020 CA1   ← the CA
notBefore=...   notAfter=...                              ← validity window
```
This is the [chain of trust](../1-knowledge/security/tls-https.md) you usually see by
clicking the browser padlock — the same data, on the command line.

## 4. See HTTP versions negotiate
```console
$ curl -sI --http2 https://cloudflare.com | head -1     # HTTP/2
$ curl -sI --http3 https://cloudflare.com | head -1     # HTTP/3 (if your curl supports it)
```
The status line shows `HTTP/2` or `HTTP/3` — the [version differences](../1-knowledge/application-layer/http.md)
in action.

## Exercises
1. Run the timing command against a server on another continent — which phase grows most? (All
   of them — each is an extra RTT × distance.)
2. Hit the same URL twice with `curl --tlsv1.3` and a reused connection — observe faster repeat
   connects (TLS session resumption).
3. Try `curl -v https://expired.badssl.com` — watch the certificate verification **fail** and
   curl refuse. That refusal *is* [authentication](../1-knowledge/security/tls-https.md) working.
4. Compare `time_total` for `http://` vs `https://` on a site that allows both — what did TLS cost?

## What you proved
- One `https://` fetch is really **DNS → TCP → TLS → HTTP**, stacked — and you saw each layer.
- Every phase costs about **one round-trip**, so latency compounds.
- The browser padlock is **certificate verification**, which you can run and even watch *fail*.

## References
- [End-to-end web request](../1-knowledge/fundamentals/web-request-end-to-end.md)
- [TLS & HTTPS](../1-knowledge/security/tls-https.md), [HTTP](../1-knowledge/application-layer/http.md)
- `man curl` (see `-w` / `--write-out` variables)
