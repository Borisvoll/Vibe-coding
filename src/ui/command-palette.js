import { escapeHTML, debounce } from '../utils.js';

// ── Default commands ─────────────────────────────────────────
const DEFAULT_COMMANDS = [
  { id: 'nav:dashboard',    type: 'navigate', label: 'Dashboard',     icon: '🏠', keywords: 'home overzicht',      tab: 'dashboard', focus: null },
  { id: 'nav:today',        type: 'navigate', label: 'Vandaag',       icon: '☀️', keywords: 'today dag',            tab: 'today',     focus: null },
  { id: 'nav:projects',     type: 'navigate', label: 'Projecten',     icon: '📁', keywords: 'project map',          tab: 'projects',  focus: null },
  { id: 'nav:settings',     type: 'navigate', label: 'Instellingen',  icon: '⚙️', keywords: 'settings opties thema', tab: 'settings',  focus: null },
  { id: 'create:task',      type: 'create',   label: 'Nieuwe taak',   icon: '✏️', keywords: 'task add maak' },
  { id: 'create:project',   type: 'create',   label: 'Nieuw project', icon: '📂', keywords: 'project add maak' },
];

/**
 * Simple command filter: matches label or keywords against query.
 * @param {string} query — user input (lowercased externally)
 * @returns {Array} matching commands
 */
export function getFilteredCommands(query) {
  if (!query) return [...DEFAULT_COMMANDS];
  const q = query.toLowerCase();
  return DEFAULT_COMMANDS.filter((cmd) => {
    const haystack = `${cmd.label} ${cmd.keywords}`.toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Ctrl+K command palette — global search overlay with grouped results + quick commands.
 *
 * @param {Object} opts
 * @param {Function}  opts.onNavigate   - Called with { tab, focus } to navigate
 * @param {Object}    [opts.eventBus]   - EventBus instance for worker invalidation
 * @param {Object}    [opts.modeManager] - ModeManager for create actions (current mode)
 * @returns {{ el, open, close, destroy, notifyRebuild, isOpen }}
 */
export function createCommandPalette({ onNavigate, eventBus, modeManager }) {
  let isOpen = false;
  let currentCommands = [];  // filtered commands
  let currentGroups = [];    // grouped search results
  let flatItems = [];        // flattened for keyboard navigation
  let selectedFlatIndex = -1;

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
        searchWorker = null; // reset; next search falls back to direct import
      };
      return searchWorker;
    } catch {
      return null;
    }
  }

  /** Send REBUILD_STORE to worker when IDB data changes. */
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
  overlay.setAttribute('aria-label', 'Zoek overal');
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
               placeholder="Zoek of typ een commando..."
               autocomplete="off" spellcheck="false" aria-autocomplete="list"
               aria-controls="cmd-palette-results" aria-label="Zoeken" />
        <kbd class="cmd-palette__kbd" aria-label="Escape om te sluiten">Esc</kbd>
      </div>
      <div class="cmd-palette__results" id="cmd-palette-results" role="listbox" aria-label="Zoekresultaten"></div>
      <div class="cmd-palette__footer">
        <span class="cmd-palette__hint">
          <kbd>↑↓</kbd> navigeer
          <kbd>↵</kbd> open
          <kbd>⌥↵</kbd> direct open
          <kbd>Esc</kbd> sluit
        </span>
      </div>
    </div>
  `;

  const backdrop    = overlay.querySelector('.cmd-palette__backdrop');
  const input       = overlay.querySelector('.cmd-palette__input');
  const resultsList = overlay.querySelector('.cmd-palette__results');

  // ── Search logic ──────────────────────────────────────────
  async function runSearch(query) {
    const worker = getOrCreateWorker();
    if (worker) {
      const id = ++searchId;
      return new Promise((resolve) => {
        const timeout = setTimeout(async () => {
          pendingSearches.delete(id);
          // Fallback to main-thread search on worker timeout
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
    // No Worker available (e.g. test environment) — call directly
    const { globalSearchGrouped } = await import('../stores/search.js');
    return globalSearchGrouped(query);
  }

  const doSearch = debounce(async (query) => {
    // Always update commands for current query
    currentCommands = getFilteredCommands(query);

    if (query.length < 2) {
      // Short query: show commands only
      currentGroups = [];
      rebuildFlat();
      renderAll();
      return;
    }
    try {
      const groups = await runSearch(query);
      currentGroups = groups;
      rebuildFlat();
      renderAll();
    } catch {
      currentGroups = [];
      rebuildFlat();
      renderAll();
    }
  }, 200);

  // ── Flat item list for keyboard navigation ────────────────
  function rebuildFlat() {
    flatItems = [];
    // Commands first
    for (const cmd of currentCommands) {
      flatItems.push({ command: cmd });
    }
    // Then search results
    for (const group of currentGroups) {
      const visible = group.items.slice(0, group.visibleCount);
      for (const item of visible) {
        flatItems.push({ item, group });
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
    if (currentCommands.length === 0 && currentGroups.length === 0) {
      resultsList.innerHTML = '<p class="cmd-palette__empty">Geen resultaten gevonden</p>';
      return;
    }

    let html = '';
    let flatIdx = 0;

    // Render commands section
    if (currentCommands.length > 0) {
      const commandsHtml = currentCommands.map((cmd) => {
        const idx = flatIdx++;
        const isSelected = idx === selectedFlatIndex;
        return `
          <div class="cmd-palette__item cmd-palette__item--cmd${isSelected ? ' cmd-palette__item--selected' : ''}"
               role="option" aria-selected="${isSelected}"
               data-flat-index="${idx}" data-cmd-id="${escapeHTML(cmd.id)}">
            <span class="cmd-palette__cmd-icon" aria-hidden="true">${cmd.icon}</span>
            <span class="cmd-palette__item-title">${escapeHTML(cmd.label)}</span>
          </div>`;
      }).join('');

      html += `
        <div class="cmd-palette__group cmd-palette__group--cmds" data-group-type="commands">
          <div class="cmd-palette__group-header" aria-hidden="true">
            <span class="cmd-palette__group-label">Commando\u2019s</span>
          </div>
          ${commandsHtml}
        </div>`;
    }

    // Render search result groups
    if (currentGroups.length > 0) {
      html += currentGroups.map((group) => {
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

        return `
        <div class="cmd-palette__group" data-group-type="${escapeHTML(group.type)}">
          <div class="cmd-palette__group-header" aria-hidden="true">
            <span class="cmd-palette__group-icon">${group.icon}</span>
            <span class="cmd-palette__group-label">${escapeHTML(group.label)}</span>
            <span class="cmd-palette__group-count">${group.items.length}</span>
          </div>
          ${itemsHtml}
          ${moreHtml}
        </div>`;
      }).join('');
    }

    resultsList.innerHTML = html;
  }

  // ── Execute command ────────────────────────────────────────
  async function executeCommand(cmd) {
    close();

    if (cmd.type === 'navigate') {
      onNavigate({ tab: cmd.tab, focus: cmd.focus });
      return;
    }

    if (cmd.type === 'create') {
      const { showPrompt } = await import('./modal.js');
      const mode = modeManager?.getMode() || 'School';

      if (cmd.id === 'create:task') {
        const text = await showPrompt('Nieuwe taak:', '', { placeholder: 'Wat moet je doen?' });
        if (text?.trim()) {
          const { addTask } = await import('../stores/tasks.js');
          await addTask(text.trim(), mode);
          eventBus?.emit('tasks:changed');
        }
      } else if (cmd.id === 'create:project') {
        const title = await showPrompt('Nieuw project:', '', { placeholder: 'Projectnaam' });
        if (title?.trim()) {
          const { addProject } = await import('../stores/projects.js');
          await addProject(title.trim(), '', mode);
          eventBus?.emit('projects:changed');
        }
      }
    }
  }

  // ── Navigation ────────────────────────────────────────────
  function activateItem(flatIndex, { altKey = false } = {}) {
    const entry = flatItems[flatIndex];
    if (!entry) return;

    // Command item
    if (entry.command) {
      executeCommand(entry.command);
      return;
    }

    // Search result item
    const { item, group } = entry;
    close();

    if (altKey && item.type === 'project' && item.id) {
      // ⌥↩ on a project → navigate to Projects tab AND open that project's detail
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
      if (flatItems.length > 0) {
        selectedFlatIndex = (selectedFlatIndex + 1) % flatItems.length;
        renderAll();
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatItems.length > 0) {
        selectedFlatIndex = selectedFlatIndex <= 0 ? flatItems.length - 1 : selectedFlatIndex - 1;
        renderAll();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedFlatIndex >= 0) {
        activateItem(selectedFlatIndex, { altKey: e.altKey });
      }
      return;
    }
  }

  function handleResultClick(e) {
    const item = e.target.closest('.cmd-palette__item');
    if (item) {
      const idx = parseInt(item.dataset.flatIndex, 10);
      if (!isNaN(idx)) activateItem(idx);
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
        // Re-focus the input so keyboard nav continues working
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
      // Show all commands on open
      currentCommands = getFilteredCommands('');
      currentGroups = [];
      selectedFlatIndex = 0;
      rebuildFlat();
      renderAll();
    });
    // Warm up the worker (builds index in background without blocking)
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
