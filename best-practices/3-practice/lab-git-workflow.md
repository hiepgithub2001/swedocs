# Lab: A Git Feature Workflow — Branch, Commit, Conflict, Merge

> **Goal:** run a complete short-lived-branch workflow in a throwaway repo — atomic commits, a
> merge conflict you resolve by hand, and `bisect` finding a bad commit — so the
> [version-control](../1-knowledge/version-control/git-and-workflows.md) practices become muscle
> memory.
>
> **Builds:** [Version control & workflows](../1-knowledge/version-control/git-and-workflows.md).
> Just `git` (already installed) — all local, no remote needed.

## Setup — a sandbox repo
```bash
mkdir git-lab && cd git-lab && git init -q
git config user.email you@example.com && git config user.name You
printf "line1\nline2\nline3\n" > app.txt
git add app.txt && git commit -q -m "init: seed app.txt"
git log --oneline        # one commit
```

## Step 1 — A short-lived feature branch + atomic commits
```bash
git switch -c feature/uppercase           # branch off main (trunk-based: small, short-lived)
sed -i 's/line2/LINE2/' app.txt
git commit -qam "feat: uppercase line2"   # atomic commit #1 (one logical change)
printf "line4\n" >> app.txt
git commit -qam "feat: add line4"         # atomic commit #2
git log --oneline                         # three commits on this branch
```
Each commit is one coherent step — easy to review, revert, and bisect.

## Step 2 — Meanwhile, main diverges (set up a conflict)
```bash
git switch main
sed -i 's/line2/line-TWO/' app.txt        # main edits the SAME line differently
git commit -qam "fix: rename line2 on main"
```
Now both branches changed `line2` — a guaranteed conflict on merge.

## Step 3 — Merge and resolve the conflict by hand
```bash
git merge feature/uppercase               # 💥 CONFLICT in app.txt
git status                                # "both modified: app.txt"
cat app.txt
```
You'll see conflict markers:
```
<<<<<<< HEAD
line-TWO
=======
LINE2
>>>>>>> feature/uppercase
```
Edit `app.txt` to the intended result (keep one, or combine), delete the `<<< === >>>` markers, then:
```bash
git add app.txt && git commit -q --no-edit   # completes the merge
git log --oneline --graph                    # see the branch + merge topology
```
You just did what Git can't do alone — **a human decided** which change wins.

## Step 4 — A bad commit, found with `bisect`
Simulate a bug introduced somewhere in history:
```bash
for i in 1 2 3 4 5; do echo "v$i" >> app.txt; git commit -qam "change $i"; done
echo "BUG" >> app.txt && git commit -qam "change 6 (introduces bug)"
for i in 7 8; do echo "v$i" >> app.txt; git commit -qam "change $i"; done

git bisect start
git bisect bad                       # current commit is broken
git bisect good HEAD~5               # 5 commits ago was fine
# git checks out the midpoint; test it, then tell git good/bad:
grep -q BUG app.txt && git bisect bad || git bisect good
# ...repeat the grep+answer until git names the first bad commit...
git bisect reset                     # end the bisect when done
```
`bisect` binary-searches history — `log(N)` steps to find the culprit instead of checking each
commit. This is *why* atomic commits matter: the bad change is isolated.

## Step 5 — Inspect the why
```bash
git log --oneline                    # readable history thanks to atomic commits + clear messages
git blame app.txt | head            # who/why for each line — the audit trail
```

## Exercises
1. Redo Step 1 using `git rebase main` instead of merge before integrating — compare the *linear*
   history vs. the merge-commit graph. When is each appropriate? (Hint: shared vs. local.)
2. Use `git revert <sha>` to undo the "bug" commit *without* rewriting history. How does that differ
   from `git reset`?
3. Make two tiny commits then `git rebase -i` is interactive (not available here) — instead practice
   `git commit --amend` to fix the last commit's message. Why never amend a *pushed* commit?
4. Write three commit messages for the same change: a bad one, an okay one, and one following
   [Conventional Commits](https://www.conventionalcommits.org/).

## What you proved
- The short-lived-branch loop (branch → atomic commits → merge) is the everyday unit of work, and
  short branches minimize conflicts.
- Conflicts are normal and **human-resolved** — Git flags them; you decide.
- Atomic commits + good messages turn history into a debugging tool (`bisect`, `blame`, `revert`) —
  the practical payoff of [version-control discipline](../1-knowledge/version-control/git-and-workflows.md).

## References
- [Version control & workflows](../1-knowledge/version-control/git-and-workflows.md) · [Pro Git book](https://git-scm.com/book)
