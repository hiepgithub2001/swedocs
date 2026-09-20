/**
 * Installing the app.
 *
 * Chrome on Android fires `beforeinstallprompt` once a page qualifies — an
 * https:// origin, a manifest with a scope and icons, a service worker with a
 * fetch handler — and that event is the only way to install on demand. Left
 * alone, the browser shows its own banner, which appears when it feels like it
 * and is gone for months once dismissed. So the event is caught, kept, and
 * spent on a button the reader can find.
 *
 * Safari has no such event: on iOS the install lives in the share sheet, so
 * there the same row explains the two taps rather than offering a button. The
 * row is always present — when nothing can be offered it says why, which is
 * usually "this page is plain http", the one cause the reader can act on.
 */
import { loadFlag, saveFlag } from './store.js';

const $ = (sel) => document.querySelector(sel);

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.matchMedia?.('(display-mode: fullscreen)').matches ||
  navigator.standalone === true;

const isApple = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function createInstall() {
  const bar = $('#install-bar');
  const row = $('#install-row');
  const note = $('#install-note');
  const button = $('#install-now');

  let deferred = null;

  const why = () => {
    if (standalone()) return 'You are reading the installed app.';
    if (loadFlag('installed')) return 'Installed. Open it from your home screen.';
    if (isApple()) return 'On iPhone and iPad: Share, then “Add to Home Screen”.';
    if (!window.isSecureContext) {
      return 'Installing needs an https:// address — this page is plain http.';
    }
    return 'Your browser will offer to install once it has seen the app work.';
  };

  const render = () => {
    button.hidden = !deferred;
    note.textContent = deferred ? '' : why();
    bar.hidden = !deferred || standalone() || loadFlag('install-dismissed');
  };

  /**
   * Spend the saved event. It is good for exactly one prompt: if the reader
   * declines, Chrome decides on its own whether to offer another, so the
   * button goes away rather than pretending to still work.
   */
  const install = async () => {
    if (!deferred) return;
    const event = deferred;
    deferred = null;
    render();
    note.textContent = 'Asking the browser…';
    try {
      event.prompt();
      const { outcome } = await event.userChoice;
      note.textContent = outcome === 'accepted' ? 'Installing…' : 'Not installed.';
    } catch {
      render();
    }
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // suppress the browser's own banner in favour of ours
    deferred = event;
    render();
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    saveFlag('installed', true);
    render();
  });

  $('#install-go').addEventListener('click', install);
  button.addEventListener('click', install);

  $('#install-later').addEventListener('click', () => {
    saveFlag('install-dismissed', true);
    bar.hidden = true;
  });

  /** Put the row on the shelf, which replaces its children on every render. */
  const mount = (container) => {
    container.append(row);
    row.hidden = false;
    render();
  };

  render();
  return { render, mount };
}
