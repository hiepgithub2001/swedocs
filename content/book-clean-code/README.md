---
collection: Book summaries
---

# Clean Code

> Robert C. Martin, 2008. The most influential and most argued-with book about
> code style ever written. Read it for the vocabulary, and read the criticism
> alongside it.

<!--
  Provenance: this summary is a machine-written distillation, not the author's
  words and not reviewed by them. It is a map, and a map is wrong in the places
  that matter most. Check anything you are about to bet on against the book.
-->

| | |
| --- | --- |
| **Author** | Robert C. Martin ("Uncle Bob") |
| **Published** | 2008 |
| **Shape** | ~460 pages: rules, then long worked refactorings, then a smell catalogue |
| **Read it for** | The shared words a team argues in — and a genuinely good chapter on naming |
| **Read it with** | [A Philosophy of Software Design](../book-a-philosophy-of-software-design/README.md), which disagrees |

## The argument in one paragraph

Code is read far more often than it is written, so the cost that matters is the
cost of reading. Therefore: make functions tiny and single-purpose, make names
reveal intent, have no comments you could have expressed in code, keep side
effects out, keep formatting consistent, and treat tests as first-class code.
Professionalism, in this telling, is refusing to leave a mess — "leave the
campground cleaner than you found it".

## The spine of the book

**Naming.** The strongest chapter, and the least controversial. Intention-
revealing names, no disinformation, pronounceable and searchable names, one word
per concept. If you read nothing else, read this.

**Functions.** The famous chapter, and the contested one. Functions should be
small; then smaller. They should do one thing, at one level of abstraction, and
take as few arguments as possible — three is already a smell, and boolean flags
mean it is really two functions. Side effects are lies.

**Comments.** "Comments are always failures" — the strongest claim in the book.
Good comments explain intent, warn of consequences, or are legal boilerplate.
Bad ones restate the code, and worse, drift out of date.

**Formatting, objects, error handling, boundaries.** Vertical distance, small
files, Tell Don't Ask, exceptions over error codes, no nulls returned or passed,
and third-party code wrapped behind your own interface and pinned by
*learning tests*.

**Tests.** The Three Laws of TDD, and **F.I.R.S.T.** — Fast, Independent,
Repeatable, Self-validating, Timely. "One assert per test" as an aspiration;
one *concept* per test as the rule. Test code is production code: it rots the
same way and must be kept clean, or the suite becomes the reason you stop
changing things.

**Smells and heuristics.** The final catalogue is the most reusable part of the
book after naming — a numbered list of things to look for, from rigidity to
feature envy, that a team can actually point at in review.

## Ideas worth stealing

| Idea | What it means | Where it bites |
| --- | --- | --- |
| **Intention-revealing names** | The name answers why, not what | `data2`, `processList`, `manager` |
| **Boy Scout rule** | Leave each file a little better | The TODO from 2019 |
| **One level of abstraction per function** | Don't mix policy and byte-shuffling | HTTP parsing inside a pricing rule |
| **Flag arguments** | A boolean parameter means two functions | `render(true)` |
| **Command/query separation** | A function changes state or answers, not both | `getUser()` that creates one |
| **F.I.R.S.T. tests** | Fast, Independent, Repeatable, Self-validating, Timely | The suite nobody runs locally |
| **Learning tests** | Tests that pin what a library actually does | The upgrade that broke silently |
| **Clean boundaries** | Wrap third-party APIs at the edge | Their types in your domain model |

## The criticism, which is substantial

This is the rare book where reading the pushback is part of reading the book.

- **The function-size rule, pursued literally, produces shallow methods.**
  Ousterhout's charge is that extracting until every function is three lines
  scatters one idea across a dozen names and makes the reader jump — trading a
  long function you can read top to bottom for a call graph you must hold in
  your head.
- **"Comments are failures" throws away what code cannot say** — why this
  algorithm and not the obvious one, which invariant must hold, what was tried
  and abandoned.
- **The worked examples are of their time.** The long Java refactorings (and
  the `SerialDate` chapter) are widely picked apart; some of the resulting code
  is, by the book's own standards, worse — more classes, more indirection, more
  mutable state threaded through fields to avoid passing arguments.
- **Assertion without evidence.** The claims are presented as professional
  ethics rather than trade-offs with costs, which is exactly the register that
  makes them easy to cargo-cult.

None of this makes the book worthless. It makes it a *first* book on the
subject rather than the last one — and it is still the book the industry's
shared vocabulary came from, which is reason enough to know it.

## How to read it

Naming, Functions (critically), Tests, and the Smells and Heuristics
catalogue. Skim the long refactoring case studies; read Ousterhout's chapter
on the disagreement afterwards. Treat every rule as a default to be argued
with, which is how the useful teams use it.

## Where it touches this knowledge base

- [Readable code](../best-practices/1-knowledge/code-quality/readable-code.md)
- [Code reviews](../best-practices/1-knowledge/code-quality/code-reviews.md) — the smell catalogue is a review checklist
- [Test doubles and TDD](../best-practices/1-knowledge/testing/test-doubles-and-tdd.md)
- [SOLID principles](../architecture-patterns/1-knowledge/fundamentals/solid-principles.md) — Martin's other contribution, argued at length in [Clean Architecture](../book-clean-architecture/README.md)

## If you liked this

[Refactoring](../book-refactoring/README.md) gives the same instincts a safe procedure.
[A Philosophy of Software Design](../book-a-philosophy-of-software-design/README.md) gives
them a principle, and disputes the conclusions.
