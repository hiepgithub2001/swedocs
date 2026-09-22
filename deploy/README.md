# Deploying to Oracle Cloud, Singapore

The site is static — an offline reader plus 33 EPUBs, about 18 MB. Any host
that serves files over TLS can do it. What follows is the Always Free path.

## Read this before you start

**Always Free resources exist only in your tenancy's home region, and the home
region is fixed when the account is created.** It cannot be changed afterwards.
So this plan works only if your account's home region is already
`ap-singapore-1`. Check the top-right region menu in the console, or:

```bash
oci iam region-subscription list --query 'data[?"is-home-region"]'
```

If home is somewhere else, the options are a new tenancy created with Singapore
as home, or paying for a Singapore instance. Provisioning in a non-home region
and expecting it to be free is the way this goes wrong quietly.

Two more things worth knowing up front. Oracle cut the Always Free Ampere
allowance from 4 OCPU / 24 GB to **2 OCPU / 12 GB on 15 June 2026**, without
announcing it. And Ampere capacity in Singapore is frequently exhausted — "Out
of host capacity" on instance creation is routine there.

None of that matters much here: this workload is 18 MB of static files. The
**AMD `VM.Standard.E2.1.Micro`** (1/8 OCPU, 1 GB) is also Always Free, is not
capacity-constrained, and is more than enough. Take the Ampere shape if it
happens to be available; do not wait on it.

## Why a VM and not an Object Storage bucket

A bucket would be simpler and is the usual answer for a static site. It does
not work for this one:

- The app needs **`/read/<book>/<chapter>` to be a real URL**, served by
  `404.html`. Object Storage has no fallback rule.
- It needs `.epub`, `.opf`, `.ncx` and `.xhtml` served with the right
  `Content-Type`, or the reader refuses to open a book.

Fixing either means putting API Gateway in front, which is not Always Free. A
VM running Caddy handles both in a config file, so that is what `Caddyfile`
here does.

## You need a domain name

Not optional. The offline reader is a **service worker**, and a service worker
only runs in a secure context. On `http://<ip>` there is no TLS, so there is no
offline mode — the one feature that justifies the whole EPUB pipeline.

If you do not have a domain, `<ip-with-dashes>.sslip.io` resolves to that IP
and Let's Encrypt will issue a certificate for it. Ugly, free, and works today.

## Steps

**1. Instance.** Console → Compute → Instances → Create.
Image Ubuntu 24.04, shape `VM.Standard.E2.1.Micro` (or `VM.Standard.A1.Flex`
if Singapore has capacity), assign a public IPv4, upload your SSH public key.

**2. Open the port in the VCN.** Networking → your VCN → Subnet → Security
List → Add Ingress Rules: source `0.0.0.0/0`, TCP, destination ports 80 and 443.

**3. Open the port on the host too.** This is the step everyone misses. Oracle's
images ship an iptables ruleset that rejects everything but SSH, *on top of* the
security list. `bootstrap.sh` does it, and it is why the script exists.

**4. Bootstrap.**

```bash
scp deploy/bootstrap.sh ubuntu@<ip>:
ssh ubuntu@<ip> 'sudo bash bootstrap.sh swedocs.example.com "$(cat ci-key.pub)"'
scp deploy/Caddyfile ubuntu@<ip>:/tmp/
ssh ubuntu@<ip> 'sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy'
```

Edit the first line of `Caddyfile` to your domain before copying it.

**5. DNS.** An `A` record for the domain pointing at the instance's public IP.
Wait for it to resolve before reloading Caddy — the certificate is issued on
first request and needs the name to already point at the host.

**6. CI secrets.** Repository → Settings → Secrets → Actions:

| Secret | Value |
| --- | --- |
| `OCI_HOST` | the instance's public IP |
| `OCI_DOMAIN` | `swedocs.example.com` |
| `OCI_SSH_KEY` | the **private** half of the CI key, whole file including the header lines |

Generate that key pair for CI alone — `ssh-keygen -t ed25519 -f ci-key -N ""` —
and do not reuse your personal key.

**7. Deploy.** Actions → Deploy to Oracle Cloud → Run workflow. It builds,
uploads, and then asserts that `/` returns 200, that `/read/anything` returns
404, and that `latest.json` names the build it just pushed.

## Cutover

`publish.yml` is untouched, so GitHub Pages keeps working throughout. Run both,
read the Oracle copy for a few days, and only then move the domain. To stop
publishing to Pages, delete `publish.yml` — not before.

One thing to keep in mind when you compare them: this is **one machine in one
region**, where Pages is a CDN. For you in Vietnam, Singapore is close and it
will feel fast. For a reader in Europe it will be slower than Pages is. The app
caches itself on first visit, which blunts that, but it does not erase it.

## Verifying the config locally

The `Caddyfile` here was checked against the real `dist/site` before it was
committed, and you can repeat that without touching the server:

```bash
npm run build && npm run site
sed 's|^swedocs\.example\.com {|:8099 {|' deploy/Caddyfile > /tmp/Caddyfile.test
docker run --rm -p 8099:8080 \
  -v "$PWD/dist/site:/srv/swedocs:ro" \
  -v /tmp/Caddyfile.test:/etc/caddy/Caddyfile:ro caddy:2-alpine
```

Then `curl -I localhost:8099/read/anything` should be `404` with an HTML body,
and `curl -I localhost:8099/pub/<build>/system-design.epub` should be
`application/epub+zip` with a one-year immutable cache header.
