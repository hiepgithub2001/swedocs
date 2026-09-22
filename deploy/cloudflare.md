# Deploying to Cloudflare Pages

The fit is better than a VM for this site, and the reason is specific rather
than general: Pages already does the two things that needed a server.

- **`404.html` is served automatically** for any unmatched path, which is what
  makes `/read/<book>/<chapter>` a real, shareable URL. `tools/site.js` already
  writes that file, so there is nothing to configure.
- **The reader fetches books unzipped** — `loadText`/`loadBlob` pull individual
  `.xhtml` files and foliate parses them itself — so the MIME types that forced
  a server on OCI Object Storage do not arise here.

What is left is caching, and the workflow generates that.

Unlike Oracle, **signing up needs no credit card.**

## Setup

**1. Account.** https://dash.cloudflare.com/sign-up — email and password.

**2. Create the project.** Workers & Pages → Create → Pages →
**Upload assets** (not "Connect to Git" — the build runs in GitHub Actions,
because rendering Mermaid needs a browser). Name it exactly **`swedocs`**.
Upload anything to finish creating it; the first real deploy replaces it.

**3. Account ID.** Workers & Pages → Overview, right-hand sidebar. It is also
the hex string in the dashboard URL.

**4. API token.** My Profile → API Tokens → Create Token →
**Edit Cloudflare Workers** template, or a custom token with
**Account → Cloudflare Pages → Edit**. Copy it once; it is not shown again.

**5. GitHub secrets.** Repository → Settings → Secrets and variables → Actions:

| Name | Kind | Value |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | the token from step 4 |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | the ID from step 3 |
| `CF_DOMAIN` | *Variable* | your custom domain, if you have one |

`CF_DOMAIN` is a **variable**, not a secret, and is optional — without it the
build points at `swedocs.pages.dev`. It matters because `BASE_URL` is compiled
into every book's cross-references, so it has to name the host that will serve
them.

**6. Deploy.** Actions → Deploy to Cloudflare → Run workflow.

## Verifying it

```bash
BUILD=$(curl -s https://swedocs.pages.dev/pub/latest.json | jq -r .build)

curl -sI https://swedocs.pages.dev/read/anything | head -1       # 404
curl -sI https://swedocs.pages.dev/pub/latest.json | grep -i cache
curl -sI "https://swedocs.pages.dev/pub/$BUILD/system-design.epub" \
  | grep -iE 'cache-control|content-type'
```

Expect `404` on the first (with the app as the body), `no-cache` on the second,
and `immutable` plus `application/epub+zip` on the third. If that last
Content-Type is wrong, add an override to the `_headers` block in the workflow
— it only affects downloading a book to an e-reader, never reading it in the
app.

## The one gotcha in `_headers`

Overlapping rules **accumulate**; they do not override. Two rules matching one
path produce a single header with both values joined by a comma, so

```
/pub/*
  Cache-Control: public, max-age=31536000, immutable
/pub/latest.json
  Cache-Control: no-cache
```

gives `latest.json` the header `public, max-age=31536000, immutable, no-cache`
— which is why the workflow writes the immutable rule against this build's
directory by name. `latest.json` sits beside that directory, not inside it, so
the two can never both match.

## Custom domain

Pages project → Custom domains → Set up a domain. If the domain's DNS is
already on Cloudflare it is a click; otherwise you move the nameservers first.
Then set the `CF_DOMAIN` variable and re-run the workflow so the books' links
point at it.

## What this does not change

`publish.yml` is untouched, so GitHub Pages keeps serving throughout. Run both
until you are satisfied, then delete whichever you do not want.

The Oracle path is also still intact — `Caddyfile`, `bootstrap.sh` and
`deploy-oci.yml` are tested and waiting. See [README.md](./README.md).
