#!/usr/bin/env node
/**
 * Structural validation of a built .epub.
 *
 * Not a substitute for epubcheck (which needs a JVM), but it covers the
 * failure modes that actually brick a book on a device: a mis-stored mimetype,
 * XML that is not well-formed, a manifest that disagrees with the zip, and
 * cross-references that point at nothing.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import JSZip from 'jszip';
import { SaxesParser } from 'saxes';

const XHTML_LIKE = /\.(xhtml|opf|ncx|xml)$/i;

function checkMimetypeHeader(buffer) {
  const problems = [];
  if (buffer.readUInt32LE(0) !== 0x04034b50) {
    problems.push('zip does not start with a local file header');
    return problems;
  }
  const method = buffer.readUInt16LE(8);
  const nameLen = buffer.readUInt16LE(26);
  const extraLen = buffer.readUInt16LE(28);
  const name = buffer.subarray(30, 30 + nameLen).toString('ascii');
  const body = buffer.subarray(30 + nameLen + extraLen, 30 + nameLen + extraLen + 20).toString('ascii');

  if (name !== 'mimetype') problems.push(`first zip entry is "${name}", must be "mimetype"`);
  if (method !== 0) problems.push(`mimetype is compressed (method ${method}), must be stored`);
  if (!body.startsWith('application/epub+zip')) problems.push('mimetype content is wrong');
  return problems;
}

function parseXml(name, xml) {
  const problems = [];
  const ids = new Set();
  const parser = new SaxesParser({ fileName: name, xmlns: true });

  parser.on('error', (error) => problems.push(`${name}: ${error.message.split('\n')[0]}`));
  parser.on('opentag', (node) => {
    const id = node.attributes.id?.value ?? node.attributes.id;
    if (typeof id === 'string') ids.add(id);
  });

  try {
    parser.write(xml).close();
  } catch (error) {
    problems.push(`${name}: ${error.message}`);
  }
  return { problems, ids };
}

const attrs = (tag) =>
  Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));

async function validate(file) {
  const buffer = await fs.readFile(file);
  const problems = [...checkMimetypeHeader(buffer)];
  const zip = await JSZip.loadAsync(buffer);

  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const text = new Map();
  const idsByFile = new Map();

  for (const name of names) {
    if (!XHTML_LIKE.test(name)) continue;
    const xml = await zip.files[name].async('string');
    text.set(name, xml);
    const { problems: p, ids } = parseXml(name, xml);
    problems.push(...p);
    idsByFile.set(name, ids);
  }

  if (!zip.files['META-INF/container.xml']) problems.push('missing META-INF/container.xml');

  const opfPath = 'OEBPS/content.opf';
  const opf = text.get(opfPath);
  if (!opf) {
    problems.push('missing OEBPS/content.opf');
    return { problems, names };
  }

  const items = [...opf.matchAll(/<item\b[^>]*\/>/g)].map((m) => attrs(m[0]));
  const manifestHrefs = new Set();
  const byId = new Map();

  for (const item of items) {
    byId.set(item.id, item);
    const resolved = path.posix.join(path.posix.dirname(opfPath), item.href);
    manifestHrefs.add(resolved);
    if (!zip.files[resolved]) problems.push(`manifest item "${item.id}" -> ${item.href} is not in the zip`);
  }

  for (const name of names) {
    if (name === 'mimetype' || name === 'META-INF/container.xml' || name === opfPath) continue;
    if (!manifestHrefs.has(name)) problems.push(`${name} is in the zip but missing from the manifest`);
  }

  const spine = [...opf.matchAll(/<itemref\b[^>]*\/>/g)].map((m) => attrs(m[0]).idref);
  for (const idref of spine) {
    if (!byId.has(idref)) problems.push(`spine references unknown manifest id "${idref}"`);
  }
  if (!items.some((i) => i.properties?.split(/\s+/).includes('nav'))) {
    problems.push('no manifest item declares properties="nav"');
  }

  // Cross-references: every internal href must land on a real file and, when it
  // carries a fragment, on a real id inside that file.
  for (const [name, xml] of text) {
    if (!name.endsWith('.xhtml')) continue;
    for (const m of xml.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)) {
      const raw = m[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|data:)/i.test(raw)) continue;

      const [target, fragment] = raw.split('#');
      const resolved = target
        ? path.posix.normalize(path.posix.join(path.posix.dirname(name), target))
        : name;

      if (!zip.files[resolved]) {
        problems.push(`${name}: link to missing file ${raw}`);
        continue;
      }
      if (fragment && idsByFile.has(resolved) && !idsByFile.get(resolved).has(fragment)) {
        problems.push(`${name}: link to missing anchor ${raw}`);
      }
    }
  }

  // SVG must be declared, or readers may refuse to render the diagram.
  for (const [name, xml] of text) {
    if (!name.endsWith('.xhtml') || !xml.includes('<svg')) continue;
    const item = items.find((i) => path.posix.join('OEBPS', i.href) === name);
    if (item && !item.properties?.split(/\s+/).includes('svg')) {
      problems.push(`${name} embeds SVG but does not declare properties="svg"`);
    }
  }

  return { problems, names, spine, items };
}

/** Accept files, or directories whose .epub files should all be checked. */
async function expand(targets) {
  const out = [];
  for (const target of targets) {
    const stat = await fs.stat(target).catch(() => null);
    if (!stat) {
      process.stderr.write(`md2epub: no such path ${target}\n`);
      process.exit(1);
    }
    if (stat.isDirectory()) {
      const names = (await fs.readdir(target)).filter((n) => n.endsWith('.epub')).sort();
      out.push(...names.map((n) => path.join(target, n)));
    } else {
      out.push(target);
    }
  }
  return out;
}

const targets = process.argv.slice(2);
if (!targets.length) {
  process.stderr.write('usage: node test/validate.js <file.epub | directory> …\n');
  process.exit(1);
}

const files = await expand(targets);
if (!files.length) {
  process.stderr.write('md2epub: no .epub files found\n');
  process.exit(1);
}

process.stdout.write('\n');
let failed = 0;

for (const file of files) {
  const { problems, names, spine } = await validate(file);
  const label = path.basename(file);

  if (problems.length) {
    failed++;
    process.stdout.write(`  ✗ ${label}  — ${problems.length} problem(s)\n`);
    for (const p of problems.slice(0, 10)) process.stdout.write(`      ${p}\n`);
    if (problems.length > 10) process.stdout.write(`      … and ${problems.length - 10} more\n`);
  } else {
    process.stdout.write(
      `  ✓ ${label.padEnd(34)} ${String(spine?.length ?? 0).padStart(3)} chapters  ${String(names.length).padStart(3)} files\n`,
    );
  }
}

const checks = 'mimetype · XML · manifest · spine · links & anchors';
process.stdout.write(
  failed
    ? `\n  FAILED — ${failed} of ${files.length} package(s) have problems\n\n`
    : `\n  PASSED — ${files.length} package(s)  (${checks})\n\n`,
);
process.exit(failed ? 1 : 0);
