import { escapeXml } from '../render.js';

export const CONTAINER_XML = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;

export function buildOpf({ chapters, assets, meta }) {
  const { title, author, language, identifier, description, modified, subjects = [] } = meta;

  const manifest = [
    '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    '    <item id="css" href="styles/book.css" media-type="text/css"/>',
    ...chapters.map((c) => {
      // `svg` tells the reader the document embeds SVG; omitting it is a
      // validation error and makes some engines skip rendering the diagram.
      const props = c.xhtml.includes('<svg') ? ' properties="svg"' : '';
      return `    <item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"${props}/>`;
    }),
    ...[...assets.values()].map(
      (a) => `    <item id="${a.id}" href="${a.href}" media-type="${a.mediaType}"/>`,
    ),
  ].join('\n');

  const spine = chapters.map((c) => `    <itemref idref="${c.id}"/>`).join('\n');

  const subjectTags = subjects
    .map((s) => `    <dc:subject>${escapeXml(s)}</dc:subject>`)
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${escapeXml(language)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>${escapeXml(language)}</dc:language>
    <dc:creator id="creator">${escapeXml(author)}</dc:creator>
    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
${description ? `    <dc:description>${escapeXml(description)}</dc:description>\n` : ''}${subjectTags ? `${subjectTags}\n` : ''}    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
${manifest}
  </manifest>
  <spine toc="ncx">
${spine}
  </spine>
</package>
`;
}
