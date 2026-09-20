/**
 * Small, boring persistence: display settings and where you stopped reading.
 *
 * localStorage, wrapped, because it throws outright in a private window and
 * comes back empty after Safari reclaims storage. Nothing here is worth
 * failing a page load over, so every access is guarded and the app renders
 * correctly with none of it.
 */
const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota, private mode, disabled site data — all survivable */
  }
};

const SETTINGS = 'swedocs:settings';

export const DEFAULT_SETTINGS = {
  theme: 'auto',
  size: 100,
  leading: 16,
  flow: 'paginated',
};

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read(SETTINGS, {}) });
export const saveSettings = (settings) => write(SETTINGS, settings);

/**
 * Reading position, keyed by the book's publication identifier rather than by
 * its slug or its build. The identifier is derived from content, so a rebuild
 * keeps the position; a renamed folder would not lose it either.
 */
const positionKey = (identifier) => `swedocs:pos:${identifier}`;

export const loadPosition = (identifier) => read(positionKey(identifier), null);
export const savePosition = (identifier, position) => write(positionKey(identifier), position);

/** Small remembered choices that are not display settings: a dismissed offer,
 * the shelf tab that was open last time. */
export const loadFlag = (name, fallback = false) => read(`swedocs:${name}`, fallback);
export const saveFlag = (name, value) => write(`swedocs:${name}`, value);
