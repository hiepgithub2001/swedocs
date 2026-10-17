import { EPUB } from '../vendor/foliate/epub.js';
import { loadFlag, saveFlag } from './store.js';

const json = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
};

/**
 * Find the current shelf.
 *
 * Published books live under an immutable `pub/<build-id>/`, so a chapter can
 * be cached forever and a rebuild never has to invalidate anything; only
 * `latest.json` is revalidated. Serving `dist/pub` directly during development
 * skips the indirection, so a missing `latest.json` falls back to it rather
 * than being an error.
 */
export async function loadShelf() {
  const at = async (build) => {
    const root = `pub/${build}/`;
    const shelf = { ...(await json(`${root}index.json`)), root };
    saveFlag('shelf-build', build);
    return shelf;
  };
  try {
    return await at((await json('pub/latest.json')).build);
  } catch {
    // Offline with a cold `latest.json`, or one naming a build whose index
    // never made it into the cache: the last shelf that did open is the one
    // the saved books belong to.
    const last = loadFlag('shelf-build', null);
    if (last) {
      try {
        return await at(last);
      } catch {
        /* fall through to the development layout */
      }
    }
    return { ...(await json('pub/index.json')), root: 'pub/' };
  }
}

/**
 * Open one book as a publication.
 *
 * The package is served unzipped, so the loader foliate-js wants is three
 * fetches — no zip library, no range requests, and each chapter is its own
 * cache entry. Sizes come from the manifest because the paginator weights
 * progress by them and HEAD requests for 70 chapters would be absurd.
 */
export async function openBook(shelf, slug, root = shelf.root) {
  const entry = shelf.books.find((book) => book.slug === slug);
  if (!entry) throw new Error(`No book named "${slug}"`);

  // `root` is the shelf's own build, unless the book was saved offline from an
  // older one (see offline.js).
  const base = new URL(`${root}${slug}/`, document.baseURI);
  const manifest = await json(new URL('manifest.json', base));
  const sizes = new Map(manifest.readingOrder.map((l) => [l.href, l.properties?.size ?? 0]));

  // A file that cannot be reached reads as one that is not there. Online the
  // engine's probe for an optional META-INF/encryption.xml is a 404; offline
  // it is a network error, and letting that throw would sink the open of a
  // book whose every real file is saved.
  const fetchPart = async (href, as) => {
    try {
      const response = await fetch(new URL(href, base));
      return response.ok ? response[as]() : null;
    } catch {
      return null;
    }
  };

  const book = new EPUB({
    loadText: (href) => fetchPart(href, 'text'),
    loadBlob: (href) => fetchPart(href, 'blob'),
    getSize: (href) => sizes.get(href) ?? 0,
  });
  await book.init();

  return { entry, manifest, base, book };
}

/** The reading-order entry for a reader route, or the book's first chapter. */
export function findByRoute(manifest, route) {
  const index = manifest.readingOrder.findIndex((l) => l.properties?.route === route);
  return index < 0 ? 0 : index;
}

/** Section-level search index, fetched only when someone opens the search box. */
export async function loadSearchIndex(publication) {
  return json(new URL('search.json', publication.base));
}
