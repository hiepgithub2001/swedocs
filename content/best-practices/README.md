# Best Practices

How do professional teams ship code that stays correct, secure, and maintainable — *as a team, over
years*? This area is the **craft and process** of producing quality software: how you
[test](./1-knowledge/testing/testing-fundamentals.md) it, [version](./1-knowledge/version-control/git-and-workflows.md)
it, [review](./1-knowledge/code-quality/code-reviews.md) it, [secure](./1-knowledge/security/secure-coding.md)
it, and [document](./1-knowledge/documentation/documentation.md) it. These are the habits that
separate a hobby script from production software.

Every section in this knowledge base is organized into **3 parts**:

| Part | Folder | What it contains |
| --- | --- | --- |
| 1️⃣ **Knowledge** | [`1-knowledge/`](./1-knowledge/) | Academic docs — the practices and *why* they exist |
| 2️⃣ **Case Study** | [`2-case-studies/`](./2-case-studies/) | The practices applied end-to-end on real changes |
| 3️⃣ **Practice** | [`3-practice/`](./3-practice/) | Hands-on labs — do TDD, doubles, a Git workflow, find vulns |

Open each part's `README.md` for its catalog.

> **Scope — craft & process, not design.** This area is about *how you work*: testing, version
> control, review, secure coding, documentation. It deliberately does **not** re-teach software
> *design* — [SOLID](../architecture-patterns/1-knowledge/fundamentals/solid-principles.md),
> [coupling/cohesion](../architecture-patterns/1-knowledge/fundamentals/coupling-and-cohesion.md),
> [DRY/KISS/YAGNI](../architecture-patterns/1-knowledge/fundamentals/core-design-principles.md),
> patterns — all of which live in [Architecture & Patterns](../architecture-patterns/). It also
> links to neighbours for the deeper layers: [CI/CD](../devops-infrastructure/1-knowledge/ci-cd/continuous-integration.md)
> (DevOps) runs the tests; [TLS](../computer-networks/1-knowledge/security/tls-https.md) (Networks)
> and [IAM](../devops-infrastructure/1-knowledge/cloud/aws-iam.md) (DevOps) secure the infrastructure
> beneath secure *coding*.

> **Status:** 🚧 in progress.

---

## 1️⃣ Knowledge — [catalog »](./1-knowledge/)
The habits: **testing** ([fundamentals & the pyramid](./1-knowledge/testing/testing-fundamentals.md),
[test doubles & TDD](./1-knowledge/testing/test-doubles-and-tdd.md)); **version control**
([Git & workflows](./1-knowledge/version-control/git-and-workflows.md)); **code quality**
([code reviews](./1-knowledge/code-quality/code-reviews.md),
[readable code](./1-knowledge/code-quality/readable-code.md)); **security**
([secure coding](./1-knowledge/security/secure-coding.md)); and **documentation**
([what to write & keeping it alive](./1-knowledge/documentation/documentation.md)).

## 2️⃣ Case Study — [catalog »](./2-case-studies/)
The practices working together: a **testing strategy for a real API** (the pyramid applied), the
**anatomy of a good pull request** (VCS + review + tests + docs in concert), and **preventing the
OWASP top bugs** (three breaches traced to the exact bad line).

## 3️⃣ Practice — [catalog »](./3-practice/)
Runnable labs: drive code test-first through a **TDD kata**, wield **test doubles**, run a full
**Git feature workflow** (with a real conflict + `bisect`), and **find & fix vulnerabilities** (SQLi,
command injection, a leaked secret). 🐍 Python + git, already installed — no extra packages.
