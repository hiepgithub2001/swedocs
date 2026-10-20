---
name: pdf-to-swedocs
description: Convert a whole PDF the user placed in books/ into a swedocs book (Markdown under private/, built into the reader) so it reads like a native EPUB in the swedocs app — reflowing text, real chapters, search, themes, offline save. Use when asked to convert, import, add or "read in the app" a PDF, rather than distil it. Covers triage, running tools/pdf2md, reviewing flagged pages against rendered images, fixing tables and figures, keeping the result out of git and the public site, and building and serving it to a phone.
---

# Converting a PDF into a swedocs book

The goal is the PDF's **full text**, reflowed: a phone reader gets chapters, a
contents panel, search, both themes and "save offline", instead of pinching at
a fixed page. This is conversion, not distillation — nothing is summarised or
rewritten. For a short book in our own words, use `distill-swe-book` instead.

```
 books/x.pdf ─[D] info ─► text layer? bookmarks?      (no text → stop: scanned, needs OCR)
      │
      ├─[D] extract (pdf.js): glyphs + position + font, outline, drawing ops
      ├─[H] infer: lines → paragraphs, headings, code, lists, notes; drop running heads
      ├─[D] figures: render page, crop image / vector boxes → images/
      ├─[D] split along the outline, write .md + README + .pdf2md/report.md
      ├─[J] review the flagged pages against rendered PNGs, fix by hand
      └─[D] build:private → site → serve --tls → phone
  D = deterministic · H = rule-based inference · J = your judgement
```

The more of a PDF the deterministic steps can carry, the less there is to
review. The best case is a **born-digital PDF with bookmarks in one column**:
the outline gives chapters *and* section headings exactly, so step H only has to
find paragraphs.

## 0. Where the result may go — decide first

A converted PDF is the whole book. `content/` is committed and **deployed to a
public site**, so a copyrighted book must never go there.

- **Default: `private/<slug>/`.** Gitignored (`private/.gitignore` is `*`),
  never committed, never deployed. Built only into the local reader.
- **`content/<slug>/`** only when the user owns the rights or the PDF's own
  licence allows redistribution (check its copyright page — CC BY, CC BY-SA,
  public domain, the user's own writing). Say which licence you relied on. If in
  doubt, private.

Only read a PDF the user put in `books/` (gitignored). If they link to someone
else's copy, ask them to place their own in `books/`; do not fetch it.

Slug: `pdf-<short-name>`, so it cannot collide with a distillation
(`book-<name>`) of the same title.

## 1. Triage

```bash
npm run pdf2md -- info books/<file>.pdf
```

Read three things off it:

| Says | Means |
| --- | --- |
| `text … ← probably scanned` | No text layer. Stop and tell the user: pdf2md does not do OCR. |
| an outline | Chapters and headings will be exact. Note which top-level entries are front matter to skip (Cover, Copyright, Contents, Index). |
| no outline | Chapters will be split at the largest headings — expect more review. |
| `figures NOT rendered` | `npm install` in `tools/pdf2md` (the `canvas` package) first. |

Structure: by default (`--level auto`) a "Part …" entry, or one whose children
are chapters, becomes a folder with a README; every other entry becomes one
file, with its sub-entries as headings. If the outline is unusual (parts not
named "Part", chapters three levels down), pass `--level N` to cut at depth N.

## 2. Convert

```bash
npm run pdf2md -- convert books/<file>.pdf -o private/pdf-<slug> \
  --skip "Cover,Copyright,Contents,Table of Contents,Index" \
  [--title "…"] [--language vi] [--collection "PDFs"]
```

It writes `README.md` (frontmatter `collection: PDFs`, so the book lands on
its own shelf tab, plus a linked contents list), one `.md` per chapter,
`images/`, and `.pdf2md/report.md`. Re-running replaces the folder, so **do the
mechanical fixes as flags and re-runs first, hand edits last.**

Read `report.md` top to bottom before anything else:

- **candidate heading sizes / heading sizes** — which font sizes became `##`,
  `###`… If a level looks wrong, that explains every wrong heading in the book.
- **Pages to check** — tables kept as text, lines with wide gaps (a flattened
  table), two-column pages, full-page images (scans or a page drawn as one
  picture).
- **Figures cut out** — where each image came from.

## 3. Review against the page — the step that makes it trustworthy

For each flagged page, and a sample of unflagged ones (a chapter opening, a
page with code, one with a figure, one from each part):

```bash
npm run pdf2md -- render books/<file>.pdf --page 118 -o "$SCRATCH/p118.png"
```

Read the PNG, find the same passage in the Markdown (`grep` a phrase), and
compare. What to look for, and the fix:

| Symptom | Fix |
| --- | --- |
| Table flattened into lines of text | Rewrite as a Markdown table from the rendered page. If it is too complex, render it as an image: `render --page N --crop x,y,w,h` (coordinates from the report) into `images/`, and reference it. |
| Figure missing (vector drawing not detected) | `render --crop` it into `images/` and insert `![what it shows](images/….png)` where it belongs. |
| Figure cropped badly or including body text | Re-render with a corrected `--crop`; overwrite the file. |
| Caption detached from its figure | Move the caption line directly under the image. |
| Code characters missing (`float A_d` for `float *A_d`) | Symbol-font glyphs with no text mapping. Retype the line from the PNG. |
| Paragraph split in two / two paragraphs run together | Join or split by hand. |
| Two-column page interleaved | Re-order the paragraphs from the PNG. |
| A heading came out as body text, or body text as a heading | Fix the `#`s. If it is systematic, it is a size rule — re-run rather than hand-fix. |
| Equations as garbled text | Render the equation region to an image, or write it in plain text (`x² + y²`); md2epub has no math renderer. |

Fix the text **only toward what the page says**. Never paraphrase, summarise or
"improve" the author's sentences — this is a conversion.

Keep a list of what you fixed and what you left; it goes in the summary.

## 4. Build and read

```bash
npm run build:private          # content/ + private/ → dist/pub, one shelf
npm run site                   # → dist/site
node tools/serve.js --site --tls
```

`build:private` is the normal build with `private/` added as a second root.
CI builds `content/` only, and `private/` is never in the repository, so a
private book cannot reach the public site through any push. Do not upload
`dist/` anywhere by hand.

Open the book in a browser at phone width (Playwright with
`LD_LIBRARY_PATH=/home/lehiep/.local/lib/chromium-deps`, or ask the user) and
check, in light and dark theme:

- the contents panel shows the real chapters and parts;
- a chapter opening, a code listing, a figure and a fixed table render;
- search finds a phrase you know is in the book.

On a phone: the public app at github.io will **not** show private books — it is
a different site. The user opens the `--tls` address of this machine (on the
tailnet) instead, installs the CA once (`tools/devcert.js` explains; it is
offered at `<base>swedocs-ca.crt`), and can install that address as its own
app. "Save offline" (↓ on the book) then works exactly as for any other book.

## 5. Report back

Tell the user:

- where it is (`private/pdf-<slug>`, never committed) or, if public, the
  licence that allows it;
- chapters, figures, size, and how many pages were flagged;
- what you fixed, and what you left as-is (e.g. "3 complex tables kept as
  images", "equations on pp. 210–214 as images");
- how to open it on the phone.

Do not commit anything under `private/`. If the user asks to commit, commit
only tool or skill changes.

## Limits — say these rather than work around them silently

- **Scanned PDFs**: no text layer, no conversion. OCR is not installed.
- **Tables** are never detected as tables; they come out as text and are
  flagged when the page has rules or wide gaps.
- **Two-column layouts** are flagged, not untangled.
- **Equations** come out as whatever glyphs the PDF used.
- **Fonts without a text mapping** lose characters; only the rendered page
  shows what they were.
