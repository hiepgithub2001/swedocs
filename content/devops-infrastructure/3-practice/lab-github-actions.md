# Lab — Build a CI pipeline with GitHub Actions

> **Builds:** [Continuous Integration](../1-knowledge/ci-cd/continuous-integration.md) — pipelines,
> triggers, stages, the green/red build, building an [artifact](../1-knowledge/containers/containers.md).
> **Tools:** a GitHub repo (free). **Time:** ~25 min.

## Goal
Make a real pipeline run automatically on every push: test your code, and if it's green, build a
[container image](../1-knowledge/containers/containers.md). You'll watch CI block a bad change —
the automated gate the whole pipeline depends on.

## 1. A repo with something to test
In a GitHub repo, add a trivial app + test (Python example) — `math_utils.py` and `test_math.py`:
```python
# math_utils.py
def add(a, b): return a + b

# test_math.py
from math_utils import add
def test_add(): assert add(2, 3) == 5
```

## 2. Add the CI workflow
Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]          # TRIGGER: runs on every push and PR
jobs:
  test:
    runs-on: ubuntu-latest        # the RUNNER (a fresh VM)
    steps:
      - uses: actions/checkout@v4         # 1. get the code
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install pytest           # 2. install test deps
      - run: pytest -v                    # 3. run tests  ← red here blocks the merge
  build-image:
    needs: test                   # only runs if `test` PASSED (stage dependency)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t myapp:${{ github.sha }} .   # 4. build the artifact, tagged by commit
```
Commit and push.

## 3. Watch it run
Open the repo's **Actions** tab. You'll see the workflow execute live:
```
CI  #1  ✅ test         (12s)   pytest passed
        ✅ build-image  (20s)   image built, tagged myapp:<commit-sha>
```
The green check is your [CI verdict](../1-knowledge/ci-cd/continuous-integration.md). Note
`build-image` only ran *because* `test` passed (`needs: test`) — **fail fast**.

## 4. Break it on purpose (the important part)
Change the test to `assert add(2, 3) == 6` and push. Now:
```
CI  #2  ❌ test         pytest FAILED: assert 5 == 6
        ⊘  build-image  skipped (needs: test)
```
The build is **blocked**, and if this were a pull request, the **merge button locks**. That
automated gate — *no broken code reaches main* — is the entire point of CI. Fix the test, push,
green again.

## 5. (Optional) Publish the image to a registry
Add a step to push to GitHub's [registry](../1-knowledge/containers/containers.md) (GHCR) so
[CD](../1-knowledge/ci-cd/continuous-delivery-deployment.md) could deploy it:
```yaml
      - run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
      - run: docker push ghcr.io/${{ github.repository }}:${{ github.sha }}
```
Now every green build produces a deployable, versioned artifact.

## Exercises
1. Add a `lint` step (`ruff` / `flake8`) **before** tests — fail fast on style, cheapest first
   ([test pyramid](../1-knowledge/ci-cd/continuous-integration.md)).
2. Make the two jobs run in **parallel** by removing `needs:` — then put it back and observe the
   difference.
3. Add a [Dependabot](../1-knowledge/ci-cd/continuous-integration.md) config or a `pip-audit`
   step — "shift-left" security scanning in CI.
4. Add a matrix (`python-version: [3.11, 3.12]`) to test on multiple versions at once.

## What you proved
- A **pipeline runs automatically on every push** — no manual testing.
- **Stages depend on each other** and **fail fast** — a red test blocks the build & merge.
- Green CI produces a versioned [artifact](../1-knowledge/containers/containers.md) ready for
  [deployment](../1-knowledge/ci-cd/continuous-delivery-deployment.md).

## References
- [Continuous Integration](../1-knowledge/ci-cd/continuous-integration.md)
- [GitHub Actions docs](https://docs.github.com/actions)
