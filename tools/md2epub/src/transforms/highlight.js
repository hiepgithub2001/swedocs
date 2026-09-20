import { visit } from 'unist-util-visit';
import { toString } from './hast-text.js';

const LANG_ALIAS = { sh: 'bash', shell: 'bash', yml: 'yaml', jsonc: 'json', txt: 'text', plain: 'text' };

/** Shiki always resolves these without loading a grammar. */
const ALWAYS_AVAILABLE = new Set(['text', 'plaintext', 'plain', 'ansi']);

/** Every fenced-code language used across the corpus, for one-shot highlighter setup. */
export function collectLanguages(chapters) {
  const langs = new Set();
  for (const chapter of chapters) {
    for (const m of chapter.markdown.matchAll(/^[ \t]*(?:`{3,}|~{3,})[ \t]*([A-Za-z0-9_+#-]+)/gm)) {
      const lang = m[1].toLowerCase();
      langs.add(LANG_ALIAS[lang] ?? lang);
    }
  }
  langs.delete('mermaid');
  for (const lang of ALWAYS_AVAILABLE) langs.delete(lang);
  return langs;
}

/**
 * Replace each fenced block with Shiki's pre-coloured markup.
 *
 * Highlighting happens here, at build time, so neither output ships a
 * syntax-highlighting engine. Dual themes are emitted as CSS custom properties
 * so one package can follow a reader's day/night setting.
 */
export function highlightCode({ highlighter, themes, chapter, warnings }) {
  const supported = highlighter
    ? new Set([...highlighter.getLoadedLanguages(), ...ALWAYS_AVAILABLE])
    : new Set();

  return (tree) => {
    const jobs = [];

    visit(tree, 'element', (node, i, parent) => {
      if (node.tagName !== 'pre' || !parent || typeof i !== 'number') return;
      const code = node.children?.find((c) => c.type === 'element' && c.tagName === 'code');
      if (!code) return;

      const className = code.properties?.className ?? [];
      const declared = className
        .find((c) => typeof c === 'string' && c.startsWith('language-'))
        ?.slice('language-'.length)
        ?.toLowerCase();

      jobs.push({ parent, index: i, lang: LANG_ALIAS[declared] ?? declared, source: toString(code).replace(/\n$/, '') });
    });

    for (const job of jobs) {
      if (!highlighter) continue;
      const lang = job.lang && supported.has(job.lang) ? job.lang : 'text';
      if (job.lang && lang === 'text' && !ALWAYS_AVAILABLE.has(job.lang)) {
        warnings.push({ chapter: chapter.relPath, kind: 'unknown-language', detail: job.lang });
      }

      const root = highlighter.codeToHast(job.source, { lang, themes, defaultColor: false });
      const pre = root.children.find((c) => c.type === 'element' && c.tagName === 'pre');
      if (pre) job.parent.children[job.index] = pre;
    }
  };
}
