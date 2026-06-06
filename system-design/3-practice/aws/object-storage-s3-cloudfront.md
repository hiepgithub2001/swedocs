# AWS Lab: Object Storage + CDN with S3 + CloudFront

> Store a file in S3 and serve it through the CloudFront CDN — the real-world pattern
> behind images, video, and static assets.

> ⚠️ Costs: S3 + CloudFront are very cheap and mostly Free-Tier for tiny usage. Still
> tear down. CloudFront distributions take ~5–15 min to deploy/disable.

## Goal
Upload an object to S3, serve it via a CloudFront distribution, and observe edge caching
(the second request is served from the edge, not the origin).

## Prerequisites
- AWS CLI configured. A globally-unique bucket name.

## Setup
1. **Create a bucket and upload an object:**
```bash
BUCKET=swedocs-lab-$RANDOM
aws s3 mb s3://$BUCKET
echo "hello from S3 origin" > index.html
aws s3 cp index.html s3://$BUCKET/index.html
```
2. **Create a CloudFront distribution** with this bucket as origin (use **Origin Access
   Control** so the bucket stays private and only CloudFront can read it). Easiest in
   the console: CloudFront → Create distribution → S3 origin → enable OAC → it offers to
   update the bucket policy for you.
3. Wait until the distribution **Status = Deployed** and note its domain
   (`dxxxx.cloudfront.net`).

## Steps
```bash
DIST=dxxxxxxxxxxxxx.cloudfront.net

# First request: MISS (fetched from S3 origin, then cached at the edge)
curl -sI https://$DIST/index.html | grep -i x-cache

# Second request: HIT from the edge
curl -sI https://$DIST/index.html | grep -i x-cache
```

## Expected result
- First response header: `X-Cache: Miss from cloudfront`.
- Second response: `X-Cache: Hit from cloudfront` — served from the edge PoP without
  hitting S3. Lower latency, origin offloaded.

## Teardown
```bash
# Disable then delete the distribution (console is simplest), then:
aws s3 rm s3://$BUCKET --recursive
aws s3 rb s3://$BUCKET
```

## Notes
- This is exactly the [video-streaming](../../2-case-studies/video-streaming.md) and
  [Instagram](../../2-case-studies/companies/instagram.md) pattern: blobs in S3, served
  via CDN; the database stores only the URL/key.
- `Cache-Control` headers + cache-busting filenames control freshness.
- Related: [Object storage](../../1-knowledge/data-storage/object-storage.md) ·
  [CDN](../../1-knowledge/building-blocks/cdn.md).
