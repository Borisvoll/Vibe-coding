const STORE_PREFIX = 'os_block_template_';

export function getTemplateState(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(`${STORE_PREFIX}${key}`);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setTemplateState(key, value) {
  try {
    window.localStorage.setItem(`${STORE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Keep block non-fatal if storage is unavailable.
  }
}
