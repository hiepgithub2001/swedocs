import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import { toHtml } from 'hast-util-to-html';

import { rewriteLinks } from './transforms/links.js';
import { slugHeadings } from './transforms/headings.js';
import { renderMermaid } from './transforms/mermaid.js';
import { highlightCode } from './transforms/highlight.js';
import { collectAssets } from './transforms/assets.js';

const escapeXml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * XHTML, not HTML. An EPUB is parsed by a strict XML parser, so void elements
 * must self-close and every entity must be numeric — `&nbsp;` is undefined in
 * XML and hard-fails the whole document in most readers.
 */
const XHTML_OPTIONS = {
  closeSelfClosing: true,
  closeEmptyElements: true,
  tightSelfClosing: false,
  characterReferences: { useNamedReferences: false },
  allowDangerousHtml: true,
};

function wrap({ title, body, lang }) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(lang)}" lang="${escapeXml(lang)}">
  <head>
    <meta charset="utf-8"/>
    <title>${escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="../styles/book.css"/>
  </head>
  <body epub:type="bodymatter">
    <section class="chapter">
${body}
    </section>
  </body>
</html>
`;
}

export function createRenderer({
  chapters,
  highlighter,
  themes,
  mermaid,
  lang = 'en',
  warnings = [],
  externals = new Map(),
  baseUrl = null,
  sourceUrl = null,
  sourceRoot = null,
}) {
  const bySrcPath = new Map(chapters.map((c) => [c.srcPath, c]));
  const assets = new Map();

  async function render(chapter) {
    const toc = [];

    const processor = unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ['yaml', 'toml'])
      .use(remarkGfm)
      .use(rewriteLinks, { chapter, bySrcPath, warnings, externals, baseUrl, sourceUrl, sourceRoot })
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(renderMermaid, { renderer: mermaid, chapter, warnings })
      .use(highlightCode, { highlighter, themes, chapter, warnings })
      .use(collectAssets, { chapter, assets, warnings })
      .use(slugHeadings, { toc });

    const tree = await processor.run(processor.parse(chapter.markdown));
    const body = toHtml(tree, XHTML_OPTIONS);

    return { ...chapter, toc, xhtml: wrap({ title: chapter.title, body, lang }) };
  }

  return { render, assets };
}

export { escapeXml };
