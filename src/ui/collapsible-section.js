/**
 * Reusable collapsible section — wraps a group of blocks behind
 * a toggle header (title + chevron + optional badge).
 *
 * State persists per mode in localStorage so each lens remembers
 * its own open/closed preference.
 *
 * Usage:
 *   const section = createCollapsibleSection({
 *     id: 'vandaag-reflection',
 *     title: 'Reflectie',
 *     hostName: 'vandaag-reflection',   // data-os-host value
 *     defaultOpen: true,
 *     mode: 'School',
 *   });
 *   container.appendChild(section.el);
 *   // section.contentEl is the block mount target
 *   // section.setOpen(true/false)
 *   // section.setMode(newMode, defaultOpen)
 *   // section.setBadge('3')
 *   // section.destroy()
 */

const STORAGE_PREFIX = 'boris_collapse_';

function storageKey(id, mode) {
  return `${STORAGE_PREFIX}${id}_${mode}`;
}

function readState(id, mode, defaultOpen) {
  try {
    const raw = localStorage.getItem(storageKey(id, mode));
    if (raw === null) return defaultOpen;
    return raw === '1';
  } catch { return defaultOpen; }
}

function writeState(id, mode, open) {
  try { localStorage.setItem(storageKey(id, mode), open ? '1' : '0'); }
  catch { /* private browsing */ }
}

const CHEVRON_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function createCollapsibleSection({ id, title, hostName, defaultOpen = true, mode = 'School' }) {
  let currentMode = mode;
  let isOpen = readState(id, currentMode, defaultOpen);

  // ── Build DOM ──────────────────────────────────────────────
  const el = document.createElement('div');
  el.className = 'collapsible-section';
  el.dataset.collapseId = id;

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'collapsible-section__header';
  header.setAttribute('aria-expanded', String(isOpen));

  const titleEl = document.createElement('span');
  titleEl.className = 'collapsible-section__title';
  titleEl.textContent = title;

  const badgeEl = document.createElement('span');
  badgeEl.className = 'collapsible-section__badge';
  badgeEl.hidden = true;

  const chevronEl = document.createElement('span');
  chevronEl.className = 'collapsible-section__chevron';
  chevronEl.innerHTML = CHEVRON_SVG;

  header.append(titleEl, badgeEl, chevronEl);

  const contentEl = document.createElement('div');
  contentEl.className = 'collapsible-section__content';

  const innerEl = document.createElement('div');
  innerEl.className = 'collapsible-section__inner os-host-stack';
  innerEl.setAttribute('data-os-host', hostName);
  contentEl.appendChild(innerEl);

  el.append(header, contentEl);

  // ── State helpers ──────────────────────────────────────────
  function applyState() {
    header.setAttribute('aria-expanded', String(isOpen));
  }

  function toggle() {
    isOpen = !isOpen;
    writeState(id, currentMode, isOpen);
    applyState();
  }

  applyState();

  // ── Event listener ─────────────────────────────────────────
  header.addEventListener('click', toggle);

  // ── Public API ─────────────────────────────────────────────
  return {
    el,
    contentEl: innerEl,

    setOpen(open) {
      isOpen = open;
      writeState(id, currentMode, isOpen);
      applyState();
    },

    setMode(newMode, newDefault) {
      currentMode = newMode;
      isOpen = readState(id, currentMode, newDefault);
      applyState();
    },

    setBadge(text) {
      if (text) {
        badgeEl.textContent = text;
        badgeEl.hidden = false;
      } else {
        badgeEl.hidden = true;
      }
    },

    destroy() {
      header.removeEventListener('click', toggle);
      el.remove();
    },
  };
}
