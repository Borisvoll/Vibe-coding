import {
  getInboxItems, addInboxItem, promoteToTask,
  saveToReference, archiveItem, deleteItem, getInboxCount,
} from '../../stores/inbox.js';
import { softDelete, undoDelete } from '../../db.js';
import { showUndoToast, showToast } from '../../toast.js';
import { escapeHTML } from '../../utils.js';


const MODE_OPTIONS = ['BPV', 'School', 'Personal'];

export function renderInboxScreen(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;

  container.insertAdjacentHTML('beforeend', `
    <article class="inbox-screen" data-mount-id="${mountId}">
      <div class="inbox-screen__header">
        <h2 class="inbox-screen__title">Inbox</h2>
        <span class="inbox-screen__count badge badge-default">0</span>
        <div class="inbox-screen__shortcuts">
          <kbd>T</kbd> Taak &nbsp; <kbd>R</kbd> Referentie &nbsp; <kbd>A</kbd> Archiveer &nbsp; <kbd>D</kbd> Verwijder &nbsp; <kbd>J</kbd>/<kbd>K</kbd> Navigeer
        </div>
      </div>
      <form class="inbox-screen__capture">
        <input type="text" class="form-input inbox-screen__capture-input"
          placeholder="Snel vastleggen... (Ctrl+I)" autocomplete="off" />
      </form>
      <div class="inbox-screen__list"></div>
      <div class="inbox-screen__processing" hidden></div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const captureInput = el.querySelector('.inbox-screen__capture-input');
  const captureForm = el.querySelector('.inbox-screen__capture');
  const listEl = el.querySelector('.inbox-screen__list');
  const processingEl = el.querySelector('.inbox-screen__processing');
  const countEl = el.querySelector('.inbox-screen__count');

  let items = [];
  let selectedIdx = 0;
  let processingItem = null;
  let selectedProcessMode = null;

  // --- Event delegation on listEl (stable parent) ---
  listEl.addEventListener('click', (e) => {
    const processBtn = e.target.closest('[data-action="process"]');
    if (processBtn) {
      e.stopPropagation();
      const row = processBtn.closest('.inbox-screen__item');
      if (row) {
        selectedIdx = parseInt(row.dataset.idx, 10);
        openProcessing(items[selectedIdx]);
      }
      return;
    }
    const row = e.target.closest('.inbox-screen__item');
    if (row) {
      selectedIdx = parseInt(row.dataset.idx, 10);
      highlightSelected();
    }
  });

  // --- Event delegation on processingEl (stable parent) ---
  processingEl.addEventListener('click', (e) => {
    // Mode tag selection
    const modeTag = e.target.closest('[data-process-mode]');
    if (modeTag) {
      selectedProcessMode = modeTag.dataset.processMode;
      processingEl.querySelectorAll('[data-process-mode]').forEach((t) => {
        t.classList.toggle('selected', t.dataset.processMode === selectedProcessMode);
      });
      return;
    }

    // Process action buttons
    const actionBtn = e.target.closest('[data-process]');
    if (!actionBtn || !processingItem) return;

    const action = actionBtn.dataset.process;
    const item = processingItem;

    switch (action) {
      case 'task':
        (async () => {
          await promoteToTask(item.id, selectedProcessMode);
          eventBus.emit('tasks:changed');
          eventBus.emit('inbox:changed');
          showToast(`Taak aangemaakt in ${selectedProcessMode === 'Personal' ? 'Persoonlijk' : selectedProcessMode}`);
          closeProcessing();
          await render();
        })();
        break;
      case 'reference':
        (async () => {
          await saveToReference(item.id);
          eventBus.emit('inbox:changed');
          showToast('Opgeslagen als referentie');
          closeProcessing();
          await render();
        })();
        break;
      case 'archive':
        (async () => {
          await archiveItem(item.id);
          eventBus.emit('inbox:changed');
          showToast('Gearchiveerd');
          closeProcessing();
          await render();
        })();
        break;
      case 'delete':
        (async () => {
          await softDelete('os_inbox', item.id);
          eventBus.emit('inbox:changed');
          showUndoToast('Item verwijderd', async () => {
            await undoDelete(item.id);
            eventBus.emit('inbox:changed');
          });
          closeProcessing();
          await render();
        })();
        break;
      case 'close':
        closeProcessing();
        break;
    }
  });

  // --- Capture with swoosh + toast ---
  let capturing = false;
  captureForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = captureInput.value.trim();
    if (!text || capturing) return;
    capturing = true;
    const mode = modeManager.getMode();

    // Swoosh animation on input
    captureInput.classList.add('inbox-screen__capture-input--swoosh');
    setTimeout(() => captureInput.classList.remove('inbox-screen__capture-input--swoosh'), 400);
    captureInput.value = '';

    try {
      await addInboxItem(text, mode !== 'BPV' ? mode : null);
      showToast('Vastgelegd!');
      eventBus.emit('inbox:changed');
      await render();
    } catch {
      captureInput.value = text;
      showToast('Opslaan mislukt — probeer opnieuw');
    } finally {
      capturing = false;
    }
  });

  captureInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      captureForm.dispatchEvent(new Event('submit'));
    }
  });

  // --- Rendering ---
  async function render() {
    items = await getInboxItems();
    const count = items.length;
    countEl.textContent = count;
    updateNavBadge(count);

    if (selectedIdx >= items.length) selectedIdx = Math.max(0, items.length - 1);

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="inbox-screen__empty">
          <p>Inbox is leeg — goed bezig!</p>
          <p class="inbox-screen__empty-hint">Leg iets vast met het invoerveld hierboven, of druk <kbd>Ctrl+I</kbd> vanuit elke pagina.</p>
        </div>
      `;
      processingEl.hidden = true;
      processingItem = null;
      return;
    }

    listEl.innerHTML = items.map((item, i) => `
      <div class="inbox-screen__item ${i === selectedIdx ? 'inbox-screen__item--selected' : ''}"
           data-item-id="${item.id}" data-idx="${i}">
        <div class="inbox-screen__item-meta">
          <span class="inbox-screen__item-type badge badge-default">${item.type === 'link' ? 'Link' : 'Gedachte'}</span>
          ${item.mode ? `<span class="badge badge-default">${escapeHTML(item.mode)}</span>` : ''}
        </div>
        <div class="inbox-screen__item-text">${escapeHTML(item.text)}</div>
        <div class="inbox-screen__item-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="process" title="Verwerk (Enter)">Verwerk</button>
        </div>
      </div>
    `).join('');

    // If processing panel was open, keep it for the current item
    if (processingItem && !items.find((it) => it.id === processingItem.id)) {
      processingEl.hidden = true;
      processingItem = null;
    }
  }

  function highlightSelected() {
    listEl.querySelectorAll('.inbox-screen__item').forEach((row, i) => {
      row.classList.toggle('inbox-screen__item--selected', i === selectedIdx);
    });
  }

  function updateNavBadge(count) {
    // Update both mobile nav badge and sidebar badge
    ['inbox-badge', 'sidebar-inbox-badge'].forEach((id) => {
      const badge = document.getElementById(id);
      if (badge) {
        badge.textContent = count;
        badge.hidden = count === 0;
      }
    });
  }

  // --- Processing Panel ---
  function openProcessing(item) {
    processingItem = item;
    processingEl.hidden = false;
    const mode = modeManager.getMode();

    processingEl.innerHTML = `
      <div class="inbox-processing__card os-mini-card">
        <h3 class="inbox-processing__title">Verwerk item</h3>
        <p class="inbox-processing__text">${escapeHTML(item.text)}</p>
        ${item.url ? `<p class="inbox-processing__url"><a href="${escapeHTML(item.url)}" target="_blank" rel="noopener">${escapeHTML(item.url)}</a></p>` : ''}

        <div class="inbox-processing__options">
          <div class="inbox-processing__option">
            <h4><kbd>T</kbd> Maak taak</h4>
            <div class="inbox-processing__mode-select">
              ${MODE_OPTIONS.map((m) => `
                <button type="button" class="tag inbox-processing__mode-tag ${m === mode ? 'selected' : ''}"
                  data-process-mode="${m}">${m === 'Personal' ? 'Persoonlijk' : m}</button>
              `).join('')}
            </div>
            <button type="button" class="btn btn-primary btn-sm" data-process="task">Taak aanmaken</button>
          </div>

          <div class="inbox-processing__option">
            <h4><kbd>R</kbd> Bewaar als referentie</h4>
            <button type="button" class="btn btn-secondary btn-sm" data-process="reference">Naar naslagwerk</button>
          </div>

          <div class="inbox-processing__option inbox-processing__option--row">
            <button type="button" class="btn btn-ghost btn-sm" data-process="archive"><kbd>A</kbd> Archiveer</button>
            <button type="button" class="btn btn-danger btn-sm" data-process="delete"><kbd>D</kbd> Verwijder</button>
          </div>
        </div>

        <button type="button" class="btn btn-ghost btn-sm inbox-processing__close" data-process="close">Annuleer (Esc)</button>
      </div>
    `;

    selectedProcessMode = mode;
  }

  function closeProcessing() {
    processingItem = null;
    processingEl.hidden = true;
    processingEl.innerHTML = '';
  }

  // --- Keyboard Shortcuts ---
  function handleKeydown(e) {
    // Don't intercept when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (items.length === 0) return;

    const key = e.key.toLowerCase();

    if (processingItem) {
      // Processing mode shortcuts
      if (key === 'escape') { e.preventDefault(); closeProcessing(); return; }
      if (key === 't') { e.preventDefault(); processingEl.querySelector('[data-process="task"]')?.click(); return; }
      if (key === 'r') { e.preventDefault(); processingEl.querySelector('[data-process="reference"]')?.click(); return; }
      if (key === 'a') { e.preventDefault(); processingEl.querySelector('[data-process="archive"]')?.click(); return; }
      if (key === 'd') { e.preventDefault(); processingEl.querySelector('[data-process="delete"]')?.click(); return; }
      return;
    }

    // List mode shortcuts
    if (key === 'j' || key === 'arrowdown') {
      e.preventDefault();
      selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
      highlightSelected();
      scrollToSelected();
    } else if (key === 'k' || key === 'arrowup') {
      e.preventDefault();
      selectedIdx = Math.max(selectedIdx - 1, 0);
      highlightSelected();
      scrollToSelected();
    } else if (key === 'enter') {
      e.preventDefault();
      if (items[selectedIdx]) openProcessing(items[selectedIdx]);
    } else if (key === 't') {
      e.preventDefault();
      if (items[selectedIdx]) {
        openProcessing(items[selectedIdx]);
        // Auto-click task after opening
        setTimeout(() => processingEl.querySelector('[data-process="task"]')?.click(), 0);
      }
    } else if (key === 'r') {
      e.preventDefault();
      if (items[selectedIdx]) {
        openProcessing(items[selectedIdx]);
        setTimeout(() => processingEl.querySelector('[data-process="reference"]')?.click(), 0);
      }
    } else if (key === 'a') {
      e.preventDefault();
      if (items[selectedIdx]) {
        (async () => {
          await archiveItem(items[selectedIdx].id);
          eventBus.emit('inbox:changed');
          await render();
        })();
      }
    } else if (key === 'd') {
      e.preventDefault();
      if (items[selectedIdx]) {
        const itemToDelete = items[selectedIdx];
        (async () => {
          await softDelete('os_inbox', itemToDelete.id);
          eventBus.emit('inbox:changed');
          showUndoToast('Item verwijderd', async () => {
            await undoDelete(itemToDelete.id);
            eventBus.emit('inbox:changed');
          });
          await render();
        })();
      }
    }
  }

  function scrollToSelected() {
    const selected = listEl.querySelector('.inbox-screen__item--selected');
    selected?.scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('keydown', handleKeydown);

  // --- Lifecycle ---
  const unsubInbox = eventBus.on('inbox:changed', () => render());

  render();

  return {
    unmount() {
      document.removeEventListener('keydown', handleKeydown);
      unsubInbox?.();
      el?.remove();
    },
  };
}
