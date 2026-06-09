# Best Practices · Part 2 — Case Studies

The practices applied to real changes — and shown working *together*, because in practice testing,
version control, review, and security aren't separate activities. Each follows the
[shared doc template](../../_TEMPLATE.md) and builds on the [Part 1 knowledge docs](../1-knowledge/).

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## Testing in practice
- ✅ [A testing strategy for a real API](./testing-strategy-for-an-api.md)
  — the [pyramid](../1-knowledge/testing/testing-fundamentals.md) applied: what to unit/integration/E2E test, where to use doubles.

## The whole workflow, together
- ✅ [Anatomy of a good pull request](./anatomy-of-a-good-pr.md)
  — [VCS](../1-knowledge/version-control/git-and-workflows.md) + [review](../1-knowledge/code-quality/code-reviews.md) + [tests](../1-knowledge/testing/testing-fundamentals.md) + [docs](../1-knowledge/documentation/documentation.md) in concert, vs. the PR that wastes a day.

## Security in practice
- ✅ [Preventing the OWASP top bugs](./preventing-owasp-top-bugs.md)
  — three breaches traced to the exact bad line, with the [secure-coding](../1-knowledge/security/secure-coding.md) habit that stops each.

> 💡 Together they make the point: quality isn't one practice but their *combination* — a tested,
> reviewed, secure, documented change is what "professional" actually means.
