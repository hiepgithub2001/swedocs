import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|mailto:)/i;

/**
 * The reader's route for a chapter: `<book>/<path-without-extension>`.
 *
 * Deliberately derived from the source path rather than the spine position.
 * A chapter's file inside the package is `0013-realtime.xhtml`, which moves
 * whenever something is inserted ahead of it; a link people can bookmark must
 * not. An index page addresses its directory, so a book's own README is just
 * the book.
 */
export function readerPath(book, relPath) {
  const dir = path.dirname(relPath);
  const base = path.basename(relPath, path.extname(relPath));
  const stem = /^(readme|index)$/i.test(base) ? dir : path.join(dir, base);
  const rel = stem === '.' ? '' : stem.split(path.sep).join('/');
  return rel ? `${book}/${rel}` : book;
}

/**
 * Rewrite relative Markdown links onto their chapter.
 *
 * Inside the book, `../algorithms/sorting-and-searching.md#stability` becomes
 * `0012-sorting-and-searching.xhtml#stability` — EPUB readers have no notion of
 * the source tree, so an un-rewritten link is a dead link.
 *
 * Splitting the corpus into one book per area breaks every link that crosses
 * an area, and there is no standard way to link between EPUB publications. So
 * a link into another book becomes an absolute URL into the deployed reader
 * (`baseUrl`): an e-reader opens the browser, the app just routes. A link that
 * leaves the corpus altogether — prompt material, a config file — becomes a
 * URL into the repository (`sourceUrl`), which is where that file actually
 * lives and is readable.
 *
 * A link that matches none of those is unwrapped to plain text rather than
 * left dangling, and reported: a reader that silently does nothing is worse
 * than a build that tells you what it dropped.
 */
export function rewriteLinks({
  chapter,
  bySrcPath,
  warnings,
  externals = new Map(),
  baseUrl = null,
  sourceUrl = null,
  sourceRoot = null,
}) {
  const trim = (url) => url.replace(/\/+$/, '');

  return (tree) => {
    visit(tree, 'link', (node, i, parent) => {
      const url = node.url ?? '';
      if (!url || EXTERNAL.test(url)) return;

      const [rawTarget, hash] = url.split('#');
      if (!rawTarget) return;

      const abs = path.resolve(path.dirname(chapter.srcPath), decodeURIComponent(rawTarget));
      // A link to a directory means that directory's index page — the root
      // README links to `./system-design/`, not to a file.
      const resolve = (map) =>
        map.get(abs) ?? map.get(path.join(abs, 'README.md')) ?? map.get(path.join(abs, 'index.md'));

      const target = resolve(bySrcPath);
      if (target) {
        const file = path.basename(target.href);
        // Anchors are slugged the same way on both sides, so a deep link survives.
        node.url = hash ? `${file}#${new GithubSlugger().slug(decodeURIComponent(hash))}` : file;
        return;
      }

      const external = resolve(externals);
      if (external && baseUrl) {
        const anchor = hash ? `#${new GithubSlugger().slug(decodeURIComponent(hash))}` : '';
        node.url = `${trim(baseUrl)}/${external.route}${anchor}`;
        return;
      }

      // Only for a file that is really there. Without the existence check
      // this branch would quietly absorb every typo into a plausible-looking
      // URL, which is precisely the failure --strict exists to catch.
      const rel = sourceRoot ? path.relative(sourceRoot, abs) : '';
      if (sourceUrl && sourceRoot && !rel.startsWith('..') && fs.existsSync(abs)) {
        node.url = `${trim(sourceUrl)}/${rel.split(path.sep).join('/')}${hash ? `#${hash}` : ''}`;
        return;
      }

      warnings.push({ chapter: chapter.relPath, kind: 'dead-link', detail: url });
      if (parent && typeof i === 'number') {
        parent.children.splice(i, 1, ...node.children);
        return i;
      }
    });
  };
}
