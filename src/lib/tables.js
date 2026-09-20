/**
 * Wide tables.
 *
 * A table is the one thing in a chapter that cannot reflow. Squeezed into a
 * phone-width column, a six-column comparison turns into one letter per line;
 * left at its natural width, it runs off the side of a page that has no way to
 * scroll sideways. So it gets a frame the size of the page and scrolls inside
 * it, both ways — which the injected stylesheet does on its own, except for
 * one thing.
 *
 * The paginator listens for touchmove on the chapter document and turns it
 * into a page turn, calling preventDefault() on the way. A drag that starts
 * inside a scrollable table has to be kept away from that listener or the
 * table never moves and the page turns instead. Those listeners are on the
 * document and in the bubble phase, so stopping propagation at the table is
 * enough. Whether to do so is decided once, at touchstart, and only when the
 * table has somewhere to scroll — a swipe across a table that already fits
 * still turns the page, which is what that swipe is for.
 */
export function attachTables(doc) {
  for (const table of doc.querySelectorAll('table')) {
    if (table.dataset.frame) continue;
    table.dataset.frame = 'on';

    let holding = false;
    const guard = (event) => {
      if (holding) event.stopPropagation();
    };
    const end = (event) => {
      guard(event);
      holding = false;
    };

    // Never preventDefault: the browser's own scrolling is the whole point.
    const passive = { passive: true };
    table.addEventListener(
      'touchstart',
      (event) => {
        holding =
          table.scrollWidth > table.clientWidth + 1 || table.scrollHeight > table.clientHeight + 1;
        guard(event);
      },
      passive,
    );
    table.addEventListener('touchmove', guard, passive);
    table.addEventListener('touchend', end, passive);
    table.addEventListener('touchcancel', end, passive);
  }
}
