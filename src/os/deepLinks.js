/**
 * Deep link manager — reflects OS route in URL hash.
 *
 * New format: #today, #projects/abc123, #today?focus=tasks
 * Legacy format (backward compat): #tab=today&focus=tasks
 */

const VALID_ROUTES = ['dashboard', 'today', 'inbox', 'lijsten', 'planning', 'projects', 'settings'];

/**
 * Parse the current URL hash into structured route info.
 * @returns {{ tab: string|null, params: Record<string,string>, focus: string|null, mode: string|null }}
 */
export function parseHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return { tab: null, params: {}, focus: null, mode: null };

  // Backward compat: detect old format (has "tab=" prefix)
  if (hash.includes('tab=')) {
    const sp = new URLSearchParams(hash);
    const tab = sp.get('tab');
    return {
      tab: tab && VALID_ROUTES.includes(tab) ? tab : null,
      params: {},
      focus: sp.get('focus') || null,
      mode: sp.get('mode') || null,
    };
  }

  // New format: #route/param?focus=x&mode=y
  const [path, query] = hash.split('?');
  const qs = new URLSearchParams(query || '');
  const segments = path.split('/').filter(Boolean);
  const route = segments[0] || null;
  const params = {};

  if (route === 'projects' && segments[1]) {
    params.id = segments[1];
  }

  return {
    tab: route && VALID_ROUTES.includes(route) ? route : null,
    params,
    focus: qs.get('focus') || null,
    mode: qs.get('mode') || null,
  };
}

/**
 * Update URL hash without triggering navigation.
 * @param {string} tab - Active route id
 * @param {string|null} [focus] - Optional focus zone
 * @param {Record<string,string>} [params] - Route params (e.g. { id: 'abc' })
 */
export function updateHash(tab, focus, params = {}) {
  if (!tab || !VALID_ROUTES.includes(tab)) return;

  let path = tab;
  if (params.id) path += `/${params.id}`;

  const qs = new URLSearchParams();
  if (focus) qs.set('focus', focus);

  const suffix = qs.toString();
  const newHash = suffix ? `#${path}?${suffix}` : `#${path}`;

  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

/**
 * Scroll a focus target into view within the OS shell.
 * @param {HTMLElement} root - The shell root element
 * @param {string} focus - Zone/section id to scroll to
 */
export function scrollToFocus(root, focus) {
  if (!root || !focus) return;

  const selectors = [
    `[data-vandaag-zone="${CSS.escape(focus)}"]`,
    `[data-os-host="vandaag-${CSS.escape(focus)}"]`,
    `[data-os-host="${CSS.escape(focus)}"]`,
    `#${CSS.escape(focus)}`,
  ];

  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
        return;
      }
    } catch { /* invalid selector, skip */ }
  }
}

/**
 * Generate a deep link URL for a route + focus combination.
 * @param {string} tab
 * @param {string|null} [focus]
 * @param {Record<string,string>} [params]
 * @returns {string} Full URL with hash
 */
export function buildDeepLink(tab, focus, params = {}) {
  let path = tab;
  if (params.id) path += `/${params.id}`;

  const qs = new URLSearchParams();
  if (focus) qs.set('focus', focus);

  const suffix = qs.toString();
  const hashPart = suffix ? `${path}?${suffix}` : path;
  const base = window.location.origin + window.location.pathname;
  return `${base}#${hashPart}`;
}
