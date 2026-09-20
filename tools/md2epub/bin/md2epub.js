#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { convert, scan, DEFAULT_IGNORE } from '../src/index.js';

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
        --no-highlight      skip syntax highlighting (faster builds)
        --mermaid <module>  ES module whose default export renders Mermaid to SVG
        --quiet             only print the final summary
    -h, --help              show this message

  Examples
    md2epub ./docs -o book.epub -t "My Handbook" -a "A. Writer"
    md2epub . --ignore drafts,archive --no-highlight
    md2epub ./content --each -o ./dist/books -a "A. Writer"

  Reproducible builds
    Set SOURCE_DATE_EPOCH to make output byte-for-byte identical across runs.
`;

const FLAGS = new Set(['--no-highlight', '--quiet', '--each', '-e', '-h', '--help']);
const ALIASES = {
  '-o': '--out', '-t': '--title', '-a': '--author', '-l': '--language',
  '-d': '--description', '-s': '--subjects', '-i': '--ignore', '-e': '--each',
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

  const books = [];
  const warnings = [];
  const stats = { chapters: 0, diagrams: 0, images: 0, elapsedMs: 0 };

  for (const name of dirs) {
    const dir = path.join(src, name);
    let title;
    try {
      ({ title } = (await scan(dir, { ignore: common.ignore ?? [] })).chapters[0]);
    } catch {
      continue; // no Markdown in this subtree
    }

    if (interactive) process.stderr.write(`\r\x1b[2K  building ${name}…`);

    const result = await convert({
      ...common,
      src: dir,
      out: path.join(outDir, `${name}.epub`),
      title: common.title ?? title,
    });

    books.push({ name, title: result.meta.title, bytes: result.bytes, stats: result.stats });
    warnings.push(...result.warnings.map((w) => ({ ...w, book: name })));
    stats.chapters += result.stats.chapters;
    stats.diagrams += result.stats.diagrams;
    stats.images += result.stats.images;
    stats.elapsedMs += result.stats.elapsedMs;
  }

  if (!books.length) throw new Error(`No subdirectory of ${src} contains Markdown`);
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
      : await convert({ ...common, src, out });
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

  if (result.warnings.length) {
    const byKind = result.warnings.reduce((acc, w) => ({ ...acc, [w.kind]: (acc[w.kind] ?? 0) + 1 }), {});
    process.stdout.write(`\n  warnings: ${Object.entries(byKind).map(([k, n]) => `${k} ×${n}`).join(', ')}\n`);
    for (const w of result.warnings.slice(0, 10)) {
      process.stdout.write(`    ${w.kind}: ${w.detail}  (${w.chapter})\n`);
    }
    if (result.warnings.length > 10) {
      process.stdout.write(`    … and ${result.warnings.length - 10} more\n`);
    }
  }
  process.stdout.write('\n');
}

main().catch((error) => {
  process.stderr.write(`\nmd2epub: ${error.message}\n`);
  process.exit(1);
});
