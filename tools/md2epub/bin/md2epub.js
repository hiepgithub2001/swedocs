#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { convert, scan, readerPath, DEFAULT_IGNORE } from '../src/index.js';

const USAGE = `md2epub — convert a folder of Markdown into a reflowable EPUB 3

  Usage
    md2epub <source-dir> [options]

  Options
    -o, --out <file>        output path            (default: <source-dir>.epub)
    -t, --title <text>      book title             (default: source folder name)
    -a, --author <text>     author metadata        (default: "Unknown")
    -l, --language <code>   BCP-47 language tag    (default: "en")
    -d, --description <t>   book description
    -s, --subjects <a,b>    comma-separated subject tags
    -i, --ignore <a,b>      extra directory names to skip
    -e, --each              one book per immediate subdirectory;
                            --out is then a directory
    -x, --exploded          also write each package unzipped, next to its
                            .epub, with a Readium web manifest
        --shelf-title <t>   title for the shelf index written by --each
        --base-url <url>    reader base URL; links into another book become
                            absolute URLs instead of being dropped
        --source-url <url>  repository base URL; links that leave the corpus
                            point at the file where it lives
        --source-root <d>   root those repository paths are relative to
                            (default: <source-dir>)
        --strict            exit non-zero on dead-link or mermaid-failed
        --no-highlight      skip syntax highlighting (faster builds)
        --mermaid <module>  ES module whose default export renders Mermaid to SVG
        --quiet             only print the final summary
    -h, --help              show this message

  Examples
    md2epub ./docs -o book.epub -t "My Handbook" -a "A. Writer"
    md2epub . --ignore drafts,archive --no-highlight
    md2epub ./content --each -o ./dist/books -a "A. Writer"
    md2epub ./content --each -o ./dist/books --base-url https://docs.example.com

  Reproducible builds
    Set SOURCE_DATE_EPOCH to make output byte-for-byte identical across runs.
`;

const FLAGS = new Set([
  '--no-highlight', '--quiet', '--strict', '--each', '-e', '--exploded', '-x', '-h', '--help',
]);
const ALIASES = {
  '-o': '--out', '-t': '--title', '-a': '--author', '-l': '--language',
  '-d': '--description', '-s': '--subjects', '-i': '--ignore', '-e': '--each',
  '-x': '--exploded',
};

function parseArgs(argv) {
  const opts = {};
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = ALIASES[argv[i]] ?? argv[i];
    if (!arg.startsWith('-')) {
      positional.push(arg);
    } else if (FLAGS.has(arg)) {
      opts[arg.replace(/^--?/, '')] = true;
    } else if (arg.startsWith('--')) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`Missing value for ${arg}`);
      opts[arg.slice(2)] = value;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return { opts, positional };
}

const human = (bytes) =>
  bytes > 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

/**
 * One book per immediate subdirectory.
 *
 * Each book's title comes from that folder's own index page, so the shelf is
 * named by the content rather than by directory slugs. Builds run in sequence
 * because each one holds a Shiki highlighter; the whole corpus still finishes
 * in seconds.
 */
async function convertEach({ src, outDir, common, interactive }) {
  const skip = new Set([...DEFAULT_IGNORE, ...(common.ignore ?? [])]);
  const entries = await fs.readdir(path.resolve(src), { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !skip.has(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  // Scan every book before converting any of them. 11% of this corpus's
  // internal links cross an area, and a book cannot rewrite a link into a
  // sibling it has not seen.
  const shelf = [];
  const externals = new Map();
  for (const name of dirs) {
    const dir = path.join(src, name);
    let scanned;
    try {
      scanned = await scan(dir, { ignore: common.ignore ?? [] });
    } catch {
      continue; // no Markdown in this subtree
    }
    // A book's own README steers the shelf as well as the book: `collection`
    // in its frontmatter names the group it belongs to, which is how a shelf
    // of nine reference works and a shelf of something else stay apart
    // without the tool knowing what either of them is.
    shelf.push({
      name,
      dir,
      title: scanned.chapters[0].title,
      collection: scanned.chapters[0].frontmatter?.collection ?? null,
    });
    for (const chapter of scanned.chapters) {
      externals.set(chapter.srcPath, { book: name, route: readerPath(name, chapter.relPath) });
    }
  }

  const books = [];
  const warnings = [];
  const stats = { chapters: 0, diagrams: 0, images: 0, elapsedMs: 0 };

  for (const { name, dir, title, collection } of shelf) {
    if (interactive) process.stderr.write(`\r\x1b[2K  building ${name}…`);

    const result = await convert({
      ...common,
      src: dir,
      out: path.join(outDir, `${name}.epub`),
      title: common.title ?? title,
      book: name,
      exploded: common.exploded ? path.join(outDir, name) : null,
      // A book never rewrites a link to one of its own chapters through the
      // reader URL, so its own pages are withheld from the index it is given.
      externals: new Map([...externals].filter(([, v]) => v.book !== name)),
    });

    books.push({
      name,
      collection,
      title: result.meta.title,
      bytes: result.bytes,
      stats: result.stats,
      identifier: result.meta.identifier,
    });
    warnings.push(...result.warnings.map((w) => ({ ...w, book: name })));
    stats.chapters += result.stats.chapters;
    stats.diagrams += result.stats.diagrams;
    stats.images += result.stats.images;
    stats.elapsedMs += result.stats.elapsedMs;
  }

  if (!books.length) throw new Error(`No subdirectory of ${src} contains Markdown`);

  // One index for the whole shelf, so the reader's first request tells it what
  // exists without fetching nine manifests.
  if (common.exploded) {
    const digest = crypto.createHash('sha256');
    const entries = [];
    for (const book of books) {
      const bytes = await fs.readFile(path.join(outDir, `${book.name}.epub`));
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      digest.update(`${book.name}:${hash}\n`);
      entries.push({
        slug: book.name,
        title: book.title,
        ...(book.collection ? { collection: book.collection } : {}),
        identifier: book.identifier,
        chapters: book.stats.chapters,
        bytes: book.bytes,
        hash: hash.slice(0, 16),
        manifest: `${book.name}/manifest.json`,
        epub: `${book.name}.epub`,
      });
    }

    // The build id names the immutable directory this shelf is published
    // under. Derived from the packages rather than from the commit, so a
    // commit that changes no content produces the same id and CI can skip the
    // redeploy entirely.
    const shelf = {
      title: common.shelfTitle ?? 'Library',
      build: digest.digest('hex').slice(0, 12),
      books: entries,
    };
    await fs.writeFile(path.join(outDir, 'index.json'), `${JSON.stringify(shelf, null, 2)}\n`);
  }

  return { outPath: path.resolve(outDir), books, warnings, stats };
}

async function main() {
  const { opts, positional } = parseArgs(process.argv.slice(2));

  if (opts.help || opts.h || !positional.length) {
    process.stdout.write(USAGE);
    process.exit(positional.length ? 0 : 1);
  }

  const src = positional[0];
  const out = opts.out ?? `${path.basename(path.resolve(src))}.epub`;
  const interactive = process.stderr.isTTY && !opts.quiet;

  let mermaid = null;
  if (opts.mermaid) {
    const mod = await import(path.resolve(opts.mermaid));
    mermaid = mod.default ?? mod.render;
    if (typeof mermaid !== 'function') {
      throw new Error(`${opts.mermaid} must export a render function as its default export`);
    }
  }

  const common = {
    title: opts.title,
    author: opts.author,
    language: opts.language,
    description: opts.description,
    subjects: opts.subjects?.split(',').map((s) => s.trim()).filter(Boolean),
    ignore: opts.ignore?.split(',').map((s) => s.trim()).filter(Boolean),
    highlight: !opts['no-highlight'],
    mermaid,
    exploded: Boolean(opts.exploded),
    shelfTitle: opts['shelf-title'] ?? opts.title,
    baseUrl: opts['base-url'] ?? null,
    sourceUrl: opts['source-url'] ?? null,
    sourceRoot: path.resolve(opts['source-root'] ?? src),
    onProgress: !interactive
      ? undefined
      : ({ done, total, title }) => {
          const pct = String(Math.round((done / total) * 100)).padStart(3);
          process.stderr.write(`\r\x1b[2K  ${pct}%  ${done}/${total}  ${title.slice(0, 48)}`);
        },
  };

  let result;
  try {
    result = opts.each
      ? await convertEach({ src, outDir: out, common, interactive })
      : await convert({
          ...common,
          src,
          out,
          // One book: the exploded form sits beside the .epub under its own
          // name, the same shape --each produces.
          exploded: opts.exploded
            ? path.join(path.dirname(out), path.basename(out, path.extname(out)))
            : null,
          book: path.basename(out, path.extname(out)),
        });
  } finally {
    // A renderer may hold a browser open. Shut it down whether or not the
    // build succeeded, or the process never exits.
    if (typeof mermaid?.close === 'function') await mermaid.close();
  }

  if (interactive) process.stderr.write('\r\x1b[2K');

  if (opts.each) {
    process.stdout.write(`\n  ${result.outPath}/\n`);
    for (const book of result.books) {
      process.stdout.write(
        `  ${human(book.bytes).padStart(8)}  ${String(book.stats.chapters).padStart(3)} ch  ${book.title}\n`,
      );
    }
    const s = result.stats;
    process.stdout.write(
      `\n  ${result.books.length} books  ·  ${s.chapters} chapters  ·  ${s.diagrams} diagrams  ` +
        `·  ${(s.elapsedMs / 1000).toFixed(1)}s\n`,
    );
  } else {
    const { stats } = result;
    process.stdout.write(
      `\n  ${result.outPath}\n` +
        `  ${human(result.bytes)}  ·  ${stats.chapters} chapters  ·  ${stats.diagrams} diagrams  ` +
        `·  ${stats.images} images  ·  ${stats.languages} languages  ·  ${(stats.elapsedMs / 1000).toFixed(1)}s\n`,
    );
  }

  // Generated Markdown fails in predictable ways — broken relative links,
  // malformed Mermaid. Under --strict those stop being warnings scrolling past
  // and become the build's verdict, which turns the converter into the quality
  // check on whatever wrote the content.
  const FATAL = new Set(['dead-link', 'mermaid-failed']);
  const fatal = opts.strict ? result.warnings.filter((w) => FATAL.has(w.kind)) : [];

  if (result.warnings.length) {
    const byKind = result.warnings.reduce((acc, w) => ({ ...acc, [w.kind]: (acc[w.kind] ?? 0) + 1 }), {});
    process.stdout.write(`\n  warnings: ${Object.entries(byKind).map(([k, n]) => `${k} ×${n}`).join(', ')}\n`);
    const shown = fatal.length ? fatal : result.warnings;
    for (const w of shown.slice(0, 10)) {
      process.stdout.write(`    ${w.kind}: ${w.detail}  (${w.chapter})\n`);
    }
    if (shown.length > 10) {
      process.stdout.write(`    … and ${shown.length - 10} more\n`);
    }
  }
  process.stdout.write('\n');

  if (fatal.length) {
    const byKind = fatal.reduce((acc, w) => ({ ...acc, [w.kind]: (acc[w.kind] ?? 0) + 1 }), {});
    throw new Error(
      `--strict: ${Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(', ')}`,
    );
  }
}

main().catch((error) => {
  process.stderr.write(`\nmd2epub: ${error.message}\n`);
  process.exit(1);
});
