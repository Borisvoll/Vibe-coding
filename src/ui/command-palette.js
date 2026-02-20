import { escapeHTML, debounce } from '../utils.js';

/**
 * Ctrl+K command palette — global search overlay.
 * Creates a full-screen modal with fuzzy search across all stores.
 *
 * @param {Object} opts
 * @param {Function} opts.onNavigate - Called with { tab, focus } when user selects a result
 * @returns {{ open(): void, close(): void, destroy(): void }}
 */
export function createCommandPalette({ onNavigate }) {
  let isOpen = false;
  let selectedIndex = -1;
  let currentResults = [];

  const TYPE_META = {
    task:    { label: 'Taak',     tab: 'today', focus: 'tasks' },
    inbox:   { label: 'Inbox',    tab: 'inbox', focus: null },
    project: { label: 'Project',  tab: 'today', focus: 'projects' },
    hours:   { label: 'Uren',     tab: 'today', focus: 'mode' },
    logbook: { label: 'Logboek',  tab: 'today', focus: 'mode' },
    daily:   { label: 'Dagplan',  tab: 'today', focus: null },
    journal: { label: 'Dagboek',  tab: 'today', focus: 'reflection' },
  };

  // ── Build DOM ─────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'cmd-palette';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Zoek overal');
  overlay.setAttribute('aria-modal', 'true');
  overlay.hidden = true;

  overlay.innerHTML = `
    <div class="cmd-palette__backdrop"></div>
    <div class="cmd-palette__panel">
      <div class="cmd-palette__input-wrap">
        <svg class="cmd-palette__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="search" class="cmd-palette__input" placeholder="Zoek in taken, inbox, projecten..." autocomplete="off" />
        <kbd class="cmd-palette__kbd">Esc</kbd>
      </div>
      <div class="cmd-palette__results" role="listbox" aria-label="Zoekresultaten"></div>
      <div class="cmd-palette__footer">
        <span class="cmd-palette__hint"><kbd>↑↓</kbd> navigeer <kbd>↵</kbd> open <kbd>Esc</kbd> sluit</span>
      </div>
    </div>
  `;

  const backdrop = overlay.querySelector('.cmd-palette__backdrop');
  const input = overlay.querySelector('.cmd-palette__input');
  const resultsList = overlay.querySelector('.cmd-palette__results');

  // ── Search logic ──────────────────────────────────────────
  const doSearch = debounce(async (query) => {
    if (query.length < 2) {
      resultsList.innerHTML = '<p class="cmd-palette__empty">Begin met typen om te zoeken...</p>';
      currentResults = [];
      selectedIndex = -1;
      return;
    }

    try {
      const { globalSearch } = await import('../stores/search.js');
      const hits = await globalSearch(query);
      currentResults = hits.slice(0, 12);
      selectedIndex = currentResults.length > 0 ? 0 : -1;
      renderResults();
    } catch {
      resultsList.innerHTML = '<p class="cmd-palette__empty">Zoeken mislukt</p>';
      currentResults = [];
      selectedIndex = -1;
    }
  }, 150);

  function renderResults() {
    if (currentResults.length === 0) {
      resultsList.innerHTML = '<p class="cmd-palette__empty">Geen resultaten gevonden</p>';
      return;
    }

    resultsList.innerHTML = currentResults.map((hit, i) => {
      const meta = TYPE_META[hit.type] || { label: hit.type, tab: 'today', focus: null };
      const title = escapeHTML(hit.title || '');
      const subtitle = escapeHTML(hit.subtitle || '');
      const isSelected = i === selectedIndex;

      return `
        <div class="cmd-palette__item${isSelected ? ' cmd-palette__item--selected' : ''}"
             role="option" aria-selected="${isSelected}" data-index="${i}">
          <span class="cmd-palette__type-badge">${escapeHTML(meta.label)}</span>
          <div class="cmd-palette__item-text">
            <span class="cmd-palette__item-title">${title}</span>
            <span class="cmd-palette__item-sub">${subtitle}</span>
          </div>
        </div>`;
    }).join('');
  }

  function navigateToResult(index) {
    const hit = currentResults[index];
    if (!hit) return;
    const meta = TYPE_META[hit.type] || { tab: 'today', focus: null };
    close();
    onNavigate({ tab: meta.tab, focus: meta.focus });
  }

  // ── Event handlers ────────────────────────────────────────
  function handleInput() {
    doSearch(input.value.trim());
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = (selectedIndex + 1) % currentResults.length;
        renderResults();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = selectedIndex <= 0 ? currentResults.length - 1 : selectedIndex - 1;
        renderResults();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        navigateToResult(selectedIndex);
      }
      return;
    }
  }

  function handleResultClick(e) {
    const item = e.target.closest('.cmd-palette__item');
    if (!item) return;
    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index)) navigateToResult(index);
  }

  function handleResultHover(e) {
    const item = e.target.closest('.cmd-palette__item');
    if (!item) return;
    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index) && index !== selectedIndex) {
      selectedIndex = index;
      renderResults();
    }
  }

  // ── Public API ────────────────────────────────────────────
  function open() {
    if (isOpen) return;
    isOpen = true;
    overlay.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add('cmd-palette--visible');
      input.value = '';
      input.focus();
      resultsList.innerHTML = '<p class="cmd-palette__empty">Begin met typen om te zoeken...</p>';
      currentResults = [];
      selectedIndex = -1;
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('cmd-palette--visible');
    const setHidden = () => { overlay.hidden = true; };
    overlay.addEventListener('transitionend', setHidden, { once: true });
    setTimeout(setHidden, 300);
  }

  function destroy() {
    close();
    input.removeEventListener('input', handleInput);
    overlay.removeEventListener('keydown', handleKeydown);
    resultsList.removeEventListener('click', handleResultClick);
    resultsList.removeEventListener('mousemove', handleResultHover);
    backdrop.removeEventListener('click', close);
    overlay.remove();
  }

  // ── Wire events ───────────────────────────────────────────
  input.addEventListener('input', handleInput);
  overlay.addEventListener('keydown', handleKeydown);
  resultsList.addEventListener('click', handleResultClick);
  resultsList.addEventListener('mousemove', handleResultHover);
  backdrop.addEventListener('click', close);

  return { el: overlay, open, close, destroy, get isOpen() { return isOpen; } };
}
