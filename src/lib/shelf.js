import { loadPosition, loadFlag, saveFlag } from './store.js';
import * as offline from './offline.js';

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

const DOWN = 'M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4 3.3 3.3zM5 18h14v2H5z';
const ICONS = {
  none: DOWN,
  stale: DOWN, // the same arrow, with a dot: there is something new to fetch
  saved: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z',
  saving: '', // a progress ring, drawn in CSS, with the percentage inside
};

const NOTES = {
  none: '',
  saved: 'Saved offline',
  stale: 'Saved offline · update ready',
};

/**
 * Paint a save button, and the note beside it if there is one, for where the
 * book stands now. Shared by the shelf's cards and the reader's toolbar, so
 * the two can never disagree about a book.
 */
export function paintSave(button, shelf, slug, note = null) {
  const book = shelf.books.find((b) => b.slug === slug);
  const title = book?.title ?? slug;
  const { state, done = 0, total = 0 } = offline.stateOf(shelf, slug);
  const percent = total ? Math.round((done / total) * 100) : 0;

  button.dataset.state = state;
  button.style.setProperty('--p', `${percent}%`);
  button.querySelector('path').setAttribute('d', ICONS[state]);
  button.querySelector('.pct').textContent = state === 'saving' ? `${percent}` : '';
  const label = {
    none: `Save “${title}” for offline reading`,
    saving: `Saving “${title}”… ${percent}%`,
    saved: `“${title}” is saved offline. Tap to remove it.`,
    stale: `Update the offline copy of “${title}”`,
  }[state];
  button.title = label;
  button.ariaLabel = label;
  if (note) {
    note.textContent = state === 'saving' ? `Saving… ${done}/${total || '…'}` : NOTES[state];
    note.dataset.state = state;
  }
}

/** What pressing a save button does, given where the book stands. */
export async function pressSave(shelf, slug) {
  const { state } = offline.stateOf(shelf, slug);
  if (state === 'saving') return null;
  if (state === 'saved') {
    const book = shelf.books.find((b) => b.slug === slug);
    if (!confirm(`Remove the offline copy of “${book?.title ?? slug}”? You can save it again any time.`)) {
      return null;
    }
    await offline.remove(slug);
    return null;
  }
  return offline.save(shelf, slug);
}

const SVG = 'http://www.w3.org/2000/svg';

/** An empty save button; paintSave gives it its icon and label. */
export function makeSaveButton(className) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.append(document.createElementNS(SVG, 'path'));
  return el('button', { type: 'button', className }, [svg, el('span', { className: 'pct' })]);
}

// Every save button on screen, so progress repaints the ones that exist
// without re-rendering the shelf under the reader's thumb.
const painters = new Map(); // slug → Set of repaint functions
offline.onChange((slug) => {
  painters.get(slug)?.forEach((paint) => paint());
  painters.get('*')?.forEach((paint) => paint());
});

export function watchSave(slug, paint) {
  if (!painters.has(slug)) painters.set(slug, new Set());
  painters.get(slug).add(paint);
  paint();
  return () => painters.get(slug)?.delete(paint);
}

let unwatch = []; // the shelf's painters, dropped when it re-renders

const entry = (book, href, shelf) => {
  const saved = loadPosition(book.identifier);
  const note = el('span', { className: 'offline-note' });
  const children = [
    el('a', { href: href(book.slug) }, [
      el('span', { className: 'name', textContent: book.title }),
      el('span', {
        className: 'meta',
        textContent: `${book.chapters} chapter${book.chapters === 1 ? '' : 's'} · ${kb(book.bytes)}`,
      }),
      ...(saved ? [el('span', { className: 'resume', textContent: 'Continue reading' })] : []),
      note,
    ]),
  ];
  if (offline.supported()) {
    const button = makeSaveButton('save');
    button.addEventListener('click', () => pressSave(shelf, book.slug));
    unwatch.push(watchSave(book.slug, () => paintSave(button, shelf, book.slug, note)));
    children.push(button);
  }
  return el('li', {}, children);
};

/**
 * "Save all" for the open collection: the honest count of what is saved, and
 * one press to fetch the rest, one book at a time.
 */
const saveAll = (shelf, books) => {
  const button = el('button', { type: 'button', className: 'save-all' });
  const note = el('span', { className: 'save-all-note' });
  const row = el('p', { className: 'save-all-row' }, [button, note]);
  let running = false;

  const paint = () => {
    const states = books.map((b) => offline.stateOf(shelf, b.slug).state);
    const saved = states.filter((s) => s === 'saved').length;
    const todo = books.filter((_, i) => states[i] !== 'saved');
    const bytes = todo.reduce((n, b) => n + (b.bytes ?? 0), 0);
    button.hidden = todo.length === 0;
    button.disabled = running;
    button.textContent = running
      ? 'Saving…'
      : `Save ${todo.length === books.length ? 'all' : 'the other'} ${todo.length} for offline · ${kb(bytes)}`;
    note.textContent = saved === books.length
      ? `All ${books.length} saved — readable with no connection.`
      : saved ? `${saved} of ${books.length} saved offline.` : '';
  };

  button.addEventListener('click', async () => {
    running = true;
    paint();
    let failed = 0;
    for (const book of books) {
      if (offline.stateOf(shelf, book.slug).state === 'saved') continue;
      if (!(await offline.save(shelf, book.slug))) failed += 1;
    }
    running = false;
    paint();
    if (failed) note.textContent = `${failed} could not be saved. Check the connection and try again.`;
  });

  unwatch.push(watchSave('*', paint));
  return row;
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
  const actions = el('div', { className: 'shelf-actions' });
  const fill = () => {
    unwatch.forEach((stop) => stop());
    unwatch = [];
    list.replaceChildren(...groups.get(open).map((book) => entry(book, href, shelf)));
    actions.replaceChildren(...(offline.supported() ? [saveAll(shelf, groups.get(open))] : []));
  };
  fill();

  const inner = el('div', { className: 'shelf-inner' }, [
    el('h1', { textContent: shelf.title }),
    el('p', {
      className: 'lede',
      textContent: `${shelf.books.length} books · ${shelf.books.reduce(
        (n, b) => n + b.chapters,
        0,
      )} chapters. Tap ↓ on a book to keep all of it on this device for reading offline.`,
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

  inner.append(actions, list);
  container.replaceChildren(inner);
}
