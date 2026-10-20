#!/usr/bin/env node
/**
 * pdf2md — turn a PDF into a folder of Markdown that md2epub builds into a
 * reflowable book, so a PDF reads in the swedocs app like any other book:
 * text that reflows to the phone, a real table of contents, search, themes.
 *
 *   pdf2md info    <file.pdf>                     outline, fonts, page count
 *   pdf2md convert <file.pdf> -o <dir> [options]  write the book
 *   pdf2md render  <file.pdf> --page N -o x.png   render a page (or --crop) to PNG
 *
 * A PDF is a page description, not a document: it says where glyphs go, not
 * what is a heading or a paragraph. Everything here is inference from layout —
 * font size, font family, position, spacing — and inference is sometimes wrong.
 * So the converter also writes `.pdf2md/report.md` beside the book: what it was
 * unsure of, page by page, for a person (or Claude) to check against rendered
 * pages. The dot-directory keeps it out of the build.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

let canvasLib = null;
try {
  canvasLib = await import('canvas');
} catch {
  /* optional: without it, figures are reported rather than rendered */
}

const USAGE = `pdf2md — convert a PDF into Markdown for md2epub

  pdf2md info    <file.pdf>
  pdf2md convert <file.pdf> -o <dir> [options]
  pdf2md render  <file.pdf> --page <n> [--crop x,y,w,h] [--scale 2] -o <file.png>

  convert options
    -o, --out <dir>         output book directory (one md2epub book)
    -t, --title <text>      book title             (default: PDF metadata, then file name)
        --collection <t>    shelf tab for the book (default: "PDFs")
        --language <code>   BCP-47 tag, when not English
        --level <n|auto>    outline depth that becomes chapter files (default: auto —
                            Parts become folders, chapters become files)
        --pages <a-b>       only convert this page range (1-based, inclusive)
        --skip <a,b,…>      outline titles to drop, e.g. "Index,Contents"
        --no-figures        do not render figures to images
        --scale <n>         figure render scale     (default: 2)

  Coordinates for --crop are in PDF points from the page's top-left, as the
  report prints them.
`;

/* ── arguments ───────────────────────────────────────────────────────── */

function parseArgs(argv) {
  const [command, file, ...rest] = argv;
  const opts = { command, file };
  const alias = { '-o': 'out', '-t': 'title' };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    const key = alias[arg] ?? arg.replace(/^--/, '');
    if (arg === '--no-figures') opts.figures = false;
    else if (arg.startsWith('-')) opts[key] = rest[++i];
    else throw new Error(`Unexpected argument ${arg}`);
  }
  return opts;
}

/* ── small helpers ───────────────────────────────────────────────────── */

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const quantile = (xs, q) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const round = (x, step = 0.5) => Math.round(x / step) * step;

const LIGATURES = { 'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'st', 'ﬆ': 'st' };
const clean = (s) =>
  s.replace(/[ﬀ-ﬆ]/g, (c) => LIGATURES[c])
    .replace(/­/g, '') // soft hyphen
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/ /g, ' ');

export const slugify = (s) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'section';

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');

/** Escape text so Markdown (with raw HTML enabled) shows it literally. */
const escapeInline = (s) =>
  s.replace(/\\/g, '\\\\')
    .replace(/([`*_[\]])/g, '\\$1')
    .replace(/</g, '&lt;');

const escapeLineStart = (s) =>
  s.replace(/^(\s*)(#{1,6}\s|>|[-+=]\s|\d+[.)]\s)/, (m, sp, mark) => `${sp}\\${mark}`);

/* ── fonts ───────────────────────────────────────────────────────────── */

function fontInfo(page, styles, fontName, cache) {
  if (cache.has(fontName)) return cache.get(fontName);
  let name = '';
  try {
    name = page.commonObjs.get(fontName)?.name ?? '';
  } catch {
    /* not loaded */
  }
  const family = styles[fontName]?.fontFamily ?? '';
  const base = name.replace(/^[A-Z]{6}\+/, '');
  const info = {
    name: base,
    // The face, not the style: what tells a sans-serif heading from serif body
    // text when the font names are subset gibberish.
    // Only the generic family: subset font names are too often gibberish
    // ("AdvP6F00" vs "AdvP6F0B") to say whether two faces are the same.
    family: family === 'monospace' ? 'mono' : family || 'serif',
    mono: family === 'monospace' || /mono|courier|consol|menlo|inconsolata|code|typewriter|\btt\b|cmtt/i.test(base),
    bold: /bold|black|heavy|semibold|demi|[-,]b(d)?$|\bbd\b/i.test(base),
    italic: /italic|oblique|[-,]it?$|\bit\b|slant/i.test(base),
  };
  cache.set(fontName, info);
  return info;
}

/* ── geometry ────────────────────────────────────────────────────────── */

const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** A user-space rectangle under `ctm`, as a top-left viewport box. */
function boxOf(viewport, ctm, x0, y0, x1, y1) {
  const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]
    .map(([x, y]) => apply(ctm, x, y))
    .map(([x, y]) => viewport.convertToViewportPoint(x, y));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

const area = (b) => b.w * b.h;
const inside = (b, x, y, pad = 0) => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
const near = (a, b, gap) =>
  a.x <= b.x + b.w + gap && b.x <= a.x + a.w + gap && a.y <= b.y + b.h + gap && b.y <= a.y + a.h + gap;
const union = (a, b) => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/**
 * Where the page draws pictures: raster images, and clusters of vector paths
 * dense enough to be a diagram rather than a rule or a shaded box.
 */
function drawings(opList, viewport) {
  const images = [];
  const paths = [];
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const { fnArray, argsArray } = opList;

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = mul(ctm, args);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      if (args?.[0]) ctm = mul(ctm, args[0]);
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
    else if (
      fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject ||
      fn === OPS.paintImageMaskXObject || fn === OPS.paintImageXObjectRepeat
    ) {
      images.push(boxOf(viewport, ctm, 0, 0, 1, 1));
    } else if (fn === OPS.constructPath) {
      const mm = args?.[2];
      if (mm && mm.length >= 4 && Number.isFinite(mm[0])) {
        const b = boxOf(viewport, ctm, mm[0], mm[1], mm[2], mm[3]);
        paths.push(b);
      }
    }
  }

  // A path the size of the page is a clip or a background, never a figure;
  // let it in and it glues everything on the page into one "drawing".
  const pageArea0 = viewport.width * viewport.height;
  for (let i = paths.length - 1; i >= 0; i--) if (area(paths[i]) > pageArea0 * 0.4) paths.splice(i, 1);

  // Cluster the paths. A single box (a shaded sidebar, a code background) or a
  // handful of rules is layout, not a figure; a diagram is many paths close
  // together.
  const clusters = [];
  for (const p of paths) {
    let hit = clusters.find((c) => near(c.box, p, 12));
    if (hit) {
      hit.box = union(hit.box, p);
      hit.n += 1;
    } else clusters.push({ box: p, n: 1 });
  }
  // Merging can make two clusters overlap; settle that.
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < clusters.length && !changed; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (near(clusters[i].box, clusters[j].box, 12)) {
          clusters[i].box = union(clusters[i].box, clusters[j].box);
          clusters[i].n += clusters[j].n;
          clusters.splice(j, 1);
          changed = true;
          break;
        }
      }
    }
  }
  // Strips of many small paths stacked a label's height apart are one drawing
  // (rows of a disk-block diagram, with the block numbers between them).
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < clusters.length && !changed; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const a = clusters[i].box;
        const b = clusters[j].box;
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const gapY = Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h);
        if (clusters[i].n >= 8 && clusters[j].n >= 8 && overlapX > Math.min(a.w, b.w) * 0.5 && gapY < 24) {
          clusters[i].box = union(a, b);
          clusters[i].n += clusters[j].n;
          clusters.splice(j, 1);
          changed = true;
          break;
        }
      }
    }
  }
  const pageArea = viewport.width * viewport.height;
  const vector = clusters
    .filter((c) => c.n >= 8 && area(c.box) >= pageArea * 0.03 && c.box.w > 40 && c.box.h > 30)
    .map((c) => ({ ...c.box, paths: c.n }));

  return {
    images: images.filter((b) => b.w >= 24 && b.h >= 24 && area(b) >= pageArea * 0.004),
    vector,
    paths,
  };
}

/**
 * Figures found from their captions. A chart whose labels are real text and
 * whose drawing is a few bars and ticks is too sparse to look like a figure,
 * but a "Figure 7.1:" line under it says exactly where one is: everything
 * between the caption and the prose above — paths and small label text — is
 * the figure. A listing set in monospace stays text.
 */
/** Is this line running text — prose, or the short last line of a paragraph? */
function proseOf(p, body) {
  const lines = [...p.lines].sort((a, b) => a.y - b.y);
  const bodyLines = lines.filter((l) => !l.mono && Math.abs(l.size - body) < 0.6);
  const colW = (quantile(bodyLines.map((l) => l.x1), 0.9) - quantile(bodyLines.map((l) => l.x0), 0.1)) || p.width * 0.6;
  // Wide, and without the gaps of labels spread across a drawing.
  const prose = (l) => !l.mono && Math.abs((l.textSize ?? l.size) - body) < 0.6 && l.x1 - l.x0 > colW * 0.6 && !l.gaps;
  const paragraphEnd = (l, above = lines[lines.indexOf(l) - 1]) => Math.abs(l.size - body) < 0.6 && !l.gaps && above && prose(above) &&
    l.y - above.y < body * 1.6 && l.x0 < above.x0 + body; // left of an indented first line, too
  // A full-width line of words, even with gaps in it (inline math spaced out).
  const sentence = (l) => !l.mono && l.x1 - l.x0 > colW * 0.6 && /([a-z]{3,}\W+){4}/i.test(l.text);
  return { prose, paragraphEnd, sentence };
}

/**
 * Pull a figure's edges back off any running text it overlaps: a crop padded
 * into the paragraph above, the caption below, or the running head.
 */
function trimFigure(f, p, body, isMargin) {
  const { prose, paragraphEnd, sentence } = proseOf(p, body);
  const box = { ...f };
  const PAD = 8; // the crop's padding, which must not reach the text either
  let limTop = 0;
  let limBottom = p.height;
  for (const l of p.lines) {
    if (l.x1 < box.x || l.x0 > box.x + box.w) continue;
    const top = l.y - l.size * 0.85;
    const bot = l.y + l.size * 0.3;
    if (bot < box.y - PAD || top > box.y + box.h + PAD) continue;
    // A line of words straddling the edge is the text around the figure; one
    // wholly inside it may be a label or a formula.
    const straddles = top < box.y - 0.5 || bot > box.y + box.h + 0.5;
    const words = straddles && Math.abs((l.textSize ?? l.size) - body) < 0.6 && /[a-z]{3,}\W+[a-z]{3,}/i.test(l.text);
    // An equation cut from running text never holds a sentence (a table may:
    // its cells can be sentences).
    const sentenceIn = f.equation && !f.table && Math.abs((l.textSize ?? l.size) - body) < 0.6 && sentence(l);
    if (!(isMargin(p, l) || CAPTION.test(l.text.trim()) || prose(l) || paragraphEnd(l) || words || sentenceIn)) continue;
    if (l.y < box.y + box.h / 2) {
      limTop = Math.max(limTop, bot + 1);
      if (bot + 1 > box.y) {
        const y = Math.min(bot + 1, box.y + box.h);
        box.h -= y - box.y;
        box.y = y;
      }
    } else {
      limBottom = Math.min(limBottom, top - 1);
      if (top - 1 < box.y + box.h) box.h = Math.max(0, top - 1 - box.y);
    }
  }
  if (box.h <= 16) return f;
  return Object.assign(f, { y: box.y, h: box.h, limTop, limBottom });
}

function captionFigures(p, body, isMargin) {
  const lines = p.lines.filter((l) => !isMargin(p, l)).sort((a, b) => a.y - b.y);
  const { prose } = proseOf(p, body);
  const pageArea = p.width * p.height;
  const out = [];
  lines.forEach((cap, i) => {
    if (!CAPTION.test(cap.text.trim())) return;
    let top = p.height * TOP;
    const got = [];
    for (let j = i - 1; j >= 0; j--) {
      const l = lines[j];
      const above = lines[j - 1];
      const paragraphEnd = Math.abs(l.size - body) < 0.6 && above && prose(above) &&
        l.y - above.y < body * 1.6 && Math.abs(l.x0 - above.x0) < body;
      // "FIGURE 20.3" over its title: the title belongs to that caption.
      const captionTail = above && CAPTION.test(above.text.trim()) && l.y - above.y < l.size * 2;
      if (l.mono || prose(l) || CAPTION.test(l.text.trim()) || paragraphEnd || captionTail) {
        top = l.y + l.size * 0.35;
        break;
      }
      got.push(l);
    }
    const bottom = cap.y - cap.size;
    const paths = p.paths.filter((b) => b.y + b.h / 2 > top && b.y + b.h / 2 < bottom && area(b) < pageArea * 0.4);
    // A lone rule (the edge of a box around a listing) is not a drawing.
    const drawn = paths.length >= 3 || paths.some((b) => b.w > 4 && b.h > 4);
    // Labels set small, or columns of text with wide gaps (a table).
    const tabular = got.filter((l) => l.gaps >= 1).length >= 2;
    if (!drawn && !tabular && got.filter((l) => l.size < body * 0.9).length < 2) return;
    let box = null;
    for (const b of [...paths, ...got.map((l) => ({ x: l.x0, y: l.y - l.size, w: l.x1 - l.x0, h: l.size * 1.3 }))]) {
      box = box ? union(box, b) : { ...b };
    }
    const y0 = Math.max(top, box.y - 4);
    const y1 = Math.min(bottom, box.y + box.h + 4);
    out.push({ x: Math.max(0, box.x - 4), y: y0, w: Math.min(p.width, box.w + 8), h: y1 - y0, caption: true, table: tabular });
  });
  return out;
}

/**
 * Regions that only read as a picture, with no caption to anchor them:
 *
 *   - a table: two or more neighbouring lines whose words sit in columns,
 *     with wide gaps between them (rows of a TLB, a trace of three threads);
 *   - a display equation: a numbered equation, "(37.4)" at the line's end,
 *     with limits or a fraction stacked above or below it, or a line in a
 *     math font whose glyphs have no faithful text ("ð" for "(").
 *
 * Text would scramble both; an image of the region keeps them readable.
 */
function regionFigures(p, body, isMargin) {
  const lines = p.lines.filter((l) => !isMargin(p, l) && !l.mono && !l.leaders).sort((a, b) => a.y - b.y);
  const { prose, sentence } = proseOf(p, body);
  const pageArea = p.width * p.height;
  const out = [];
  // Raised or lowered bits of a line of prose (evaluation bars, limits set
  // inline) belong to that line, not to a table or equation next to it.
  const inProse = (o) => lines.some((q) => q !== o && (prose(q) || sentence(q)) && Math.abs(q.y - o.y) < body * 0.9);
  const boxOfLines = (ls) => {
    let box = null;
    for (const l of ls) {
      const b = { x: l.x0, y: l.y - l.size, w: l.x1 - l.x0, h: l.size * 1.35 };
      box = box ? union(box, b) : b;
    }
    // Rules and bars within the region's band — not a shaded box around it.
    const paths = p.paths.filter((b) => area(b) < pageArea * 0.4 && b.y >= box.y - 8 && b.y + b.h <= box.y + box.h + 8 && b.x + b.w > box.x - 30 && b.x < box.x + box.w + 30);
    for (const b of paths) box = union(box, b);
    return { x: Math.max(0, box.x - 4), y: box.y - 3, w: Math.min(p.width, box.w + 8), h: box.h + 6, region: true };
  };

  // Tables: runs of lines with column gaps; a short line in between (a row
  // of dashes, a lone cell) stays in the run.
  let run = [];
  const flushRun = () => {
    const rows = run.filter((l) => l.gaps >= 1);
    // One row is a diagram when drawing surrounds it: "head → 10 → 30 → NULL".
    const drawnRow = rows.length === 1 && p.paths.filter((b) => b.y < rows[0].y + 4 && b.y + b.h > rows[0].y - rows[0].size - 4).length >= 3;
    if (rows.length >= 2 || drawnRow) {
      while (run.length && !(run.at(-1).gaps >= 1)) run.pop();
      out.push({ ...boxOfLines(run), table: !drawnRow });
    }
    run = [];
  };
  for (const l of lines) {
    const last = run.at(-1);
    const near = last && l.y - last.y < Math.max(l.size, last.size) * 2.2;
    if (l.gaps >= 1 && !prose(l) && !inProse(l) && !CAPTION.test(l.text.trim())) {
      if (!near) flushRun();
      run.push(l);
    } else if (near && run.length && !prose(l) && l.text.length < 40 && !CAPTION.test(l.text.trim())) run.push(l);
    else flushRun();
  }
  flushRun();

  // Display equations.
  const garbled = (l) => (l.text.match(/[ðÞ½¼þ]/g) ?? []).length >= 2;
  lines.forEach((l, i) => {
    const numbered = EQUATION_NUMBER.test(l.text.trim()) && !prose(l);
    // An unnumbered display equation: a line of mostly math, with exponents
    // or limits stacked on it (checked below).
    const display = mathy(l.text) && !inProse(l);
    if (!numbered && !garbled(l) && !display) return;
    // Limits, big operators and fraction parts sit just above and below,
    // chained line to line; a line of words ("which results in:") does not.
    const part = (o) => !prose(o) && !inProse(o) && !CAPTION.test(o.text.trim()) && !/[a-z]{3,}\W+[a-z]{3,}/i.test(o.text);
    const stack = [l];
    for (let j = i - 1; j >= 0 && stack[0].y - lines[j].y < body * 1.6 && part(lines[j]); j--) stack.unshift(lines[j]);
    for (let j = i + 1; j < lines.length && lines[j].y - stack.at(-1).y < body * 1.6 && part(lines[j]); j++) stack.push(lines[j]);
    if (stack.length === 1 && !garbled(l)) return; // a one-line formula reads fine as text
    if (!numbered && !garbled(l) && !stack.some((o) => o !== l && o.size < l.size * 0.9)) return; // nothing stacked
    out.push({ ...boxOfLines(stack), equation: true });
  });
  return out;
}

/**
 * Rebuild a table as rows and cells, or say it cannot be done.
 *
 * Only a region of text and rules qualifies: shaded cells or drawing in it
 * make it a diagram, which stays an image. Columns are the runs of x that
 * text occupies in the fullest rows (whitespace that runs down the table
 * separates them), every other piece of text goes to the column it overlaps
 * most, and a line with nothing in the first column carries on the row above
 * (a wrapped cell).
 */
function tableFrom(p, f) {
  const lines = p.lines.filter((l) => inside(f, l.x0 + 1, l.y - l.size * 0.3, 2)).sort((a, b) => a.y - b.y);
  if (lines.length < 2 || lines.some((l) => l.mono)) return null;
  // Equations line up in columns too; they stay pictures.
  if (lines.some((l) => EQUATION_NUMBER.test(l.text.trim()) || /[∂∑∫√]/.test(l.text))) return null;
  const paths = p.paths.filter((b) => b.x >= f.x - 3 && b.x + b.w <= f.x + f.w + 3 && b.y >= f.y - 3 && b.y + b.h <= f.y + f.h + 3);
  const thin = (b) => b.h < 2.5 || b.w < 2.5 || b.w > f.w * 0.8;
  // Cell shading drawn cell by cell (a header bar, banded rows): rectangles
  // in one row that together span the table are layout, not drawing.
  const band = (b) => {
    const row = paths.filter((o) => Math.abs(o.y - b.y) < 1.5 && Math.abs(o.h - b.h) < 1.5);
    return b.h < 24 && row.reduce((sum, o) => sum + o.w, 0) > f.w * 0.75;
  };
  if (paths.filter((b) => !thin(b) && !band(b)).length > 2) return null;
  // ...but when every row of text sits in boxes, the boxes are the point (a
  // CPU schedule, where a bar's length is time): a drawing, not a table.
  const boxedRows = new Set(paths.filter((b) => !thin(b) && b.h >= 6).map((b) => Math.round(b.y / 3)));
  const textRows = new Set(lines.map((l) => Math.round(l.y / 3)));
  if (boxedRows.size > Math.max(1, textRows.size / 2)) return null;

  const rows = lines.map((l) => {
    const segs = [];
    for (const it of [...l.items].sort((a, b) => a.x - b.x)) {
      if (!it.str.trim()) continue;
      const last = segs.at(-1);
      const gap = last ? it.x - last.x1 : Infinity;
      if (last && gap < Math.max(l.size * 0.9, 3)) {
        last.text += (gap > l.size * 0.15 && !/\s$/.test(last.text) ? ' ' : '') + it.str;
        last.x1 = Math.max(last.x1, it.x + it.w);
      } else segs.push({ x0: it.x, x1: it.x + it.w, text: it.str });
    }
    return { y: l.y, size: l.size, segs };
  }).filter((r) => r.segs.length);

  const most = Math.max(...rows.map((r) => r.segs.length));
  if (most < 2 || most > 10) return null;
  const spans = rows.filter((r) => r.segs.length === most).flatMap((r) => r.segs.map((g) => [g.x0, g.x1])).sort((a, b) => a[0] - b[0]);
  const cols = [];
  for (const [a, b] of spans) {
    const last = cols.at(-1);
    if (last && a <= last[1] + 2) last[1] = Math.max(last[1], b);
    else cols.push([a, b]);
  }
  if (cols.length < 2) return null;
  const colOf = (g) => {
    let best = 0;
    let score = -Infinity;
    cols.forEach(([a, b], i) => {
      const overlap = Math.min(b, g.x1) - Math.max(a, g.x0);
      const s2 = overlap > 0 ? overlap : -Math.min(Math.abs(g.x0 - b), Math.abs(a - g.x1));
      if (s2 > score) [score, best] = [s2, i];
    });
    return best;
  };

  // Text that sits across or between the columns (numbers around a disk
  // platter) means this is a drawing with labels, not a table.
  let misfit = 0;
  let total = 0;
  for (const r of rows) {
    for (const g of r.segs) {
      const [a, b] = cols[colOf(g)];
      const overlap = Math.min(b, g.x1) - Math.max(a, g.x0);
      total += 1;
      if (overlap < (g.x1 - g.x0) * 0.5) misfit += 1;
    }
  }
  if (misfit > total * 0.15) return null;

  const table = [];
  let prevY = null;
  for (const r of rows) {
    const cells = cols.map(() => '');
    for (const g of r.segs) {
      const i = colOf(g);
      cells[i] = cells[i] ? `${cells[i]} ${g.text.trim()}` : g.text.trim();
    }
    const last = table.at(-1);
    if (last && !cells[0] && prevY !== null && r.y - prevY < r.size * 1.5) {
      cells.forEach((c, i) => { if (c) last[i] = last[i] ? `${last[i]} ${c}` : c; });
    } else table.push(cells);
    prevY = r.y;
  }
  const filled = table.flat().filter(Boolean).length / (table.length * cols.length);
  if (table.length < 2 || filled < 0.5) return null;
  // A heading in two rows ("Resulting" over "Cache State", "Read" over "(μs)")
  // is one header: fold the second in while the first has gaps in it or the
  // second is only units in parentheses.
  for (let n = 0; n < 2 && table.length > 2; n++) {
    const [h, next] = table;
    const units = next.filter(Boolean).every((c) => /^\(.*\)$/.test(c));
    const data = next.some((c) => /^[\d.,\s%-]+$/.test(c)); // a row with a number in a cell is data
    // An empty corner cell over the row labels is a normal header, not half of one.
    if (!units && (data || !h.slice(1).some((c) => !c))) break;
    table.splice(0, 2, h.map((c, i) => [c, next[i]].filter(Boolean).join(' ')));
  }
  return table;
}

function tableMarkdown(rows) {
  const cell = (t) => escapeInline(clean(t)).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim() || ' ';
  const line = (r) => `| ${r.map(cell).join(' | ')} |`;
  return [line(rows[0]), `| ${rows[0].map(() => '---').join(' | ')} |`, ...rows.slice(1).map(line)].join('\n');
}

/* ── glyphs that do not say what they draw ─────────────────────────────── */

/**
 * Math fonts in many publishers' PDFs map their symbols onto ordinary codes:
 * "2" draws a minus, "5" an equals sign, "ð" an opening parenthesis, and
 * control codes stand for whatever the subset put first. The text layer then
 * reads "x1 2 0:5" for "x1 − 0.5". The only witness to the truth is the glyph
 * itself, so this draws each suspicious glyph from the PDF's own font and
 * compares its shape with reference symbols.
 *
 * Conservative by construction: only punctuation, digits, control codes and
 * Latin-1 oddities are suspects; only symbols are candidates; code fonts are
 * left alone; a hyphen never becomes a dash; and an ordinary character is
 * replaced only in a font that shows at least two confident substitutions.
 */
const GLYPH_CANDIDATES = [...'−+=×÷±≤≥<>()[]{}∗∘→←|/≠≈∂∞√∑∫′,.;:'];
const SUSPECT = /[\u0000-\u001f\u0080-\u00ff0-9!-\/:-@\[-`{-~]/;

async function repairGlyphs(doc, from, to) {
  if (!canvasLib) return { map: new Map(), symbols: new Set(), notes: ['glyph repair skipped (no canvas package)'] };
  const { createCanvas, registerFont } = canvasLib;
  const refFonts = [];
  for (const [file, family] of [['DejaVuSerif', 'DejaVuSerif'], ['DejaVuSans', 'DejaVuSans']]) {
    const f = `/usr/share/fonts/truetype/dejavu/${file}.ttf`;
    try {
      await fs.access(f);
      registerFont(f, { family });
      refFonts.push(family);
    } catch {
      /* not installed */
    }
  }
  if (!refFonts.length) refFonts.push('serif', 'sans-serif');

  const N = 32;
  const S = 160;
  const shape = (draw) => {
    const c = createCanvas(S, S);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#000';
    draw(g);
    const d = g.getImageData(0, 0, S, S).data;
    let [x0, y0, x1, y1] = [S, S, -1, -1];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (d[(y * S + x) * 4] < 128) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const side = Math.max(w, h);
    const bits = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const sx = Math.floor(x0 - (side - w) / 2 + ((x + 0.5) * side) / N);
      const sy = Math.floor(y0 - (side - h) / 2 + ((y + 0.5) * side) / N);
      if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1 && d[(sy * S + sx) * 4] < 128) bits[y * N + x] = 1;
    }
    return { bits, aspect: w / h, cy: (y0 + y1) / 2 };
  };
  const grow = (b) => {
    const o = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!b[y * N + x]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy;
        const xx = x + dx;
        if (yy >= 0 && yy < N && xx >= 0 && xx < N) o[yy * N + xx] = 1;
      }
    }
    return o;
  };
  const similar = (a, b) => {
    if (!a || !b) return 0;
    const A = grow(a.bits);
    const B = grow(b.bits);
    let [ab, ba, na, nb] = [0, 0, 0, 0];
    for (let i = 0; i < N * N; i++) {
      na += a.bits[i];
      nb += b.bits[i];
      if (a.bits[i] && B[i]) ab += 1;
      if (b.bits[i] && A[i]) ba += 1;
    }
    const ratio = Math.min(a.aspect, b.aspect) / Math.max(a.aspect, b.aspect);
    return ((ab + ba) / (na + nb)) * (0.5 + 0.5 * ratio);
  };
  const refs = new Map();
  const ref = (ch) => {
    if (!refs.has(ch)) refs.set(ch, refFonts.map((fam) => shape((g) => { g.font = `100px ${fam}`; g.fillText(ch, 30, 120); })));
    return refs.get(ch);
  };
  const fit = (mine, ch) => Math.max(0, ...ref(ch).map((r) => similar(mine, r)));

  // One page per (font, character) to draw it from.
  const suspects = new Map();
  // Code fonts say what they mean. A monospace font that never sets a letter
  // is not one: equal-width signs (+ − = ×) make a symbol font "monospace".
  const mono = new Set();
  const letters = new Map();
  for (let n = from; n <= to; n++) {
    const page = await doc.getPage(n);
    const text = await page.getTextContent();
    for (const [name, style] of Object.entries(text.styles)) if (style.fontFamily === 'monospace') mono.add(name);
    for (const it of text.items) {
      const k = (it.str.match(/[A-Za-z]/g) ?? []).length;
      if (k) letters.set(it.fontName, (letters.get(it.fontName) ?? 0) + k);
      for (const ch of new Set(it.str)) {
        if (ch === ' ' || !SUSPECT.test(ch)) continue;
        const key = `${it.fontName}\u0000${ch}`;
        if (!suspects.has(key)) suspects.set(key, { n, fontName: it.fontName, ch });
      }
    }
  }
  const code = new Set([...mono].filter((name) => (letters.get(name) ?? 0) >= 20));
  const symbols = new Set([...mono].filter((name) => !code.has(name))); // monospace, but not code
  const byPage = new Map();
  for (const sp of suspects.values()) (byPage.get(sp.n) ?? byPage.set(sp.n, []).get(sp.n)).push(sp);

  const found = new Map(); // fontName → [{ ch, to, plain }]
  for (const [n, list] of byPage) {
    await renderPage(doc, n, 0.2); // drawing the page is what makes the outlines available
    const page = await doc.getPage(n);
    for (const sp of list) {
      let font;
      try {
        font = page.commonObjs.get(sp.fontName);
      } catch {
        continue;
      }
      // Not font.isMonospace: a symbol font of equal-width signs is flagged so.
      if (code.has(sp.fontName) || /mono|courier|consol|menlo|inconsolata|code|typewriter|\btt\b|cmtt/i.test(font.name ?? '')) continue;
      const fc = font.toFontChar?.[sp.ch.charCodeAt(0)];
      const draw = font.getPathGenerator(page.commonObjs, fc !== undefined ? String.fromCodePoint(fc) : sp.ch);
      const mine = shape((g) => { g.save(); g.translate(30, 120); g.beginPath(); draw(g, 100); g.fill(); g.restore(); });
      if (!mine) continue;
      const control = /[\u0000-\u001f\u007f-\u009f]/.test(sp.ch);
      const self = control ? 0 : fit(mine, sp.ch);
      let best = null;
      let score = 0;
      for (const c of GLYPH_CANDIDATES) {
        const v = fit(mine, c);
        if (v > score) [best, score] = [c, v];
      }
      if (!best || best === sp.ch) continue;
      if (/[-‐‑–—−]/.test(sp.ch) && /[-−]/.test(best)) continue;
      const confident = (self < 0.5 && score >= 0.75 && score - self >= 0.3) || (score >= 0.95 && score - self >= 0.4);
      if (!confident) continue;
      // A dot drawn above the baseline is a centred dot.
      if (best === '.' && mine.cy < 105) best = '·';
      const name = (font.name ?? '').replace(/^[A-Z]{6}\+/, '');
      const plain = /[!-~]/.test(sp.ch); // an ordinary printable character
      (found.get(sp.fontName) ?? found.set(sp.fontName, []).get(sp.fontName)).push({ ch: sp.ch, to: best, plain, name });
    }
  }

  const map = new Map();
  const notes = [];
  for (const [fontName, list] of found) {
    // An ordinary character is replaced only when its font is evidently a
    // symbol font: two or more confident substitutions in it.
    const keep = list.filter((x) => !x.plain || list.filter((y) => y.plain).length >= 2);
    if (!keep.length) continue;
    map.set(fontName, new Map(keep.map((x) => [x.ch, x.to])));
    for (const x of keep) notes.push(`${x.name}: ${JSON.stringify(x.ch)} → ${x.to}`);
  }
  return { map, symbols, notes };
}

/* ── text → lines ────────────────────────────────────────────────────── */

/**
 * Group a page's text items into lines, each a list of styled runs, in reading
 * order. Single-column only: a two-column page comes out with its columns
 * interleaved, which the report flags.
 */
function linesOf(page, text, viewport, fonts, glyphs = new Map(), symbols = new Set()) {
  const items = [];
  for (const it of text.items) {
    if (!it.str) continue;
    const fix = glyphs.get(it.fontName);
    const str = clean(fix ? [...it.str].map((c) => fix.get(c) ?? c).join('') : it.str);
    if (!str.trim() && !it.hasEOL) continue;
    const [a, b, , , e, f] = it.transform;
    const size = Math.hypot(it.transform[2], it.transform[3]) || Math.hypot(a, b) || it.height;
    if (Math.abs(b) > Math.abs(a) * 0.2) continue; // rotated text: margin notes, spine labels
    const [x, y] = viewport.convertToViewportPoint(e, f);
    const font = fontInfo(page, text.styles, it.fontName, fonts);
    // A symbol font of equal-width signs is not code.
    items.push({ str, x, y, w: it.width, size, font: symbols.has(it.fontName) ? { ...font, mono: false, family: 'serif' } : font });
  }

  // Full-size text first, so a superscript joins the line it marks instead of
  // starting one that the rest of the sentence then attaches to.
  items.sort((p, q) => (Math.round(q.size * 2) - Math.round(p.size * 2)) || p.y - q.y || p.x - q.x);
  const lines = [];
  for (const it of items) {
    // Same line when the baselines are close — close enough to take a
    // superscript, not so loose as to swallow the line below.
    // Same line when the baselines are close. The tolerance comes from the
    // smaller of the two sizes, so a two-inch decorative chapter number does not
    // swallow the title beside it; a run between half and most of the line's
    // size (a superscript or subscript) gets the larger allowance.
    let line = null;
    let best = Infinity;
    for (const l of lines) {
      const lo = Math.min(l.size, it.size);
      const hi = Math.max(l.size, it.size);
      // The larger allowance is for a super- or subscript, which sits right
      // against the text it marks.
      const touching = l.items.some((o) =>
        Math.abs(it.x - (o.x + o.w)) < hi * 0.6 || Math.abs(o.x - (it.x + it.w)) < hi * 0.6 ||
        (it.x < o.x + o.w && o.x < it.x + it.w));
      const tol = lo >= hi * 0.5 && touching ? hi * 0.55 : lo * 0.45;
      const dy = Math.abs(l.y - it.y);
      if (dy < tol && dy < best) {
        best = dy;
        line = l;
      }
    }
    if (line) {
      line.items.push(it);
      if (it.size > line.size) {
        line.size = it.size;
        line.y = it.y;
      }
      line.x0 = Math.min(line.x0, it.x);
    } else lines.push({ y: it.y, size: it.size, x0: it.x, items: [it] });
  }

  lines.sort((p, q) => p.y - q.y || p.x0 - q.x0);
  for (const line of lines) {
    line.items.sort((p, q) => p.x - q.x);
    // TeX's \neq: the symbol font's negation slash (stored at the code for
    // "6") laid over an "=". The text layer reads "6="; the page shows "≠".
    for (let i = line.items.length - 1; i >= 0; i--) {
      const it = line.items[i];
      if (it.str.trim() !== '6' || !/^cmsy/i.test(it.font.name ?? '')) continue;
      // Overlaid, so the "=" may sit just before or just after it.
      const next = line.items.find((o) => o !== it && Math.abs(o.x - it.x) < it.size * 0.8 && o.str.trimStart().startsWith('='));
      if (next) {
        next.str = next.str.replace('=', '≠');
        line.items.splice(i, 1);
      }
    }
    // A built-up fraction: small numerator text raised above the baseline,
    // often in several pieces, with a small denominator lowered beneath its
    // span. Inline, it reads as (a)/(b).
    const small = (it) => it.size < line.size * 0.85;
    const raised = (it) => small(it) && it.y < line.y - line.size * 0.15;
    const lowered = (it) => small(it) && it.y > line.y + line.size * 0.1;
    for (const d of line.items.filter(lowered)) {
      const rest = line.items.filter((it) => it !== d);
      const groups = [];
      for (const it of rest) {
        const g = groups.at(-1);
        if (raised(it) && g && g.at(-1) === rest[rest.indexOf(it) - 1] && raised(g.at(-1))) g.push(it);
        else if (raised(it)) groups.push([it]);
      }
      const num = groups.find((g) => d.x < g.at(-1).x + g.at(-1).w && g[0].x < d.x + d.w);
      if (!num) continue;
      const wrap = (t) => (/^[\w.]+$/.test(t.trim()) ? t.trim() : `(${t.trim()})`);
      const x1 = Math.max(...num.map((it) => it.x + it.w), d.x + d.w);
      const merged = {
        ...num[0], str: ` ${wrap(num.map((it) => it.str).join(''))}/${wrap(d.str)} `,
        y: line.y, size: line.size, w: x1 - num[0].x, font: { ...num[0].font, mono: false },
      };
      line.items = line.items.filter((it) => it !== d && !num.includes(it));
      line.items.splice(line.items.findIndex((it) => it.x > merged.x) >>> 0, 0, merged);
      line.items.sort((p, q) => p.x - q.x);
    }
    const runs = [];
    let prevEnd = null;
    let chars = { mono: 0, bold: 0, italic: 0, all: 0 };
    const families = new Map();
    for (const it of line.items) {
      const small = it.size < line.size * 0.85;
      const sup = small && line.y - it.y > line.size * 0.15;
      const sub = small && !sup && it.size < line.size * 0.75;
      let str = it.str;
      if (prevEnd !== null) {
        const gap = it.x - prevEnd;
        const lastChar = runs.at(-1)?.text.slice(-1) ?? ' ';
        if (gap > it.size * 0.15 && lastChar !== ' ' && !str.startsWith(' ')) str = ` ${str}`;
        // Wide gaps inside a code line are alignment; keep some of it.
        if (it.font.mono && gap > it.size * 1.2) str = ' '.repeat(Math.round(gap / (it.size * 0.6))) + str.trimStart();
      }
      prevEnd = it.x + it.w;
      const style = { mono: it.font.mono, bold: it.font.bold, italic: it.font.italic, sup, sub };
      // A listing's line numbers are often set in the text face; they say
      // nothing about whether the line is code.
      const lineNumber = it === line.items[0] && !it.font.mono && /^\d{1,4}$/.test(it.str.trim());
      const n = lineNumber ? 0 : it.str.replace(/\s/g, '').length;
      chars.all += n;
      families.set(it.font.family, (families.get(it.font.family) ?? 0) + n);
      if (it.font.mono) chars.mono += n;
      if (it.font.bold) chars.bold += n;
      if (it.font.italic) chars.italic += n;
      const last = runs.at(-1);
      if (last && last.mono === style.mono && last.bold === style.bold && last.italic === style.italic && last.sup === style.sup && last.sub === style.sub) {
        last.text += str;
      } else runs.push({ text: str, ...style });
    }
    line.runs = runs;
    line.text = runs.map((r) => r.text).join('').replace(/\s+$/, '');
    line.x1 = prevEnd ?? line.x0;
    line.mono = chars.all > 0 && chars.mono / chars.all > 0.6;
    line.bold = chars.all > 0 && chars.bold / chars.all > 0.8;
    line.family = [...families].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    // The size most of its characters are set in: one big glyph (an integral,
    // a bar) raises line.size but does not make the line a heading or a formula.
    const sizes = new Map();
    for (const it of line.items) sizes.set(round(it.size), (sizes.get(round(it.size)) ?? 0) + it.str.length);
    line.textSize = [...sizes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? line.size;
    line.mixed = families.size > 1;
    line.leaders = line.items.some((i) => /\.{4,}|…{2,}|(\. ){4,}/.test(i.str)) && /\d+\s*$/.test(line.text);
    line.gaps = line.items.filter((it, i) => i && it.x - (line.items[i - 1].x + line.items[i - 1].w) > it.size * 2).length;
  }
  return lines.filter((l) => l.text.trim());
}

/* ── document analysis ───────────────────────────────────────────────── */

/** Page numbers and running heads: short lines in the margins that repeat. */
const TOP = 0.13; // a running head sits in the top 13% of the page…
const BOTTOM = 0.88; // …a footer or folio in the bottom 12%
function marginFilter(pages) {
  const key = (t) => t.trim().toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ');
  const counts = new Map();
  for (const p of pages) {
    const seen = new Set();
    for (const l of p.lines) {
      if (l.y > p.height * TOP && l.y < p.height * BOTTOM) continue;
      const k = key(l.text);
      if (seen.has(k)) continue;
      seen.add(k);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const threshold = Math.max(3, pages.length * 0.04);
  // A page number is a number at the start or end of a margin line that
  // follows the page sequence: PDF page minus printed number is the same on
  // many pages (one offset per book, or per chapter where numbering restarts).
  // A footnote that opens with its number does not keep step.
  const numbersOf = (t) => [t.match(/^(\d{1,4})\s+\S/)?.[1], t.match(/\S\s+(\d{1,4})$/)?.[1]].filter(Boolean).map(Number);
  const offsets = new Map();
  for (const p of pages) {
    const seen = new Set();
    for (const l of p.lines) {
      if (l.y > p.height * TOP && l.y < p.height * BOTTOM) continue;
      for (const n of numbersOf(l.text.trim())) seen.add(p.number - n);
    }
    for (const o of seen) offsets.set(o, (offsets.get(o) ?? 0) + 1);
  }
  const folio = (t, p) => t.length < 110 && numbersOf(t).some((n) => (offsets.get(p.number - n) ?? 0) >= 3);
  const zone = (p, l) => l.y <= p.height * TOP || l.y >= p.height * BOTTOM;
  // "94 CHAPTER 5 Memory…" / "Defining Software Architecture | 7": a running
  // head changes with the section, but it always carries the page number. It
  // may take two lines ("SCHEDULING:" over "THE MULTI-LEVEL FEEDBACK QUEUE 3"),
  // so the margin's lines are taken as stacks; a stack standing apart from the
  // body text, with a page number on any of its lines, goes. Body copy that
  // happens to open with a number sits a line-height from its neighbour.
  const dropped = new WeakMap();
  const droppedOn = (p) => {
    if (dropped.has(p)) return dropped.get(p);
    const out = new Set();
    const lines = [...p.lines].sort((a, b) => a.y - b.y);
    const stacks = [];
    for (const l of lines) {
      if (!zone(p, l)) continue;
      const last = stacks.at(-1);
      const prevLine = last?.at(-1);
      if (prevLine && l.y - prevLine.y < l.size * 1.8 && zone(p, prevLine)) last.push(l);
      else stacks.push([l]);
    }
    for (const stack of stacks) {
      const y0 = stack[0].y;
      const y1 = stack.at(-1).y;
      const size = Math.max(...stack.map((l) => l.size));
      const apart = lines.every((o) => stack.includes(o) || o.y < y0 - size * 1.8 || o.y > y1 + size * 1.8 || (o.y > y0 - size * 0.5 && o.y < y1 + size * 0.5 && zone(p, o)));
      if (apart && stack.some((l) => folio(l.text.trim(), p))) stack.forEach((l) => out.add(l));
    }
    dropped.set(p, out);
    return out;
  };
  return (p, l) => {
    if (!zone(p, l)) return false;
    const t = l.text.trim();
    if (/^[\divxlc]{1,6}$/i.test(t)) return true;
    if (droppedOn(p).has(l)) return true;
    return (counts.get(key(l.text)) ?? 0) >= threshold;
  };
}

/** Body size: the size most characters are set in. */
function bodySize(pages) {
  const weight = new Map();
  for (const p of pages) {
    for (const l of p.lines) {
      if (l.mono) continue;
      const s = round(l.size);
      weight.set(s, (weight.get(s) ?? 0) + l.text.length);
    }
  }
  return [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;
}

/* ── outline → chapter tree ──────────────────────────────────────────── */

async function outlineTree(doc, viewports) {
  const raw = (await doc.getOutline()) ?? [];
  const resolve = async (item, depth) => {
    let page = null;
    let y = 0;
    try {
      const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
      if (dest) {
        page = (await doc.getPageIndex(dest[0])) + 1;
        const kind = dest[1]?.name;
        // The y in a destination is in user space; ask the viewport where that is.
        const top = kind === 'XYZ' ? dest[3] : kind === 'FitH' || kind === 'FitBH' ? dest[2] : kind === 'FitR' ? dest[5] : null;
        if (Number.isFinite(top) && viewports[page - 1]) {
          y = Math.max(0, viewports[page - 1].convertToViewportPoint(0, top)[1] - 4);
          // A destination in the top third is "this page": chapter openers put
          // a label ("CHAPTER") above the point the link aims at.
          if (y < viewports[page - 1].height * 0.33) y = 0;
        }
      }
    } catch {
      /* an outline entry that points nowhere */
    }
    const children = [];
    for (const child of item.items ?? []) children.push(await resolve(child, depth + 1));
    return { title: clean(item.title ?? '').trim() || 'Untitled', page, y, depth, children };
  };
  const out = [];
  for (const item of raw) out.push(await resolve(item, 1));
  return out;
}

/* ── lines → Markdown blocks ─────────────────────────────────────────── */

function renderRuns(runs) {
  // Style markers have to hug the text: move the spaces outside them.
  const merged = [];
  for (const r of runs) {
    const last = merged.at(-1);
    if (last && last.mono === r.mono && last.bold === r.bold && last.italic === r.italic && last.sup === r.sup && last.sub === r.sub) last.text += r.text;
    else merged.push({ ...r });
  }
  return merged.map((r) => {
    const m = r.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const [, lead, core, trail] = m;
    if (!core) return r.text;
    let out;
    if (r.sup) out = `<sup>${escapeInline(core)}</sup>`;
    else if (r.sub) out = `<sub>${escapeInline(core)}</sub>`;
    else if (r.mono) out = core.includes('`') ? `\`\` ${core} \`\`` : `\`${core}\``;
    else {
      out = escapeInline(core);
      if (r.bold && r.italic) out = `***${out}***`;
      else if (r.bold) out = `**${out}**`;
      else if (r.italic) out = `*${out}*`;
    }
    return lead + out + trail;
  }).join('');
}

/** Join a paragraph's lines, mending words hyphenated across the break. */
function joinLines(lines) {
  const runs = [];
  for (const line of lines) {
    const lineRuns = line.runs.map((r) => ({ ...r }));
    if (runs.length) {
      const last = runs.at(-1);
      const next = lineRuns[0];
      if (/[a-zà-ỹ][-\u2010]$/i.test(last.text) && /^[a-zà-ỹ]/.test(next.text.trimStart())) {
        last.text = last.text.slice(0, -1);
        next.text = next.text.trimStart();
      } else if (!/\s$/.test(last.text)) {
        next.text = ` ${next.text.trimStart()}`;
      }
    }
    runs.push(...lineRuns);
  }
  return runs;
}

const BULLET = /^\s*([•◦▪▫●○■□‣⁃∙·–—*-])\s+/;
/**
 * Mostly digits and operators, with operators in it: "1.00B ∗ 2 + 1.00B ∗ 2 = …".
 * A row of a table of numbers is digits alone.
 */
const mathy = (t) => {
  const c = t.replace(/\s/g, '');
  const ops = (c.match(/[+−=∗×÷<>≤≥^]/g) ?? []).length;
  return c.length >= 6 && (ops >= 2 || c.includes('=')) && (c.match(/[0-9+\-−=∗×÷<>≤≥()[\]^.,/]/g) ?? []).length / c.length >= 0.6;
};
const EQUATION_NUMBER = /\((?:[A-Z]|\d+)\.\d+\)\s*$/; // "(37.4)", "(A.3)"
const CAPTION = /^(figure|fig\.|table)\s*(?:[A-Z]\.?)?\d+[\d.]*[a-z]?\s*[:.]/i;

/**
 * The label of a boxed callout: "TIP: …", "ASIDE: …", "THE CRUX: …" — a short
 * line in capitals (small caps come through as capitals) with a colon early.
 */
const isCalloutLabel = (l) => {
  const t = l.text.trim();
  const letters = t.replace(/[^A-Za-z]/g, '');
  return !l.mono && t.length < 100 && letters.length >= 4 && letters === letters.toUpperCase() &&
    /^[A-Z][A-Z0-9 ’'&-]{1,30}:/.test(t);
};
const NUMBERED = /^\s*(\(?\d{1,3}[.)]|\(?[a-z][.)])\s+/;

/**
 * Turn one page's lines into blocks: headings, paragraphs, list items, code,
 * and figures placed where they sit on the page.
 */
function blocksOf(page, ctx) {
  const { body, levelOf } = ctx;
  const lines = page.lines.filter((l) => !l.leaders && !ctx.isMargin(page, l) && !page.figures.some((f) => inside(f, l.x0 + 1, l.y - l.size * 0.3, 2)));
  const bodyLines = lines.filter((l) => !l.mono && Math.abs(l.size - body) < 1);
  const left = quantile(bodyLines.map((l) => l.x0), 0.1) || quantile(lines.map((l) => l.x0), 0.1);
  const right = quantile(bodyLines.map((l) => l.x1), 0.9) || page.width;
  const lead = median(bodyLines.slice(1).map((l, i) => l.y - bodyLines[i].y).filter((g) => g > 0 && g < body * 3)) || body * 1.25;

  const blocks = [];
  let cur = null;
  // A callout runs from its label to the next clear vertical gap; every block
  // inside it carries its id, and is written as one blockquote.
  let callout = null;
  let inFrame = -1;
  const flush = () => {
    if (cur) {
      if (callout) cur.callout = callout;
      blocks.push(cur);
    }
    cur = null;
  };

  const events = [
    ...lines.map((l) => ({ y: l.y, line: l })),
    ...page.figures.map((f) => ({ y: f.y + f.h, figure: f })),
  ].sort((a, b) => a.y - b.y);

  // A "weak" heading — told apart only by weight or face — is a heading when it
  // stands alone. If the next line carries straight on in the same style, it
  // was the first line of a sidebar paragraph.
  const lineEvents = events.filter((e) => e.line);
  const nextOf = new Map(lineEvents.map((e, i) => [e.line, lineEvents[i + 1]?.line ?? null]));
  // Font families are guessed (names are often obfuscated), and a chapter can
  // come out in a "different face" wholesale, so a weak heading is also judged
  // by its neighbours: a heading is never the next line of a full-width line
  // in its own style, and a line that fills the column is a paragraph's first
  // line when the text carries straight on.
  const prevOf = new Map(lineEvents.map((e, i) => [e.line, lineEvents[i - 1]?.line ?? null]));
  const sameStyle = (a, b) => a && b && a.family === b.family && a.bold === b.bold && Math.abs(a.y - b.y) < lead * 1.3;
  const fills = (x) => x.x1 > right - body * 2;
  const levelFor = (l) => {
    const lv = levelOf(l);
    if (typeof lv === 'number') return lv;
    const prev = prevOf.get(l);
    if (sameStyle(prev, l) && fills(prev) && !prev.mono) return 0;
    const next = nextOf.get(l);
    const nextLevel = next && levelOf(next);
    if (sameStyle(l, next) && (nextLevel === 0 || (typeof nextLevel !== 'number' && fills(l)))) return 0;
    return lv.weak;
  };

  let prev = null;
  for (const ev of events) {
    if (ev.figure) {
      flush();
      blocks.push({ type: 'figure', figure: ev.figure, page: page.number });
      prev = null;
      continue;
    }
    const l = ev.line;
    const gap = prev ? l.y - prev.y : Infinity;
    const level = levelFor(l);
    const small = l.size < body * 0.85 && l.y > page.height * 0.7;

    // A framed sidebar of prose is a callout for as long as its frame lasts;
    // its short first line is the title.
    const frame = (page.asides ?? []).findIndex((b) => inside(b, l.x0 + 1, l.y - l.size * 0.3, 2));
    if (frame !== inFrame) {
      flush();
      callout = null;
      inFrame = frame;
      if (frame >= 0) {
        callout = (ctx.callouts = (ctx.callouts ?? 0) + 1);
        if (l.text.length < 80 && !/[.,;:]$/.test(l.text.trim())) {
          cur = { type: 'para', lines: [l], page: page.number, label: true };
          prev = l;
          continue;
        }
      }
    }
    if (callout && inFrame < 0 && (gap > lead * 1.6 || level)) {
      flush();
      callout = null;
    }
    // A label that wraps: the next line is in capitals too.
    const letters = l.text.replace(/[^A-Za-z]/g, '');
    if (cur?.label && gap < lead * 1.45 && letters.length >= 4 && letters === letters.toUpperCase()) {
      cur.lines.push(l);
      prev = l;
      continue;
    }
    if (isCalloutLabel(l) && !level) {
      if (cur?.label && gap < lead * 1.45) cur.lines.push(l); // a second label line
      else {
        flush();
        callout = (ctx.callouts = (ctx.callouts ?? 0) + 1);
        cur = { type: 'para', lines: [l], page: page.number, label: true };
      }
      prev = l;
      continue;
    }

    if (level) {
      if (cur?.type === 'heading' && cur.level === level && gap < l.size * 1.8) {
        cur.lines.push(l);
      } else {
        flush();
        cur = { type: 'heading', level, lines: [l], page: page.number };
      }
    } else if (l.mono || (cur?.type === 'code' && gap < lead * 1.6 && /^\d{1,4}$/.test(l.text.trim()))) {
      if (cur?.type !== 'code' || gap > lead * 2.2) {
        flush();
        cur = { type: 'code', lines: [], page: page.number, left: l.x0 };
      }
      cur.left = Math.min(cur.left, l.x0);
      if (prev && gap > lead * 1.6) cur.lines.push(null); // a blank line in the listing
      cur.lines.push(l);
    } else if (small) {
      if (cur?.type !== 'note' || gap > lead * 1.6) {
        flush();
        cur = { type: 'note', lines: [l], page: page.number };
      } else cur.lines.push(l);
    } else {
      // First-line indent is relative to the line above, so a sidebar set in
      // from the margin is not a run of one-line paragraphs.
      const indented = prev && !prev.mono && Math.abs(l.y - prev.y) < lead * 1.45
        ? l.x0 > prev.x0 + body * 0.8
        : l.x0 > left + body * 0.8;
      // "… is simply 60/3 =" / "20. Computing …": a number that carries on a
      // sentence is not a list item.
      const carriesOn = cur?.type === 'para' && !cur.list && gap <= lead * 1.45 && prev && !/[.:;!?”"’)]$/.test(prev.text.trim());
      const bullet = BULLET.test(l.text) || (NUMBERED.test(l.text) && !carriesOn);
      const prevShort = prev && !prev.mono && prev.x1 < right - body * 2.5 && /[.!?:;”"’)]$/.test(prev.text);
      const startsNew =
        !cur || cur.type !== 'para' || cur.label || gap > lead * 1.45 || bullet ||
        (indented && !cur.list) || prevShort ||
        // A list item ends when a line comes back to the bullet's own position;
        // its wrapped lines hang to the right of it.
        (cur.list && !bullet && l.x0 < cur.lines[0].x0 + body * 0.3);
      if (startsNew) {
        flush();
        cur = { type: 'para', lines: [l], page: page.number, list: bullet ? (BULLET.test(l.text) ? 'bullet' : 'number') : null, gapBefore: gap };
      } else cur.lines.push(l);
    }
    prev = l;
  }
  flush();
  return { blocks, twoColumn: twoColumns(lines, page.width) };
}

/** A rough tell for two-column layout: many body lines start near the middle. */
function twoColumns(lines, width) {
  const starts = lines.filter((l) => l.x0 > width * 0.45 && l.x0 < width * 0.6).length;
  return lines.length > 20 && starts > lines.length * 0.3;
}

function blockToMarkdown(block, ctx) {
  if (block.type === 'heading') {
    const text = block.lines.map((l) => l.text.trim()).join(' ').replace(/\s+/g, ' ');
    return `${'#'.repeat(block.level)} ${escapeInline(text)}`;
  }
  if (block.type === 'code') {
    const charW = median(block.lines.filter(Boolean).flatMap((l) => l.items.filter((i) => i.str.trim()).map((i) => i.w / Math.max(1, i.str.length)))) || 5;
    const body = block.lines.map((l) => {
      if (!l) return '';
      const indent = Math.max(0, Math.round((l.x0 - block.left) / charW));
      return ' '.repeat(indent) + l.runs.map((r) => r.text).join('').replace(/\s+$/, '');
    }).join('\n');
    const fence = body.includes('```') ? '~~~' : '```';
    return `${fence}\n${body}\n${fence}`;
  }
  if (block.type === 'figure') return ctx.figureMarkdown(block);
  if (block.type === 'note') {
    return `<small>${renderRuns(joinLines(block.lines)).trim()}</small>`;
  }
  if (block.label) return `**${escapeInline(block.lines.map((l) => l.text.trim()).join(' '))}**`;
  // paragraph or list item
  let text = renderRuns(joinLines(block.lines)).replace(/\s+/g, ' ').trim();
  if (block.list === 'bullet') return `- ${text.replace(/^(\\?[•◦▪▫●○■□‣⁃∙·–—*-])\s+/, '')}`;
  if (block.list === 'number') {
    const m = text.match(/^\(?(\d{1,3}|[a-z])[.)]\s+/);
    return m && /^\d/.test(m[1]) ? `${m[1]}. ${text.slice(m[0].length)}` : escapeLineStart(text);
  }
  return escapeLineStart(text);
}

/** Glue paragraphs split by a page break back together. */
function mendPageBreaks(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === 'para' && !b.list && !b.callout && !b.label) {
      // What a page break puts between the halves — a callout or figure at the
      // top of the new page, a footnote at the foot of the old — is skipped.
      let k = out.length - 1;
      while (k >= 0 && (out[k].callout || out[k].type === 'figure' || out[k].type === 'note') && out[k].page >= b.page - 1) k--;
      const last = out[k];
      const caption = (x) => /^\W*(figure|fig\.|table|listing|example)\s+[\dA-Z]/i.test(x.lines[0].text.trim());
      // A list item carries on over the break when the next page opens in
      // lower case ("…what type of food is" / "shown in a photo.").
      if (last?.list && b.page !== last.page && /^[a-zà-ỹ]/.test(b.lines[0].text.trim()) && !last.callout) {
        last.lines.push(...b.lines);
        continue;
      }
      if (
        last?.type === 'para' && b.page !== last.page && !last.list && !last.callout && !last.label && !caption(last) && !caption(b) &&
        (!/[.!?:”"’)]$/.test(last.lines.at(-1).text.trim()) || /^[a-zà-ỹ]/.test(b.lines[0].text.trim()))
      ) {
        last.lines.push(...b.lines);
        continue;
      }
    }
    out.push(b);
  }
  return out;
}

/* ── commands ────────────────────────────────────────────────────────── */

async function open(file) {
  const data = new Uint8Array(await fs.readFile(file));
  // Glyph outlines (disableFontFace + fontExtraProperties) are what lets
  // repairGlyphs look at what a character actually draws.
  return getDocument({ data, verbosity: 0, isEvalSupported: false, useSystemFonts: false, disableFontFace: true, fontExtraProperties: true }).promise;
}

async function info(file) {
  const doc = await open(file);
  const meta = await doc.getMetadata().catch(() => ({}));
  const viewports = [];
  for (let i = 1; i <= doc.numPages; i++) viewports.push((await doc.getPage(i)).getViewport({ scale: 1 }));
  const tree = await outlineTree(doc, viewports);
  process.stdout.write(`pages   ${doc.numPages}\ntitle   ${meta.info?.Title ?? '—'}\nauthor  ${meta.info?.Author ?? '—'}\n`);
  process.stdout.write(`size    ${Math.round(viewports[0].width)} × ${Math.round(viewports[0].height)} pt\n`);

  // A sample of pages for text and fonts, so "is this scanned?" is answered.
  const sample = [...new Set([0.1, 0.3, 0.5, 0.7].map((q) => Math.max(1, Math.round(doc.numPages * q))))];
  let chars = 0;
  for (const n of sample) {
    const text = await (await doc.getPage(n)).getTextContent();
    chars += text.items.reduce((s, it) => s + (it.str?.length ?? 0), 0);
  }
  process.stdout.write(`text    ${Math.round(chars / sample.length)} chars/page on sampled pages${chars / sample.length < 100 ? '  ← probably scanned: no text layer, needs OCR' : ''}\n`);
  process.stdout.write(`figures ${canvasLib ? 'rendered with canvas' : 'NOT rendered: install the optional "canvas" package'}\n\noutline\n`);
  const show = (items) => {
    for (const it of items) {
      process.stdout.write(`${'  '.repeat(it.depth)}${it.title}  → p.${it.page ?? '?'}\n`);
      show(it.children);
    }
  };
  if (!tree.length) process.stdout.write('  (none — chapters will be split at the largest headings)\n');
  show(tree);
}

async function renderPage(doc, number, scale) {
  const page = await doc.getPage(number);
  const viewport = page.getViewport({ scale });
  const canvas = canvasLib.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

function crop(canvas, box, scale) {
  const pad = 6;
  // Wider at the sides: rotated axis labels are not text lines, so the box
  // never grew to take them in, and a single column has nothing beside it.
  const side = 14;
  const x = Math.max(0, Math.floor((box.x - side) * scale));
  const y = Math.max(0, Math.floor(Math.max(box.y - pad, box.limTop ?? 0) * scale));
  const y1 = Math.min(box.y + box.h + pad, box.limBottom ?? Infinity) * scale;
  const w = Math.min(canvas.width - x, Math.ceil((box.x + box.w + side) * scale) - x);
  const h = Math.min(canvas.height - y, Math.ceil(y1 - y));
  const out = canvasLib.createCanvas(w, h);
  out.getContext('2d').drawImage(canvas, -x, -y);
  return out;
}

async function render(file, opts) {
  if (!canvasLib) throw new Error('rendering needs the optional "canvas" package (npm install in tools/pdf2md)');
  const doc = await open(file);
  const scale = Number(opts.scale ?? 2);
  const canvas = await renderPage(doc, Number(opts.page), scale);
  const out = opts.crop
    ? crop(canvas, Object.fromEntries(['x', 'y', 'w', 'h'].map((k, i) => [k, Number(opts.crop.split(',')[i])])), scale)
    : canvas;
  await fs.writeFile(opts.out, out.toBuffer('image/png'));
  process.stdout.write(`${opts.out}  ${out.width} × ${out.height}\n`);
}

async function convert(file, opts) {
  if (!opts.out) throw new Error('convert needs -o <dir>');
  const doc = await open(file);
  const meta = await doc.getMetadata().catch(() => ({}));
  const title = opts.title ?? (meta.info?.Title?.trim() || path.basename(file, path.extname(file)));
  const [from, to] = (opts.pages ?? `1-${doc.numPages}`).split('-').map(Number);
  const figuresOn = opts.figures !== false && Boolean(canvasLib);
  const scale = Number(opts.scale ?? 2);
  const skip = new Set((opts.skip ?? '').split(',').map((s) => norm(s)).filter(Boolean));
  const outDir = path.resolve(opts.out);
  const report = { file: path.basename(file), pages: {}, figures: {}, notes: [] };
  // Two lists: pages where the rules were unsure (check these), and where
  // figures were cut out (glance at these).
  const flag = (n, msg) => (report.pages[n] ??= []).push(msg);
  const figureNote = (n, msg) => (report.figures[n] ??= []).push(msg);

  // 0. Symbol fonts whose characters do not say what they draw.
  const glyphs = await repairGlyphs(doc, from, to);
  if (glyphs.notes.length) {
    const tally = new Map();
    for (const n of glyphs.notes) tally.set(n, (tally.get(n) ?? 0) + 1);
    report.notes.push(`glyphs repaired from their shapes (font: code → symbol, × font subsets): ${[...tally].map(([n, k]) => (k > 1 ? `${n} ×${k}` : n)).join('; ')}`);
  }

  // 1. Read every page.
  const pages = [];
  const viewports = [];
  const fonts = new Map();
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    viewports.push(viewport);
    if (n < from || n > to) continue;
    const opList = await page.getOperatorList(); // also loads the fonts fontInfo asks about
    const text = await page.getTextContent();
    const lines = linesOf(page, text, viewport, new Map([...fonts]), glyphs.map, glyphs.symbols);
    const { images, vector, paths } = drawings(opList, viewport);
    pages.push({ number: n, width: viewport.width, height: viewport.height, lines, images, vector, paths, figures: [] });
    page.cleanup();
    if (process.stderr.isTTY) process.stderr.write(`\r  reading ${n}/${doc.numPages}`);
  }
  if (process.stderr.isTTY) process.stderr.write('\r\x1b[2K');

  const textChars = pages.reduce((s, p) => s + p.lines.reduce((t, l) => t + l.text.length, 0), 0);
  if (textChars / Math.max(1, pages.length) < 100) {
    throw new Error('this PDF has almost no text layer — it is a scan. pdf2md does not do OCR.');
  }

  // 2. What is body text, what is a heading.
  const body = bodySize(pages);
  const isMargin = marginFilter(pages);
  const tree = await outlineTree(doc, viewports);
  // Decide what each outline entry becomes. A *container* (a Part, or an
  // entry whose children are chapters) is a folder with a README; a *chapter*
  // is one file; everything beneath a chapter is a heading inside it. With
  // `--level N` the cut is simply at depth N instead.
  const mode = opts.level ?? 'auto';
  // "Chapter 3 …", "3 Title", "A. Title" (lettered appendices); not "3.1 Title".
  const chapterish = (t) => /^(chapter|appendix)\b/i.test(t) || (/^\d+\s+\D/.test(t) && !/^\d+\.\d/.test(t)) || /^[A-Z][.:]\s+\S/.test(t);
  const isContainer = (it) => it.children.some((c) => c.page) && (mode === 'auto'
    ? /^(part|book|volume)\b/i.test(it.title) || it.children.filter((c) => chapterish(c.title)).length >= 2
    : it.depth < Number(mode));
  // Chapter titles become each file's H1. Entries beneath a chapter are the
  // most reliable heading signal there is — the publisher's own statement of
  // the structure — so a line that matches one is a heading at that depth,
  // whatever its font says.
  const titleKeys = new Set();
  const deeper = new Map(); // norm(title) → depth below its chapter
  const starts = [];
  const assign = (items, parents, rel) => {
    for (const it of items) {
      const k = norm(it.title);
      if (rel) {
        if (k.length > 3 && !deeper.has(k)) deeper.set(k, rel);
        assign(it.children, parents, rel + 1);
      } else if (skip.has(k)) {
        if (it.page) starts.push({ ...it, skip: true, parents });
      } else if (it.page) {
        const node = { ...it, parents, hasChildren: isContainer(it) };
        starts.push(node);
        titleKeys.add(k);
        if (node.hasChildren) assign(it.children, [...parents, node], 0);
        else assign(it.children, parents, 1);
      }
    }
  };
  assign(tree, [], 0);
  starts.sort((a, b) => a.page - b.page || a.y - b.y);
  const outlineLevel = (text) => {
    const k = norm(text);
    if (k.length < 4) return 0;
    if (deeper.has(k)) return deeper.get(k);
    // The first line of a heading that wraps.
    if (k.length >= 10) for (const [key, d] of deeper) if (key.startsWith(k)) return d;
    return 0;
  };

  // The body's face, so a heading set in another one can be told apart.
  const familyWeight = new Map();
  for (const p of pages) for (const l of p.lines) {
    if (!l.mono && Math.abs(l.size - body) < 0.6) familyWeight.set(l.family, (familyWeight.get(l.family) ?? 0) + l.text.length);
  }
  const bodyFamily = [...familyWeight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Heading sizes: noticeably bigger than body, short, and not so common that
  // they are just a second body face.
  const sizeStats = new Map();
  for (const p of pages) {
    for (const l of p.lines) {
      if (isMargin(p, l) || l.mono || l.leaders || l.size < body * 1.12 || l.text.length > 140) continue;
      const s = round(l.size);
      const st = sizeStats.get(s) ?? { n: 0, chars: 0, titles: 0, words: 0 };
      st.n += 1;
      st.chars += l.text.length;
      if (/[a-z]{2,}/i.test(l.text)) st.words += 1;
      const k = norm(l.text);
      if ((k.length > 3 && [...titleKeys].some((tk) => tk.includes(k))) || /^(chapter|part|appendix)\s+\w+$/i.test(l.text.trim()) || /^\d{1,2}$/.test(l.text.trim())) st.titles += 1;
      sizeStats.set(s, st);
    }
  }
  const totalChars = pages.reduce((s, p) => s + p.lines.reduce((t, l) => t + l.text.length, 0), 0);
  report.notes.push(`candidate heading sizes: ${[...sizeStats].sort((a, b) => b[0] - a[0]).map(([sz, st]) => `${sz}pt×${st.n}${st.titles ? ` (${st.titles} titles)` : ''}`).join(', ')}`);
  // Sizes within half a point are one level: rounding splits 16.4 and 16.6.
  for (const sz of [...sizeStats.keys()].sort((a, b) => a - b)) {
    const up = sizeStats.get(sz + 0.5);
    if (up && sizeStats.has(sz)) {
      const st = sizeStats.get(sz);
      const [keep, drop] = up.n >= st.n ? [sz + 0.5, sz] : [sz, sz + 0.5];
      const a = sizeStats.get(keep);
      const b = sizeStats.get(drop);
      sizeStats.set(keep, { n: a.n + b.n, chars: a.chars + b.chars, titles: a.titles + b.titles, words: a.words + b.words, alias: [...(a.alias ?? []), drop, ...(b.alias ?? [])] });
      sizeStats.delete(drop);
    }
  }
  const headingSizes = [...sizeStats]
    .filter(([, st]) => st.chars < totalChars * 0.05)
    // A size that only ever sets a lone number or letter is decoration.
    .filter(([, st]) => st.words >= Math.max(1, st.n * 0.5))
    // In a long document, a size used once or twice is a title page or a
    // pull quote, not a level of structure.
    .filter(([, st]) => pages.length < 40 || st.n >= 3)
    // Sizes used only for chapter titles become the file's H1, not a level.
    .filter(([, st]) => !(st.titles > 0 && st.titles >= st.n * 0.6))
    .map(([s]) => s)
    .sort((a, b) => b - a)
    .slice(0, 4);
  // When the outline already supplies levels, sizes only fill in beneath them.
  const maxDeeper = Math.max(0, ...deeper.values());
  const sizeOffset = maxDeeper;
  const aliasOf = new Map();
  for (const sz of headingSizes) for (const a of sizeStats.get(sz)?.alias ?? []) aliasOf.set(a, sz);
  const levelOf = (l, face = bodyFamily) => {
    if (l.mono || l.leaders) return 0;
    const fromOutline = l.text.length < 160 && l.size >= body - 0.6 && !/[.,;]$/.test(l.text.trim()) && !BULLET.test(l.text) && !NUMBERED.test(l.text) ? outlineLevel(l.text) : 0;
    if (fromOutline) return Math.min(6, fromOutline + 1);
    const r = round(l.size);
    const i = headingSizes.indexOf(aliasOf.get(r) ?? r);
    if (i >= 0) return Math.min(6, i + 2 + sizeOffset);
    // A short line on its own at about body size, set bold or in a different
    // face from the body (a sans heading over serif text): the smallest heading.
    const t = l.text.trim();
    const standout = !l.mixed && (l.bold || (face && l.family !== face));
    if (standout && t.length < 80 && l.size >= body - 0.6 && l.size < body * 1.12 && !mathy(t) && /[a-z]{3,}/i.test(t) &&
        /[a-z]/i.test(t) && !/[.,;:]$/.test(t) && !/^(figure|fig\.|table|listing)\s/i.test(t)) {
      return { weak: Math.min(6, 2 + Math.max(sizeOffset, Math.min(headingSizes.length, 2))) };
    }
    return 0;
  };
  report.notes.push(`body text ${body}pt; heading sizes ${headingSizes.map((s, i) => `${s}pt → ${'#'.repeat(i + 2)}`).join(', ') || 'none found'}`);

  // 3. Figures: raster images and dense vector clusters, rendered to PNG.
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, 'images'), { recursive: true });
  await fs.mkdir(path.join(outDir, '.pdf2md'), { recursive: true });
  let figureCount = 0;
  let tableCount = 0;
  for (const p of pages) {
    const pageArea = p.width * p.height;
    const scanned = p.images.some((b) => area(b) > pageArea * 0.8);
    if (scanned) {
      flag(p.number, 'full-page image — a scanned page, or a page drawn as one picture; its text may be missing');
    }
    const boxes = [...p.images.filter((b) => area(b) <= pageArea * 0.8), ...p.vector, ...captionFigures(p, body, isMargin), ...regionFigures(p, body, isMargin)]
      .map((b) => ({ x: Math.max(0, b.x), y: Math.max(0, b.y), w: Math.min(b.w, p.width - b.x), h: Math.min(b.h, p.height - b.y), vector: Boolean(b.paths || b.caption || b.region), caption: Boolean(b.caption || b.region), captioned: Boolean(b.caption), table: Boolean(b.table), equation: Boolean(b.equation), image: !b.paths && !b.caption && !b.region }));
    // Overlapping boxes are one figure.
    const merged = [];
    for (const b of boxes) {
      const hit = merged.find((m) => near(m, b, 4));
      if (hit) {
        Object.assign(hit, union(hit, b), {
          vector: hit.vector && b.vector, caption: hit.caption || b.caption,
          table: hit.table || b.table, equation: hit.equation || b.equation, image: hit.image || b.image, captioned: hit.captioned || b.captioned,
        });
      }
      else merged.push({ ...b });
    }
    // A cluster that is mostly text is a table or a boxed sidebar, not a
    // figure. If a raster image got merged into one, keep just the image.
    const textIn = (f, only = () => true) => p.lines.filter((l) => only(l) && inside(f, l.x0 + 1, l.y - 1)).reduce((s, l) => s + l.text.length, 0);
    p.figures = [];
    for (const f of merged) {
      // A captioned figure's text is its labels.
      // A captioned listing in a box is still code: keep it as text.
      if ((f.caption && textIn(f, (l) => l.mono) <= 200) || textIn(f) <= 400) {
        p.figures.push(f);
        continue;
      }
      // A ruled region full of text: a table, if it rebuilds as one.
      const rows = tableFrom(p, f);
      if (rows) {
        p.figures.push(Object.assign(f, { tableRows: rows }));
        continue;
      }
      // A framed code listing is meant to be text, and a framed box of prose
      // is a sidebar (written as a callout); anything else is a table that
      // would not rebuild.
      const { sentence } = proseOf(p, body);
      if (textIn(f, (l) => sentence(l)) >= textIn(f) * 0.5) (p.asides ??= []).push(f);
      else if (textIn(f, (l) => l.mono) < textIn(f) * 0.6) {
        flag(p.number, `ruled region at ${[f.x, f.y, f.w, f.h].map(Math.round).join(',')} kept as text — probably a table; check it`);
      }
      for (const img of boxes.filter((b) => !b.vector && near(f, b, 0) && textIn(b) <= 400)) p.figures.push(img);
    }
    // A drawing's labels — small text just outside its paths — are part of it.
    for (const f of p.figures) {
      if (!f.vector) continue;
      for (let grew = true; grew; ) {
        grew = false;
        for (const l of p.lines) {
          // Small text, or a row of labels spread across the drawing ("VPN … offset").
          const label = l.size < body * 0.9 || (l.gaps >= 1 && l.text.length < 60);
          if (!label || l.mono || isMargin(p, l) || CAPTION.test(l.text.trim())) continue;
          if (l.x1 < f.x || l.x0 > f.x + f.w) continue;
          const top = l.y - l.size;
          const bot = l.y + l.size * 0.3;
          if (top >= f.y - 0.5 && bot <= f.y + f.h + 0.5) continue;
          if (bot < f.y - 12 || top > f.y + f.h + 12) continue;
          Object.assign(f, union(f, { x: l.x0, y: top, w: l.x1 - l.x0, h: bot - top }));
          grew = true;
        }
      }
    }
    for (const f of p.figures) {
      trimFigure(f, p, body, isMargin);
      // A table of text and rules becomes a real table; anything else, or one
      // that will not rebuild, stays a picture.
      if (f.table && !f.equation && !f.image && !f.tableRows) f.tableRows = tableFrom(p, f) ?? undefined;
      if (f.tableRows) {
        tableCount += 1;
        continue;
      }
      // Fraction bars in a paragraph of inline math look like a drawing, and
      // its spaced-out lines like a table; a picture that would hold two or
      // more sentences of body text is that paragraph, and stays text.
      if (!f.captioned && !f.image) {
        const { sentence } = proseOf(p, body);
        const held = p.lines.filter((l) => inside(f, l.x0 + 1, l.y - l.size * 0.3, 2) && Math.abs((l.textSize ?? l.size) - body) < 0.6 && sentence(l));
        if (held.length >= 2) {
          f.dropped = true;
          continue;
        }
      }
      figureCount += 1;
      f.file = `images/p${String(p.number).padStart(4, '0')}-${figureCount}`; // extension chosen on encode
      figureNote(p.number, `${path.basename(f.file)} (${f.vector ? 'vector drawing' : 'image'}) at ${[f.x, f.y, f.w, f.h].map(Math.round).join(',')}`);
    }
    p.figures = p.figures.filter((f) => !f.dropped);
  }
  if (figuresOn) {
    for (const p of pages.filter((pg) => pg.figures.some((f) => !f.tableRows))) {
      const canvas = await renderPage(doc, p.number, scale);
      for (const f of p.figures.filter((x) => !x.tableRows)) {
        // PNG keeps line art and text crisp; a photograph is several times
        // smaller as JPEG, and on a phone saving books offline that matters.
        const c = crop(canvas, f, scale);
        const png = c.toBuffer('image/png', { compressionLevel: 9 });
        const jpg = c.toBuffer('image/jpeg', { quality: 0.85 });
        const useJpg = jpg.length * 1.6 < png.length;
        f.file += useJpg ? '.jpg' : '.png';
        await fs.writeFile(path.join(outDir, f.file), useJpg ? jpg : png);
      }
      if (process.stderr.isTTY) process.stderr.write(`\r  rendering figures, page ${p.number}`);
    }
    if (process.stderr.isTTY) process.stderr.write('\r\x1b[2K');
  } else if (figureCount) {
    report.notes.push(`${figureCount} figures found but not rendered${canvasLib ? ' (--no-figures)' : ' (no canvas package)'}`);
  }

  // 4. Blocks, page by page.
  const ctx = {
    body,
    levelOf,
    isMargin,
    figureMarkdown: (b) => {
      const f = b.figure;
      if (f.tableRows) return tableMarkdown(f.tableRows);
      if (!figuresOn) return `<!-- figure on page ${b.page}: not rendered -->`;
      // Look for a caption: the block right after, starting "Figure" / "Fig." / "Table".
      return `![Figure from page ${b.page}](${ctx.prefix}${f.file})`;
    },
    prefix: '',
  };
  const allBlocks = [];
  for (const p of pages) {
    const { blocks, twoColumn } = blocksOf(p, ctx);
    if (twoColumn) flag(p.number, 'looks like two columns — reading order may interleave them');
    const tables = p.lines.filter((l) => l.gaps >= 2 && !l.mono && !p.figures.some((f) => inside(f, l.x0 + 1, l.y - l.size * 0.3, 2))).length;
    if (tables >= 3) flag(p.number, `${tables} lines with wide internal gaps — possibly a table flattened into text`);
    for (const b of blocks) {
      b.y = b.type === 'figure' ? b.figure.y : b.lines?.find(Boolean)?.y ?? 0;
      allBlocks.push(b);
    }
  }

  // 5. Split into chapters along the outline.
  const sections = [];
  if (!starts.length) {
    // No outline: split at the biggest headings in the text.
    report.notes.push('no outline — split at the largest headings');
    let cur = { title, blocks: [], depth: 1, parents: [] };
    for (const b of allBlocks) {
      if (b.type === 'heading' && b.level === 2) {
        if (cur.blocks.length) sections.push(cur);
        cur = { title: b.lines.map((l) => l.text.trim()).join(' '), blocks: [], depth: 1, parents: [] };
        continue;
      }
      cur.blocks.push(b);
    }
    sections.push(cur);
  } else {
    const front = { title: 'Front matter', blocks: [], depth: 1, parents: [], front: true };
    let si = 0;
    let cur = front;
    for (const b of allBlocks) {
      while (si < starts.length && (b.page > starts[si].page || (b.page === starts[si].page && b.y >= starts[si].y - 2))) {
        cur = { ...starts[si], blocks: [] };
        sections.push(cur);
        si += 1;
      }
      cur.blocks.push(b);
    }
    if (front.blocks.length) report.notes.push(`${new Set(front.blocks.map((b) => b.page)).size} pages before the first outline entry dropped (cover, title page, contents)`);
  }

  // 6. Write files: a directory per entry that has children, a file otherwise.
  const written = [];
  const used = new Map();
  const nameFor = (dir, n, t) => {
    const base = `${String(n).padStart(2, '0')}-${slugify(t)}`;
    const k = `${dir}/${base}`;
    used.set(k, (used.get(k) ?? 0) + 1);
    return used.get(k) > 1 ? `${base}-${used.get(k)}` : base;
  };
  const counters = new Map();
  const dirOf = new Map();
  const shown = { figures: 0, tables: 0 }; // in the book, not on skipped pages
  for (const s of sections.filter((x) => !x.skip)) {
    const parentDir = s.parents?.length ? dirOf.get(s.parents.at(-1)) : outDir;
    if (!parentDir) continue;
    const n = (counters.get(parentDir) ?? 0) + 1;
    counters.set(parentDir, n);
    const name = nameFor(parentDir, n, s.title);
    let filePath;
    if (s.hasChildren) {
      const dir = path.join(parentDir, name);
      dirOf.set(starts.find((st) => st.title === s.title && st.page === s.page), dir);
      await fs.mkdir(dir, { recursive: true });
      filePath = path.join(dir, 'README.md');
    } else filePath = path.join(parentDir, `${name}.md`);

    ctx.prefix = path.relative(path.dirname(filePath), outDir).split(path.sep).filter(Boolean).map(() => '../').join('');
    const blocks = mendPageBreaks(s.blocks);
    // Drop the chapter's own title as printed on its opening page: the file's
    // H1 already says it, and "Chapter 3" on a line of its own adds nothing.
    const key = norm(s.title);
    // A chapter without sub-entries in the outline still starts its sections
    // at ##, whatever depth the rest of the book's outline pushed sizes to.
    const top = Math.min(...blocks.filter((b) => b.type === 'heading').map((b) => b.level));
    if (Number.isFinite(top) && top > 2) for (const b of blocks) if (b.type === 'heading') b.level -= top - 2;
    const body = [];
    const notes = [];
    blocks.forEach((b, i) => {
      if (b.type === 'figure') shown[b.figure.tableRows ? 'tables' : 'figures'] += 1;
      if (i < 6 && (b.type === 'heading' || b.type === 'para')) {
        const t = norm(b.lines.map((l) => l.text).join(' '));
        if (t && (key.includes(t) || t.includes(key) || /^(chapter|part|appendix)[a-z]*\d*$/.test(t) || /^\d{1,2}$/.test(t))) return;
      }
      if (b.type === 'note') notes.push(b);
      else if (b.callout) {
        const quoted = blockToMarkdown(b, ctx).split('\n').map((x) => (x ? `> ${x}` : '>')).join('\n');
        const before = blocks[i - 1];
        if (before?.callout === b.callout && body.length) body[body.length - 1] += `${b.list && before.list === b.list ? '\n' : '\n>\n'}${quoted}`;
        else body.push(quoted);
      } else if (b.list && blocks[i - 1]?.list === b.list && body.length) {
        // Consecutive items are one list, not a list per item.
        body[body.length - 1] += `\n${blockToMarkdown(b, ctx)}`;
      } else body.push(blockToMarkdown(b, ctx));
    });
    if (notes.length) {
      body.push('---', '**Notes**', ...notes.map((b) => `<small>p. ${b.page}</small> ${blockToMarkdown(b, ctx).replace(/^<small>|<\/small>$/g, '')}`));
    }
    const md = `# ${escapeInline(s.title)}\n\n${body.join('\n\n')}\n`;
    await fs.writeFile(filePath, md);
    written.push({ file: path.relative(outDir, filePath), title: s.title, pages: [s.blocks[0]?.page, s.blocks.at(-1)?.page], depth: (s.parents?.length ?? 0) });
  }

  // 7. The book's own index page.
  const fm = [
    '---',
    `collection: ${JSON.stringify(opts.collection ?? 'PDFs')}`,
    ...(opts.language ? [`language: ${opts.language}`] : []),
    '---',
  ].join('\n');
  const contents = written
    .map((w) => `${'  '.repeat(w.depth)}- [${escapeInline(w.title)}](./${w.file.split(path.sep).join('/')})`)
    .join('\n');
  await fs.writeFile(
    path.join(outDir, 'README.md'),
    `${fm}\n\n# ${escapeInline(title)}\n\n> Converted from \`${path.basename(file)}\` (${doc.numPages} pages) by pdf2md. ` +
      'Layout was inferred from the PDF, so check figures and tables against the original.\n\n' +
      `## Contents\n\n${contents}\n`,
  );

  // 8. The report: what to check.
  const lines = [
    `# pdf2md report — ${report.file}`,
    '',
    ...report.notes.map((n) => `- ${n}`),
    `- ${written.length} files, ${shown.figures} figures, ${shown.tables} tables rebuilt`,
    '',
    '## Files',
    '',
    ...written.map((w) => `- \`${w.file}\` — pages ${w.pages[0]}–${w.pages[1]}`),
    '',
    '## Pages to check',
    '',
    ...(Object.keys(report.pages).length
      ? Object.entries(report.pages).map(([n, msgs]) => `- p.${n}: ${msgs.join('; ')}`)
      : ['(none)']),
    '',
    '## Figures cut out',
    '',
    ...Object.entries(report.figures).map(([n, msgs]) => `- p.${n}: ${msgs.join('; ')}`),
  ];
  await fs.writeFile(path.join(outDir, '.pdf2md', 'report.md'), `${lines.join('\n')}\n`);
  await fs.writeFile(path.join(outDir, '.pdf2md', 'source.json'), `${JSON.stringify({ file: path.basename(file), pages: doc.numPages, title, body, headingSizes }, null, 2)}\n`);

  process.stdout.write(
    `\n  ${outDir}\n  ${written.length} files · ${shown.figures} figures · ${shown.tables} tables · body ${body}pt · ` +
      `${Object.keys(report.pages).length} pages flagged in .pdf2md/report.md\n\n`,
  );
}

/* ── main ────────────────────────────────────────────────────────────── */

// `pdf2md info x.pdf | head` closes the pipe early; that is not an error.
process.stdout.on('error', (error) => {
  if (error.code === 'EPIPE') process.exit(0);
  throw error;
});

const opts = parseArgs(process.argv.slice(2));
try {
  if (!opts.file || !['info', 'convert', 'render'].includes(opts.command)) {
    process.stdout.write(USAGE);
    process.exit(opts.command ? 1 : 0);
  }
  if (opts.command === 'info') await info(opts.file);
  else if (opts.command === 'render') await render(opts.file, opts);
  else await convert(opts.file, opts);
} catch (error) {
  process.stderr.write(`\npdf2md: ${error.message}\n`);
  process.exit(1);
}
