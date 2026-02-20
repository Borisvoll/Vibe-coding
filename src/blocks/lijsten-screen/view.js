import {
  getLists, addList, updateList, deleteList,
  getItemsByList, addItem, toggleItem, updateItem, deleteItem, getItemCount,
} from '../../stores/lists.js';
import { escapeHTML } from '../../utils.js';

const PRIORITY_META = [
  { value: 1, label: 'P1', color: 'var(--color-danger, #e53e3e)', className: 'p1' },
  { value: 2, label: 'P2', color: 'var(--color-warning, #dd6b20)', className: 'p2' },
  { value: 3, label: 'P3', color: 'var(--color-blue, #3182ce)', className: 'p3' },
  { value: 4, label: 'Geen', color: 'var(--color-text-tertiary)', className: 'p4' },
];

const DEFAULT_LISTS = [
  { name: 'Boodschappen', icon: '🛒' },
  { name: 'Te doen', icon: '✅' },
];

export function mountLijstenScreen(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus } = context;
  let selectedListId = null;

  container.insertAdjacentHTML('beforeend', `
    <div class="lijsten-screen" data-mount-id="${mountId}">
      <div class="lijsten-screen__sidebar">
        <div class="lijsten-screen__sidebar-header">
          <h3 class="lijsten-screen__sidebar-title">Mijn lijsten</h3>
          <button type="button" class="lijsten-screen__add-btn" aria-label="Nieuwe lijst">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>
          </button>
        </div>
        <div class="lijsten-screen__list-nav"></div>
        <div class="lijsten-screen__new-form" hidden>
          <input type="text" class="form-input lijsten-screen__new-input" placeholder="Lijstnaam..." maxlength="60" autocomplete="off" />
        </div>
      </div>
      <div class="lijsten-screen__main">
        <div class="lijsten-screen__empty-state">
          <p>Kies een lijst of maak een nieuwe aan</p>
        </div>
      </div>
    </div>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const listNavEl = el.querySelector('.lijsten-screen__list-nav');
  const mainEl = el.querySelector('.lijsten-screen__main');
  const addBtn = el.querySelector('.lijsten-screen__add-btn');
  const newForm = el.querySelector('.lijsten-screen__new-form');
  const newInput = el.querySelector('.lijsten-screen__new-input');

  // ── New list ──────────────────────────────────────────────

  addBtn.addEventListener('click', () => {
    newForm.hidden = !newForm.hidden;
    if (!newForm.hidden) {
      newInput.value = '';
      newInput.focus();
    }
  });

  newInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = newInput.value.trim();
      if (!name) return;
      const list = await addList(name);
      newForm.hidden = true;
      selectedListId = list.id;
      eventBus.emit('lists:changed');
    }
    if (e.key === 'Escape') {
      newForm.hidden = true;
    }
  });

  // ── Render sidebar ────────────────────────────────────────

  async function ensureDefaults() {
    const lists = await getLists();
    if (lists.length > 0) return;
    for (const def of DEFAULT_LISTS) {
      await addList(def.name, def.icon);
    }
  }

  async function renderSidebar() {
    await ensureDefaults();
    const lists = await getLists();

    const counts = {};
    for (const list of lists) {
      counts[list.id] = await getItemCount(list.id);
    }

    // Auto-select first list if none selected
    if (!selectedListId && lists.length > 0) {
      selectedListId = lists[0].id;
    }

    listNavEl.innerHTML = lists.map((list) => {
      const c = counts[list.id] || { total: 0, done: 0 };
      const active = selectedListId === list.id;
      const icon = list.icon ? escapeHTML(list.icon) : '📋';
      const remaining = c.total - c.done;
      const countText = remaining > 0 ? `${remaining}` : '';
      return `
        <button type="button" class="lijsten-screen__nav-item ${active ? 'lijsten-screen__nav-item--active' : ''}" data-list-id="${list.id}">
          <span class="lijsten-screen__nav-icon">${icon}</span>
          <span class="lijsten-screen__nav-name">${escapeHTML(list.name)}</span>
          ${countText ? `<span class="lijsten-screen__nav-count">${countText}</span>` : ''}
        </button>
      `;
    }).join('');

    // Attach click handlers
    listNavEl.querySelectorAll('.lijsten-screen__nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedListId = btn.dataset.listId;
        renderSidebar();
        renderMain();
      });
    });
  }

  // ── Render main (selected list) ───────────────────────────

  async function renderMain() {
    if (!selectedListId) {
      mainEl.innerHTML = '<div class="lijsten-screen__empty-state"><p>Kies een lijst of maak een nieuwe aan</p></div>';
      return;
    }

    const lists = await getLists();
    const list = lists.find((l) => l.id === selectedListId);
    if (!list) {
      selectedListId = null;
      mainEl.innerHTML = '<div class="lijsten-screen__empty-state"><p>Lijst niet gevonden</p></div>';
      return;
    }

    const items = await getItemsByList(selectedListId);
    const activeItems = items.filter((i) => !i.done);
    const doneItems = items.filter((i) => i.done);

    // Sort active by priority (lower = higher priority), then position
    activeItems.sort((a, b) => {
      const pa = a.priority ?? 4;
      const pb = b.priority ?? 4;
      if (pa !== pb) return pa - pb;
      return (a.position ?? 999) - (b.position ?? 999);
    });

    mainEl.innerHTML = `
      <div class="lijsten-screen__header">
        <div class="lijsten-screen__header-left">
          <span class="lijsten-screen__header-icon">${escapeHTML(list.icon || '📋')}</span>
          <h2 class="lijsten-screen__title">${escapeHTML(list.name)}</h2>
        </div>
        <div class="lijsten-screen__header-actions">
          <button type="button" class="btn btn-ghost btn-sm lijsten-screen__rename-btn">Hernoem</button>
          <button type="button" class="btn btn-ghost btn-sm lijsten-screen__delete-btn">Verwijder</button>
        </div>
      </div>

      <div class="lijsten-screen__quick-add">
        <input type="text" class="form-input lijsten-screen__add-input" placeholder="Voeg een taak toe..." autocomplete="off" maxlength="200" />
        <div class="lijsten-screen__add-options">
          <button type="button" class="lijsten-screen__priority-btn" data-current-priority="4" title="Prioriteit instellen">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 14V3L8 6L14 3V14"/></svg>
          </button>
          <input type="date" class="lijsten-screen__date-input" title="Deadline instellen" />
        </div>
      </div>

      <ul class="lijsten-screen__items">
        ${activeItems.map((item) => renderItem(item)).join('')}
      </ul>

      ${doneItems.length > 0 ? `
        <details class="lijsten-screen__done-section">
          <summary class="lijsten-screen__done-toggle">Afgerond (${doneItems.length})</summary>
          <ul class="lijsten-screen__items lijsten-screen__items--done">
            ${doneItems.map((item) => renderItem(item)).join('')}
          </ul>
        </details>
      ` : ''}
    `;

    // ── Event handlers ────────────────────────────────────────

    // Quick add
    const addInput = mainEl.querySelector('.lijsten-screen__add-input');
    const dateInput = mainEl.querySelector('.lijsten-screen__date-input');
    const priorityBtn = mainEl.querySelector('.lijsten-screen__priority-btn');
    let currentPriority = 4;

    priorityBtn.addEventListener('click', () => {
      // Cycle through priorities: 4 → 1 → 2 → 3 → 4
      currentPriority = currentPriority === 4 ? 1 : currentPriority + 1;
      priorityBtn.dataset.currentPriority = currentPriority;
      const meta = PRIORITY_META.find((p) => p.value === currentPriority);
      priorityBtn.style.color = meta.color;
      priorityBtn.title = `Prioriteit: ${meta.label}`;
    });

    addInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = addInput.value.trim();
        if (!text) return;
        const item = await addItem(selectedListId, text);
        // Add priority and due date if set
        const changes = {};
        if (currentPriority !== 4) changes.priority = currentPriority;
        if (dateInput.value) changes.dueDate = dateInput.value;
        if (Object.keys(changes).length > 0) {
          await updateItem(item.id, changes);
        }
        addInput.value = '';
        dateInput.value = '';
        currentPriority = 4;
        priorityBtn.dataset.currentPriority = '4';
        priorityBtn.style.color = '';
        eventBus.emit('lists:changed');
      }
    });

    // Toggle items
    mainEl.querySelectorAll('.lijsten-screen__check').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const itemId = btn.closest('[data-item-id]').dataset.itemId;
        await toggleItem(itemId);
        eventBus.emit('lists:changed');
      });
    });

    // Delete items
    mainEl.querySelectorAll('.lijsten-screen__item-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const itemId = btn.closest('[data-item-id]').dataset.itemId;
        await deleteItem(itemId);
        eventBus.emit('lists:changed');
      });
    });

    // Inline priority change
    mainEl.querySelectorAll('.lijsten-screen__item-priority').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const itemId = btn.closest('[data-item-id]').dataset.itemId;
        const current = parseInt(btn.dataset.priority, 10) || 4;
        const next = current === 4 ? 1 : current + 1;
        await updateItem(itemId, { priority: next });
        eventBus.emit('lists:changed');
      });
    });

    // Rename list
    mainEl.querySelector('.lijsten-screen__rename-btn')?.addEventListener('click', async () => {
      const newName = prompt('Nieuwe naam:', list.name);
      if (newName?.trim()) {
        await updateList(list.id, { name: newName.trim() });
        eventBus.emit('lists:changed');
      }
    });

    // Delete list
    mainEl.querySelector('.lijsten-screen__delete-btn')?.addEventListener('click', async () => {
      if (confirm(`"${list.name}" verwijderen? Alle items worden verwijderd.`)) {
        await deleteList(list.id);
        selectedListId = null;
        eventBus.emit('lists:changed');
      }
    });

    // Auto-focus add input
    setTimeout(() => addInput?.focus(), 50);
  }

  function renderItem(item) {
    const priority = item.priority ?? 4;
    const meta = PRIORITY_META.find((p) => p.value === priority);
    const priorityClass = meta ? `lijsten-screen__item--${meta.className}` : '';
    const doneClass = item.done ? 'lijsten-screen__item--done' : '';
    const dueDateStr = item.dueDate || '';
    const isOverdue = dueDateStr && !item.done && dueDateStr < new Date().toISOString().slice(0, 10);
    const dueLabel = dueDateStr ? formatDueDate(dueDateStr) : '';

    return `
      <li class="lijsten-screen__item ${doneClass} ${priorityClass}" data-item-id="${item.id}">
        <button type="button" class="lijsten-screen__check" aria-label="${item.done ? 'Markeer ongedaan' : 'Markeer gedaan'}">
          ${item.done ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
        </button>
        <div class="lijsten-screen__item-content">
          <span class="lijsten-screen__item-text">${escapeHTML(item.text)}</span>
          ${dueLabel ? `<span class="lijsten-screen__item-due ${isOverdue ? 'lijsten-screen__item-due--overdue' : ''}">${escapeHTML(dueLabel)}</span>` : ''}
        </div>
        ${priority < 4 && !item.done ? `
          <button type="button" class="lijsten-screen__item-priority" data-priority="${priority}" title="${meta.label}" style="color:${meta.color}">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 14V3L8 6L14 3V14"/></svg>
          </button>
        ` : ''}
        <button type="button" class="lijsten-screen__item-delete" aria-label="Verwijder">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </li>
    `;
  }

  function formatDueDate(dateStr) {
    const today = new Date().toISOString().slice(0, 10);
    if (dateStr === today) return 'Vandaag';
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    if (dateStr === tomorrow) return 'Morgen';
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDate();
    const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    return `${day} ${months[d.getMonth()]}`;
  }

  // ── Initial render + event subscription ───────────────────

  async function fullRender() {
    await renderSidebar();
    await renderMain();
  }

  const unsubLists = eventBus.on('lists:changed', () => fullRender());

  fullRender();

  return {
    unmount() {
      unsubLists?.();
      el?.remove();
    },
  };
}
