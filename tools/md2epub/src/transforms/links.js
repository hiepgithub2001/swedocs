import path from 'node:path';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|mailto:)/i;

/**
 * Rewrite relative Markdown links onto their chapter inside the book.
 *
 * `../algorithms/sorting-and-searching.md#stability` becomes
 * `0012-sorting-and-searching.xhtml#stability` — EPUB readers have no notion of
 * the source tree, so an un-rewritten link is a dead link. A link whose target
 * is not in the spine is unwrapped to plain text rather than left dangling,
 * and reported, because a reader that silently does nothing is worse than a
 * build that tells you what it dropped.
 */
export function rewriteLinks({ chapter, bySrcPath, warnings }) {
  return (tree) => {
    visit(tree, 'link', (node, i, parent) => {
      const url = node.url ?? '';
      if (!url || EXTERNAL.test(url)) return;

      const [rawTarget, hash] = url.split('#');
      if (!rawTarget) return;

      const abs = path.resolve(path.dirname(chapter.srcPath), decodeURIComponent(rawTarget));
      const target =
        bySrcPath.get(abs) ??
        bySrcPath.get(path.join(abs, 'README.md')) ??
        bySrcPath.get(path.join(abs, 'index.md'));

      if (!target) {
        warnings.push({ chapter: chapter.relPath, kind: 'dead-link', detail: url });
        if (parent && typeof i === 'number') {
          parent.children.splice(i, 1, ...node.children);
          return i;
        }
        return;
      }

      const file = path.basename(target.href);
      // Anchors are slugged the same way on both sides, so a deep link survives.
      node.url = hash ? `${file}#${new GithubSlugger().slug(decodeURIComponent(hash))}` : file;
    });
  };
}
