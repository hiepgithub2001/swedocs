# md2epub

Convert a folder of Markdown into a reflowable **EPUB 3**.

Generic: it takes any directory, makes no assumptions about this repository, and
has no JVM dependency and no browser dependency of its own — diagram rendering
is a plugin (see Diagrams).

```bash
npm install
node bin/md2epub.js ../ -o ../dist/swedocs.epub \
  -t "swedocs — Software Knowledge Base" -a "hiepgithub2001" --ignore _TEMPLATE.md
```

## How it works

Markdown is parsed once into a syntax tree, put through a fixed sequence of
transforms, then serialised as XHTML and zipped:

```
scan ─▶ parse ─▶ links ─▶ mermaid ─▶ highlight ─▶ assets ─▶ headings ─▶ XHTML ─▶ zip
```

Everything expensive or format-specific happens at build time, so the output
needs no JavaScript at runtime. That is what makes EPUB viable: readers do not
execute scripts.

| Stage | File | What it does |
| --- | --- | --- |
| scan | `src/scan.js` | Walks the tree, derives spine order and chapter titles |
| links | `src/transforms/links.js` | Rewrites `../a/b.md#x` onto the right chapter |
| mermaid | `src/transforms/mermaid.js` | Renders diagrams to static SVG (pluggable) |
| highlight | `src/transforms/highlight.js` | Shiki, dual light/dark themes |
| assets | `src/transforms/assets.js` | Pulls local images into the package |
| headings | `src/transforms/headings.js` | Stable anchor ids + per-chapter TOC |
| package | `src/epub/*` | OPF manifest, EPUB 3 nav, EPUB 2 NCX, CSS, zip |

### Ordering

Chapters are ordered by frontmatter `order`, then natural filename order, so
`1-knowledge` precedes `2-case-studies` and `10-x` still follows `9-x`. A
directory takes its title and position from its own `README.md`, so content
steers the book without a tool-specific config file. Within a directory, pages
come before subdirectories.

## Options

| Flag | Default | |
| --- | --- | --- |
| `-o, --out` | `<dir>.epub` | Output path |
| `-t, --title` | folder name | Book title |
| `-a, --author` | `Unknown` | Author metadata |
| `-l, --language` | `en` | BCP-47 language tag |
| `-d, --description` | — | Book description |
| `-s, --subjects` | — | Comma-separated subject tags |
| `-i, --ignore` | — | Extra directory names to skip |
| `-e, --each` | off | One book per immediate subdirectory |
| `--base-url` | — | Reader base URL for links into another book |
| `--source-url` | — | Repository base URL for links that leave the corpus |
| `--strict` | off | Exit non-zero on `dead-link` or `mermaid-failed` |
| `--no-highlight` | off | Skip syntax highlighting |
| `--mermaid <module>` | — | ES module rendering Mermaid to SVG |
| `--quiet` | off | Summary only |

## Links

Inside a book, a relative Markdown link is rewritten onto the target chapter's
file. Splitting a corpus into one book per area breaks every link that crosses
an area — 11% of this one's — and there is no standard way to link between EPUB
publications, so those two flags say where such a link should point instead:

| Link | Becomes |
| --- | --- |
| Same book | `0012-sorting-and-searching.xhtml#stability` |
| Another book, with `--base-url` | `<base>/system-design/1-knowledge/data-storage/indexing` |
| Outside the corpus, with `--source-url` | `<source>/_TEMPLATE.md` |
| Nothing that exists | unwrapped to plain text, reported as `dead-link` |

Reader routes are `<book>/<path-without-extension>`, derived from the source
path rather than the spine position: a chapter's file inside the package moves
whenever something is inserted ahead of it, and a link people bookmark must
not. An index page addresses its directory.

`--source-url` applies only to a file that is really there. Without that check
it would absorb every typo into a plausible-looking URL, which is exactly what
`--strict` exists to catch.

## The gate

Generated Markdown fails in predictable ways: broken relative links, malformed
Mermaid, unclosed fences. `--strict` turns `dead-link` and `mermaid-failed`
from warnings scrolling past into the build's verdict, which makes the
converter the quality check on whatever wrote the content.

```bash
npm run build:strict
```

## Diagrams

Mermaid rendering is injected, not imported, so the core converter stays
browser-free. `--mermaid` takes an ES module whose default export is:

```js
export default async function render(source, { id }) {
  return '<svg …>…</svg>'; // or null to fall back
}
```

Without one, diagram source is preserved as a labelled block rather than
dropped.

`render/mermaid.js` is the renderer this repo uses. It drives Mermaid 11 in a
headless Chromium — the only stage that needs a browser, because Mermaid's
layout engines measure text, and nothing but a real layout engine knows how
wide a label is.

```bash
node bin/md2epub.js ../.. --each -o ../../dist/books --mermaid render/mermaid.js
```

Three things keep it usable in CI:

- One browser and one page for the whole run, not one per diagram.
- Rendered SVG is cached under a hash of the source and the rendering settings,
  so an unchanged diagram never re-renders. Cold: 12s for 220 diagrams. Warm: 4s.
- Mermaid is served over loopback rather than injected as a script, so its
  lazily-imported per-diagram chunks resolve.

Diagrams are themed, not baked. Mermaid renders against a fixed palette, which
is then rewritten to `var(--dg-*, <original>)` — textually inside the SVG's own
stylesheet, and via scoped attribute-selector rules for the colours that land on
presentation attributes, where `var()` is not substituted. `book.css` defines
those custom properties for light and dark, so one SVG follows the reader's
appearance setting, and a reader that defines nothing still gets the fallback.

Every SVG carries intrinsic `width` and `height` off its viewBox. In a
paginated view a late reflow does not merely shift text — it changes which page
the reader is on.

| Variable | |
| --- | --- |
| `MD2EPUB_MERMAID_CACHE` | Cache directory (default: `<repo>/.cache/mermaid`) |
| `MD2EPUB_CHROMIUM_LIBS` | Directory of Chromium's shared libraries, for a machine without them and without root. Unset in CI, where `playwright install --with-deps chromium` has done the job. |

### Diagrams that do not parse

Mermaid's grammar is stricter than it looks, and generated Markdown finds the
edges. Three blocks in this corpus failed until fixed: HTML entities in a
sequence message, a `;` in message text (it ends the statement), and `<--|x|`,
which is not a link. Each surfaces as a `mermaid-failed` warning naming the
chapter.

## Validation

```bash
node test/validate.js ../dist/swedocs.epub
```

Checks the failures that actually brick a book on a device: mimetype stored
first, well-formed XML throughout, manifest and zip agreeing in both
directions, a resolvable spine, and every internal link and anchor landing on
something real.

This is not a replacement for [epubcheck](https://github.com/w3c/epubcheck),
which needs a JVM — worth adding in CI, where `setup-java` is free.

## Output

Re-running produces the same `dc:identifier` for unchanged content, so a
rebuilt book updates in place in a reader's library instead of appearing as a
duplicate and losing reading position.
