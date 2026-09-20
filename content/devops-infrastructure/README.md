# DevOps & Infrastructure

How does code you just wrote end up running reliably in production — built, tested,
packaged, deployed, and watched — without a human hand-carrying it at each step? This
area answers that, **top-down**: we start from the problem DevOps exists to solve, then
follow a change from a `git push` all the way to running safely in the cloud.

Every section in this knowledge base is organized into **3 parts**:

| Part | Folder | What it contains |
| --- | --- | --- |
| 1️⃣ **Knowledge** | [`1-knowledge/`](./1-knowledge/) | Academic docs — concepts, theory, definitions |
| 2️⃣ **Case Study** | [`2-case-studies/`](./2-case-studies/) | How real teams build & run systems end-to-end |
| 3️⃣ **Practice** | [`3-practice/`](./3-practice/) | Hands-on labs — write the pipeline / container / config that *is* the concept |

Open each part's `README.md` for its catalog.

> **Scope.** This area owns the *operational* lifecycle: **CI/CD, containers,
> orchestration, infrastructure-as-code, cloud, and observability**. The *networking
> fundamentals* underneath (TCP/IP, DNS, TLS, load-balancing internals) live in
> [Computer Networks](../computer-networks/) — we link there rather than repeat them.

> **Status:** 🚧 in progress — 1️⃣ Knowledge being written first, top-down.

---

## 1️⃣ Knowledge — [catalog »](./1-knowledge/)
The path from commit to production: **DevOps culture & CI/CD** (automating build → test
→ release), **containers & Kubernetes** (packaging and running workloads),
**infrastructure-as-code & cloud** (provisioning the machines declaratively), and
**observability & SRE** (knowing it works, and keeping it reliable). Each topic leads
with a top-down hook, a worked example, and the **essential terminology**.

## 2️⃣ Case Study — [catalog »](./2-case-studies/)
How real teams ship: a complete CI/CD pipeline from commit to canary, what happens when
you deploy to Kubernetes, and how an SRE team runs an on-call incident.

## 3️⃣ Practice — [catalog »](./3-practice/)
Runnable labs where you **build the thing** — a Dockerfile, a GitHub Actions pipeline, a
local Kubernetes deployment, a Terraform config, a metrics dashboard. Mostly free, local
tools (Docker, `kind`/`minikube`, `gh`, Terraform, Prometheus) — no paid cloud required.
