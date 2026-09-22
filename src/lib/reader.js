import '../vendor/foliate/view.js';
import { loadPosition, savePosition } from './store.js';

const $ = (sel) => document.querySelector(sel);

const idle = (fn) =>
  (window.requestIdleCallback ?? ((cb) => setTimeout(cb, 200)))(fn, { timeout: 1000 });

/**
 * The reading surface.
 *
 * foliate-js owns pagination, the iframe and the touch gestures; this owns
 * where the reader is, what that means as a URL, and making the next page
 * already be there when it is asked for.
 */
export function createReader({ settings, hrefFor, onRelocate, onExternalLink, onDocument }) {
  let view = null;
  let current = null; // { book, manifest, entry, base }
  let restoring = false;
  const warmed = new Set();

  const host = $('#view-host');

  /**
   * Give a link to another chapter an address the browser can use.
   *
   * foliate loads each chapter into a blob: URL, so a relative href like
   * "0004-cdn.xhtml" resolves against a document with no origin of its own.
   * Left-clicking works, because foliate intercepts the click and turns the
   * page itself — but the browser's own "Open link in new tab" has no URL to
   * open, so on the context menu the entry is missing or leads nowhere.
   *
   * Rewriting to the app's own /read/ URL costs nothing in place: an absolute
   * URL reaches foliate's external-link event, which routes back through the
   * app and navigates exactly as the relative link did. Only the copy inside
   * the reader is touched — the .epub someone downloads keeps its relative
   * links, which is what lets it work in any other e-reader.
   */
  const letModifiedClicksThrough = (doc) => {
    // foliate calls preventDefault() on every link click in the chapter, with
    // no test for a modifier, so ctrl-click and shift-click are swallowed and
    // the new tab is never opened. Listening in the capture phase on the
    // document — foliate listens in the bubble phase — lets a modified click
    // be taken off the path before its handler sees it. stopPropagation does
    // not touch the default action, so the browser still does exactly what
    // the modifier asked for.
    doc.addEventListener(
      'click',
      (event) => {
        if (!event.target.closest?.('a[href]')) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          event.stopPropagation();
        }
      },
      true,
    );
  };

  const addressInBookLinks = (doc, index) => {
    const here = current?.manifest.readingOrder[index];
    if (!here || !hrefFor) return;
    const from = new URL(here.href, current.base);
    const routes = new Map(
      current.manifest.readingOrder.map((link) => [
        new URL(link.href, current.base).href,
        link.properties?.route,
      ]),
    );
    for (const a of doc.querySelectorAll('a[href]')) {
      const raw = a.getAttribute('href');
      // Absolute URLs are already addressable, and a bare fragment stays
      // inside the chapter it was written in.
      if (!raw || raw.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
      const target = new URL(raw, from);
      const route = routes.get(target.href.split('#')[0]);
      // Absolute, not root-relative: the chapter's own document has no origin
      // to resolve a leading "/" against, so only a full URL is something the
      // browser can hand to a new tab.
      if (route) a.setAttribute('href', new URL(hrefFor(route) + target.hash, location.href).href);
    }
  };

  /**
   * Warm the next and previous chapters.
   *
   * At roughly 3 KB gzipped a chapter, the whole point of turning a page is
   * that nothing happens — no spinner, no wait. These fetches land in the HTTP
   * cache (and, offline, in the service worker's), so the paginator's own load
   * is a cache hit. Done on idle so it never competes with the page being read.
   */
  const prefetch = (index) => {
    if (!current) return;
    const { readingOrder } = current.manifest;
    for (const step of [1, -1, 2]) {
      const link = readingOrder[index + step];
      // Relocation fires on every page turn, not only on every chapter, so
      // without this the same three chapters are re-requested a few dozen
      // times per chapter read — invisible on a warm cache, and painful on a
      // phone that is paying for it.
      if (!link || warmed.has(link.href)) continue;
      warmed.add(link.href);
      idle(() =>
        fetch(new URL(link.href, current.base), { priority: 'low' }).catch(() => {
          warmed.delete(link.href);
        }),
      );
    }
  };

  /**
   * Re-issue the injected stylesheet, and nothing else.
   *
   * The table frames are sized in pixels from the reading surface, so they
   * have to be rewritten when the window changes shape — but setting the
   * paginator's layout attributes again, even to the values they already
   * have, makes it lay the whole section out afresh. This only touches the
   * stylesheet, which the renderer swaps in place.
   */
  const refreshStyles = () => view?.renderer.setStyles?.(settings.userCss());

  const applyStyles = () => {
    if (!view) return;
    view.renderer.setAttribute('flow', settings.value.flow);
    // These are read two ways inside the paginator: as CSS lengths in a
    // calc(), and as bare numbers through parseFloat. So a unitless gap
    // collapses the column to nothing, and anything but px or % is silently
    // read as its own numeric prefix — `44rem` becomes a 44-pixel column.
    view.renderer.setAttribute('gap', '6%');
    view.renderer.setAttribute('margin', '24px');
    view.renderer.setAttribute('max-inline-size', '704px');
    view.renderer.setAttribute('max-block-size', '1400px');
    view.renderer.setStyles?.(settings.userCss());
    for (const { doc } of view.renderer.getContents?.() ?? []) settings.applyToDocument(doc);
  };

  const close = () => {
    view?.close();
    view?.remove();
    view = null;
    current = null;
    warmed.clear();
  };

  /**
   * Open a book and land on `target` — a reader route, optionally with a
   * heading anchor. With no target, resume where this book was left, which is
   * stored against its publication identifier rather than its slug so a
   * rebuild does not lose the place.
   */
  async function open(publication, { route = null, anchor = null } = {}) {
    if (current?.entry.slug !== publication.entry.slug) close();
    current = publication;

    if (!view) {
      view = document.createElement('foliate-view');
      host.append(view);

      view.addEventListener('load', ({ detail }) => {
        settings.applyToDocument(detail.doc);
        addressInBookLinks(detail.doc, detail.index);
        letModifiedClicksThrough(detail.doc);
        onDocument?.(detail.doc);
      });

      view.addEventListener('relocate', ({ detail }) => {
        const index = detail.section?.current ?? 0;
        const link = current.manifest.readingOrder[index];
        if (!restoring && detail.cfi) {
          savePosition(current.entry.identifier, { cfi: detail.cfi, route: link?.properties?.route });
        }
        prefetch(index);
        // While a navigation is in flight the address bar is already right —
        // the caller set it. Relocations that arrive mid-flight describe where
        // the reader still is, and writing those back would undo the Back
        // button the moment it was pressed.
        onRelocate({ ...detail, index, link, restoring, publication: current });
      });

      // A link the converter left relative points at another chapter of this
      // same book, and foliate-js follows it. One it rewrote to an absolute
      // URL points at another book or at the repository, and arrives here —
      // 252 of this corpus's links are of the first kind, and they should feel
      // no different from a link within the book.
      view.addEventListener('external-link', (event) => {
        event.preventDefault();
        onExternalLink(event.detail.href_);
      });

      await view.open(publication.book);
      applyStyles();
    }

    const saved = loadPosition(publication.entry.identifier);
    const index = route
      ? current.manifest.readingOrder.findIndex((l) => l.properties?.route === route)
      : -1;

    restoring = true;
    try {
      if (index >= 0) {
        const link = current.manifest.readingOrder[index];
        await view.goTo(anchor ? `${link.href}#${anchor}` : index);
      } else if (saved?.cfi) {
        await view.init({ lastLocation: saved.cfi });
      } else {
        await view.init({ showTextStart: true });
      }
    } finally {
      restoring = false;
    }

    // A route that names no chapter still opens the book, but the caller
    // should be able to say so: silently landing somewhere else is how a stale
    // bookmark turns into "the app is broken".
    return { found: !route || index >= 0 };
  }

  return {
    open,
    close,
    applyStyles,
    refreshStyles,
    get view() {
      return view;
    },
    get publication() {
      return current;
    },
    prev: () => view?.prev(),
    next: () => view?.next(),
    goTo: (target) => view?.goTo(target),
  };
}
