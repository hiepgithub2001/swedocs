# DevOps & Infrastructure · Part 2 — Case Studies

How real teams build and run software end-to-end: the pipeline, the rollout, the
infrastructure, and what happens when it breaks. Each follows the
[case-study template](./_TEMPLATE.md) and builds on the
[Part 1 knowledge docs](../1-knowledge/).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## Shipping software
- ✅ [From `git push` to production — a full CI/CD pipeline](./ci-cd-pipeline.md)
  — one change, from push through CI, build, staging, and a canary rollout. The capstone.
- ✅ [Deploying to Kubernetes — what actually happens](./deploying-to-kubernetes.md)
  — the control-plane chain that turns one line of YAML into running, reachable pods.

## Running it
- ✅ [An on-call incident, start to finish (SRE)](./incident-response.md)
  — alert → mitigate → recover → blameless postmortem.
