import { visit } from 'unist-util-visit';
import { toString } from './hast-text.js';

/**
 * Turn ```mermaid fences into static SVG.
 *
 * This is the stage that makes an EPUB possible at all: readers do not run
 * JavaScript, so a diagram must already be a picture by the time it is
 * packaged. `renderer` is injected rather than imported so the core converter
 * has no browser dependency — without one, the diagram source is preserved as
 * a labelled block instead of vanishing.
 */
export function renderMermaid({ renderer, chapter, warnings }) {
  return async (tree) => {
    const jobs = [];

    visit(tree, 'element', (node, i, parent) => {
      if (node.tagName !== 'pre' || !parent || typeof i !== 'number') return;
      const code = node.children?.find((c) => c.type === 'element' && c.tagName === 'code');
      if (!code) return;

      const className = code.properties?.className ?? [];
      if (!className.includes('language-mermaid')) return;

      jobs.push({ source: toString(code).replace(/\n$/, ''), parent, index: i });
    });

    if (!jobs.length) return;

    let n = 0;
    for (const job of jobs) {
      const id = `${chapter.id}-fig${++n}`;
      let svg = null;

      if (renderer) {
        try {
          svg = await renderer(job.source, { id });
        } catch (error) {
          warnings.push({ chapter: chapter.relPath, kind: 'mermaid-failed', detail: error.message });
        }
      }

      job.parent.children[job.index] = svg
        ? {
            type: 'element',
            tagName: 'figure',
            properties: { className: ['diagram'] },
            children: [{ type: 'raw', value: svg }],
          }
        : {
            type: 'element',
            tagName: 'figure',
            properties: { className: ['diagram', 'diagram-source'] },
            children: [
              {
                type: 'element',
                tagName: 'pre',
                properties: {},
                children: [
                  {
                    type: 'element',
                    tagName: 'code',
                    properties: {},
                    children: [{ type: 'text', value: job.source }],
                  },
                ],
              },
              {
                type: 'element',
                tagName: 'figcaption',
                properties: {},
                children: [{ type: 'text', value: 'Diagram (Mermaid source)' }],
              },
            ],
          };
    }
  };
}
