/**
 * Reading styles. Deliberately conservative: EPUB engines range from WebKit to
 * 15-year-old renderers, so this leans on inherited defaults, avoids layout
 * that assumes a viewport size, and never fixes a font size in px — the reader's
 * own size control has to keep working.
 */
export const BOOK_CSS = `@charset "utf-8";

:root {
  --ink: #1a1a1a;
  --paper: #ffffff;
  --muted: #5b6470;
  --rule: #e2e5ea;
  --accent: #2d5b8a;
  --code-bg: #f6f8fa;

  /* Diagram palette. Rendered Mermaid SVG refers to these by name and carries
     the light value as its own fallback, so a reader that defines nothing
     still gets a legible figure. */
  --dg-node-bg: #eaeff5;
  --dg-node-border: #4a6785;
  --dg-node-text: #16202b;
  --dg-line: #4a6785;
  --dg-label-bg: #eaeff5;
  --dg-alt-bg: #dbe3ed;
  --dg-note-bg: #fbf3d5;
  --dg-note-border: #b59b4a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ink: #e6e6e6;
    --paper: #16181c;
    --muted: #9aa4b1;
    --rule: #2c313a;
    --accent: #8fb6de;
    --code-bg: #1e2228;

    --dg-node-bg: #232b35;
    --dg-node-border: #7d9dc0;
    --dg-node-text: #dfe6ee;
    --dg-line: #7d9dc0;
    --dg-label-bg: #232b35;
    --dg-alt-bg: #2d3742;
    --dg-note-bg: #3a331d;
    --dg-note-border: #b59b4a;
  }
}

body {
  color: var(--ink);
  background: var(--paper);
  line-height: 1.6;
  margin: 0;
  padding: 0 1em;
  font-family: Georgia, "Times New Roman", serif;
  widows: 2;
  orphans: 2;
}

h1, h2, h3, h4, h5, h6 {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  line-height: 1.25;
  page-break-after: avoid;
  break-after: avoid;
}

h1 { font-size: 1.6em; margin: 1em 0 0.6em; }
h2 { font-size: 1.28em; margin: 1.6em 0 0.5em; padding-bottom: 0.2em; border-bottom: 1px solid var(--rule); }
h3 { font-size: 1.1em; margin: 1.3em 0 0.4em; }
h4, h5, h6 { font-size: 1em; margin: 1.1em 0 0.3em; }

p { margin: 0.7em 0; }
a { color: var(--accent); text-decoration: none; }

blockquote {
  margin: 1em 0;
  padding: 0.1em 1em;
  border-left: 3px solid var(--rule);
  color: var(--muted);
  font-style: italic;
}

/* Code must never force horizontal scrolling: most readers cannot scroll a
   block sideways, so an over-wide line is simply unreadable. Wrap instead. */
pre, code, kbd, samp {
  font-family: "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}

code {
  font-size: 0.85em;
  background: var(--code-bg);
  padding: 0.12em 0.34em;
  border-radius: 3px;
}

pre {
  background: var(--code-bg);
  border: 1px solid var(--rule);
  border-radius: 4px;
  padding: 0.75em;
  margin: 1em 0;
  font-size: 0.78em;
  line-height: 1.45;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  page-break-inside: avoid;
  break-inside: avoid;
}

pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}

/* Shiki dual themes: one package follows the reader's day/night setting.
   Both rules have the same specificity, so the dark one has to come last —
   an equal-specificity light rule after it wins in dark mode too. */
.shiki, .shiki span { color: var(--shiki-light); background-color: var(--shiki-light-bg); }
@media (prefers-color-scheme: dark) {
  .shiki, .shiki span { color: var(--shiki-dark); background-color: var(--shiki-dark-bg); }
}

table {
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 0.85em;
  width: 100%;
}

th, td {
  border: 1px solid var(--rule);
  padding: 0.4em 0.6em;
  text-align: left;
  vertical-align: top;
}

th { background: var(--code-bg); font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }

figure.diagram {
  margin: 1.2em 0;
  text-align: center;
  page-break-inside: avoid;
  break-inside: avoid;
}

figure.diagram svg { max-width: 100%; height: auto; }

figcaption {
  font-size: 0.8em;
  color: var(--muted);
  font-style: italic;
  margin-top: 0.4em;
}

hr { border: 0; border-top: 1px solid var(--rule); margin: 2em 0; }
img { max-width: 100%; height: auto; }
ul, ol { margin: 0.7em 0; padding-left: 1.4em; }
li { margin: 0.25em 0; }

nav#toc ol { list-style: none; padding-left: 1em; }
nav#toc > ol { padding-left: 0; }
nav#toc a { display: block; padding: 0.22em 0; }
`;
