/**
 * Books saved for offline reading.
 *
 * Chapters are cached as they are read anyway; this is the deliberate version,
 * behind a button on every book: pull the whole package — chapters, images,
 * styles, manifest, search index — into the same cache the service worker
 * answers `pub/` from, so a book opened on a plane has every page.
 *
 * Done from the page with the Cache API rather than handed to the worker, so
 * there is real progress to show and it works on a first visit, before the
 * worker controls anything.
 *
 * The catch is the build id. Every deploy publishes under a new `pub/<build>/`,
 * so a book saved last week sits at URLs the current shelf no longer names.
 * Three things keep it readable:
 *
 *   - which build each book was saved from is remembered, with the book's
 *     content hash at the time;
 *   - opening a book whose hash has not changed reads the saved copy, online
 *     or off, so a deploy that touched other books costs nothing;
 *   - a book whose content did change is re-saved in the background the next
 *     time the app is open online, and opened from the old copy until then.
 */
import { loadFlag, saveFlag } from './store.js';

const PUB = 'swedocs-pub'; // the worker's cache for `pub/`; see sw.js
const PARALLEL = 4;

const records = () => loadFlag('offline', {});
const record = (slug, value) => {
  const all = records();
  if (value) all[slug] = value;
  else delete all[slug];
  saveFlag('offline', all);
};

const rootOf = (build) => `pub/${build}/`;

const jobs = new Map(); // slug → { done, total, promise }
const listeners = new Set();
const emit = (slug) => listeners.forEach((fn) => fn(slug));

/**
 * Every file a book needs, as absolute URLs.
 *
 * Read from the package itself — container.xml, then every item in the OPF
 * manifest — rather than from manifest.json alone, because that is what the
 * reading engine opens a book with: miss the OPF and a "saved" book will not
 * open offline at all.
 */
async function filesOf(root, slug) {
  const base = new URL(`${root}${slug}/`, document.baseURI);
  const get = async (url, as) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${url.pathname}`);
    return response[as]();
  };
  const xml = (text) => new DOMParser().parseFromString(text, 'application/xml');

  const containerUrl = new URL('META-INF/container.xml', base);
  const rootfile = xml(await get(containerUrl, 'text'))
    .getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
  if (!rootfile) throw new Error(`no package in ${containerUrl.pathname}`);
  const opfUrl = new URL(rootfile, base);
  const items = [...xml(await get(opfUrl, 'text')).getElementsByTagName('item')]
    .map((item) => new URL(item.getAttribute('href'), opfUrl).href);

  const manifestUrl = new URL('manifest.json', base);
  const manifest = await get(manifestUrl, 'json');
  return [...new Set([
    manifestUrl.href,
    new URL('search.json', base).href,
    containerUrl.href,
    opfUrl.href,
    ...items,
    ...manifest.readingOrder.map((link) => new URL(link.href, base).href),
    ...manifest.resources.map((link) => new URL(link.href, base).href),
  ])];
}

/** Drop a book's cached files from every build except `keep`. */
async function prune(slug, keep = null) {
  if (!('caches' in window)) return;
  const cache = await caches.open(PUB);
  const pattern = new RegExp(`/pub/([^/]+)/${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
  for (const request of await cache.keys()) {
    const match = new URL(request.url).pathname.match(pattern);
    if (match && match[1] !== keep) await cache.delete(request);
  }
}

export const supported = () => 'caches' in window && window.isSecureContext;

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Where a book stands: `none`, `saving` (with progress), `saved`, or `stale` —
 * saved, readable offline, but from an older build than the shelf's.
 */
export function stateOf(shelf, slug) {
  const job = jobs.get(slug);
  if (job) return { state: 'saving', done: job.done, total: job.total };
  const saved = records()[slug];
  if (!saved) return { state: 'none' };
  const entry = shelf.books.find((book) => book.slug === slug);
  if (saved.build === shelf.build || saved.hash === entry?.hash) return { state: 'saved' };
  return { state: 'stale' };
}

/** Save one book. Resolves true when every file is in the cache. */
export function save(shelf, slug) {
  if (jobs.has(slug)) return jobs.get(slug).promise;
  const entry = shelf.books.find((book) => book.slug === slug);
  const job = { done: 0, total: 0, promise: null };
  jobs.set(slug, job);
  emit(slug);

  job.promise = (async () => {
    try {
      const cache = await caches.open(PUB);
      const urls = await filesOf(shelf.root, slug);
      job.total = urls.length;
      emit(slug);

      let next = 0;
      let failed = 0;
      const worker = async () => {
        while (next < urls.length) {
          const url = urls[next++];
          try {
            if (!(await cache.match(url))) {
              const response = await fetch(url);
              if (!response.ok) throw new Error(url);
              await cache.put(url, response);
            }
          } catch {
            failed += 1;
          }
          job.done += 1;
          emit(slug);
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
      if (failed) return false;

      record(slug, { build: shelf.build, hash: entry?.hash ?? null, at: Date.now() });
      await prune(slug, shelf.build);
      // Ask the browser not to clear this under storage pressure. Granted
      // quietly to an installed app on Android; elsewhere it may be ignored.
      navigator.storage?.persist?.().catch(() => {});
      return true;
    } catch {
      return false;
    } finally {
      jobs.delete(slug);
      emit(slug);
    }
  })();
  return job.promise;
}

/** Forget a saved book and free its space. */
export async function remove(slug) {
  record(slug, null);
  await prune(slug);
  emit(slug);
}

/**
 * The roots to open a book from, best first.
 *
 * An unchanged book reads from where it was saved, which is complete. A
 * changed one prefers the current build, and keeps the saved copy as the
 * fallback for when the current one cannot be fetched — which offline, until
 * it has been re-saved, is always.
 */
export function rootsFor(shelf, slug) {
  const saved = records()[slug];
  if (!saved || saved.build === shelf.build) return [shelf.root];
  const entry = shelf.books.find((book) => book.slug === slug);
  const old = rootOf(saved.build);
  if (saved.hash && saved.hash === entry?.hash) return [old, shelf.root];
  return navigator.onLine === false ? [old, shelf.root] : [shelf.root, old];
}

/**
 * Re-save, in the background, every saved book whose content a deploy has
 * changed. Only online, one book at a time, and only books whose old copy is
 * actually outdated — an unchanged book keeps reading from where it is.
 */
export async function refreshStale(shelf) {
  if (!supported() || navigator.onLine === false) return;
  for (const slug of Object.keys(records())) {
    if (!shelf.books.some((book) => book.slug === slug)) continue;
    if (stateOf(shelf, slug).state !== 'stale') continue;
    await save(shelf, slug);
  }
}

