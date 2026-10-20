# Private books

PDFs converted with `pdf2md` go here, one book per folder, in the same shape
as `content/`. Nothing in this directory except this note is committed —
`.gitignore` keeps every converted book out of the repository — so they never
reach the public site, which is built from `content/` alone.

```bash
npm run pdf2md -- convert books/<file>.pdf -o private/pdf-<slug>
npm run build:private      # content/ + private/ → dist/pub
npm run site               # → dist/site
node tools/serve.js --site --tls   # read it, on this machine or a phone
```

A converted PDF is the whole book. It belongs here unless its licence lets it
be republished.
