import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const MD_EXT = new Set(['.md', '.markdown', '.mdown', '.mkd']);
const INDEX_NAMES = new Set(['readme', 'index']);
export const DEFAULT_IGNORE = new Set([
  'node_modules', '.git', '.github', 'dist', 'build', 'out', '.next', '.obsidian', 'tools',
]);

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

const isIndex = (name) => INDEX_NAMES.has(path.basename(name, path.extname(name)).toLowerCase());

/** Humanise `2-case-studies` / `big-o_complexity` into `Big O Complexity`. */
function humanise(name) {
  return name
    .replace(/^\d+[-_.\s]+/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** First ATX H1 in the source, if there is one outside a fenced block. */
function firstHeading(markdown) {
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const f = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (line.trimStart().startsWith(fence)) fence = null;
      continue;
    }
    if (fence) continue;
    const h = line.match(/^\s{0,3}#\s+(.+?)\s*#*\s*$/);
    if (h) return h[1].trim();
  }
  return null;
}

async function readDoc(absPath) {
  const raw = await fs.readFile(absPath, 'utf8');
  const { data, content } = matter(raw);
  return {
    data,
    content,
    title: data.title ?? firstHeading(content) ?? humanise(path.basename(absPath, path.extname(absPath))),
    order: Number.isFinite(data.order) ? Number(data.order) : null,
  };
}

/**
 * Walk `dir` into a tree of file/dir nodes.
 *
 * Ordering at every level is: explicit frontmatter `order`, then natural
 * (numeric-aware) filename order — so `1-knowledge` precedes `2-case-studies`
 * and `10-appendix` still lands after `9-…`. A directory inherits its order and
 * title from its own index file, which lets a README steer where its whole
 * subtree sits without any tool-specific config file.
 */
async function walk(dir, { ignore, depth = 0 }) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const mdNames = [];
  const dirNames = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || ignore.has(entry.name)) continue;
    if (entry.isDirectory()) dirNames.push(entry.name);
    else if (MD_EXT.has(path.extname(entry.name).toLowerCase())) mdNames.push(entry.name);
  }

  const fileNodes = [];
  for (const name of mdNames) {
    const abs = path.join(dir, name);
    fileNodes.push({ type: 'file', name, abs, doc: await readDoc(abs), index: isIndex(name) });
  }

  const index = fileNodes.find((f) => f.index) ?? null;
  const rest = fileNodes.filter((f) => f !== index);

  // A directory's index page occupies this nav level and everything else in the
  // directory nests one level beneath it. A directory with no index page
  // contributes no level of its own — its contents rise to the parent's level,
  // so an organisational folder never shows up as an empty branch.
  const childDepth = index ? depth + 1 : depth;
  if (index) index.depth = depth;
  for (const node of rest) node.depth = childDepth;

  const dirNodes = [];
  for (const name of dirNames) {
    const child = await walk(path.join(dir, name), { ignore, depth: childDepth });
    if (child.chapters.length) dirNodes.push(child);
  }

  const rank = (node) => {
    const order = node.type === 'dir' ? node.order : node.doc.order;
    return order ?? Number.POSITIVE_INFINITY;
  };
  const byOrderThenName = (a, b) => rank(a) - rank(b) || collator.compare(a.name, b.name);

  rest.sort(byOrderThenName);
  dirNodes.sort(byOrderThenName);

  // Files before subdirectories: a section's own pages read ahead of its subsections.
  const children = [...rest, ...dirNodes];

  return {
    type: 'dir',
    name: path.basename(dir),
    abs: dir,
    depth,
    index,
    children,
    order: index?.doc.order ?? null,
    title: index?.doc.title ?? humanise(path.basename(dir)),
    get chapters() {
      return [index, ...children].filter(Boolean);
    },
  };
}

/** Depth-first flatten: a directory's index page, then its children. */
function flatten(node, out = []) {
  if (node.type === 'file') {
    out.push(node);
    return out;
  }
  if (node.index) out.push(node.index);
  for (const child of node.children) flatten(child, out);
  return out;
}

export async function scan(root, { ignore = [] } = {}) {
  const ignoreSet = new Set([...DEFAULT_IGNORE, ...ignore]);
  const tree = await walk(path.resolve(root), { ignore: ignoreSet });
  const chapters = flatten(tree).map((node, i) => ({
    index: i,
    id: `ch${String(i).padStart(4, '0')}`,
    href: `text/${String(i).padStart(4, '0')}-${path
      .basename(node.abs, path.extname(node.abs))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'page'}.xhtml`,
    srcPath: node.abs,
    relPath: path.relative(path.resolve(root), node.abs),
    depth: node.depth ?? 0,
    title: node.doc.title,
    frontmatter: node.doc.data,
    markdown: node.doc.content,
  }));

  if (!chapters.length) throw new Error(`No Markdown files found under ${root}`);
  return { root: path.resolve(root), tree, chapters };
}

export { humanise };
