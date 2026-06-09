# DevOps & Infrastructure · Part 3 — Practice

**Practice = build the pipeline / container / config yourself.**

DevOps is a hands-on discipline — you don't understand a container, a pipeline, or a
Kubernetes deployment until you've built one and watched it run (and break). Each lab is
small, local, and free: a Dockerfile you build, a CI pipeline that runs on a push, a
cluster on your laptop, infrastructure described as code. Tools: Docker,
`kind`/`minikube`, GitHub Actions, Terraform, Prometheus — no paid cloud required.

> 🧩 The goal is **doing**: don't just read what a canary deploy is — script one and shift
> traffic 10% at a time.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## A. Package it (start here)
- ✅ [Write a Dockerfile & run a container](./lab-dockerfile.md)
  — build an image, run it, inspect layers. Mirrors [containers](../1-knowledge/containers/containers.md).

## B. Automate it
- ✅ [Build a CI pipeline with GitHub Actions](./lab-github-actions.md)
  — test on every push, build & publish an image. Mirrors [CI](../1-knowledge/ci-cd/continuous-integration.md).

## C. Run it
- ✅ [Deploy to a local Kubernetes cluster (`kind`)](./lab-kubernetes-kind.md)
  — pods, deployments, services, a rolling update. Mirrors [Kubernetes](../1-knowledge/containers/kubernetes.md).

## D. Provision & observe
- ✅ [Describe infrastructure with Terraform](./lab-terraform.md)
  — declare, plan, apply, destroy. Mirrors [IaC](../1-knowledge/fundamentals/infrastructure-as-code.md).
- ✅ [Instrument an app with Prometheus metrics](./lab-prometheus-metrics.md)
  — expose, scrape, and graph metrics. Mirrors [observability](../1-knowledge/observability/observability.md).
