# Lab — Deploy a container to AWS (ECS on Fargate)

> **Builds:** [AWS core services](../../1-knowledge/cloud/aws-core-services.md),
> [containers](../../1-knowledge/containers/containers.md),
> [IAM roles](../../1-knowledge/cloud/aws-iam.md), and
> [load balancing](../../1-knowledge/containers/service-networking-load-balancing.md). **Tools:**
> AWS account + AWS CLI v2 + Docker. **Time:** ~45 min. **Cost:** Fargate is *not* free-tier — a
> tiny task for an hour is a few cents; **the ALB costs ~$0.02/hr — tear down promptly.**

> ⚠️ **Read [AWS setup, cost safety & teardown](../../../system-design/3-practice/aws/setup-and-costs.md)
> first.** Set a budget alarm. This lab creates always-on resources (a load balancer) — the
> **Teardown** step at the end is mandatory.

## Goal
Take the [container image](../../1-knowledge/containers/containers.md) you can already build and run
it on **real AWS**: push it to **ECR**, run it serverlessly on **Fargate**, and reach it through an
**ALB** — using an [IAM task role](../../1-knowledge/cloud/aws-iam.md) with least privilege. This is
the [service map](../../1-knowledge/cloud/aws-core-services.md), made real.

## The pieces (concept → AWS)
```
your image  →  ECR (registry)  →  ECS task on Fargate (compute)  →  ALB (load balancer)  →  you
                                         using an IAM task role (permissions)
```

## 1. Build & push the image to ECR
Use any small web image (e.g. the one from the [Dockerfile lab](../lab-dockerfile.md)).
```console
$ aws ecr create-repository --repository-name myapp
# authenticate Docker to ECR (replace <acct>/<region>):
$ aws ecr get-login-password --region us-east-1 \
    | docker login --username AWS --password-stdin <acct>.dkr.ecr.us-east-1.amazonaws.com
$ docker tag myapp:1.0 <acct>.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0
$ docker push <acct>.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0     # image now in AWS
```
[ECR](../../1-knowledge/cloud/aws-core-services.md) is just AWS's private Docker
[registry](../../1-knowledge/containers/containers.md).

## 2. Create the IAM execution role (least privilege)
Fargate needs a role to pull from ECR and write logs. Create the **task execution role** with the
AWS-managed policy (the [least-privilege](../../1-knowledge/cloud/aws-iam.md) starter):
```console
$ aws iam create-role --role-name ecsTaskExecutionRole \
    --assume-role-policy-document file://ecs-trust.json    # trusts ecs-tasks.amazonaws.com
$ aws iam attach-role-policy --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```
The task *assumes* this [role](../../1-knowledge/cloud/aws-iam.md) — no access keys baked into the
container.

## 3. Define the task & run it on Fargate
Register a **task definition** (the container + CPU/memory + the role), then create an **ECS
service** that keeps N copies running behind a load balancer. The console wizard
(**ECS → Create service → Fargate**) is the gentlest path; the CLI equivalent is
`aws ecs register-task-definition` + `aws ecs create-service`. Key choices:
- **Launch type:** Fargate (serverless — no EC2 to manage).
- **Image:** your ECR URI from step 1.
- **Desired count:** 2 (so you see [load balancing](../../1-knowledge/containers/service-networking-load-balancing.md)).
- **Load balancer:** create an **ALB** targeting the task's port.

## 4. Reach your app through the ALB
```console
$ aws elbv2 describe-load-balancers --query "LoadBalancers[].DNSName" --output text
myapp-alb-123456.us-east-1.elb.amazonaws.com

$ curl http://myapp-alb-123456.us-east-1.elb.amazonaws.com
hello from a container        ← your container, on AWS, reached via the load balancer
```
The [ALB](../../1-knowledge/containers/service-networking-load-balancing.md) health-checks your
tasks and spreads requests across the 2 Fargate tasks — kill one in the console and watch ECS
[reconcile](../../1-knowledge/containers/kubernetes.md) it back (ECS is AWS's own orchestrator,
same desired-state idea as [Kubernetes](../../1-knowledge/containers/kubernetes.md)).

## 5. 🔴 Teardown (do not skip — the ALB bills hourly)
```console
$ aws ecs update-service --cluster <cluster> --service myapp --desired-count 0
$ aws ecs delete-service --cluster <cluster> --service myapp --force
$ aws elbv2 delete-load-balancer --load-balancer-arn <arn>      # stop the hourly charge
$ aws ecr delete-repository --repository-name myapp --force
# delete the target group, cluster, and (optionally) the IAM role too
```
Then sanity-check per the [cost-safety guide](../../../system-design/3-practice/aws/setup-and-costs.md)
that no load balancers or services remain.

## Exercises
1. Bump desired count to 4 and watch the ALB spread traffic; scale to 0 and back.
2. Give the task role permission to read one S3 bucket ([least privilege](../../1-knowledge/cloud/aws-iam.md))
   and have the app read a file from it — no keys needed.
3. View the task's logs in **CloudWatch** ([observability](../../1-knowledge/observability/observability.md)).
4. Do a "deploy": push `myapp:1.1` and update the service — watch ECS do a
   [rolling update](../../1-knowledge/ci-cd/continuous-delivery-deployment.md).

## What you proved
- A local [container image](../../1-knowledge/containers/containers.md) runs on real AWS via
  **ECR → Fargate → ALB**.
- An [IAM task role](../../1-knowledge/cloud/aws-iam.md) grants permissions **without stored keys**.
- ECS keeps the [desired count](../../1-knowledge/containers/kubernetes.md) running and the ALB
  load-balances — the [service map](../../1-knowledge/cloud/aws-core-services.md) in action.

## References
- [AWS core services](../../1-knowledge/cloud/aws-core-services.md) · [IAM](../../1-knowledge/cloud/aws-iam.md)
- [Amazon ECS — Getting started](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-fargate.html)
- ⚠️ [AWS setup & cost safety](../../../system-design/3-practice/aws/setup-and-costs.md)
