#!/usr/bin/env node
/**
 * Assemble the deployable site from the app and the built books.
 *
 *   dist/site/
 *     index.html · 404.html · app.js · … · vendor/    ← src/, verbatim
 *     pub/latest.json                                 ← names the current build
 *     pub/<build-id>/…                                ← dist/pub, verbatim
 *
 * The books go under a directory named by a hash of the packages themselves,
 * so every URL below it can be cached forever: a rebuild that changes nothing
 * produces the same id and the same URLs, and a rebuild that changes something
 * writes a new directory rather than mutating an old file. `latest.json` is the
 * only thing a reader has to revalidate.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const PUB = path.join(ROOT, 'dist', 'pub');
const OUT = path.join(ROOT, 'dist', 'site');

/** The app's own notes are for people reading the repo, not for the web. */
const SKIP = new Set(['README.md']);

async function copy(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) await copy(src, dest);
    else await fs.copyFile(src, dest);
  }
}

const shelf = JSON.parse(await fs.readFile(path.join(PUB, 'index.json'), 'utf8'));
const { build } = shelf;
if (!build) throw new Error('dist/pub/index.json has no build id — run the build first');

await fs.rm(OUT, { recursive: true, force: true });
await copy(SRC, OUT);
await copy(PUB, path.join(OUT, 'pub', build));

// Static hosts answer an unknown path with 404.html; ours is the app, which
// is what makes /read/<book>/<chapter> a real, linkable URL.
await fs.copyFile(path.join(OUT, 'index.html'), path.join(OUT, '404.html'));

// Without this, GitHub Pages runs the output through Jekyll, which drops
// anything whose name begins with an underscore.
await fs.writeFile(path.join(OUT, '.nojekyll'), '');

await fs.writeFile(
  path.join(OUT, 'pub', 'latest.json'),
  `${JSON.stringify({ build, books: shelf.books.length, title: shelf.title }, null, 2)}\n`,
);

const bytes = async (dir) => {
  let total = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await bytes(full) : (await fs.stat(full)).size;
  }
  return total;
};

process.stdout.write(
  `\n  ${path.relative(ROOT, OUT)}/  ·  build ${build}  ·  ` +
    `${(await bytes(OUT) / (1 << 20)).toFixed(1)} MB\n\n`,
);
