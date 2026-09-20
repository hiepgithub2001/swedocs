import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

import { CONTAINER_XML, buildOpf } from './opf.js';
import { buildNav, buildNcx } from './nav.js';
import { BOOK_CSS } from './styles.js';

/**
 * Every file in the package, in the order the spec wants them.
 *
 * Built once and handed to both writers, so the exploded directory the web
 * reader loads is byte-identical to the contents of the `.epub` an e-reader
 * loads. They cannot drift, because there is only one of them.
 */
async function buildPackage({ chapters, assets, meta }) {
  const files = [
    // `mimetype` must be the first entry in the zip and must be STORED, not
    // deflated. Readers sniff those exact bytes at a fixed offset; get it
    // wrong and the file is rejected as corrupt before anything is parsed.
    { path: 'mimetype', data: 'application/epub+zip', store: true },
    { path: 'META-INF/container.xml', data: CONTAINER_XML },
    { path: 'OEBPS/content.opf', data: buildOpf({ chapters, assets, meta }) },
    {
      path: 'OEBPS/nav.xhtml',
      data: buildNav({ chapters, title: meta.title, lang: meta.language }),
    },
    {
      path: 'OEBPS/toc.ncx',
      data: buildNcx({ chapters, title: meta.title, identifier: meta.identifier }),
    },
    { path: 'OEBPS/styles/book.css', data: BOOK_CSS },
    ...chapters.map((c) => ({ path: `OEBPS/${c.href}`, data: c.xhtml })),
  ];

  for (const asset of assets.values()) {
    files.push({ path: `OEBPS/${asset.href}`, data: await fs.readFile(asset.srcPath) });
  }
  return files;
}

/** Package the rendered bundle as a single .epub. */
export async function writeEpub({ chapters, assets, meta, outPath, files = null }) {
  const zip = new JSZip();
  const date = new Date(meta.modified);

  for (const file of files ?? (await buildPackage({ chapters, assets, meta }))) {
    zip.file(file.path, file.data, file.store ? { date, compression: 'STORE' } : { date });
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

/**
 * Write the same package as a directory, plus its web manifest.
 *
 * A monolithic `.epub` is one cache entry: regenerate one chapter and every
 * reader re-downloads all of it. Exploded, a chapter is its own request, and
 * the whole directory can be published under an immutable build id.
 */
export async function writeExploded({ files, manifest, search, outDir }) {
  const root = path.resolve(outDir);
  await fs.rm(root, { recursive: true, force: true });

  for (const file of files) {
    const target = path.join(root, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.data);
  }
  await fs.writeFile(path.join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  if (search) await fs.writeFile(path.join(root, 'search.json'), `${JSON.stringify(search)}\n`);
}

export { buildPackage };
