---
name: distill-econ-book
description: Read an economics book the user has placed in books/ and rewrite it as a short book under content/ for someone with no economics background — one question per chapter, every term defined where it first appears, the money drawn as it moves, and the book's argument clearly separated from settled fact. Use when asked to distill, summarise, condense or "re-write" an economics, finance, trade, money, markets or political-economy book, especially for a beginner. Covers extracting the PDF, placing the book's argument and era, the four kinds of claim, beginner scaffolding, and checking every figure against the source.
---

# Distilling an economics book for a beginner

The reader has no economics background and is not going to acquire one first.
They want to finish the book able to follow an argument about interest rates or
rent or tariffs and know which part of it is definition, which part is model,
and which part is somebody's politics.

That last skill is the whole deliverable. An economics book is an **argument**,
not a manual. A distillation that flattens the argument into bullet points and
drops the arguing leaves a beginner more confident and no better informed —
which is worse than where they started.

Where this overlaps with [`distill-book`](../distill-book/SKILL.md) — sourcing,
extraction, the build — it says so and moves on. The rest is what changes when
the subject is economics and the reader is new.

## 0. The source

**Only read a PDF the user put in `books/` themselves.** A link to a copy on
someone else's site or repo gets declined in one sentence, with a request that
they put their own copy in `books/`. Do not fetch it.

`books/` is gitignored wholesale, so no source PDF enters the repository, and
no passage of one is reproduced in the output.

## 1. Extract

Reuse the sibling skill's extractor — it is dependency-free and page-marked:

```bash
python3 .claude/skills/distill-book/scripts/pdftext.py books/<file>.pdf \
  -o "$SCRATCH/<slug>.txt"
```

Output goes to the scratchpad, never the repo. The built-in parser loses what
lives in the font encoding, so ligatures arrive as gaps. Harmless for checking
a claim, fatal for quoting: **quote nothing from this output.**

Economics books are heavy with tables and figures, and a table extracts as a
run of loose numbers with the column headings somewhere else. When a number
matters, find the surrounding sentence — not the number on its own line.

## 2. Place the book before you summarise it

Write this down in the scratchpad before drafting anything. It is four lines
and it determines the tone of every chapter:

| Question | Why it changes the writing |
| --- | --- |
| **When was it written, and what had just happened?** | A book written in 1975, 2009 or 2021 is answering inflation, a banking collapse or supply chains. Its urgency is about *that*. |
| **Who is the author arguing with?** | Almost every economics book is a rebuttal. Naming the opponent makes the argument legible instead of obvious. |
| **Which tradition is this?** | Keynesian, monetarist/Chicago, Austrian, behavioural, Marxist, institutional, development, post-Keynesian, MMT. Say it plainly in the README. |
| **What is the one claim the book would die on?** | Everything else in the book is scaffolding for it. Chapter one of your version can name it. |

A beginner who knows "this is a monetarist book from 1980 arguing against
1970s demand management" can place every chapter. A beginner told only "this
book explains inflation" has been handed one school's view as physics.

## 3. Map the real book

Find the table of contents and write down the actual part and chapter list.
Do not invent structure; a reader holding the original must recognise yours.

Regrouping is allowed where the original hides its own argument — and
economics books do this often, burying the thesis after eighty pages of
history. Where you move something, the README says what moved and why.

## 4. Plan the output

```
content/book-<slug>/
  README.md               # frontmatter, what this is, who for, the spine
  00-the-argument.md      # the book's claim in one page, before any theory
  01-<question>.md        # one chapter = one question
  ...
  99-glossary.md          # every term, one line each
```

`md2epub` builds one book per immediate subdirectory of `content/`, so the
directory is the book and `README.md` is its first chapter — its `# H1`
becomes the shelf title. One book, one shelf entry: do not bundle several
books into a themed directory.

The README frontmatter is what puts it on the Book summaries tab:

```markdown
---
collection: Book summaries
---
```

Two chapters exist in this skill and not the other one:

- **`00-the-argument.md`** — the thesis, the opponent, the era, on one page,
  before any theory. A beginner reads the rest knowing where it is going.
- **`99-glossary.md`** — one line per term, in the beginner's words, ordered
  alphabetically. Chapters link into it. A beginner who forgets what *real*
  means in "real wages" needs one hop, not a re-read.

## 5. Write for someone who knows nothing

**Chapter shape.** Every chapter is a question the reader already has:

1. `# A question in plain words` — "Why does printing money raise prices?",
   not "Chapter 4: The Quantity Theory".
2. A one- or two-line `>` lede answering it in a sentence. Give the answer
   first. Suspense is for the original.
3. **Something they already know** — a wage, a rent, a queue, a ticket
   scalper, a grocery bill. The everyday case comes *before* the term for it.
4. The idea, named. Bold the term where it first appears and define it in the
   same sentence. Terms are the reader's whole reason for being here — they
   are what makes the news readable — so keep the author's vocabulary and drop
   the author's sentences.
5. The mechanism, drawn (see below).
6. **Where it breaks** — the case the model gets wrong, and who says so.
7. `## What to take away` — three to five bullets.
8. `## Check yourself` — two or three questions whose answers are in the
   chapter. Not a quiz; a way to notice you skimmed.
9. A `---` rule, then `Previous: … · Next: …` links.

**Numbers a person can feel.** "A 2% annual inflation rate halves the value of
cash in about 35 years" lands; "inflation erodes purchasing power" does not.
Convert to a monthly bill, a salary, a decade — something with a unit the
reader owns.

**Date-stamp every figure.** Write "US unemployment in 1982 (about 10%)", not
"high unemployment". The book's *present* is not the reader's, and an undated
number silently becomes a claim about today that nobody checked.

**Never adopt the thesis in your own voice.** "Friedman argues that…" and "the
book's case is…" — not "money supply growth causes inflation". A beginner
cannot yet hear the difference between the field's consensus and one author's
position, so the sentence has to carry it.

## 6. The four kinds of claim

This is the section to get right. Every paragraph in an economics book is one
of four things, and a beginner cannot yet tell them apart. Mark each kind
differently and they can:

| Kind | Example | How it appears in the distillation |
| --- | --- | --- |
| **Definition** | What *real* vs *nominal* means; what GDP counts | Flat statement. Safe. Put it in the glossary too. |
| **Mechanism** (a model) | Rate rises → borrowing falls → demand falls | State it as a model, with its assumptions named. Models are tools, not facts. |
| **Empirical claim** | "Minimum wage rises did not cost jobs in New Jersey" | Attribute it, date it, and say in one clause whether it is settled or contested. |
| **Prediction or policy** | "Deficits at this level will cause a crisis" | Say who predicted it, when, and — if enough time has passed — what happened. |

The honest move when a book's empirical claim is disputed is one sentence:
what the objection is and who makes it. Not a debate, not a both-sides
paragraph. One sentence keeps the reader from mistaking a live argument for a
closed one, and it is most of the value you add over a summary.

Where the book has been overtaken by events — a prediction that did not land,
data since revised, a consensus that moved — say so where it comes up rather
than in a note at the end.

## 7. Diagrams

Mermaid, rendered at build time. **Draw the money moving, or the causal chain,
or the loop.** Economics is almost entirely flows, stocks and feedback, and all
three draw well:

- **Who pays whom** — a flowchart with the amounts on the edges. This one
  explains more than any paragraph about taxes, subsidies or tariffs.
- **Causal chains with signs** — label each edge `+` or `−` so the reader can
  follow the direction: `Rates up --"−"--> Borrowing --"−"--> Demand`.
- **Feedback loops** — a cycle back to the start, labelled as reinforcing or
  balancing. Inflation expectations, bank runs and debt spirals are loops, and
  a beginner who has seen the loop never forgets the mechanism.
- **Stock vs flow** — a tank with a pipe in and a pipe out. Debt vs deficit,
  wealth vs income, unemployment level vs job losses. Confusing these two is
  the single most common beginner error, and one picture fixes it.
- **Timelines** (`timeline`) for a history chapter.

Mermaid 11 also has `xychart-beta` and `quadrantChart` if a curve or a 2×2 is
genuinely the clearest thing. Use them sparingly, and **never draw a curve
without labelling both axes and the units** — an unlabelled supply-and-demand
cross teaches a beginner nothing except that economics has crosses in it.

Parser gotcha: a `"` inside an unquoted node label is a syntax error. Wrap the
whole label — `A["Real wage<br/>pay after inflation"]`.

## 8. Verify against the source

Budget real time for this, before the build. Every one of these gets checked:

- **every number** — figures, dates, percentages, sample sizes
- **every named person, place, study or episode** — and the year
- **every definition** — matching in substance, not in wording
- **every attribution** — who said it, and in which book; economics writers
  quote each other constantly and a claim drifts one author sideways easily

```bash
python3 .claude/skills/distill-econ-book/scripts/checkclaims.py \
  "$SCRATCH/<slug>.txt" content/book-<slug>/
```

It pulls every figure, year, money amount and proper-noun term out of the
Markdown and looks for each in the source, trying the obvious formatting
variants (`1,000`/`1000`, `50%`/`50 percent`, `$5 billion`/`5bn`) and the
ligature gaps the extractor leaves. Read the **MISSING** list one item at a
time; it exits non-zero while anything is missing.

It deliberately ignores two things, because both are yours rather than the
book's: **bold that opens a bullet or a paragraph** (a label you wrote) and
text spanning a table cell boundary. Bold *inside* a sentence is checked —
that is where a real term gets defined.

In an economics distillation a zero-hit number usually means one of three
things, in descending order of how often it happens:

1. You imported a figure from the present world instead of the book's.
2. The number is real but from a different chapter of the *field* — another
   author's study that you associated with this book.
3. The extractor mangled a table. Confirm by searching the page.

The first two are errors to fix. Only the third is noise. A term with zero
hits is the strongest signal available: it usually means the idea came from a
later edition, a review of the book, or nowhere.

## 9. Wire it in and build

Add a row to the Book summaries table in `content/README.md`. Then:

```bash
npm run build     # strict: dead links and bad diagrams fail the build
npm run site      # assemble dist/site
```

`--strict` fails on dead relative links and on Mermaid that does not parse, so
the build is also the diagram test. Check the chapter count looks right.

## 10. Commit honestly

Say what was checked and what was not. If the definitions were verified but
the tables were not, the commit says that. Never describe a distillation as
checked against a source that was not read.

## What to leave out

The book's own data appendices, full regression tables and extended case
studies stay in the book. The point is to send the reader to the original
better prepared, not instead of it — and for a beginner, "better prepared"
means they know the vocabulary and the shape of the argument, which is exactly
what fits in a short book.

If the original is worth reading, the README says so, and says what is only in
it.
