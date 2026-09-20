# Lab — A serverless function with Lambda + API Gateway

> **Builds:** [serverless / FaaS](../../1-knowledge/cloud/cloud-computing.md),
> [AWS core services](../../1-knowledge/cloud/aws-core-services.md) (Lambda, API Gateway), and
> [IAM roles](../../1-knowledge/cloud/aws-iam.md). **Tools:** AWS account + AWS CLI v2. **Time:**
> ~30 min. **Cost:** **free** — Lambda's always-free tier is 1M requests/month; this lab uses a
> handful.

> ⚠️ Skim [AWS setup & cost safety](../../../system-design/3-practice/aws/setup-and-costs.md) first.
> No always-on resources here (scale-to-zero), but tear down to keep the account tidy.

## Goal
Run code with **no server at all**: deploy a function to **Lambda**, expose it over HTTP with
**API Gateway**, and watch it **scale to zero** (you pay nothing when idle). This is the
[serverless model](../../1-knowledge/cloud/cloud-computing.md) from the cloud doc, made real.

## 1. Write the function
`handler.py` — a Lambda is just a function with an `event` and a return value:
```python
def handler(event, context):
    name = event.get("queryStringParameters", {}).get("name", "world")
    return {
        "statusCode": 200,
        "body": f"hello, {name}, from a serverless function!"
    }
```
No web server, no port, no `main()` loop — the platform calls `handler` per request.

## 2. Create an execution role (least privilege)
Lambda assumes an [IAM role](../../1-knowledge/cloud/aws-iam.md) to run (and write logs):
```console
$ aws iam create-role --role-name lambda-basic \
    --assume-role-policy-document file://lambda-trust.json   # trusts lambda.amazonaws.com
$ aws iam attach-role-policy --role-name lambda-basic \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```
Again: the function gets permissions via an assumed [role](../../1-knowledge/cloud/aws-iam.md), not
stored keys.

## 3. Deploy the function
```console
$ zip function.zip handler.py
$ aws lambda create-function --function-name hello \
    --runtime python3.12 --handler handler.handler \
    --role arn:aws:iam::<acct>:role/lambda-basic \
    --zip-file fileb://function.zip

$ aws lambda invoke --function-name hello --payload '{}' out.json && cat out.json
{"statusCode": 200, "body": "hello, world, from a serverless function!"}   ← it ran, no server
```

## 4. Put an HTTP endpoint in front (API Gateway)
Give it a public URL. The simplest is a **Lambda Function URL**; the fuller path is
[API Gateway](../../1-knowledge/cloud/aws-core-services.md):
```console
$ aws lambda create-function-url-config --function-name hello --auth-type NONE
# returns: https://abc123.lambda-url.us-east-1.on.aws/

$ curl "https://abc123.lambda-url.us-east-1.on.aws/?name=hiep"
hello, hiep, from a serverless function!        ← your function, over HTTP, no server running
```

## 5. See "scale to zero" & cold starts
- **Idle = $0:** when no requests come, *nothing runs* — you're billed only per invocation +
  compute-ms. This is the [serverless](../../1-knowledge/cloud/cloud-computing.md) superpower.
- **Cold start:** the *first* request after idle is slightly slower while AWS spins up an
  environment (the [trade-off](../../1-knowledge/cloud/cloud-computing.md) the cloud doc warned
  about). Hit it twice and compare:
```console
$ time curl -s "https://abc123.lambda-url.us-east-1.on.aws/" >/dev/null   # cold: ~300ms
$ time curl -s "https://abc123.lambda-url.us-east-1.on.aws/" >/dev/null   # warm: ~20ms
```

## 6. 🔴 Teardown
```console
$ aws lambda delete-function --function-name hello
$ aws iam detach-role-policy --role-name lambda-basic \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
$ aws iam delete-role --role-name lambda-basic
```

## Exercises
1. Load-test it (`for i in {1..100}; do curl -s "$URL" & done`) and watch Lambda spin up many
   concurrent executions automatically — [elasticity](../../1-knowledge/cloud/cloud-computing.md)
   with zero config.
2. View the function's logs in **CloudWatch** ([observability](../../1-knowledge/observability/observability.md)).
3. Give the role permission to write to **DynamoDB** and have the function store each request — the
   classic [serverless stack](../../1-knowledge/cloud/aws-core-services.md) (Lambda + DynamoDB).
4. Measure cold-start latency for different memory sizes — more memory = faster cold start.

## What you proved
- **Serverless runs code with no servers to manage** — just a function.
- It **scales to zero** (free when idle) and **scales out automatically** under load — the
  [FaaS trade-offs](../../1-knowledge/cloud/cloud-computing.md), felt directly, including **cold
  starts**.
- An [IAM role](../../1-knowledge/cloud/aws-iam.md) grants the function its permissions, keylessly.

## References
- [Cloud computing — serverless](../../1-knowledge/cloud/cloud-computing.md) · [AWS service map](../../1-knowledge/cloud/aws-core-services.md)
- [AWS Lambda — Getting started](https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html)
- ⚠️ [AWS setup & cost safety](../../../system-design/3-practice/aws/setup-and-costs.md)
