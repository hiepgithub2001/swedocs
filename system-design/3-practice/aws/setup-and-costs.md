# AWS Track: Setup, Cost Safety & Teardown

> Read this before any AWS lab. It keeps you from accidentally running up a bill.

## Goal
Have a working AWS CLI, sane guardrails (budget alarm, least privilege), and the
discipline to tear everything down.

## Prerequisites
1. **An AWS account.** New accounts get a **12-month Free Tier** plus always-free
   allowances.
2. **AWS CLI v2** installed: `aws --version`.
3. **Configure credentials** — create an IAM user (not root) with programmatic access,
   then:
```bash
aws configure        # enter access key, secret, default region (e.g. us-east-1)
aws sts get-caller-identity   # confirm it works
```

## Cost safety (do this first)
**Set a budget alarm** so you're emailed if spend crosses a threshold:
```bash
# Easiest in the console: Billing → Budgets → Create budget → $5 monthly, email alert.
```
Also:
- Prefer **Free Tier** instance sizes (e.g. `t3.micro`/`t2.micro`, `db.t3.micro`,
  `cache.t3.micro`).
- Work in **one region** so resources are easy to find.
- **Tag** lab resources (e.g. `Project=swedocs-lab`) to locate and delete them.
- Never commit access keys to git.

## The golden rule: tear down
The expensive mistakes are **always-on** resources: EC2 instances, RDS/ElastiCache
clusters, NAT gateways, load balancers, and idle Elastic IPs. Each lab ends with a
**Teardown** section — run it. Then sanity-check:
```bash
aws ec2 describe-instances --query "Reservations[].Instances[].InstanceId"
aws elbv2 describe-load-balancers --query "LoadBalancers[].LoadBalancerArn"
aws rds describe-db-instances --query "DBInstances[].DBInstanceIdentifier"
aws elasticache describe-cache-clusters --query "CacheClusters[].CacheClusterId"
```
If a list isn't empty and you're done, delete it.

## Expected result
`aws sts get-caller-identity` returns your account; a billing budget alarm exists; you
know how to list and delete resources.

## Notes
- Many labs can run **entirely in Free Tier** if you tear down promptly.
- Consider a separate **sandbox account** (via AWS Organizations) for experiments.
- Related: this whole track maps to the [Knowledge](../../1-knowledge/) building blocks.
