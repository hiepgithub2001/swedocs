import { loadShelf, openBook, loadSearchIndex, bookUrls } from './lib/library.js';
import { createSettings } from './lib/settings.js';
import { createReader } from './lib/reader.js';
import { createPanel } from './lib/panel.js';
import { renderShelf } from './lib/shelf.js';

const $ = (sel) => document.querySelector(sel);

/**
 * The app is two screens — a shelf and a reader — behind real URLs.
 *
 * Real ones, not fragments, because the converter writes cross-book links as
 * `<base>/read/<book>/<path>` into every package: a link followed inside the
 * app routes, and the same link followed from a standalone .epub opens the
 * browser at the same page. Static hosting serves this file for those deep
 * paths (404.html is a copy of it), and the <base> in the document head is
 * what keeps every other relative URL pointing at the app root.
 */
const BASE = new URL(document.baseURI).pathname;
const routeOf = () => decodeURI(location.pathname.slice(BASE.length)).replace(/^\/+/, '');
const hrefFor = (route) => `${BASE}${route ? `read/${route}` : ''}`;

const status = (message) => {
  $('#status').textContent = message ?? '';
};

let shelf = null;
let publication = null;
let landed = null; // the route the reader is actually showing

const settings = createSettings(() => reader.applyStyles());
const reader = createReader({ settings, onRelocate, onExternalLink });
const panel = createPanel({
  hrefFor,
  onNavigate: (route, anchor) => go(route, { anchor }),
  onNavigateTo: (cfi) => reader.goTo(cfi),
  fullText: async (query, { onProgress, onHit }) => {
    for await (const result of reader.view.search({ query })) {
      if (result === 'done') break;
      if (result.subitems) onHit(result);
      else if (typeof result.progress === 'number') onProgress(result.progress);
    }
  },
});

function show(screen) {
  $('#shelf').hidden = screen !== 'shelf';
  $('#reader').hidden = screen !== 'reader';
  $('#bar').hidden = screen !== 'reader';
  $('#progress').hidden = screen !== 'reader';
  if (screen === 'shelf') document.title = shelf?.title ?? 'swedocs';
}

function onRelocate(detail) {
  const route = detail.link?.properties?.route;
  landed = route ?? landed;
  $('#where-book').textContent = detail.publication.entry.title;
  $('#where-chapter').textContent = detail.link?.title ?? '';
  // The bar is the whole book; the label names the chapter too. On a
  // 70-chapter book a page turn moves the book fraction by a third of a
  // percent, so a bare percentage looks frozen and reads as broken.
  const percent = Math.round((detail.fraction ?? 0) * 100);
  const total = detail.publication.manifest.readingOrder.length;
  $('#progress-fill').style.width = `${percent}%`;
  $('#progress-label').textContent = `${detail.index + 1}/${total} · ${percent}%`;
  panel.setRoute(route);

  if (route) {
    document.title = `${detail.link.title} · ${detail.publication.entry.title}`;
    // replaceState, not push: turning pages is not navigation history, but the
    // address bar should still be the link you would send someone.
    const href = hrefFor(route);
    if (!detail.restoring && location.pathname !== href) history.replaceState({}, '', href);
  }
}

/**
 * A link out of the current book.
 *
 * The converter rewrites a cross-book link to an absolute URL into this very
 * app, so that the same package works in a standalone EPUB reader. Followed
 * here, it should route rather than reload — and a link to the repository or
 * anywhere else should just open.
 */
function onExternalLink(href) {
  const url = new URL(href, location.href);
  if (url.origin === location.origin && url.pathname.startsWith(`${BASE}read/`)) {
    go(decodeURI(url.pathname.slice(BASE.length + 'read/'.length)), {
      anchor: url.hash.slice(1) || null,
    });
    return;
  }
  window.open(url.href, '_blank', 'noopener');
}

/** Navigate. `route` is `<book>` or `<book>/<path>`; `anchor` is a heading id. */
async function go(route, { anchor = null, replace = false, push = true } = {}) {
  const url = hrefFor(route) + (anchor ? `#${anchor}` : '');
  if (push) history[replace ? 'replaceState' : 'pushState']({}, '', url);
  await render(route, anchor);
}

async function render(route, anchor) {
  if (!route) {
    panel.close();
    renderShelf(shelf, $('#shelf'), { href: (slug) => hrefFor(slug) });
    show('shelf');
    return;
  }

  const [slug, ...rest] = route.split('/');
  const chapterRoute = rest.length ? route : null;

  try {
    if (publication?.entry.slug !== slug) {
      status('Opening…');
      publication = await openBook(shelf, slug);
      panel.setBook(publication.manifest, () => loadSearchIndex(shelf, slug));
      $('#save-offline').dataset.slug = slug;
    }
    show('reader');
    status('');
    const { found } = await reader.open(publication, { route: chapterRoute, anchor });
    if (!found) status(`There is no “${rest.join('/')}” in ${publication.entry.title}.`);

    // Opening a book with no chapter in the URL resumes where it was left.
    // Now that it has landed somewhere, say so in the address bar, so the link
    // is the page on screen rather than "the book, wherever you were".
    if (!chapterRoute && landed && location.pathname !== hrefFor(landed)) {
      history.replaceState({}, '', hrefFor(landed));
    }
  } catch (error) {
    show('shelf');
    renderShelf(shelf, $('#shelf'), { href: (s) => hrefFor(s) });
    status(`Could not open “${slug}”. ${error.message}`);
  }
}

/* ── chrome ──────────────────────────────────────────────────────────── */

$('#to-shelf').addEventListener('click', () => go(''));
$('#page-prev').addEventListener('click', () => reader.prev());
$('#page-next').addEventListener('click', () => reader.next());

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea')) return;
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') reader.prev();
  else if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') reader.next();
});

// In-app links (the shelf, and anything else pointing inside the app) route
// without a page load; everything else is left to the browser.
document.addEventListener('click', (event) => {
  const a = event.target.closest?.('a[href]');
  if (!a || event.metaKey || event.ctrlKey || a.target) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return;
  event.preventDefault();
  go(decodeURI(url.pathname.slice(BASE.length)).replace(/^read\/|^\/+/, ''), {
    anchor: url.hash.slice(1) || null,
  });
});

window.addEventListener('popstate', () => {
  const path = routeOf();
  render(path.replace(/^read\//, ''), location.hash.slice(1) || null);
});

/* ── offline ─────────────────────────────────────────────────────────── */

$('#save-offline').addEventListener('click', async () => {
  const { slug } = $('#save-offline').dataset;
  if (!slug || !navigator.serviceWorker?.controller) return;
  const state = $('#offline-state');
  state.textContent = 'Saving…';

  const urls = [
    ...publication.manifest.readingOrder.map((l) => new URL(l.href, publication.base).pathname),
    ...publication.manifest.resources.map((l) => new URL(l.href, publication.base).pathname),
    new URL('manifest.json', publication.base).pathname,
    new URL('search.json', publication.base).pathname,
    `${BASE}${bookUrls(shelf, slug).manifest}`,
  ];

  navigator.serviceWorker.controller.postMessage({ type: 'cache-book', slug, urls });
  navigator.serviceWorker.addEventListener('message', function done(event) {
    if (event.data?.type !== 'cached' || event.data.slug !== slug) return;
    navigator.serviceWorker.removeEventListener('message', done);
    state.textContent = event.data.ok ? 'Available offline.' : 'Could not save everything.';
  });
});

/* ── boot ────────────────────────────────────────────────────────────── */

async function boot() {
  try {
    shelf = await loadShelf();
  } catch (error) {
    status(`Could not load the library. ${error.message}`);
    return;
  }

  const path = routeOf();
  await render(path.replace(/^read\//, ''), location.hash.slice(1) || null);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE }).catch(() => {});
  }
}

boot();
