import { loadPosition, loadFlag, saveFlag } from './store.js';

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const kb = (bytes) =>
  bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

/**
 * Books a build did not put in a collection.
 *
 * `collection` comes from a book's own README frontmatter, so the nine areas
 * that predate the idea have none — and a shelf of one group shows no tabs at
 * all, which is what keeps this invisible until something is actually apart.
 */
const UNGROUPED = 'Knowledge areas';

const entry = (book, href) => {
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
};

/** The library: what is on the shelf, what is in each book, and where you left off. */
export function renderShelf(shelf, container, { href }) {
  const groups = new Map();
  for (const book of shelf.books) {
    const name = book.collection ?? UNGROUPED;
    groups.set(name, [...(groups.get(name) ?? []), book]);
  }

  const names = [...groups.keys()];
  const remembered = loadFlag('shelf-tab', null);
  let open = names.includes(remembered) ? remembered : names[0];

  const list = el('ul', { className: 'books' });
  const fill = () => list.replaceChildren(...groups.get(open).map((book) => entry(book, href)));
  fill();

  const inner = el('div', { className: 'shelf-inner' }, [
    el('h1', { textContent: shelf.title }),
    el('p', {
      className: 'lede',
      textContent: `${shelf.books.length} books · ${shelf.books.reduce(
        (n, b) => n + b.chapters,
        0,
      )} chapters. Everything reads offline once opened.`,
    }),
  ]);

  if (names.length > 1) {
    const tabs = names.map((name) =>
      el('button', {
        type: 'button',
        role: 'tab',
        className: 'tab',
        ariaSelected: String(name === open),
        tabIndex: name === open ? 0 : -1,
      }, [
        el('span', { textContent: name }),
        el('span', { className: 'count', textContent: String(groups.get(name).length) }),
      ]),
    );

    const select = (index) => {
      open = names[index];
      saveFlag('shelf-tab', open);
      tabs.forEach((tab, i) => {
        tab.ariaSelected = String(i === index);
        tab.tabIndex = i === index ? 0 : -1;
      });
      list.setAttribute('aria-label', open);
      fill();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      // A tab strip is one stop in the tab order; the arrows move within it.
      tab.addEventListener('keydown', (event) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        const next = (i + step + tabs.length) % tabs.length;
        select(next);
        tabs[next].focus();
      });
    });

    inner.append(el('div', { className: 'tabs', role: 'tablist', ariaLabel: 'Collections' }, tabs));
    list.setAttribute('role', 'tabpanel');
    list.setAttribute('aria-label', open);
  }

  inner.append(list);
  container.replaceChildren(inner);
}
