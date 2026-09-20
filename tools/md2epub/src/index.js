import crypto from 'node:crypto';
import path from 'node:path';

import { scan } from './scan.js';
import { createRenderer } from './render.js';
import { collectLanguages } from './transforms/highlight.js';
import { buildPackage, writeEpub, writeExploded } from './epub/write.js';
import { buildManifest } from './epub/manifest.js';

/**
 * A stable identifier for the same corpus across builds.
 *
 * Randomising this per build would make every CI run look like a brand-new
 * book to a reader's library, duplicating the entry and losing reading
 * position. Derived from the content instead, so it only changes when the book
 * genuinely does.
 */
function deriveIdentifier(title, chapters) {
  const hash = crypto
    .createHash('sha256')
    .update(title)
    .update(chapters.map((c) => c.relPath).join('\n'))
    .digest('hex');
  const uuid = [hash.slice(0, 8), hash.slice(8, 12), `5${hash.slice(13, 16)}`, `a${hash.slice(17, 20)}`, hash.slice(20, 32)];
  return `urn:uuid:${uuid.join('-')}`;
}

/**
 * The only non-deterministic input to a build.
 *
 * Everything else — ordering, ids, slugs, the identifier — is derived from
 * content, so two builds of unchanged sources differ in exactly one field.
 * Honouring SOURCE_DATE_EPOCH (the reproducible-builds convention) makes the
 * output byte-for-byte identical, which is what lets CI skip redeploying a
 * book that did not actually change.
 */
function resolveModified(explicit) {
  const iso = (d) => new Date(d).toISOString().replace(/\.\d+Z$/, 'Z');
  if (explicit) return iso(explicit);
  if (process.env.SOURCE_DATE_EPOCH) return iso(Number(process.env.SOURCE_DATE_EPOCH) * 1000);
  return iso(Date.now());
}

async function buildHighlighter(chapters, themes) {
  const { createHighlighter, bundledLanguages } = await import('shiki');
  const langs = [...collectLanguages(chapters)].filter((l) => l in bundledLanguages);
  return {
    highlighter: await createHighlighter({ themes: Object.values(themes), langs }),
    langs,
  };
}

export async function convert({
  src,
  out,
  title,
  author = 'Unknown',
  language = 'en',
  description,
  subjects,
  ignore = [],
  mermaid = null,
  themes = { light: 'github-light', dark: 'github-dark' },
  highlight = true,
  modified = null,
  externals = new Map(),
  exploded = null,
  book = null,
  baseUrl = null,
  sourceUrl = null,
  sourceRoot = null,
  onProgress = () => {},
} = {}) {
  const started = Date.now();
  const { chapters: sources } = await scan(src, { ignore });

  const bookTitle = title ?? path.basename(path.resolve(src));
  const warnings = [];

  const { highlighter, langs } = highlight
    ? await buildHighlighter(sources, themes)
    : { highlighter: null, langs: [] };

  const { render, assets } = createRenderer({
    chapters: sources,
    highlighter,
    themes,
    mermaid,
    lang: language,
    warnings,
    externals,
    baseUrl,
    sourceUrl,
    sourceRoot,
  });

  const chapters = [];
  for (const source of sources) {
    chapters.push(await render(source));
    onProgress({ done: chapters.length, total: sources.length, title: source.title });
  }

  const meta = {
    title: bookTitle,
    author,
    language,
    description,
    subjects,
    identifier: deriveIdentifier(bookTitle, sources),
    modified: resolveModified(modified),
  };

  const files = await buildPackage({ chapters, assets, meta });
  const { bytes } = await writeEpub({ meta, outPath: out, files });

  // The web reader loads the same files, unzipped, next to a manifest it can
  // parse without a zip library. Built from the same array, so the two forms
  // cannot drift.
  const slug = book ?? path.basename(out, path.extname(out));
  const manifest = buildManifest({ chapters, assets, meta, book: slug });
  if (exploded) await writeExploded({ files, manifest, outDir: exploded });

  highlighter?.dispose?.();

  return {
    outPath: path.resolve(out),
    bytes,
    stats: {
      chapters: chapters.length,
      images: assets.size,
      languages: langs.length,
      diagrams: chapters.reduce((n, c) => n + (c.xhtml.match(/class="diagram/g)?.length ?? 0), 0),
      elapsedMs: Date.now() - started,
    },
    warnings,
    meta,
    manifest,
  };
}

export { scan, DEFAULT_IGNORE } from './scan.js';
export { readerPath } from './transforms/links.js';
