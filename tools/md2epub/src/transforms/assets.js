import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|data:)/i;

const MEDIA_TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

/**
 * Pull locally-referenced images into the package and repoint their `src`.
 *
 * An EPUB is a sealed zip: anything not carried inside it is simply missing
 * when the reader is offline, which is the normal case.
 */
export function collectAssets({ chapter, assets, warnings }) {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;
      const src = node.properties?.src;
      if (!src || EXTERNAL.test(src)) return;

      const abs = path.resolve(path.dirname(chapter.srcPath), decodeURIComponent(src.split('#')[0]));
      const ext = path.extname(abs).toLowerCase();
      const mediaType = MEDIA_TYPES[ext];

      if (!mediaType || !fs.existsSync(abs)) {
        warnings.push({ chapter: chapter.relPath, kind: 'missing-image', detail: src });
        return;
      }

      if (!assets.has(abs)) {
        const safe = path
          .basename(abs, ext)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        assets.set(abs, {
          id: `img${String(assets.size).padStart(3, '0')}`,
          href: `images/${String(assets.size).padStart(3, '0')}-${safe || 'image'}${ext}`,
          mediaType,
          srcPath: abs,
        });
      }

      node.properties.src = `../${assets.get(abs).href}`;
      if (!node.properties.alt) node.properties.alt = '';
    });
  };
}
