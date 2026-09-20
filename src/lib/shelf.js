import { loadPosition } from './store.js';

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const kb = (bytes) =>
  bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

/** The library: nine books, what is in each, and where you left off. */
export function renderShelf(shelf, container, { href }) {
  container.replaceChildren(
    el('div', { className: 'shelf-inner' }, [
      el('h1', { textContent: shelf.title }),
      el('p', {
        className: 'lede',
        textContent: `${shelf.books.length} books · ${shelf.books.reduce(
          (n, b) => n + b.chapters,
          0,
        )} chapters. Everything reads offline once opened.`,
      }),
      el(
        'ul',
        { className: 'books' },
        shelf.books.map((book) => {
          const saved = loadPosition(book.identifier);
          return el('li', {}, [
            el('a', { href: href(book.slug) }, [
              el('span', { className: 'name', textContent: book.title }),
              el('span', {
                className: 'meta',
                textContent: `${book.chapters} chapters · ${kb(book.bytes)}`,
              }),
              ...(saved ? [el('span', { className: 'resume', textContent: 'Continue reading' })] : []),
            ]),
          ]);
        }),
      ),
    ]),
  );
}
