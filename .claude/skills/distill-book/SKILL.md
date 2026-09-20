---
name: distill-book
description: Read a PDF book the user has placed in books/ and rewrite it as a short, concise book under content/ — one chapter per idea, a diagram wherever there is a mechanism, pitched at a mid-level software engineer. Use when asked to distill, summarise, condense, or "re-write" a book, or to check an existing distillation against its source. Covers extracting text from a PDF without poppler, verifying every claim against the source, and wiring the result into the md2epub build.
---

# Distilling a book

The goal is a book a mid-level engineer can read in an evening and use the next
day: every core idea of the original, in the original's order, at roughly a
fifth of the length, with the mechanisms drawn rather than described.

The thing that makes this worth doing at all is step 5. A distillation written
from memory is a guess in a confident voice — fluent, plausible, and wrong in
places you cannot detect from the inside. Reading the source is what separates
this from making things up.

## 0. The source

**Only read a PDF the user put in `books/` themselves.** If they give a link to
a copy on someone else's site or repo, decline that in one sentence and ask
them to place their own copy in `books/`. Do not fetch it.

`books/` is gitignored wholesale (`books/.gitignore` is `*`), so a source PDF
never enters the repository. Nothing from it is reproduced in the output.

## 1. Extract

```bash
python3 .claude/skills/distill-book/scripts/pdftext.py books/<file>.pdf \
  -o "$SCRATCH/<slug>.txt"
```

Write it to the scratchpad, not the repo. The script uses `pdftotext` when it
is installed and otherwise parses the file itself; both emit `=== PAGE n ===`
markers so a passage traces back to a page.

The built-in parser drops what lives in the font encoding: ligatures arrive as
gaps (`Eective`, `Soware`), and some subset fonts lose glyphs entirely. That
is harmless for checking claims and fatal for quoting. **Quote nothing from
this output** — you cannot tell a faithful sentence from a mangled one.

Searching it is easier after flattening whitespace:

```python
import re
t = re.sub(r'\s+', ' ', open(path, encoding='latin-1').read()).replace(') T', '')
```

## 2. Map the real book

Find the table of contents (usually the first 10–20 pages) and write down the
actual part and chapter list. **Do not invent structure.** A reader who knows
the original must recognise this one; a reader who does not must be able to
pick up the original and find their way.

Regrouping is allowed where the original's shape hides its argument — five
consecutive chapters on one subject can become a part — but the chapter
sequence stays, and the README says what you regrouped and why.

## 3. Plan the output

```
content/book-<slug>/
  README.md               # frontmatter, what this is, who for, the spine
  1-<part>/README.md      # part index
  1-<part>/01-<topic>.md  # one chapter
  ...
```

A short book can be flat (`README.md` plus numbered chapters). `md2epub`
builds one book per immediate subdirectory of `content/`, so the directory is
the book and `README.md` is its first chapter — its `# H1` becomes the shelf
title.

The README needs this frontmatter, which is what puts it on the Book summaries
tab rather than among the knowledge areas:

```markdown
---
collection: Book summaries
---
```

## 4. Write

**Audience.** Someone who ships features competently and is new to this
subject. Assume they can read code and a system diagram. Assume none of the
book's vocabulary. Never assume they will look something up.

**Prose.**

- Original sentences throughout. Reproduce no passage, not even a good one.
- Keep the author's coined terms — they are the vocabulary the reader needs at
  work — and drop the author's sentences.
- Say the thing, then say what it costs. A distillation that keeps only the
  claims and drops the trade-offs is propaganda for the book.
- Where the book has aged badly or is widely disputed, say so and say who
  disputes it. That judgement is most of the value you add over a summary.

**Every chapter:**

1. `# Title`, then a one- or two-line `>` lede saying why the chapter exists.
2. The ideas, in the original's order, each with a concrete example.
3. A diagram wherever there is a mechanism (see below).
4. `## What to take away` — three to five bullets, each usable tomorrow.
5. A `---` rule, then `Previous: … · Next: …` links.

Link outward to the knowledge areas (`../../system-design/…`) where they cover
the same ground; that is what makes this part of the base rather than a guest.

## 5. Diagrams

Mermaid, rendered at build time. **Draw the mechanism, not the table of
contents** — a diagram that lists the chapter's headings in boxes is decoration.
Draw what flows, what waits on what, and where the boundary is.

Label edges with what crosses them. Name the failure the picture explains.
Two contrasting subgraphs in one diagram beats two diagrams.

One parser gotcha: a `"` inside an unquoted node label is a syntax error.
Wrap the whole label instead — `A["Sales context<br/>Customer = a lead"]`,
never `A[Sales context<br/>"Customer" = a lead]`.

## 6. Verify against the source

Do this before the build, and budget real time for it. Go through the
distillation and check **every**:

- **number** — "eight expectations", "4 to 12 services", "1–2 low, 3–4 medium"
- **named list** — that all nine members are there, named as the book names them
- **definition** — word for word in substance, not in wording
- **rating or table** — the book's own judgements, not your reconstruction
- **attribution** — who said it, and in *which* book

```python
for pat in ['First Law of Software Architecture', 'architecture quantum', ...]:
    for m in list(re.finditer(re.escape(pat), t))[:3]:
        print(t[max(0, m.start() - 160):m.start() + 400])
```

A term that returns **zero** hits is the highest-value signal in this whole
process: it usually means the idea came from a sequel, a later edition, a blog
post, or nowhere. Check what the book actually says and rewrite that section.

Record what you verified. The commit message is the right place, and it is what
lets a later reader tell a checked claim from an unchecked one.

## 7. Wire it in and build

Add a row to the table in `content/README.md`. Then:

```bash
npm run build     # strict: dead links and bad diagrams fail the build
npm run site      # assemble dist/site
```

`--strict` catches dead relative links, so link freely and let it find the
typos. Check the reported chapter count and size look right for the book.

## 8. Commit honestly

Say what you checked and what you did not. If you verified the definitions but
not the ratings, the commit says so. Never describe a distillation as verified
against a source you did not read.

## What to leave out

The book's own worked case studies and its complete rating tables stay in the
book. Reproducing them turns a distillation into a substitute, and the point is
to send the reader to the original better prepared, not instead.

If the original is good, say so in the README, and say what is only in it.
