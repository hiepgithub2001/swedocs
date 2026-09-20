/**
 * Diagrams, full screen and zoomable.
 *
 * A rendered Mermaid diagram is an inline SVG sized to the text column: fine
 * on a laptop, a postage stamp on a phone. The detail is already in the file —
 * it is vector — so all it needs is a surface big enough to show it and a way
 * to move around inside it.
 *
 * The package is left exactly as the converter wrote it. The affordance is
 * added to the document the reader loaded, and the zoomed diagram is a clone
 * living in this document, so the same .epub opened in any other reader is
 * untouched by any of this.
 */
const $ = (sel) => document.querySelector(sel);

const MIN = 1; // 1 is "fits the screen" — there is never a reason to go below
const MAX = 12;

export function createLightbox() {
  const dialog = $('#zoom');
  const stage = $('#zoom-stage');
  const canvas = $('#zoom-canvas');
  const caption = $('#zoom-caption');
  const level = $('#zoom-level');

  let natural = { w: 0, h: 0 }; // the SVG's own coordinate size
  let base = { w: 0, h: 0 }; // that size, fitted to the stage, at scale 1
  let scale = 1;
  let tx = 0;
  let ty = 0;

  const pointers = new Map();
  let pinch = null;

  /**
   * Write the current transform out, clamped.
   *
   * Panning is bounded rather than free: a diagram dragged off the edge and
   * lost is the most annoying way for a zoom to fail, and at scale 1 there is
   * nowhere to go, so it stays centred.
   */
  const apply = () => {
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const cw = base.w * scale;
    const ch = base.h * scale;
    tx = cw <= sw ? (sw - cw) / 2 : Math.min(0, Math.max(sw - cw, tx));
    ty = ch <= sh ? (sh - ch) / 2 : Math.min(0, Math.max(sh - ch, ty));
    canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    level.textContent = `${Math.round(scale * 100)}%`;
    stage.classList.toggle('pannable', cw > sw + 1 || ch > sh + 1);
  };

  /** Zoom to `next`, keeping the stage point (px, py) under the same finger. */
  const zoomTo = (next, px, py) => {
    const clamped = Math.min(MAX, Math.max(MIN, next));
    const ratio = clamped / scale;
    tx = px - (px - tx) * ratio;
    ty = py - (py - ty) * ratio;
    scale = clamped;
    apply();
  };

  /** Lay the diagram out to fill the stage, and call that 100%. */
  const fit = () => {
    const k = Math.min(stage.clientWidth / natural.w, stage.clientHeight / natural.h);
    base = { w: natural.w * k, h: natural.h * k };
    canvas.style.width = `${base.w}px`;
    canvas.style.height = `${base.h}px`;
    scale = 1;
    tx = 0;
    ty = 0;
    apply();
  };

  const centre = () => [stage.clientWidth / 2, stage.clientHeight / 2];

  function open(figure) {
    const svg = figure.querySelector('svg');
    if (!svg) return;

    // The renderer writes width/height onto the <svg> from its viewBox, but a
    // hand-written one may carry only the box — and a diagram with neither is
    // still worth showing, so fall back to something with the right feel.
    const box = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    natural = {
      w: parseFloat(svg.getAttribute('width')) || box[2] || 960,
      h: parseFloat(svg.getAttribute('height')) || box[3] || 640,
    };

    const copy = document.importNode(svg, true);
    // The book's copy is capped to the column; this one should fill its box.
    copy.removeAttribute('style');
    copy.setAttribute('width', '100%');
    copy.setAttribute('height', '100%');
    canvas.replaceChildren(copy);

    caption.textContent = figure.querySelector('figcaption')?.textContent?.trim() ?? '';
    caption.hidden = !caption.textContent;

    dialog.showModal();
    fit(); // the stage has no size until the dialog is open
  }

  /**
   * Make every diagram in a loaded chapter openable.
   *
   * Called for each document the reader loads, and idempotent, because
   * foliate-js reloads a section whenever it repaginates.
   */
  const attach = (doc) => {
    for (const figure of doc.querySelectorAll('figure.diagram')) {
      if (figure.dataset.zoom || !figure.querySelector('svg')) continue;
      figure.dataset.zoom = 'on';
      figure.setAttribute('role', 'button');
      figure.setAttribute('tabindex', '0');
      figure.setAttribute(
        'aria-label',
        `${figure.querySelector('figcaption')?.textContent?.trim() || 'Diagram'} — open larger`,
      );
      figure.addEventListener('click', (event) => {
        // The paginator is watching this document for taps and swipes.
        event.preventDefault();
        event.stopPropagation();
        open(figure);
      });
      figure.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        open(figure);
      });
    }
  };

  /* ── gestures ──────────────────────────────────────────────────────── */

  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomTo(scale * Math.exp(-event.deltaY * 0.002), event.clientX - r.left, event.clientY - r.top);
    },
    { passive: false },
  );

  stage.addEventListener('pointerdown', (event) => {
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinch = null;
  });

  stage.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const points = [...pointers.values()];
    if (points.length === 1) {
      tx += event.clientX - previous.x;
      ty += event.clientY - previous.y;
      apply();
      return;
    }
    if (points.length !== 2) return;

    const r = stage.getBoundingClientRect();
    const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    const mid = {
      x: (points[0].x + points[1].x) / 2 - r.left,
      y: (points[0].y + points[1].y) / 2 - r.top,
    };
    if (pinch) {
      // A two-finger gesture zooms and moves at once: take the midpoint's own
      // travel as a pan first, so a pinch held at a constant spread simply
      // drags the diagram instead of pinning it in place.
      tx += mid.x - pinch.mid.x;
      ty += mid.y - pinch.mid.y;
      zoomTo(scale * (dist / pinch.dist), mid.x, mid.y);
    }
    pinch = { dist, mid };
  });

  const release = (event) => {
    pointers.delete(event.pointerId);
    pinch = null;
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  stage.addEventListener('dblclick', (event) => {
    const r = stage.getBoundingClientRect();
    zoomTo(scale > 1.2 ? MIN : 2.5, event.clientX - r.left, event.clientY - r.top);
  });

  /* ── chrome ────────────────────────────────────────────────────────── */

  $('#zoom-in').addEventListener('click', () => zoomTo(scale * 1.5, ...centre()));
  $('#zoom-out').addEventListener('click', () => zoomTo(scale / 1.5, ...centre()));
  $('#zoom-reset').addEventListener('click', fit);
  $('#zoom-close').addEventListener('click', () => dialog.close());

  // Freeing the clone matters: a sequence diagram is a few hundred KB of DOM.
  dialog.addEventListener('close', () => canvas.replaceChildren());

  window.addEventListener('resize', () => {
    if (dialog.open) fit();
  });

  return { attach, open };
}
