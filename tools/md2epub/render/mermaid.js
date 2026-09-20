/**
 * Mermaid → static SVG, via a headless Chromium.
 *
 * Plugged into md2epub with `--mermaid render/mermaid.js`. It is a separate
 * module rather than part of the converter because it is the one stage that
 * needs a browser: Mermaid's layout engines measure text, and nothing but a
 * real layout engine knows how wide a label is.
 *
 * Three things make it usable in CI:
 *
 *   - One browser and one page for the whole run, not one per diagram.
 *   - Rendered SVG is cached on disk under a hash of the source and the
 *     rendering settings, so an unchanged diagram never re-renders.
 *   - Mermaid is served over loopback rather than injected as a script, so
 *     its lazily-imported per-diagram chunks resolve.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MERMAID_DIST = path.join(HERE, '..', 'node_modules', 'mermaid', 'dist');

/**
 * A palette that reads on a white page and on a black one.
 *
 * Diagrams are figures: every glyph sits on a fill this file controls, never
 * directly on the reader's page colour. Borders and connectors are mid-tone
 * so they hold their contrast against either background. See THEMING below
 * for how these become overridable custom properties.
 */
const PALETTE = {
  'node-bg': '#eaeff5',
  'node-border': '#4a6785',
  'node-text': '#16202b',
  'line': '#4a6785',
  'label-bg': '#eaeff5',
  'alt-bg': '#dbe3ed',
  'note-bg': '#fbf3d5',
  'note-border': '#b59b4a',
};

const MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: 'strict',
  deterministicIds: true,
  // Readers do not run scripts and render foreignObject unevenly. SVG <text>
  // labels are the only form that survives both an EPUB reader and the PWA.
  htmlLabels: false,
  flowchart: { htmlLabels: false, useMaxWidth: false, curve: 'basis' },
  sequence: { useMaxWidth: false },
  gantt: { useMaxWidth: false },
  class: { htmlLabels: false, useMaxWidth: false },
  state: { useMaxWidth: false },
  er: { useMaxWidth: false },
  journey: { useMaxWidth: false },
  pie: { useMaxWidth: false },
  theme: 'base',
  fontFamily: 'ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif',
  fontSize: 15,
  themeVariables: {
    background: 'transparent',
    primaryColor: PALETTE['node-bg'],
    primaryBorderColor: PALETTE['node-border'],
    primaryTextColor: PALETTE['node-text'],
    secondaryColor: PALETTE['alt-bg'],
    secondaryBorderColor: PALETTE['node-border'],
    secondaryTextColor: PALETTE['node-text'],
    tertiaryColor: PALETTE['label-bg'],
    tertiaryBorderColor: PALETTE['node-border'],
    tertiaryTextColor: PALETTE['node-text'],
    lineColor: PALETTE.line,
    textColor: PALETTE['node-text'],
    mainBkg: PALETTE['node-bg'],
    nodeBorder: PALETTE['node-border'],
    nodeTextColor: PALETTE['node-text'],
    clusterBkg: PALETTE['alt-bg'],
    clusterBorder: PALETTE['node-border'],
    edgeLabelBackground: PALETTE['label-bg'],
    labelBackground: PALETTE['label-bg'],
    noteBkgColor: PALETTE['note-bg'],
    noteBorderColor: PALETTE['note-border'],
    noteTextColor: PALETTE['node-text'],
    actorBkg: PALETTE['node-bg'],
    actorBorder: PALETTE['node-border'],
    actorTextColor: PALETTE['node-text'],
    signalColor: PALETTE.line,
    signalTextColor: PALETTE['node-text'],
    labelBoxBkgColor: PALETTE['node-bg'],
    labelBoxBorderColor: PALETTE['node-border'],
    labelTextColor: PALETTE['node-text'],
    loopTextColor: PALETTE['node-text'],
    activationBkgColor: PALETTE['alt-bg'],
    activationBorderColor: PALETTE['node-border'],
    sequenceNumberColor: PALETTE['node-bg'],
    altBackground: PALETTE['alt-bg'],
  },
};

/** Bump when PALETTE, MERMAID_CONFIG or the post-processing below changes. */
const RECIPE = 'v1';

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:#fff;font-family:${MERMAID_CONFIG.fontFamily}}</style>
</head><body><div id="sink"></div></body></html>`;

let session = null;

async function start() {
  const server = http.createServer(async (req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(PAGE);
    }
    const file = path.join(MERMAID_DIST, path.normalize(rel));
    if (!file.startsWith(MERMAID_DIST)) {
      res.writeHead(403);
      return res.end();
    }
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  // On a machine without Chromium's system libraries installed (and without
  // root to install them), MD2EPUB_CHROMIUM_LIBS points at a directory holding
  // them. Unset on a normal machine and in CI, where `playwright install-deps`
  // has done the job.
  const libs = process.env.MD2EPUB_CHROMIUM_LIBS;
  const browser = await chromium.launch({
    args: ['--font-render-hinting=none'],
    env: libs
      ? { ...process.env, LD_LIBRARY_PATH: [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') }
      : undefined,
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.evaluate(async (config) => {
    const mod = await import('/mermaid.esm.min.mjs');
    window.mermaid = mod.default;
    window.mermaid.initialize(config);
  }, MERMAID_CONFIG);

  return { server, browser, page };
}

/**
 * Give the SVG intrinsic dimensions and make colours overridable.
 *
 * THEMING. Mermaid puts most colours in a `<style>` block scoped to the
 * diagram id, but some land on `fill=` / `stroke=` presentation attributes,
 * where `var()` is not substituted. So the stylesheet text gets textual
 * replacement, and the attributes get scoped rules that match on the literal
 * value — CSS wins over a presentation attribute at any specificity. Both
 * carry the original hex as the fallback, so a reader that defines nothing
 * still sees the palette above.
 *
 * SIZING. The width and height attributes come off the viewBox so the layout
 * reserves the right box before the SVG paints. In a paginated view a late
 * reflow does not merely shift text, it changes which page the reader is on.
 */
function finish(svg, id) {
  const viewBox = /viewBox="([\d.\-\s]+)"/.exec(svg);
  let width = null;
  let height = null;
  if (viewBox) {
    const [, , w, h] = viewBox[1].trim().split(/\s+/).map(Number);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      width = Math.round(w);
      height = Math.round(h);
    }
  }

  // Two palette entries may share a hex (a label background is the node
  // background). Key by hex so each colour is substituted once, in a single
  // pass — a second pass would rewrite the fallback inside what the first
  // one wrote.
  const byHex = new Map();
  for (const [name, hex] of Object.entries(PALETTE)) {
    if (!byHex.has(hex)) byHex.set(hex, `var(--dg-${name}, ${hex})`);
  }
  const anyHex = new RegExp([...byHex.keys()].join('|'), 'gi');
  const substitute = (css) => css.replace(anyHex, (hex) => byHex.get(hex.toLowerCase()) ?? hex);

  // 1. Colours inside the diagram's own stylesheet, and inside style="…".
  let out = svg.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/g,
    (all, open, css, close) => open + substitute(css) + close,
  );
  out = out.replace(/style="([^"]*)"/g, (all, css) =>
    css.includes('#') ? `style="${substitute(css)}"` : all,
  );

  // 2. Colours that landed on presentation attributes, where var() is not
  //    substituted. A CSS rule beats a presentation attribute outright.
  const rules = [];
  for (const prop of ['fill', 'stroke', 'stop-color']) {
    for (const hex of byHex.keys()) {
      if (!new RegExp(`${prop}="${hex}"`, 'i').test(out)) continue;
      rules.push(`#${id} [${prop}="${hex}" i]{${prop}:${byHex.get(hex)}}`);
    }
  }
  if (rules.length) {
    out = out.replace(/(<svg[^>]*>)/, `$1<style>${rules.join('')}</style>`);
  }

  // 3. Intrinsic size. Mermaid's own width/height are unreliable — it writes
  //    "100%" when useMaxWidth is on and omits them otherwise.
  out = out.replace(/<svg([^>]*)>/, (all, attrs) => {
    let a = attrs
      .replace(/\s(width|height)="[^"]*"/g, '')
      .replace(/\sstyle="[^"]*"/g, '');
    if (width) a += ` width="${width}" height="${height}"`;
    a += ' style="max-width:100%;height:auto"';
    return `<svg${a}>`;
  });

  return { svg: out, width, height };
}

const cacheDir =
  process.env.MD2EPUB_MERMAID_CACHE ?? path.join(HERE, '..', '..', '..', '.cache', 'mermaid');

/**
 * Render one diagram. Returns an SVG string, or throws with Mermaid's own
 * parse error so the converter can report it as `mermaid-failed`.
 */
export default async function render(source, { id }) {
  const key = crypto
    .createHash('sha256')
    .update(`${RECIPE}\n${source}`)
    .digest('hex')
    .slice(0, 32);
  const cached = path.join(cacheDir, `${key}.svg`);

  // The id is part of the output but not of the cache key: the same diagram
  // in two chapters renders once and is re-labelled on the way out.
  const relabel = (svg) => svg.split('mmd-cache-id').join(id);

  try {
    return relabel(await fs.readFile(cached, 'utf8'));
  } catch {
    /* not cached yet */
  }

  session ??= await start();

  const result = await session.page.evaluate(
    async ([src, renderId]) => {
      try {
        const { svg } = await window.mermaid.render(renderId, src);
        return { svg };
      } catch (error) {
        return { error: String(error?.message ?? error) };
      } finally {
        document.getElementById(`d${renderId}`)?.remove();
      }
    },
    [source, 'mmd-cache-id'],
  );

  if (result.error) throw new Error(result.error.replace(/\s+/g, ' ').trim().slice(0, 200));

  const { svg } = finish(result.svg, 'mmd-cache-id');
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cached, svg);
  return relabel(svg);
}

/** Called by the CLI once every diagram is done. */
render.close = async () => {
  if (!session) return;
  const { server, browser } = session;
  session = null;
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
};
