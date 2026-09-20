import { loadSettings, saveSettings } from './store.js';

const $ = (sel) => document.querySelector(sel);

/**
 * Display settings, applied in two places at once.
 *
 * The chrome follows `data-theme` on this document; the book follows the same
 * attribute on the document inside the reader, plus a small stylesheet of
 * `--reader-*` values. book.css declares every colour and metric as a custom
 * property for exactly this reason, so the publisher's styles and the reader's
 * preferences compose rather than fight — no `!important` arms race, and the
 * same stylesheet still works in a standalone .epub where no app is involved.
 */
export function createSettings(onChange) {
  let settings = loadSettings();
  const dialog = $('#settings');

  /**
   * How tall a table's frame may be.
   *
   * Measured rather than written as `vh`, because the reader's viewport is
   * only the screen in paginated mode: set to scroll, foliate-js makes the
   * iframe as tall as the whole chapter, and 78vh of that is several pages.
   * The host element is the reading surface in both modes.
   */
  const frameHeight = () =>
    Math.max(240, Math.round(($('#view-host')?.clientHeight || window.innerHeight) * 0.78));

  const userCss = () => `
    :root {
      --reader-font-size: ${settings.size / 100}em;
      --reader-line-height: ${settings.leading / 10};
    }
    /* The reader's tap zones sit over the page edges, so keep text clear of
       them, and never let a diagram or a wide table push a column sideways. */
    body { padding-inline: 0.4em; }
    img, svg, figure { max-width: 100%; }
    pre { white-space: pre-wrap !important; }

    /* A table gets a frame the size of the page and scrolls inside it, rather
       than reflowing — book.css sizes it to the column because most EPUB
       engines cannot scroll a block at all, and here we can. */
    table {
      display: block;
      width: max-content;
      max-width: 100%;
      max-height: ${frameHeight()}px;
      overflow: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      border: 1px solid var(--rule);
      border-radius: 6px;
      -webkit-column-break-inside: avoid;
      break-inside: avoid;
    }
    /* max-content alone would set a 200-character prose cell on one line and
       make you scroll a sentence; capping the cell gives every column a
       readable measure and lets the table, not the words, be the wide thing. */
    table th, table td { max-width: 16em; }
    /* Scrolling down a long table should not lose the column names. */
    table thead th {
      position: sticky;
      top: 0;
      z-index: 1;
    }

    /* A diagram is a button here — the app opens it full screen and lets you
       zoom in. The attribute is set by the app on the document it loaded, so
       the same package in a standalone reader shows none of this. */
    figure.diagram[data-zoom] {
      position: relative;
      cursor: zoom-in;
      -webkit-tap-highlight-color: transparent;
    }
    figure.diagram[data-zoom]::after {
      content: "\\2921";
      position: absolute;
      top: 0;
      right: 0;
      padding: 0.15em 0.4em;
      border: 1px solid var(--rule);
      border-radius: 6px;
      background: var(--paper);
      color: var(--muted);
      font-size: 0.8em;
      line-height: 1.3;
      pointer-events: none;
    }
    figure.diagram[data-zoom]:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 4px;
    }
  `;

  const applyChrome = () => {
    document.documentElement.dataset.theme = settings.theme;
    if (settings.theme === 'auto') delete document.documentElement.dataset.theme;
  };

  /** Called for every document the reader loads, including re-loads. */
  const applyToDocument = (doc) => {
    if (settings.theme === 'auto') delete doc.documentElement.dataset.theme;
    else doc.documentElement.dataset.theme = settings.theme;
  };

  const sync = () => {
    $('#out-size').value = `${settings.size}%`;
    $('#out-leading').value = (settings.leading / 10).toFixed(1);
    $('#set-size').value = settings.size;
    $('#set-leading').value = settings.leading;
    for (const input of dialog.querySelectorAll('input[name="theme"]')) {
      input.checked = input.value === settings.theme;
    }
    for (const input of dialog.querySelectorAll('input[name="flow"]')) {
      input.checked = input.value === settings.flow;
    }
  };

  const update = (patch) => {
    settings = { ...settings, ...patch };
    saveSettings(settings);
    applyChrome();
    sync();
    onChange(settings);
  };

  dialog.addEventListener('input', (event) => {
    const { id, name, value } = event.target;
    if (id === 'set-size') update({ size: Number(value) });
    else if (id === 'set-leading') update({ leading: Number(value) });
    else if (name === 'theme') update({ theme: value });
    else if (name === 'flow') update({ flow: value });
  });

  $('#open-settings').addEventListener('click', () => dialog.showModal());

  applyChrome();
  sync();

  return {
    get value() {
      return settings;
    },
    userCss,
    applyToDocument,
  };
}
