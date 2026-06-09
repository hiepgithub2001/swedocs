# Lab — Host a static site on S3 + CloudFront

> **Builds:** [AWS core services](../../1-knowledge/cloud/aws-core-services.md) (S3, CloudFront),
> [object storage](../../1-knowledge/cloud/cloud-computing.md), and the
> [CDN](../../../computer-networks/2-case-studies/cdn.md) concept made concrete. **Tools:** AWS
> account + AWS CLI v2. **Time:** ~30 min. **Cost:** **essentially free** — S3 storage of a few KB
> and CloudFront's free tier; no always-on compute.

> ⚠️ Skim [AWS setup & cost safety](../../../system-design/3-practice/aws/setup-and-costs.md) first
> (budget alarm, don't commit keys). This lab has no hourly-billed resources, but tear down when done.

## Goal
Serve a website with **zero servers**: store the files in **S3** (object storage) and put
**CloudFront** (AWS's [CDN](../../../computer-networks/2-case-studies/cdn.md)) in front to cache them
at the edge near users. This is the cheapest, most scalable hosting there is — and a direct
application of [S3 + CloudFront from the service map](../../1-knowledge/cloud/aws-core-services.md).

## 1. Make a site & a bucket
```console
$ echo '<h1>hello from S3 + CloudFront</h1>' > index.html
$ aws s3 mb s3://my-unique-site-bucket-12345        # bucket names are globally unique
$ aws s3 cp index.html s3://my-unique-site-bucket-12345/
```
[S3](../../1-knowledge/cloud/aws-core-services.md) stores your file as an **object** — durable
(11 nines of durability) and cheap.

## 2. Put CloudFront in front (the CDN)
Create a **CloudFront distribution** with the S3 bucket as its **origin** (console:
**CloudFront → Create distribution → origin = your bucket**, use **Origin Access Control** so the
bucket stays private and only CloudFront can read it — [least privilege](../../1-knowledge/cloud/aws-iam.md)).
```console
$ aws cloudfront create-distribution --origin-domain-name \
    my-unique-site-bucket-12345.s3.amazonaws.com
# returns a distribution domain like d111111abcdef8.cloudfront.net (takes a few min to deploy)
```
**Why not just serve from S3 directly?** [CloudFront](../../../computer-networks/2-case-studies/cdn.md)
caches your content at edge locations worldwide, so a user in Tokyo gets it from a nearby
[PoP](../../../computer-networks/2-case-studies/cdn.md) (~10 ms) instead of crossing an ocean to
your bucket's region — the [latency win](../../../computer-networks/1-knowledge/fundamentals/latency-bandwidth-throughput.md)
from the CDN case study, for real. It also gives you HTTPS and DDoS absorption.

## 3. Load it & see the cache
```console
$ curl -sI https://d111111abcdef8.cloudfront.net | grep -i 'x-cache\|server'
server: CloudFront
x-cache: Miss from cloudfront          ← first hit: fetched from S3 origin, then cached
$ curl -sI https://d111111abcdef8.cloudfront.net | grep -i x-cache
x-cache: Hit from cloudfront           ← second hit: served from the edge cache 🎉
```
That `Hit from cloudfront` is the [CDN cache](../../../computer-networks/2-case-studies/cdn.md)
working — exactly the `cf-cache-status: HIT` idea from the CDN case study.

## 4. Update content & invalidate the cache
Change `index.html`, re-upload, and you'll still see the *old* version (it's cached!). Force a
refresh with an **invalidation** — the [cache-invalidation](../../../computer-networks/2-case-studies/cdn.md)
problem, hands-on:
```console
$ aws s3 cp index.html s3://my-unique-site-bucket-12345/
$ aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
# now the edge re-fetches from origin → new content
```
(In production you'd use **versioned filenames** like `app.a1b2c3.js` instead of invalidating —
the cache-busting trick from the CDN doc.)

## 5. 🔴 Teardown
```console
$ aws cloudfront delete-distribution --id <id> --if-match <etag>   # disable first, then delete
$ aws s3 rb s3://my-unique-site-bucket-12345 --force                # remove bucket + contents
```

## Exercises
1. Add a `style.css` + image and confirm each gets cached independently (per-object `x-cache`).
2. Set a long `Cache-Control: max-age` on the objects and observe CloudFront honoring it.
3. Point a real domain at the distribution with [Route 53](../../1-knowledge/cloud/aws-core-services.md)
   + an ACM TLS cert (HTTPS on your own domain).
4. Compare load latency from the S3 region URL vs the CloudFront URL using a far-away test
   ([traceroute/curl timing](../../../computer-networks/3-practice/lab-curl-https.md)).

## What you proved
- **S3 hosts files with no server**, durably and cheaply (object storage).
- **CloudFront caches at the edge** — the [CDN](../../../computer-networks/2-case-studies/cdn.md)
  concept, with real `x-cache: Hit` headers and the invalidation problem.
- This serverless hosting **scales infinitely and costs ~nothing** — the cloud's sweet spot.

## What you proved maps to
[AWS service map](../../1-knowledge/cloud/aws-core-services.md) ·
[CDN case study](../../../computer-networks/2-case-studies/cdn.md) ·
[cloud computing](../../1-knowledge/cloud/cloud-computing.md)

## References
- [Amazon S3 — static website hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html) · [CloudFront + S3](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GettingStarted.SimpleDistribution.html)
- ⚠️ [AWS setup & cost safety](../../../system-design/3-practice/aws/setup-and-costs.md)
