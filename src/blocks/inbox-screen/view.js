import {
  getInboxItems, addInboxItem, promoteToTask,
  saveToReference, archiveItem, deleteItem, getInboxCount,
} from '../../stores/inbox.js';
import { escapeHTML } from '../../utils.js';
import { triageInboxItem } from '../../ai/client.js';

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

  // --- Capture ---
  captureForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = captureInput.value.trim();
    if (!text) return;
    const mode = modeManager.getMode();
    await addInboxItem(text, mode !== 'BPV' ? mode : null);
    captureInput.value = '';
    eventBus.emit('inbox:changed');
    await render();
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

    // Click to select
    listEl.querySelectorAll('.inbox-screen__item').forEach((row) => {
      row.addEventListener('click', () => {
        selectedIdx = parseInt(row.dataset.idx, 10);
        highlightSelected();
      });
      row.querySelector('[data-action="process"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedIdx = parseInt(row.dataset.idx, 10);
        openProcessing(items[selectedIdx]);
      });
    });

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

        <div class="inbox-processing__ai-bar">
          <button type="button" class="btn btn-ghost btn-sm" data-action="ai-triage">✨ AI-suggestie</button>
          <div class="inbox-processing__ai-result" hidden></div>
        </div>

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

    let selectedProcessMode = mode;

    processingEl.querySelectorAll('[data-process-mode]').forEach((tag) => {
      tag.addEventListener('click', () => {
        selectedProcessMode = tag.dataset.processMode;
        processingEl.querySelectorAll('[data-process-mode]').forEach((t) => {
          t.classList.toggle('selected', t.dataset.processMode === selectedProcessMode);
        });
      });
    });

    // ── AI Triage ──
    const aiBtn = processingEl.querySelector('[data-action="ai-triage"]');
    const aiResult = processingEl.querySelector('.inbox-processing__ai-result');
    aiBtn?.addEventListener('click', async () => {
      aiBtn.disabled = true;
      aiBtn.textContent = 'Bezig…';
      aiResult.hidden = true;
      try {
        const suggestion = await triageInboxItem(item.text);
        const actionLabel = { task: '📋 Taak', reference: '📚 Referentie', archive: '🗄 Archiveer' }[suggestion.action] || suggestion.action;
        aiResult.innerHTML = `
          <div style="display:flex;align-items:baseline;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-2)">
            <strong>${escapeHTML(actionLabel)}</strong>
            ${suggestion.mode ? `<span class="badge badge-default">${escapeHTML(suggestion.mode)}</span>` : ''}
            <span style="color:var(--color-text-secondary);font-size:var(--font-sm)">${escapeHTML(suggestion.text || '')}</span>
            <button type="button" class="btn btn-accent btn-sm" data-ai-accept>Accepteer</button>
          </div>
        `;
        aiResult.hidden = false;
        aiResult.querySelector('[data-ai-accept]')?.addEventListener('click', () => {
          if (suggestion.mode) {
            selectedProcessMode = suggestion.mode;
            processingEl.querySelectorAll('[data-process-mode]').forEach((t) => {
              t.classList.toggle('selected', t.dataset.processMode === selectedProcessMode);
            });
          }
          const actionMap = { task: 'task', reference: 'reference', archive: 'archive' };
          processingEl.querySelector(`[data-process="${actionMap[suggestion.action]}"]`)?.click();
        });
      } catch (err) {
        aiResult.innerHTML = `<p style="color:var(--color-error);font-size:var(--font-sm);margin-top:var(--space-1)">${escapeHTML(err.message)}</p>`;
        aiResult.hidden = false;
      } finally {
        aiBtn.disabled = false;
        aiBtn.textContent = '✨ AI-suggestie';
      }
    });

    processingEl.querySelector('[data-process="task"]')?.addEventListener('click', async () => {
      await promoteToTask(item.id, selectedProcessMode);
      eventBus.emit('tasks:changed');
      eventBus.emit('inbox:changed');
      closeProcessing();
      await render();
    });

    processingEl.querySelector('[data-process="reference"]')?.addEventListener('click', async () => {
      await saveToReference(item.id);
      eventBus.emit('inbox:changed');
      closeProcessing();
      await render();
    });

    processingEl.querySelector('[data-process="archive"]')?.addEventListener('click', async () => {
      await archiveItem(item.id);
      eventBus.emit('inbox:changed');
      closeProcessing();
      await render();
    });

    processingEl.querySelector('[data-process="delete"]')?.addEventListener('click', async () => {
      await deleteItem(item.id);
      eventBus.emit('inbox:changed');
      closeProcessing();
      await render();
    });

    processingEl.querySelector('[data-process="close"]')?.addEventListener('click', () => {
      closeProcessing();
    });
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
        (async () => {
          await deleteItem(items[selectedIdx].id);
          eventBus.emit('inbox:changed');
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
