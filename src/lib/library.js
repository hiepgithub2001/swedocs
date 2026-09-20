import { EPUB } from '../vendor/foliate/epub.js';

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
  try {
    const { build } = await json('pub/latest.json');
    const root = `pub/${build}/`;
    return { ...(await json(`${root}index.json`)), root };
  } catch {
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
export async function openBook(shelf, slug) {
  const entry = shelf.books.find((book) => book.slug === slug);
  if (!entry) throw new Error(`No book named "${slug}"`);

  const base = new URL(`${shelf.root}${slug}/`, document.baseURI);
  const manifest = await json(new URL('manifest.json', base));
  const sizes = new Map(manifest.readingOrder.map((l) => [l.href, l.properties?.size ?? 0]));

  const fetchPart = async (href, as) => {
    const response = await fetch(new URL(href, base));
    return response.ok ? response[as]() : null;
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
export async function loadSearchIndex(shelf, slug) {
  return json(new URL(`${shelf.root}${slug}/search.json`, document.baseURI));
}

export function bookUrls(shelf, slug) {
  const entry = shelf.books.find((book) => book.slug === slug);
  return {
    manifest: `${shelf.root}${slug}/manifest.json`,
    search: `${shelf.root}${slug}/search.json`,
    epub: `${shelf.root}${entry?.epub ?? `${slug}.epub`}`,
  };
}
