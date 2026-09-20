import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

import { CONTAINER_XML, buildOpf } from './opf.js';
import { buildNav, buildNcx } from './nav.js';
import { BOOK_CSS } from './styles.js';

/**
 * Package the rendered bundle as a single .epub.
 *
 * Two constraints from the spec drive the order below: `mimetype` must be the
 * first entry in the zip and must be STORED, not deflated. Readers sniff those
 * exact bytes at a fixed offset; get it wrong and the file is rejected as
 * corrupt before anything else is even parsed.
 */
export async function writeEpub({ chapters, assets, meta, outPath }) {
  const zip = new JSZip();
  const date = new Date(meta.modified);

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE', date });
  zip.file('META-INF/container.xml', CONTAINER_XML, { date });

  const oebps = zip.folder('OEBPS');
  oebps.file('content.opf', buildOpf({ chapters, assets, meta }), { date });
  oebps.file('nav.xhtml', buildNav({ chapters, title: meta.title, lang: meta.language }), { date });
  oebps.file('toc.ncx', buildNcx({ chapters, title: meta.title, identifier: meta.identifier }), { date });
  oebps.file('styles/book.css', BOOK_CSS, { date });

  for (const chapter of chapters) oebps.file(chapter.href, chapter.xhtml, { date });
  for (const asset of assets.values()) {
    oebps.file(asset.href, await fs.readFile(asset.srcPath), { date });
  }

  // JSZip creates directory entries implicitly (META-INF/, OEBPS/text/, …) and
  // stamps them with the wall clock, which alone is enough to make two builds
  // of identical content differ. Force every entry onto the fixed date.
  for (const entry of Object.values(zip.files)) entry.date = date;

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    streamFiles: false,
  });

  await fs.mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await fs.writeFile(outPath, buffer);
  return { bytes: buffer.length };
}
