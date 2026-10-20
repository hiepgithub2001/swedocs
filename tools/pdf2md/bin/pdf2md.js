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
  const pageArea = viewport.width * viewport.height;
  const vector = clusters
    .filter((c) => c.n >= 8 && area(c.box) >= pageArea * 0.03 && c.box.w > 40 && c.box.h > 30)
    .map((c) => ({ ...c.box, paths: c.n }));

  return {
    images: images.filter((b) => b.w >= 24 && b.h >= 24 && area(b) >= pageArea * 0.004),
    vector,
  };
}

/* ── text → lines ────────────────────────────────────────────────────── */

/**
 * Group a page's text items into lines, each a list of styled runs, in reading
 * order. Single-column only: a two-column page comes out with its columns
 * interleaved, which the report flags.
 */
function linesOf(page, text, viewport, fonts) {
  const items = [];
  for (const it of text.items) {
    if (!it.str) continue;
    const str = clean(it.str);
    if (!str.trim() && !it.hasEOL) continue;
    const [a, b, , , e, f] = it.transform;
    const size = Math.hypot(it.transform[2], it.transform[3]) || Math.hypot(a, b) || it.height;
    if (Math.abs(b) > Math.abs(a) * 0.2) continue; // rotated text: margin notes, spine labels
    const [x, y] = viewport.convertToViewportPoint(e, f);
    items.push({ str, x, y, w: it.width, size, font: fontInfo(page, text.styles, it.fontName, fonts) });
  }

  items.sort((p, q) => p.y - q.y || p.x - q.x);
  const lines = [];
  for (const it of items) {
    // Same line when the baselines are close — close enough to take a
    // superscript, not so loose as to swallow the line below.
    // Same line when the baselines are close. The tolerance comes from the
    // smaller of the two sizes, so a two-inch decorative chapter number does not
    // swallow the title beside it; a run between half and most of the line's
    // size (a superscript or subscript) gets the larger allowance.
    const line = lines.find((l) => {
      const lo = Math.min(l.size, it.size);
      const hi = Math.max(l.size, it.size);
      // The larger allowance is for a super- or subscript, which sits right
      // against the text it marks.
      const touching = l.items.some((o) => Math.abs(it.x - (o.x + o.w)) < hi * 0.6 || Math.abs(o.x - (it.x + it.w)) < hi * 0.6);
      const tol = lo >= hi * 0.5 && touching ? hi * 0.45 : lo * 0.45;
      return Math.abs(l.y - it.y) < tol;
    });
    if (line) {
      line.items.push(it);
      if (it.size > line.size) {
        line.size = it.size;
        line.y = it.y;
      }
      line.x0 = Math.min(line.x0, it.x);
    } else lines.push({ y: it.y, size: it.size, x0: it.x, items: [it] });
  }

  for (const line of lines) {
    line.items.sort((p, q) => p.x - q.x);
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
      const n = it.str.replace(/\s/g, '').length;
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
    line.mixed = families.size > 1;
    line.leaders = line.items.some((i) => /\.{4,}|…{2,}|(\. ){4,}/.test(i.str)) && /\d+\s*$/.test(line.text);
    line.gaps = line.items.filter((it, i) => i && it.x - (line.items[i - 1].x + line.items[i - 1].w) > it.size * 2).length;
  }
  return lines.filter((l) => l.text.trim());
}

/* ── document analysis ───────────────────────────────────────────────── */

/** Page numbers and running heads: short lines in the margins that repeat. */
function marginFilter(pages) {
  const key = (t) => t.trim().toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ');
  const counts = new Map();
  for (const p of pages) {
    const seen = new Set();
    for (const l of p.lines) {
      if (l.y > p.height * 0.1 && l.y < p.height * 0.9) continue;
      const k = key(l.text);
      if (seen.has(k)) continue;
      seen.add(k);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const threshold = Math.max(3, pages.length * 0.04);
  return (p, l) => {
    if (l.y > p.height * 0.1 && l.y < p.height * 0.9) return false;
    const t = l.text.trim();
    if (/^[\divxlc]{1,6}$/i.test(t)) return true;
    // "94 CHAPTER 5 Memory…" / "5.1 Importance of … 95": a running head
    // changes with the section, but it always carries the page number.
    // "94 CHAPTER 5 Memory…" / "Defining Software Architecture | 7", top or bottom.
    if (t.length < 110 && (/^\d{1,4}\s+\S/.test(t) || /\S\s+\d{1,4}$/.test(t))) return true;
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
  const flush = () => {
    if (cur) blocks.push(cur);
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
  const levelFor = (l) => {
    const lv = levelOf(l);
    if (typeof lv === 'number') return lv;
    const next = nextOf.get(l);
    if (next && next.y - l.y < lead * 1.3 && next.family === l.family && next.bold === l.bold && !levelOf(next)) return 0;
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

    if (level) {
      if (cur?.type === 'heading' && cur.level === level && gap < l.size * 1.8) {
        cur.lines.push(l);
      } else {
        flush();
        cur = { type: 'heading', level, lines: [l], page: page.number };
      }
    } else if (l.mono) {
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
      const bullet = BULLET.test(l.text) || NUMBERED.test(l.text);
      const prevShort = prev && !prev.mono && prev.x1 < right - body * 2.5 && /[.!?:;”"’)]$/.test(prev.text);
      const startsNew =
        !cur || cur.type !== 'para' || gap > lead * 1.45 || bullet ||
        (indented && !cur.list) || prevShort ||
        (cur.list && !indented && !bullet);
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
    const last = out.at(-1);
    if (
      b.type === 'para' && last?.type === 'para' && b.page !== last.page && !b.list && !last.list &&
      !/[.!?:”"’)]$/.test(last.lines.at(-1).text.trim())
    ) {
      last.lines.push(...b.lines);
      continue;
    }
    out.push(b);
  }
  return out;
}

/* ── commands ────────────────────────────────────────────────────────── */

async function open(file) {
  const data = new Uint8Array(await fs.readFile(file));
  return getDocument({ data, verbosity: 0, isEvalSupported: false, useSystemFonts: false }).promise;
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
  const x = Math.max(0, Math.floor((box.x - pad) * scale));
  const y = Math.max(0, Math.floor((box.y - pad) * scale));
  const w = Math.min(canvas.width - x, Math.ceil((box.w + pad * 2) * scale));
  const h = Math.min(canvas.height - y, Math.ceil((box.h + pad * 2) * scale));
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
    const lines = linesOf(page, text, viewport, new Map([...fonts]));
    const { images, vector } = drawings(opList, viewport);
    pages.push({ number: n, width: viewport.width, height: viewport.height, lines, images, vector, figures: [] });
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
  const chapterish = (t) => /^(chapter|appendix)\b/i.test(t) || (/^\d+\s+\D/.test(t) && !/^\d+\.\d/.test(t));
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
  const levelOf = (l) => {
    if (l.mono || l.leaders) return 0;
    const fromOutline = l.text.length < 160 && l.size >= body - 0.6 && !/[.,;]$/.test(l.text.trim()) && !BULLET.test(l.text) && !NUMBERED.test(l.text) ? outlineLevel(l.text) : 0;
    if (fromOutline) return Math.min(6, fromOutline + 1);
    const r = round(l.size);
    const i = headingSizes.indexOf(aliasOf.get(r) ?? r);
    if (i >= 0) return Math.min(6, i + 2 + sizeOffset);
    // A short line on its own at about body size, set bold or in a different
    // face from the body (a sans heading over serif text): the smallest heading.
    const t = l.text.trim();
    const standout = !l.mixed && (l.bold || (bodyFamily && l.family !== bodyFamily));
    if (standout && t.length < 80 && l.size >= body - 0.6 && l.size < body * 1.12 &&
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
  for (const p of pages) {
    const pageArea = p.width * p.height;
    const scanned = p.images.some((b) => area(b) > pageArea * 0.8);
    if (scanned) {
      flag(p.number, 'full-page image — a scanned page, or a page drawn as one picture; its text may be missing');
    }
    const boxes = [...p.images.filter((b) => area(b) <= pageArea * 0.8), ...p.vector]
      .map((b) => ({ x: Math.max(0, b.x), y: Math.max(0, b.y), w: Math.min(b.w, p.width - b.x), h: Math.min(b.h, p.height - b.y), vector: Boolean(b.paths) }));
    // Overlapping boxes are one figure.
    const merged = [];
    for (const b of boxes) {
      const hit = merged.find((m) => near(m, b, 4));
      if (hit) Object.assign(hit, union(hit, b), { vector: hit.vector && b.vector });
      else merged.push({ ...b });
    }
    // A cluster that is mostly text is a table or a boxed sidebar, not a
    // figure. If a raster image got merged into one, keep just the image.
    const textIn = (f) => p.lines.filter((l) => inside(f, l.x0 + 1, l.y - 1)).reduce((s, l) => s + l.text.length, 0);
    p.figures = [];
    for (const f of merged) {
      if (textIn(f) <= 400) {
        p.figures.push(f);
        continue;
      }
      flag(p.number, `ruled region at ${[f.x, f.y, f.w, f.h].map(Math.round).join(',')} kept as text — probably a table; check it`);
      for (const img of boxes.filter((b) => !b.vector && near(f, b, 0) && textIn(b) <= 400)) p.figures.push(img);
    }
    for (const f of p.figures) {
      figureCount += 1;
      f.file = `images/p${String(p.number).padStart(4, '0')}-${figureCount}`; // extension chosen on encode
      figureNote(p.number, `${path.basename(f.file)} (${f.vector ? 'vector drawing' : 'image'}) at ${[f.x, f.y, f.w, f.h].map(Math.round).join(',')}`);
    }
  }
  if (figuresOn) {
    for (const p of pages.filter((pg) => pg.figures.length)) {
      const canvas = await renderPage(doc, p.number, scale);
      for (const f of p.figures) {
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
    const tables = p.lines.filter((l) => l.gaps >= 2 && !l.mono).length;
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
    const body = [];
    const notes = [];
    blocks.forEach((b, i) => {
      if (i < 6 && (b.type === 'heading' || b.type === 'para')) {
        const t = norm(b.lines.map((l) => l.text).join(' '));
        if (t && (key.includes(t) || t.includes(key) || /^(chapter|part|appendix)[a-z]*\d*$/.test(t) || /^\d{1,2}$/.test(t))) return;
      }
      if (b.type === 'note') notes.push(b);
      else if (b.list && blocks[i - 1]?.list === b.list && body.length) {
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
    `- ${written.length} files, ${figureCount} figures`,
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
    `\n  ${outDir}\n  ${written.length} files · ${figureCount} figures · body ${body}pt · ` +
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
