# md2epub

Convert a folder of Markdown into a reflowable **EPUB 3**.

Generic: it takes any directory, makes no assumptions about this repository, and
has no browser or JVM dependency.

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
| `--no-highlight` | off | Skip syntax highlighting |
| `--mermaid <module>` | — | ES module rendering Mermaid to SVG |
| `--quiet` | off | Summary only |

## Diagrams

Mermaid rendering is injected, not imported, so the converter stays
browser-free. `--mermaid` takes an ES module whose default export is:

```js
export default async function render(source, { id }) {
  return '<svg …>…</svg>'; // or null to fall back
}
```

Without one, diagram source is preserved as a labelled block rather than
dropped. Any renderer works — `@mermaid-js/mermaid-cli`, a Playwright page, a
remote service.

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
