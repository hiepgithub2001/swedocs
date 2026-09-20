const $ = (sel) => document.querySelector(sel);

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

/**
 * The side panel: contents, and search over them.
 *
 * Search comes in two tiers. The first is section-level: chapter titles and
 * headings, from one small file per book fetched the first time the box is
 * opened. That is what "point me at the section on consistent hashing"
 * actually needs, and it answers instantly without downloading the book.
 *
 * The second tier only runs when asked, because it reads every chapter of the
 * book to do it. Offering it as a button rather than running it automatically
 * keeps the common case cheap and makes the expensive case a deliberate act.
 */
export function createPanel({ hrefFor, onNavigate, onNavigateTo, fullText }) {
  const panel = $('#panel');
  const body = $('#panel-body');
  const input = $('#search-input');

  let manifest = null;
  let index = null;
  let loadIndex = null;
  let currentRoute = null;

  const close = () => {
    panel.hidden = true;
    $('#open-toc').setAttribute('aria-expanded', 'false');
  };

  // Real hrefs, not `#`: these are the same URLs the address bar shows, so
  // they can be copied, opened in a new tab and read by a screen reader as
  // destinations. The handler stops the event here rather than letting the
  // app's delegated link handler see it twice.
  const link = (label, route, anchor, where) => {
    const a = el('a', {
      href: hrefFor(route) + (anchor ? `#${anchor}` : ''),
      textContent: label,
    });
    if (where) a.append(el('span', { className: 'hit-where', textContent: where }));
    if (!anchor && route === currentRoute) a.setAttribute('aria-current', 'true');
    a.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation();
      close();
      onNavigate(route, anchor);
    });
    return a;
  };

  const tocList = (items) =>
    el(
      'ol',
      {},
      items.map((item) =>
        el('li', {}, [
          link(item.title, item.properties?.route, null),
          ...(item.children ? [tocList(item.children)] : []),
        ]),
      ),
    );

  const showToc = () => {
    body.replaceChildren(manifest?.toc?.length ? tocList(manifest.toc) : el('p', {
      className: 'empty',
      textContent: 'No contents.',
    }));
  };

  /** Chapter titles first, then section headings; both plain substring. */
  const search = (query) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return showToc();
    if (!index) return;

    const hits = [];
    for (const chapter of index.chapters) {
      if (chapter.title.toLowerCase().includes(needle)) {
        hits.push({ label: chapter.title, route: chapter.route, rank: 0 });
      }
      for (const section of chapter.sections) {
        if (section.text.toLowerCase().includes(needle)) {
          hits.push({
            label: section.text,
            where: chapter.title,
            route: chapter.route,
            anchor: section.id,
            rank: 1,
          });
        }
      }
      if (hits.length > 120) break;
    }

    hits.sort((a, b) => a.rank - b.rank);
    body.replaceChildren(
      hits.length
        ? el('ol', {}, hits.map((hit) => el('li', {}, [link(hit.label, hit.route, hit.anchor, hit.where)])))
        : el('p', { className: 'empty', textContent: `No section matches “${query}”.` }),
      fullTextButton(query),
    );
  };

  /** Tier two: every word of the book, on request. */
  const fullTextButton = (query) => {
    const button = el('button', { type: 'button', className: 'full-text' }, [
      `Search the full text for “${query}”`,
    ]);
    button.addEventListener('click', async () => {
      button.disabled = true;
      const list = el('ol');
      const note = el('p', { className: 'empty', textContent: 'Reading the book…' });
      body.replaceChildren(note, list);

      let found = 0;
      await fullText(query, {
        onProgress: (fraction) => {
          note.textContent = `Reading the book… ${Math.round(fraction * 100)}%`;
        },
        onHit: ({ label, subitems }) => {
          for (const { cfi, excerpt } of subitems) {
            found += 1;
            const a = el('a', { href: '#' }, [
              el('span', {}, [excerpt.pre, el('mark', { textContent: excerpt.match }), excerpt.post]),
              el('span', { className: 'hit-where', textContent: label }),
            ]);
            a.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              close();
              onNavigateTo(cfi);
            });
            list.append(el('li', {}, [a]));
          }
        },
      });
      note.textContent = found ? `${found} matches.` : `Nothing matches “${query}”.`;
    });
    return button;
  };

  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => search(input.value), 120);
  });

  $('#panel-close').addEventListener('click', close);
  $('#open-toc').addEventListener('click', async () => {
    input.value = '';
    showToc();
    await reveal();
    body.querySelector('[aria-current]')?.scrollIntoView({ block: 'center' });
  });
  $('#open-search').addEventListener('click', async () => {
    await reveal();
    input.focus();
    input.select();
  });

  async function reveal() {
    panel.hidden = false;
    $('#open-toc').setAttribute('aria-expanded', 'true');
    if (!index && loadIndex) {
      index = await loadIndex().catch(() => null);
      if (input.value) search(input.value);
    }
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) close();
  });

  return {
    close,
    /** A new book: drop the old index rather than searching the wrong one. */
    setBook(nextManifest, nextLoadIndex) {
      manifest = nextManifest;
      loadIndex = nextLoadIndex;
      index = null;
      input.value = '';
      close();
    },
    setRoute(route) {
      currentRoute = route;
      if (!panel.hidden && !input.value) showToc();
    },
  };
}
