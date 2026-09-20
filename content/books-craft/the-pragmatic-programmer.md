# The Pragmatic Programmer

> Andrew Hunt & David Thomas, 1999 — 20th Anniversary Edition, 2019. A book of
> habits rather than rules, written by two people who have clearly been on call.

| | |
| --- | --- |
| **Authors** | Andrew Hunt, David Thomas |
| **Editions** | 1st, 1999 · 20th Anniversary Edition, 2019 (rewritten, not reprinted) |
| **Shape** | ~50 short, self-contained topics, each a page or three |
| **Read it for** | Judgement — how to decide, not what to decide |
| **Skip it if** | You want code. There is very little of it, on purpose. |

## The argument in one paragraph

Software is not built, it is grown, and the thing that kills it is not a bad
decision but an accumulation of unexamined ones. So the pragmatic programmer
treats every piece of the job — the code, the tools, the estimates, the
conversations — as something to be **kept deliberately soft**: reversible where
possible, tested where not, and always understood well enough to explain.
Competence, in this book, is mostly a matter of refusing to let things happen
to you.

## Why it was written

The late nineties were the height of heavyweight process: the belief that
enough documentation, enough up-front design, and enough method would make
software predictable. Hunt and Thomas came at it from the opposite end — from
consulting on projects that had already gone wrong — and wrote down what the
people who recovered those projects actually did. Two years later both authors
signed the Agile Manifesto, and you can see why: this is the same argument, at
the scale of one programmer.

## The spine of the book

**Responsibility.** The opening move is that you own your work. "Provide
options, don't make lame excuses" and the *broken windows* metaphor — one
unfixed mess licenses the next — are the book's foundation, and everything
technical after it is downstream of caring.

**Don't repeat yourself.** The most quoted idea here, and the most
misunderstood. DRY is about **knowledge**, not text: two pieces of code that
look alike but change for different reasons are not duplication, and merging
them is a mistake. The authors spend the 2019 edition clarifying exactly this,
because a generation read DRY as "never type anything twice" and built
frameworks out of it.

**Orthogonality.** Components should be able to change independently. The test
is a question: if I change this, what else has to know? The answer should
usually be "nothing", and when it isn't, you have found the design.

**Tracer bullets, not prototypes.** Build a thin, working slice end to end and
keep it working, rather than a throwaway mock of the hard part. Prototypes are
for answering one question and then being deleted; tracer code is the skeleton
of the real system, and it tells you early whether the pieces actually meet.

**Reversibility.** There are no final decisions. Every "we'll use this database
forever" is a bet, and the pragmatic response is not to pick better but to keep
the bet cheap to lose.

**Design by contract, assertions, and crashing early.** A program that dies at
the moment a fact stops being true is far cheaper to debug than one that limps
on. "Dead programs tell no lies."

**Automate and own your tools.** Plain text, shell fluency, one editor learned
properly, version control for everything, scripts instead of instructions. The
specific tools have dated; the demand that the machine do repetitive work has
not.

**The pragmatic team.** The same habits, one level up — no broken windows in a
codebase, communicate as a unit, automate the build, test everything you ship.

## Ideas worth stealing

| Idea | What it means | Where it bites |
| --- | --- | --- |
| **Broken windows** | Fix small decay immediately, or it authorises more | The commented-out block nobody removes |
| **DRY, properly** | One authoritative source per piece of *knowledge* | Two services sharing a model class because the fields matched once |
| **Orthogonality** | A change should have a small, predictable blast radius | The "small" config change that redeploys four systems |
| **Tracer bullets** | Ship a thin end-to-end slice, then thicken it | Three months of backend before anyone sees a screen |
| **Crash early** | Fail at the point of the broken assumption | `catch (e) {}`, and a corrupted row found on Friday |
| **Rubber ducking** | Explaining a bug out loud finds it | The Slack message you never send because you fixed it while typing |
| **Good-enough software** | Quality is a requirement you negotiate, not a virtue you maximise | The refactor that shipped nothing for a quarter |
| **Estimates in ranges** | "Two to three weeks" carries information "May 14th" destroys | Every roadmap |

## What has aged, and what hasn't

The 2019 edition is a genuine rewrite — CORBA and CVS are gone, concurrency and
"you can't write perfect software" are expanded — so read that one. Even so,
some chapters are now folklore rather than advice: the exhortation to learn a
text-manipulation language landed differently before every language had one.

What has not aged at all is the framing. The book's real subject is how to stay
the kind of engineer who notices things, and none of that depends on a
toolchain. The DRY clarification alone makes the new edition worth it, because
the misreading of DRY has probably caused more accidental coupling in the last
twenty years than any other well-intentioned rule.

## How to read it

It is a book of topics, not an argument you must follow in order — read the
table of contents and jump. If you want the dense hour: responsibility, DRY,
orthogonality, tracer bullets, reversibility, crash early, and the estimation
chapter. The "Challenges" at the end of each topic are the part everyone skips
and the part that changes behaviour.

## Where it touches this knowledge base

- [Readable code](../best-practices/1-knowledge/code-quality/readable-code.md) — the same instincts, stated as practice
- [Testing fundamentals](../best-practices/1-knowledge/testing/testing-fundamentals.md) — "test your software, or your users will"
- [Git and workflows](../best-practices/1-knowledge/version-control/git-and-workflows.md) — version control as the underpinning, not the chore
- [Coupling and cohesion](../architecture-patterns/1-knowledge/fundamentals/coupling-and-cohesion.md) — orthogonality with the academic name on it
- [Debugging](../best-practices/1-knowledge/code-quality/debugging.md) — rubber ducking, and reading the error message

## If you liked this

[A Philosophy of Software Design](./a-philosophy-of-software-design.md) takes
one of these instincts and pursues it for a whole book.
[Refactoring](./refactoring.md) is what you reach for once you agree the code
should be changeable and want the moves written down.
