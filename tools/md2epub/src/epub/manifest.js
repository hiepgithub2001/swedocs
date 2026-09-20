import { nest } from './nav.js';
import { readerPath } from '../transforms/links.js';

/**
 * A Readium Web Publication Manifest for the same package.
 *
 * The OPF is what an EPUB reader parses; this is what a web reader parses.
 * Emitting both from one build is the point of the whole arrangement — the
 * package is the seam, and neither side can drift from the other because
 * neither side converts anything.
 *
 * Two fields per chapter are ours rather than the spec's, and live under
 * `properties`, which is where the format puts extensions:
 *
 *   route   the reader's URL for this chapter, the same string `--base-url`
 *           writes into cross-book links, so an inbound link resolves by
 *           lookup rather than by guessing at the spine position.
 *   source  the Markdown file it came from, so a chapter can link back to
 *           where it is edited.
 */
export function buildManifest({ chapters, assets, meta, book }) {
  const link = (chapter) => ({
    href: `OEBPS/${chapter.href}`,
    type: 'application/xhtml+xml',
    title: chapter.title,
    properties: {
      route: readerPath(book, chapter.relPath),
      source: chapter.relPath.split('\\').join('/'),
      depth: chapter.depth,
    },
  });

  const toTree = (nodes) =>
    nodes.map((node) => {
      const entry = {
        href: `OEBPS/${node.chapter.href}`,
        title: node.chapter.title,
        properties: { route: readerPath(book, node.chapter.relPath) },
      };
      if (node.children.length) entry.children = toTree(node.children);
      return entry;
    });

  return {
    '@context': 'https://readium.org/webpub-manifest/context.jsonld',
    metadata: {
      '@type': 'http://schema.org/Book',
      conformsTo: 'https://readium.org/webpub-manifest/profiles/epub',
      identifier: meta.identifier,
      title: meta.title,
      author: meta.author,
      language: meta.language,
      modified: meta.modified,
      ...(meta.description ? { description: meta.description } : {}),
      ...(meta.subjects?.length ? { subject: meta.subjects } : {}),
      numberOfPages: chapters.length,
    },
    links: [
      { rel: 'self', href: 'manifest.json', type: 'application/webpub+json' },
      { rel: 'alternate', href: `../${book}.epub`, type: 'application/epub+zip' },
    ],
    readingOrder: chapters.map(link),
    resources: [
      { href: 'OEBPS/styles/book.css', type: 'text/css' },
      { href: 'OEBPS/nav.xhtml', type: 'application/xhtml+xml', rel: 'contents' },
      ...[...assets.values()].map((a) => ({ href: `OEBPS/${a.href}`, type: a.mediaType })),
    ],
    toc: toTree(nest(chapters)),
  };
}
