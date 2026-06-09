# Best Practices · Part 3 — Practice

**Practice = build the habit.**

These practices only stick when your hands do them: feel the red-green-refactor rhythm, swap a real
dependency for a double, resolve a merge conflict, watch your own SQL-injection exploit succeed and
then fail after the fix. Each lab uses 🐍 Python and `git` — **already installed** — with no extra
packages.

> 🧩 The goal is **the habit, internalized**: do it once here so the safe way becomes your default.

> Legend: ✅ written · 🚧 in progress · ⬜ not started

## A. Testing (start here)
- ✅ [A TDD kata — build a String Calculator test-first](./lab-tdd-kata.md)
  — the red-green-refactor loop. Mirrors [test doubles & TDD](../1-knowledge/testing/test-doubles-and-tdd.md).
- ✅ [Test doubles — stub, mock, spy & fake](./lab-test-doubles.md)
  — test code with external deps, no DB/network. Mirrors [test doubles & TDD](../1-knowledge/testing/test-doubles-and-tdd.md).

## B. Version control
- ✅ [A Git feature workflow](./lab-git-workflow.md)
  — branch, atomic commits, resolve a conflict, `bisect` a bug. Mirrors [Git & workflows](../1-knowledge/version-control/git-and-workflows.md).

## C. Security
- ✅ [Find & fix the vulnerabilities](./lab-find-vulnerabilities.md)
  — exploit then patch SQLi, command injection, a leaked secret. Mirrors [secure coding](../1-knowledge/security/secure-coding.md).
