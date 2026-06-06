# AWS Lab: Load Balancing with an Application Load Balancer (ALB)

> Put an ALB in front of two EC2 instances and watch it distribute traffic and health-
> check out a failed instance — the managed version of the
> [Nginx load-balancing lab](../load-balancing-nginx.md).

> ⚠️ Costs: ALB bills per hour + per LCU; `t3.micro` EC2 is Free-Tier eligible. Tear
> down when done. See [setup-and-costs](./setup-and-costs.md).

## Goal
Reach one ALB DNS name and see responses alternate between two backend instances; stop
one and watch the ALB route only to the healthy one.

## Prerequisites
- AWS CLI configured; a default VPC with ≥2 subnets in different AZs.

## Setup (high level)
1. **Launch 2 EC2 instances** (`t3.micro`, Amazon Linux) in two AZs. User-data installs
   a web server that returns the instance ID:
```bash
#!/bin/bash
dnf install -y httpd
echo "Served by $(hostname)" > /var/www/html/index.html
systemctl enable --now httpd
```
2. **Create a target group** (HTTP:80) with a health check on `/`, and register both
   instances:
```bash
aws elbv2 create-target-group --name lab-tg --protocol HTTP --port 80 \
  --vpc-id <vpc-id> --health-check-path /
aws elbv2 register-targets --target-group-arn <tg-arn> \
  --targets Id=<i-aaa> Id=<i-bbb>
```
3. **Create the ALB** across the two subnets and a listener forwarding to the target
   group:
```bash
aws elbv2 create-load-balancer --name lab-alb --type application \
  --subnets <subnet-a> <subnet-b> --security-groups <sg-id>
aws elbv2 create-listener --load-balancer-arn <alb-arn> \
  --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=<tg-arn>
```
(Security groups must allow HTTP:80 to the ALB and from the ALB to the instances.)

## Steps
```bash
ALB_DNS=$(aws elbv2 describe-load-balancers --names lab-alb \
  --query "LoadBalancers[0].DNSName" --output text)

# Repeated requests alternate across the two instances
for i in $(seq 1 6); do curl -s http://$ALB_DNS/; done

# Stop one instance, then keep curling
aws ec2 stop-instances --instance-ids <i-aaa>
# wait ~30s for health checks to mark it unhealthy
for i in $(seq 1 6); do curl -s http://$ALB_DNS/; done
```

## Expected result
- Responses alternate between the two instance IDs (round-robin-ish).
- After stopping one and the health check failing, all responses come from the
  remaining healthy instance — no client errors.

## Teardown
```bash
aws elbv2 delete-listener --listener-arn <listener-arn>
aws elbv2 delete-load-balancer --load-balancer-arn <alb-arn>
aws elbv2 delete-target-group --target-group-arn <tg-arn>
aws ec2 terminate-instances --instance-ids <i-aaa> <i-bbb>
```

## Notes
- ALB = Layer 7 (path/host routing, TLS termination); **NLB** = Layer 4 for ultra-low
  latency / high connections.
- ALB health checks ≈ the Nginx `upstream` health behavior, fully managed.
- Related: [Load balancers](../../1-knowledge/building-blocks/load-balancers.md).
