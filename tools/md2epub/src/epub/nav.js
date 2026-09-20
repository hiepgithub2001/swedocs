import { escapeXml } from '../render.js';

/** Rebuild the directory hierarchy from each chapter's depth. */
export function nest(chapters) {
  const root = [];
  const stack = [{ depth: -1, children: root }];

  for (const chapter of chapters) {
    while (stack.length > 1 && stack[stack.length - 1].depth >= chapter.depth) stack.pop();
    const node = { chapter, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push({ depth: chapter.depth, children: node.children });
  }
  return root;
}

function navList(nodes, indent = '      ') {
  const items = nodes
    .map((node) => {
      const link = `<a href="${node.chapter.href}">${escapeXml(node.chapter.title)}</a>`;
      const sub = node.children.length ? `\n${navList(node.children, `${indent}    `)}\n${indent}  ` : '';
      return `${indent}  <li>${link}${sub}</li>`;
    })
    .join('\n');
  return `${indent}<ol>\n${items}\n${indent}</ol>`;
}

export function buildNav({ chapters, title, lang }) {
  const tree = nest(chapters);
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(lang)}" lang="${escapeXml(lang)}">
  <head>
    <meta charset="utf-8"/>
    <title>${escapeXml(title)} — Contents</title>
    <link rel="stylesheet" type="text/css" href="styles/book.css"/>
  </head>
  <body>
    <nav epub:type="toc" id="toc" role="doc-toc">
      <h1>Contents</h1>
${navList(tree)}
    </nav>
    <nav epub:type="landmarks" id="landmarks" hidden="hidden">
      <ol>
        <li><a epub:type="toc" href="nav.xhtml">Contents</a></li>
        <li><a epub:type="bodymatter" href="${chapters[0].href}">Start of content</a></li>
      </ol>
    </nav>
  </body>
</html>
`;
}

/**
 * EPUB 2 navigation map. Redundant on a modern reader, but a number of devices
 * (older Kobo/Kindle-converted pipelines) still read the NCX and show no table
 * of contents at all without it. It costs a few kilobytes.
 */
export function buildNcx({ chapters, title, identifier }) {
  let playOrder = 0;

  const points = (nodes, indent = '    ') =>
    nodes
      .map((node) => {
        const id = node.chapter.id;
        const order = ++playOrder;
        const sub = node.children.length ? `\n${points(node.children, `${indent}  `)}` : '';
        return `${indent}<navPoint id="nav-${id}" playOrder="${order}">
${indent}  <navLabel><text>${escapeXml(node.chapter.title)}</text></navLabel>
${indent}  <content src="${node.chapter.href}"/>${sub}
${indent}</navPoint>`;
      })
      .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(identifier)}"/>
    <meta name="dtb:depth" content="4"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
${points(nest(chapters))}
  </navMap>
</ncx>
`;
}
