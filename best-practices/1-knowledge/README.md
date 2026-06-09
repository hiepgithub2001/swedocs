# Best Practices · Part 1 — Knowledge

Academic docs: the **craft and process practices** of professional software engineering — and *why*
each exists. Each topic follows the [shared doc template](../../_TEMPLATE.md) and leads with a
top-down hook, a worked example, and the essential terminology.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

> 📚 These are habits, not theory — read the one you're about to *use*. Testing first (the safety
> net everything else relies on), then how you version, review, secure, and document.

> 🔗 Craft & process, not design. Software *design* (SOLID, patterns, DRY/KISS/YAGNI) lives in
> [Architecture & Patterns](../../architecture-patterns/); this links there rather than repeating it.
> Deeper layers link to [DevOps](../../devops-infrastructure/) (CI/CD, IAM) and
> [Networks](../../computer-networks/) (TLS).

## Testing — the safety net
- ✅ [Testing fundamentals & the test pyramid](./testing/testing-fundamentals.md)
- ✅ [Test doubles & TDD](./testing/test-doubles-and-tdd.md) — stub/mock/fake/spy, red-green-refactor

## Version control — collaborating on code
- ✅ [Git & workflows](./version-control/git-and-workflows.md) — trunk-based vs. Git Flow, atomic commits, PRs

## Code quality — keeping it reviewable
- ✅ [Code reviews](./code-quality/code-reviews.md) — what to look for, the human side
- ✅ [Writing readable code](./code-quality/readable-code.md) — names, small functions, comments, linters

## Security — the developer's share
- ✅ [Secure coding](./security/secure-coding.md) — OWASP top bugs, injection, authz, secrets

## Documentation — knowledge that outlives you
- ✅ [Documentation](./documentation/documentation.md) — READMEs, ADRs, docstrings, fighting drift
