# swedocs

A software-engineering knowledge base written in Markdown, published as EPUB 3
books and read in a browser.

| | |
| --- | --- |
| [`content/`](./content/) | The knowledge base. Nine areas, 275 chapters. The only place content is written. |
| [`src/`](./src/) | The reader — a PWA that opens the books offline on phone or desktop. |
| [`tools/md2epub/`](./tools/md2epub/) | The converter. Markdown in, EPUB 3 out, deterministically. |
| `dist/` | Build output. Gitignored — every byte is derived from `content/`. |

Markdown stays the source of truth. It is never converted in place: the
converter only ever writes to `dist/`, so `content/` reads as plain files on
GitHub and stays available to whatever comes next — a print PDF, a native app,
a retrieval index.

## Build

```bash
cd tools/md2epub
npm install
npm test          # build all nine books under --strict, then validate them
```

`npm test` fails on a broken relative link or a Mermaid block that does not
parse, so the converter doubles as the quality check on new content. See
[the converter's README](./tools/md2epub/README.md) for the flags.

## Writing

Add Markdown under `content/<area>/`, following the shape the area already
uses. [`_TEMPLATE.md`](./_TEMPLATE.md) is the starting point for a new page.
Diagrams are [Mermaid](https://mermaid.js.org/) fenced blocks — they render on
GitHub, and the build turns them into SVG for the books.
