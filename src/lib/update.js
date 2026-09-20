/**
 * Pulling the latest app.
 *
 * The service worker answers the shell from its own cache, first, always — that
 * is what makes the app open with no network. The cost is that a deployed
 * change does not arrive by reloading: the page that reload draws comes out of
 * the same cache it did before. A new shell arrives only when a new worker
 * takes over, and the browser decides when to go looking for one (roughly: on
 * navigation, at most once a day, and never at all while the tab stays open).
 *
 * So: a button. It asks for the worker script, and if that has changed, waits
 * for the new worker to take charge and reloads into it. If the script is
 * byte-identical the app can still have changed underneath it — during
 * development it usually has — so the worker is asked to re-fetch the shell
 * past every cache, and the page reloads onto that.
 */
import { loadFlag, saveFlag } from './store.js';

const $ = (sel) => document.querySelector(sel);

/** Resolve when this worker is running the show, or has given up. */
const settled = (worker) =>
  new Promise((resolve) => {
    if (worker.state === 'activated' || worker.state === 'redundant') return resolve();
    worker.addEventListener('statechange', () => {
      // A worker that installs while another controls the page waits its turn.
      // sw.js calls skipWaiting() itself, but an older copy may not have.
      if (worker.state === 'installed') worker.postMessage({ type: 'skip-waiting' });
      if (worker.state === 'activated' || worker.state === 'redundant') resolve();
    });
  });

/**
 * Ask the active worker to refresh the shell.
 *
 * Over a port rather than `navigator.serviceWorker.controller`, because on a
 * first visit the worker is registered but does not control this page yet —
 * which is exactly when a reader is most likely to press the button.
 */
const refreshShell = (worker) =>
  new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(false), 30000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timer);
      resolve(data?.ok === true);
    };
    worker.postMessage({ type: 'refresh-shell' }, [channel.port2]);
  });

export function createUpdate() {
  const row = $('#update-row');
  const button = $('#update-now');
  const state = $('#update-state');

  let busy = false;

  /**
   * Reload into the new app — and leave a note, because the reload is what
   * throws away every word this row has said. Without it the button's whole
   * visible effect is a flicker.
   */
  const done = () => {
    saveFlag('updated', true);
    location.reload();
  };

  const run = async () => {
    if (busy) return;
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (!registration) {
      // Nothing is cached, so there is nothing stale to clear.
      state.textContent = 'Nothing is stored here — reload for the latest.';
      return;
    }

    busy = true;
    button.disabled = true;
    state.textContent = 'Checking…';

    try {
      await registration.update();
      const incoming = registration.installing ?? registration.waiting;
      if (incoming) {
        state.textContent = 'Updating…';
        await settled(incoming);
        done();
        return;
      }

      // The worker script is unchanged. The files it serves may not be.
      state.textContent = 'Refreshing…';
      const ok = await refreshShell(registration.active);
      if (!ok) {
        state.textContent = 'Could not reach the network. Still on the stored version.';
        return;
      }
      done();
    } catch (error) {
      state.textContent = `Could not check. ${error.message}`;
    } finally {
      busy = false;
      button.disabled = false;
    }
  };

  button.addEventListener('click', run);

  /** Put the row on the shelf, which replaces its children on every render. */
  const mount = (container) => {
    container.append(row);
    row.hidden = !('serviceWorker' in navigator);
    if (!loadFlag('updated')) return;
    saveFlag('updated', false);
    state.textContent = 'Up to date.';
  };

  return { mount };
}
