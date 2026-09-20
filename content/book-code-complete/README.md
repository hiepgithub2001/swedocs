---
collection: Book summaries
---

# Code Complete

> Steve McConnell, 1993 — 2nd edition 2004. The encyclopedia of construction:
> everything about writing code, with citations, from an era that measured
> things.

<!--
  Provenance: this summary is a machine-written distillation, not the author's
  words and not reviewed by them. It is a map, and a map is wrong in the places
  that matter most. Check anything you are about to bet on against the book.
-->

| | |
| --- | --- |
| **Author** | Steve McConnell |
| **Editions** | 1st, 1993 · 2nd, 2004 |
| **Shape** | ~950 pages, 35 chapters, hundreds of references to empirical studies |
| **Read it for** | Breadth, and evidence — it argues from data, not from taste |
| **Skip it if** | You want to be persuaded quickly. This is a reference, not an evening. |

## The argument in one paragraph

**Construction** — the actual writing of code — is the one phase of software
that always happens, and the one nobody studies. So study it: how to name
things, when to use a boolean, how long a routine should be, what defensive
programming buys you, when to refactor, why a table-driven method beats a
nested `if`, how much design is enough. Where evidence exists, use it; where it
doesn't, say so. The governing metaphor is **software as construction** — you
scale the process to the building, and you do not pour the foundation twice.

## The spine of the book

**Metaphors and prerequisites.** Different metaphors (growing, accretion,
construction) produce different behaviour; the book argues for construction, and
for checking that requirements and architecture exist before you build on them.

**Design in construction.** Design is a *wicked problem* — you only understand
it by solving it — and the primary technical imperative is **managing
complexity**. Practical heuristics: find real-world objects, form consistent
abstractions, hide secrets, identify areas likely to change, keep coupling
loose. This chapter is the through-line to Ousterhout and Parnas.

**Working classes and routines.** Cohesion, the reasons to create a routine
(and "it was too long" is not the only one), parameter ordering, guard clauses,
the actual empirical picture on routine length — which is not "as short as
possible" but "long routines are fine up to a point, and defect density does
not monotonically improve as you shrink them".

**Defensive programming.** Assertions for programmer errors, error handling for
user and environment errors, barricades between trusted and untrusted regions,
and the choice — made deliberately — between robustness and correctness.

**Variables, statements, and layout.** Scope as small as possible, single
purpose per variable, the cost of long-lived globals, loop and conditional
structure, and an evidence-backed argument that layout matters because
indentation is how people infer structure.

**Quality.** The chapter most worth quoting at management: no single defect-
detection technique is better than about 60% effective, which is precisely why
you combine reviews, unit tests, and system tests. Pair that with the cost
curve — a defect found in requirements is orders of magnitude cheaper than the
same defect found in production — and you have the whole economic case for
testing and review in two paragraphs.

**Collaborative construction, debugging, refactoring, tuning.** Inspections
versus walkthroughs versus pairing; debugging as hypothesis testing rather than
guessing; refactoring as routine; and a long, sober treatment of performance
that begins by telling you to measure and to fix the design before the code.

## Ideas worth stealing

| Idea | What it means | Where it bites |
| --- | --- | --- |
| **Managing complexity is the primary imperative** | Every other rule is downstream | Clever code that nobody can modify |
| **Defect-cost curve** | Fixing late costs orders of magnitude more | "We'll write the tests after launch" |
| **No technique catches more than ~60%** | Layer your defences | Relying on unit tests alone |
| **Pseudocode Programming Process** | Write the routine in prose, then turn prose into comments and code | Typing before thinking |
| **Table-driven methods** | Replace branching with data you can read | A 200-line `switch` on country code |
| **Barricades** | Validate at the boundary, trust inside | Every function re-checking for null |
| **Variable scope minimisation** | Shorten the distance between uses | The field that should have been a local |
| **Build vs. buy, and reuse** | Construction includes deciding not to construct | The in-house date library |

## What has aged, and what hasn't

The 2004 edition predates distributed version control, cloud deployment,
containers, and the entire modern testing stack; some examples are in Visual
Basic; and the process framing, with its phase language, reads as pre-agile even
though McConnell himself wrote about iteration. A few empirical claims come from
studies of 1980s systems and should be treated as directional rather than
precise.

What survives is the part nobody else does: the willingness to cite evidence,
the honesty about where evidence is thin, and the sheer coverage. Most modern
books about code are one person's taste at 200 pages. This is the field's
accumulated findings at 900.

## How to read it

Do not read it front to back. Read chapter 5 (design in construction), chapter
20–22 (quality, collaborative construction, developer testing), and chapter 24
(refactoring). Then keep it on the shelf and look up a chapter when you are
about to do that thing — the checklists at the end of each chapter are the
usable artifact.

## Where it touches this knowledge base

- [Readable code](../best-practices/1-knowledge/code-quality/readable-code.md)
- [Testing fundamentals](../best-practices/1-knowledge/testing/testing-fundamentals.md) — the defect-cost curve, and why layers of defence
- [Code reviews](../best-practices/1-knowledge/code-quality/code-reviews.md) — inspections, with the numbers attached
- [Debugging](../best-practices/1-knowledge/code-quality/debugging.md)
- [Documentation](../best-practices/1-knowledge/documentation/documentation.md)
- [Secure coding](../best-practices/1-knowledge/security/secure-coding.md) — barricades and untrusted input

## If you liked this

[The Pragmatic Programmer](../book-the-pragmatic-programmer/README.md) is the same material
at a tenth of the length and none of the citations.
[The Mythical Man-Month](../book-the-mythical-man-month/README.md) is what
happens one level up, when the thing being constructed is a team.
