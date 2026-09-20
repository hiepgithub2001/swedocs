/**
 * Offline.
 *
 * Two caches with opposite lifetimes. The shell is small and changes whenever
 * the app is deployed, so it is versioned and swapped wholesale. Published
 * chapters live under an immutable `pub/<build-id>/` path, so once one is
 * cached it is correct forever and is never revalidated — a rebuild writes a
 * new directory rather than changing an old file. Only `latest.json`, which
 * names the current build, goes to the network first.
 */
const VERSION = 'v2';
const SHELL = `swedocs-shell-${VERSION}`;
const PUB = 'swedocs-pub';

const BASE = new URL('./', self.registration.scope).pathname;

const SHELL_FILES = [
  '',
  'index.html',
  'app.css',
  'app.js',
  'manifest.webmanifest',
  // The icons belong to the shell: an installed app that lost its icon to a
  // cold cache is a blank square on the home screen.
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'lib/install.js',
  'lib/library.js',
  'lib/lightbox.js',
  'lib/panel.js',
  'lib/reader.js',
  'lib/settings.js',
  'lib/shelf.js',
  'lib/store.js',
  'lib/tables.js',
  'vendor/foliate/epub.js',
  'vendor/foliate/epubcfi.js',
  'vendor/foliate/overlayer.js',
  'vendor/foliate/paginator.js',
  'vendor/foliate/progress.js',
  'vendor/foliate/search.js',
  'vendor/foliate/text-walker.js',
  'vendor/foliate/view.js',
].map((file) => BASE + file);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // One failure must not sink the install, or a single renamed file leaves
      // the app with no offline support at all.
      .then((cache) => Promise.allSettled(SHELL_FILES.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL && key !== PUB).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
};

const networkFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw error;
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  const path = url.pathname.slice(BASE.length);

  // Every deep route is this one document. Answering navigations from the
  // cache is also what makes /read/<book>/<chapter> work offline, where the
  // host's 404 fallback is not there to serve it.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(BASE + 'index.html').then((hit) => hit ?? fetch(request)),
    );
    return;
  }

  if (path === 'pub/latest.json') return event.respondWith(networkFirst(request, PUB));
  if (path.startsWith('pub/')) return event.respondWith(cacheFirst(request, PUB));
  event.respondWith(cacheFirst(request, SHELL));
});

/**
 * "Save this book offline": pull a whole publication in one go, rather than
 * waiting for the reader to happen to visit every chapter.
 */
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-book') return;
  const { slug, urls } = event.data;

  event.waitUntil(
    caches
      .open(PUB)
      .then((cache) => Promise.allSettled(urls.map((url) => cache.add(url))))
      .then((results) => {
        const ok = results.every((result) => result.status === 'fulfilled');
        event.source?.postMessage({ type: 'cached', slug, ok });
      }),
  );
});
