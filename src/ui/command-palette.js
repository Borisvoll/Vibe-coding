import { escapeHTML, debounce } from '../utils.js';

/** Group display order for commands. */
const CMD_GROUP_ORDER = ['navigate', 'create'];
const CMD_GROUP_LABELS = {
  navigate: 'Navigatie',
  create: 'Aanmaken',
};

/**
 * Ctrl+K command palette — global search + command actions.
 *
 * @param {Object} opts
 * @param {Function}  opts.onNavigate  - Called with { tab, focus } to navigate
 * @param {Object}    [opts.eventBus]  - EventBus instance for worker invalidation
 * @param {Object}    [opts.commands]  - Command registry instance (from createCommandRegistry)
 * @returns {{ el, open, close, destroy, notifyRebuild, isOpen }}
 */
export function createCommandPalette({ onNavigate, eventBus, commands }) {
  let isOpen = false;
  let currentGroups = [];   // grouped search results
  let commandItems = [];    // filtered commands
  let flatItems = [];       // flattened for keyboard navigation
  let selectedFlatIndex = -1;
  let currentQuery = '';

  // ── Web Worker setup ──────────────────────────────────────
  let searchWorker = null;
  let searchId = 0;
  const pendingSearches = new Map(); // id → { resolve, timeout }

  function getOrCreateWorker() {
    if (typeof Worker === 'undefined') return null;
    if (searchWorker) return searchWorker;
    try {
      searchWorker = new Worker(
        new URL('../workers/search.worker.js', import.meta.url),
        { type: 'module' },
      );
      searchWorker.onmessage = (e) => {
        const { type: msgType, id, groups } = e.data;
        if (msgType === 'RESULTS' && pendingSearches.has(id)) {
          const { resolve, timeout } = pendingSearches.get(id);
          clearTimeout(timeout);
          pendingSearches.delete(id);
          resolve(groups);
        }
      };
      searchWorker.onerror = () => {
        searchWorker = null;
      };
      return searchWorker;
    } catch {
      return null;
    }
  }

  function notifyWorkerRebuild(store) {
    if (searchWorker) {
      searchWorker.postMessage({ type: 'REBUILD_STORE', store });
    }
  }

  // ── EventBus subscriptions for index invalidation ─────────
  const unsubs = [];
  if (eventBus) {
    unsubs.push(eventBus.on('tasks:changed',    () => notifyWorkerRebuild('os_tasks')));
    unsubs.push(eventBus.on('projects:changed', () => notifyWorkerRebuild('os_projects')));
    unsubs.push(eventBus.on('inbox:changed',    () => notifyWorkerRebuild('os_inbox')));
  }

  // ── Build DOM ─────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'cmd-palette';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Command palette');
  overlay.setAttribute('aria-modal', 'true');
  overlay.hidden = true;

  overlay.innerHTML = `
    <div class="cmd-palette__backdrop"></div>
    <div class="cmd-palette__panel">
      <div class="cmd-palette__input-wrap">
        <svg class="cmd-palette__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="search" class="cmd-palette__input"
               placeholder="Zoek of voer een opdracht uit\u2026"
               autocomplete="off" spellcheck="false" aria-autocomplete="list"
               aria-controls="cmd-palette-results" aria-label="Zoeken" />
        <kbd class="cmd-palette__kbd" aria-label="Escape om te sluiten">Esc</kbd>
      </div>
      <div class="cmd-palette__results" id="cmd-palette-results" role="listbox" aria-label="Resultaten"></div>
      <div class="cmd-palette__footer">
        <span class="cmd-palette__hint">
          <kbd>↑↓</kbd> navigeer
          <kbd>↵</kbd> open
          <kbd>Esc</kbd> sluit
        </span>
      </div>
    </div>
  `;

  const backdrop    = overlay.querySelector('.cmd-palette__backdrop');
  const input       = overlay.querySelector('.cmd-palette__input');
  const resultsList = overlay.querySelector('.cmd-palette__results');

  // ── Command filtering ────────────────────────────────────
  function getFilteredCommands(query) {
    if (!commands) return [];
    return query ? commands.filter(query) : commands.getAll();
  }

  function groupCommands(cmds) {
    const byGroup = new Map();
    for (const cmd of cmds) {
      const g = cmd.group || 'other';
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(cmd);
    }
    const ordered = [];
    for (const key of CMD_GROUP_ORDER) {
      if (byGroup.has(key)) {
        ordered.push({ groupKey: key, label: CMD_GROUP_LABELS[key] || key, items: byGroup.get(key) });
        byGroup.delete(key);
      }
    }
    for (const [key, items] of byGroup) {
      ordered.push({ groupKey: key, label: CMD_GROUP_LABELS[key] || key, items });
    }
    return ordered;
  }

  // ── Search logic ──────────────────────────────────────────
  async function runSearch(query) {
    const worker = getOrCreateWorker();
    if (worker) {
      const id = ++searchId;
      return new Promise((resolve) => {
        const timeout = setTimeout(async () => {
          pendingSearches.delete(id);
          try {
            const { globalSearchGrouped } = await import('../stores/search.js');
            resolve(await globalSearchGrouped(query));
          } catch {
            resolve([]);
          }
        }, 500);
        pendingSearches.set(id, { resolve, timeout });
        worker.postMessage({ type: 'SEARCH', query, id });
      });
    }
    const { globalSearchGrouped } = await import('../stores/search.js');
    return globalSearchGrouped(query);
  }

  const doSearch = debounce(async (query) => {
    currentQuery = query;

    // Always get filtered commands
    commandItems = getFilteredCommands(query);

    if (query.length < 2) {
      // No search — show only commands
      currentGroups = [];
      rebuildFlat();
      renderAll();
      return;
    }

    try {
      const groups = await runSearch(query);
      // Check we're still on the same query (avoid stale results)
      if (query !== currentQuery) return;
      currentGroups = groups;
      rebuildFlat();
      renderAll();
    } catch {
      currentGroups = [];
      rebuildFlat();
      renderAll();
    }
  }, 150);

  // ── Flat item list for keyboard navigation ────────────────
  function rebuildFlat() {
    flatItems = [];

    // Commands first
    for (const cmd of commandItems) {
      flatItems.push({ kind: 'command', cmd });
    }

    // Then search results
    for (const group of currentGroups) {
      const visible = group.items.slice(0, group.visibleCount);
      for (const item of visible) {
        flatItems.push({ kind: 'result', item, group });
      }
    }

    if (flatItems.length > 0 && selectedFlatIndex < 0) {
      selectedFlatIndex = 0;
    }
    if (selectedFlatIndex >= flatItems.length) {
      selectedFlatIndex = flatItems.length > 0 ? 0 : -1;
    }
  }

  // ── Render ────────────────────────────────────────────────
  function renderAll() {
    if (flatItems.length === 0) {
      const msg = currentQuery.length >= 2 ? 'Geen resultaten gevonden' : 'Geen opdrachten beschikbaar';
      resultsList.innerHTML = `<p class="cmd-palette__empty">${escapeHTML(msg)}</p>`;
      return;
    }

    let flatIdx = 0;
    const parts = [];

    // Render command groups
    if (commandItems.length > 0) {
      const groups = groupCommands(commandItems);
      for (const group of groups) {
        const itemsHtml = group.items.map((cmd) => {
          const idx = flatIdx++;
          const isSelected = idx === selectedFlatIndex;
          return `
            <div class="cmd-palette__item cmd-palette__item--command${isSelected ? ' cmd-palette__item--selected' : ''}"
                 role="option" aria-selected="${isSelected}"
                 data-flat-index="${idx}" data-cmd-id="${escapeHTML(cmd.id)}">
              <span class="cmd-palette__command-icon" aria-hidden="true">${escapeHTML(cmd.icon || '')}</span>
              <span class="cmd-palette__item-title">${escapeHTML(cmd.label)}</span>
              ${cmd.shortcut ? `<kbd class="cmd-palette__command-shortcut">${escapeHTML(cmd.shortcut)}</kbd>` : ''}
            </div>`;
        }).join('');

        parts.push(`
          <div class="cmd-palette__group" data-group-type="cmd-${escapeHTML(group.groupKey)}">
            <div class="cmd-palette__group-header" aria-hidden="true">
              <span class="cmd-palette__group-label">${escapeHTML(group.label)}</span>
            </div>
            ${itemsHtml}
          </div>`);
      }
    }

    // Render search result groups
    if (currentGroups.length > 0) {
      for (const group of currentGroups) {
        const visible = group.items.slice(0, group.visibleCount);
        const remaining = group.items.length - group.visibleCount;

        const itemsHtml = visible.map((item) => {
          const idx = flatIdx++;
          const isSelected = idx === selectedFlatIndex;
          const title = escapeHTML(item.title || '');
          const subtitle = escapeHTML(item.subtitle || '');
          return `
            <div class="cmd-palette__item${isSelected ? ' cmd-palette__item--selected' : ''}"
                 role="option" aria-selected="${isSelected}"
                 data-flat-index="${idx}" data-item-id="${escapeHTML(item.id || '')}"
                 data-item-type="${escapeHTML(item.type)}">
              <div class="cmd-palette__item-text">
                <span class="cmd-palette__item-title">${title}</span>
                <span class="cmd-palette__item-sub">${subtitle}</span>
              </div>
            </div>`;
        }).join('');

        const moreHtml = remaining > 0
          ? `<button type="button" class="cmd-palette__show-more" data-group-type="${escapeHTML(group.type)}" aria-label="Laad meer ${escapeHTML(group.label)} resultaten">
               Toon meer <span class="cmd-palette__show-more-count">${remaining} meer</span>
             </button>`
          : '';

        parts.push(`
          <div class="cmd-palette__group" data-group-type="${escapeHTML(group.type)}">
            <div class="cmd-palette__group-header" aria-hidden="true">
              <span class="cmd-palette__group-icon">${group.icon}</span>
              <span class="cmd-palette__group-label">${escapeHTML(group.label)}</span>
              <span class="cmd-palette__group-count">${group.items.length}</span>
            </div>
            ${itemsHtml}
            ${moreHtml}
          </div>`);
      }
    }

    resultsList.innerHTML = parts.join('');
  }

  // ── Execution ────────────────────────────────────────────
  function executeItem(flatIndex, { altKey = false } = {}) {
    const entry = flatItems[flatIndex];
    if (!entry) return;

    if (entry.kind === 'command') {
      close();
      commands?.execute(entry.cmd.id);
      return;
    }

    // Search result navigation
    const { item, group } = entry;
    close();

    if (altKey && item.type === 'project' && item.id) {
      onNavigate({ tab: 'projects', focus: null });
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('projects:open', { detail: { id: item.id } }));
      }, 120);
    } else {
      onNavigate({ tab: group.tab, focus: group.focus });
    }
  }

  // ── Event handlers ────────────────────────────────────────
  function handleInput() {
    const q = input.value.trim();
    selectedFlatIndex = -1;
    doSearch(q);
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
      if (flatItems.length > 0) {
        selectedFlatIndex = (selectedFlatIndex + 1) % flatItems.length;
        renderAll();
        scrollSelected();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatItems.length > 0) {
        selectedFlatIndex = selectedFlatIndex <= 0 ? flatItems.length - 1 : selectedFlatIndex - 1;
        renderAll();
        scrollSelected();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedFlatIndex >= 0) {
        executeItem(selectedFlatIndex, { altKey: e.altKey });
      }
      return;
    }
  }

  function scrollSelected() {
    const el = resultsList.querySelector('.cmd-palette__item--selected');
    el?.scrollIntoView({ block: 'nearest' });
  }

  function handleResultClick(e) {
    const item = e.target.closest('.cmd-palette__item');
    if (item) {
      const idx = parseInt(item.dataset.flatIndex, 10);
      if (!isNaN(idx)) executeItem(idx);
      return;
    }

    const moreBtn = e.target.closest('.cmd-palette__show-more');
    if (moreBtn) {
      const groupType = moreBtn.dataset.groupType;
      const group = currentGroups.find((g) => g.type === groupType);
      if (group) {
        group.visibleCount = Math.min(group.visibleCount + 6, group.items.length);
        rebuildFlat();
        renderAll();
        input.focus();
      }
    }
  }

  function handleResultHover(e) {
    const item = e.target.closest('.cmd-palette__item');
    if (!item) return;
    const idx = parseInt(item.dataset.flatIndex, 10);
    if (!isNaN(idx) && idx !== selectedFlatIndex) {
      selectedFlatIndex = idx;
      renderAll();
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
      currentQuery = '';
      selectedFlatIndex = -1;
      // Show commands in empty state
      commandItems = getFilteredCommands('');
      currentGroups = [];
      rebuildFlat();
      renderAll();
    });
    const worker = getOrCreateWorker();
    if (worker) worker.postMessage({ type: 'INIT' });
    input.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('cmd-palette--visible');
    const hide = () => { overlay.hidden = true; };
    overlay.addEventListener('transitionend', hide, { once: true });
    setTimeout(hide, 350);
  }

  function destroy() {
    close();
    for (const unsub of unsubs) unsub?.();
    input.removeEventListener('input', handleInput);
    overlay.removeEventListener('keydown', handleKeydown);
    resultsList.removeEventListener('click', handleResultClick);
    resultsList.removeEventListener('mousemove', handleResultHover);
    backdrop.removeEventListener('click', close);
    searchWorker?.terminate();
    searchWorker = null;
    overlay.remove();
  }

  // ── Wire events ───────────────────────────────────────────
  input.addEventListener('input', handleInput);
  overlay.addEventListener('keydown', handleKeydown);
  resultsList.addEventListener('click', handleResultClick);
  resultsList.addEventListener('mousemove', handleResultHover);
  backdrop.addEventListener('click', close);

  return {
    el: overlay,
    open,
    close,
    destroy,
    notifyRebuild: notifyWorkerRebuild,
    get isOpen() { return isOpen; },
  };
}
