# AWS Lab: API Gateway + Lambda (Routing + Rate Limiting)

> Build a serverless API: API Gateway as the front door routing to a Lambda, with a
> **usage plan** enforcing rate limits — the managed version of the
> [Nginx API gateway lab](../api-gateway-nginx.md).

> ⚠️ Costs: API Gateway and Lambda both have large always-free tiers; this lab is
> effectively free. Delete resources when done.

## Goal
Call an HTTPS endpoint that triggers a Lambda, then apply a throttle and watch requests
past the limit get rejected with `429`.

## Prerequisites
- AWS CLI configured; an IAM role for Lambda execution.

## Setup
1. **Create a Lambda** (`hello.py` → zipped):
```python
def handler(event, context):
    return {"statusCode": 200, "body": "hello from lambda"}
```
```bash
zip fn.zip hello.py
aws lambda create-function --function-name lab-fn \
  --runtime python3.12 --handler hello.handler \
  --role <lambda-exec-role-arn> --zip-file fileb://fn.zip
```
2. **Create an HTTP API** in API Gateway and integrate it with the Lambda (console:
   API Gateway → HTTP API → add `GET /hello` integration → Lambda `lab-fn` → deploy).
   Note the invoke URL `https://<api-id>.execute-api.<region>.amazonaws.com`.

## Steps
```bash
API=https://<api-id>.execute-api.<region>.amazonaws.com

# It works
curl -s $API/hello

# Apply throttling: in a REST API you attach a Usage Plan + API key with
# rate=1 req/s, burst=2. Then hammer it:
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" $API/hello
done
```

## Expected result
- `GET /hello` returns `hello from lambda` (API Gateway routed to Lambda).
- Under throttling, the burst loop returns a mix of `200` then `429 Too Many Requests`
  once you exceed the configured rate — rate limiting enforced at the edge, no server to
  manage.

## Teardown
```bash
aws lambda delete-function --function-name lab-fn
# delete the HTTP/REST API and any usage plan/API key (console or apigatewayv2 delete-api)
```

## Notes
- API Gateway gives routing, auth (Cognito/JWT/IAM), throttling, and request validation
  — the gateway concerns from the
  [proxies & gateways](../../1-knowledge/building-blocks/proxies-gateways.md) doc, fully
  managed.
- Account-level + per-method throttling protects your backend like the
  [rate limiter](../../2-case-studies/rate-limiter.md) case study.
