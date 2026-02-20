/**
 * Deep link manager — reflects OS tab + focus in URL hash.
 *
 * URL format: #tab=vandaag&focus=tasks
 * Supports: tab (any SHELL_TAB), focus (section zone id), mode
 */

const VALID_TABS = ['dashboard', 'today', 'inbox', 'lijsten', 'planning', 'settings'];

/**
 * Parse the current URL hash into structured params.
 * @returns {{ tab: string|null, focus: string|null, mode: string|null }}
 */
export function parseHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return { tab: null, focus: null, mode: null };

  const params = new URLSearchParams(hash);
  const tab = params.get('tab');
  const focus = params.get('focus');
  const mode = params.get('mode');

  return {
    tab: tab && VALID_TABS.includes(tab) ? tab : null,
    focus: focus || null,
    mode: mode || null,
  };
}

/**
 * Update URL hash without triggering navigation.
 * @param {string} tab - Active tab id
 * @param {string|null} [focus] - Optional focus zone
 */
export function updateHash(tab, focus) {
  if (!tab || !VALID_TABS.includes(tab)) return;

  const params = new URLSearchParams();
  params.set('tab', tab);
  if (focus) params.set('focus', focus);

  const newHash = `#${params.toString()}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

/**
 * Scroll a focus target into view within the OS shell.
 * Looks for: [data-vandaag-zone="<focus>"], [data-os-host="<focus>"], or [id="<focus>"]
 *
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
        // Small delay to ensure blocks are mounted
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
        return;
      }
    } catch { /* invalid selector, skip */ }
  }
}

/**
 * Generate a deep link URL for a tab + focus combination.
 * @param {string} tab
 * @param {string|null} [focus]
 * @returns {string} Full URL with hash
 */
export function buildDeepLink(tab, focus) {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (focus) params.set('focus', focus);
  const base = window.location.origin + window.location.pathname;
  return `${base}#${params.toString()}`;
}
