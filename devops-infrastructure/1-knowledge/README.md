# DevOps & Infrastructure · Part 1 — Knowledge

Academic docs, taught **top-down**: we start from *why* DevOps exists and follow a single
code change as it's built, tested, packaged, deployed, and watched in production. Each
topic follows the [knowledge template](../_TEMPLATE.md) and leads with three beginner
aids — a **top-down hook**, a **worked example**, and the **essential terminology**.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

> 📚 Read in order — the list follows a change's journey: culture → automate the build →
> package it → provision the machines → run & watch it.

## Fundamentals — the big picture first
- ✅ [What is DevOps? Culture, automation & feedback loops](./fundamentals/what-is-devops.md)
- ✅ [Environments & the path to production](./fundamentals/environments-and-release-flow.md)
- ✅ [Infrastructure as Code (IaC)](./fundamentals/infrastructure-as-code.md)

## CI/CD — automate build, test & release
- ✅ [Continuous Integration (CI)](./ci-cd/continuous-integration.md)
- ✅ [Continuous Delivery & Deployment (CD) + rollout strategies](./ci-cd/continuous-delivery-deployment.md)

## Containers & orchestration — package and run the workload
- ✅ [Containers & images (Docker)](./containers/containers.md)
- ✅ [Kubernetes — orchestrating containers](./containers/kubernetes.md)
- ✅ [Service networking & load balancing](./containers/service-networking-load-balancing.md)

## Cloud — where the infrastructure lives
- ✅ [Cloud computing — IaaS, PaaS, SaaS](./cloud/cloud-computing.md)
- ✅ [AWS — the services behind the concepts](./cloud/aws-core-services.md)
- ✅ [AWS IAM — identity & access management](./cloud/aws-iam.md)

## Observability & reliability — know it works, keep it working
- ✅ [Observability — logs, metrics & traces](./observability/observability.md)
- ✅ [SRE — SLOs, error budgets & incident response](./observability/sre-reliability.md)
