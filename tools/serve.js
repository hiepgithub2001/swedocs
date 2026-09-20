#!/usr/bin/env node
/**
 * Development server.
 *
 * Serves the app and the built books under one origin, at the same path the
 * deployed site uses, so relative URLs, the service worker's scope and the
 * <base> computation are exercised exactly as they will be in production.
 *
 *   node tools/serve.js [--port 8080] [--base /swedocs/] [--site] [--tls]
 *
 * `--site` serves the assembled dist/site instead, which is what CI deploys —
 * worth a look before a release, since that is the only arrangement where
 * pub/latest.json and the immutable build directory are actually exercised.
 *
 * `--tls` additionally listens on https, with the certificate `tools/devcert.js`
 * mints. Service workers — and so installing the app — need a secure context,
 * which localhost gets for free and a LAN or tailnet address never does; over
 * http the one arrangement that matters, a phone reading from this machine, is
 * the one arrangement none of that can be exercised in. The http listener stays
 * up alongside it, and serves the authority to install at <base>swedocs-ca.crt.
 *
 * Any path that is not a file is answered with index.html, which is what the
 * host's 404 fallback does for the /read/<book>/<chapter> routes.
 */
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
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
const SITE = process.argv.includes('--site');
const TLS = process.argv.includes('--tls');
const TLS_PORT = Number(arg('tls-port', 8443));
const TLS_DIR = path.join(ROOT, '.cache', 'tls');

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
  '.crt': 'application/x-x509-ca-cert',
};

/** `pub/` is the build output; everything else is the app. */
function resolve(urlPath) {
  const rel = urlPath.slice(BASE.length);
  if (SITE) return path.join(ROOT, 'dist', 'site', rel || 'index.html');
  if (rel === '' || rel === 'index.html') return path.join(ROOT, 'src', 'index.html');
  if (rel.startsWith('pub/')) return path.join(ROOT, 'dist', 'pub', rel.slice(4));
  return path.join(ROOT, 'src', rel);
}

const fallback = () =>
  path.join(ROOT, SITE ? 'dist/site/404.html' : 'src/index.html');

async function handle(req, res) {
  const urlPath = decodeURI(new URL(req.url, 'http://localhost').pathname);

  if (!urlPath.startsWith(BASE)) {
    res.writeHead(302, { location: BASE });
    return res.end();
  }

  // The authority has to be fetched over http: until it is installed, https
  // is exactly what the phone will not talk to.
  if (TLS && urlPath === `${BASE}swedocs-ca.crt`) {
    const body = await fs.readFile(path.join(TLS_DIR, 'ca.crt'));
    res.writeHead(200, {
      'content-type': TYPES['.crt'],
      'content-disposition': 'attachment; filename="swedocs-ca.crt"',
    });
    return res.end(body);
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
    const body = await fs.readFile(fallback());
    res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-cache' });
    res.end(body);
  }
}

http.createServer(handle).listen(PORT, () => {
  process.stdout.write(`  http://localhost:${PORT}${BASE}\n`);
});

if (TLS) {
  const [key, cert] = await Promise.all([
    fs.readFile(path.join(TLS_DIR, 'server.key')),
    fs.readFile(path.join(TLS_DIR, 'server.crt')),
  ]).catch(() => {
    process.stderr.write('  --tls: no certificate. Run: node tools/devcert.js\n');
    process.exit(1);
  });
  https.createServer({ key, cert }, handle).listen(TLS_PORT, () => {
    process.stdout.write(`  https://localhost:${TLS_PORT}${BASE}\n`);
  });
}
