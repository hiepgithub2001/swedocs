#!/usr/bin/env node
/**
 * Development server.
 *
 * Serves the app and the built books under one origin, at the same path the
 * deployed site uses, so relative URLs, the service worker's scope and the
 * <base> computation are exercised exactly as they will be in production.
 *
 *   node tools/serve.js [--port 8080] [--base /swedocs/]
 *
 * Any path that is not a file is answered with index.html, which is what the
 * host's 404 fallback does for the /read/<book>/<chapter> routes.
 */
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};

const PORT = Number(arg('port', 8080));
const BASE = arg('base', '/swedocs/').replace(/\/*$/, '/');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xhtml': 'application/xhtml+xml; charset=utf-8',
  '.ncx': 'application/x-dtbncx+xml',
  '.opf': 'application/oebps-package+xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.epub': 'application/epub+zip',
};

/** `pub/` is the build output; everything else is the app. */
function resolve(urlPath) {
  const rel = urlPath.slice(BASE.length);
  if (rel === '' || rel === 'index.html') return path.join(ROOT, 'src', 'index.html');
  if (rel.startsWith('pub/')) return path.join(ROOT, 'dist', 'pub', rel.slice(4));
  return path.join(ROOT, 'src', rel);
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURI(new URL(req.url, 'http://localhost').pathname);

  if (!urlPath.startsWith(BASE)) {
    res.writeHead(302, { location: BASE });
    return res.end();
  }

  const file = resolve(urlPath);
  const safe = file.startsWith(path.join(ROOT, 'src')) || file.startsWith(path.join(ROOT, 'dist'));

  try {
    if (!safe) throw new Error('outside root');
    const body = await fs.readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch {
    // Not a file. A route gets the app; anything else gets a 404, because a
    // missing package file must read as missing — a loader that is handed
    // index.html instead tries to parse it as XML and fails confusingly.
    const isRoute = !path.extname(urlPath) && !urlPath.slice(BASE.length).startsWith('pub/');
    if (!isRoute) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found\n');
    }
    const body = await fs.readFile(path.join(ROOT, 'src', 'index.html'));
    res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-cache' });
    res.end(body);
  }
});

server.listen(PORT, () => {
  process.stdout.write(`  http://localhost:${PORT}${BASE}\n`);
});
