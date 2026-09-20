import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import { toString } from './hast-text.js';

/**
 * Give every heading a stable id and collect the chapter's table of contents.
 *
 * Ids come from a per-chapter slugger so duplicates within one file get `-1`
 * suffixes, matching the anchors that `rewriteLinks` generates for inbound
 * deep links.
 */
export function slugHeadings({ toc }) {
  const slugger = new GithubSlugger();
  return (tree) => {
    visit(tree, 'element', (node) => {
      const level = /^h([1-6])$/.exec(node.tagName)?.[1];
      if (!level) return;

      const text = toString(node);
      node.properties = node.properties ?? {};
      const id = node.properties.id ?? slugger.slug(text);
      node.properties.id = id;

      if (Number(level) <= 3) toc.push({ level: Number(level), id, text });
    });
  };
}
