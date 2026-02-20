import {
  getLists, addList, updateList, deleteList,
  getItemsByList, addItem, addSubtask, getSubtasks,
  toggleItem, updateItem, deleteItem, getItemCount,
  reorderItems,
} from '../../stores/lists.js';
import { escapeHTML } from '../../utils.js';
import { showConfirm, showPrompt } from '../../ui/modal.js';

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
  // Drag state
  let dragItemId = null;

  container.insertAdjacentHTML('beforeend', `
    <div class="lijsten-screen" data-mount-id="${mountId}">
      <div class="lijsten-screen__sidebar">
        <div class="lijsten-screen__sidebar-header">
          <h3 class="lijsten-screen__sidebar-title">Mijn lijsten</h3>
          <button type="button" class="lijsten-screen__add-btn" aria-label="Nieuwe lijst" data-tooltip="Nieuwe lijst">
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

    // Load subtasks for all items
    const subtaskMap = {};
    for (const item of [...activeItems, ...doneItems]) {
      subtaskMap[item.id] = await getSubtasks(item.id);
    }

    mainEl.innerHTML = `
      <div class="lijsten-screen__header">
        <div class="lijsten-screen__header-left">
          <span class="lijsten-screen__header-icon">${escapeHTML(list.icon || '📋')}</span>
          <h2 class="lijsten-screen__title">${escapeHTML(list.name)}</h2>
        </div>
        <div class="lijsten-screen__header-actions">
          <button type="button" class="btn btn-ghost btn-sm lijsten-screen__rename-btn" data-tooltip="Naam wijzigen">Hernoem</button>
          <button type="button" class="btn btn-ghost btn-sm lijsten-screen__delete-btn" data-tooltip="Lijst verwijderen">Verwijder</button>
        </div>
      </div>

      <div class="lijsten-screen__quick-add">
        <input type="text" class="form-input lijsten-screen__add-input" placeholder="Voeg een taak toe..." autocomplete="off" maxlength="200" />
        <div class="lijsten-screen__add-options">
          <button type="button" class="lijsten-screen__priority-btn" data-current-priority="4" data-tooltip="Prioriteit">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 14V3L8 6L14 3V14"/></svg>
          </button>
          <input type="date" class="lijsten-screen__date-input" data-tooltip="Deadline" />
        </div>
      </div>

      <ul class="lijsten-screen__items">
        ${activeItems.map((item) => renderItemWithSubtasks(item, subtaskMap[item.id] || [])).join('')}
      </ul>

      ${doneItems.length > 0 ? `
        <details class="lijsten-screen__done-section">
          <summary class="lijsten-screen__done-toggle">Afgerond (${doneItems.length})</summary>
          <ul class="lijsten-screen__items lijsten-screen__items--done">
            ${doneItems.map((item) => renderItemWithSubtasks(item, subtaskMap[item.id] || [])).join('')}
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

    // Toggle items (top-level + subtasks)
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

    // Add subtask — show inline input
    mainEl.querySelectorAll('.lijsten-screen__subtask-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemEl = btn.closest('[data-item-id]');
        const parentId = itemEl.dataset.itemId;
        // Toggle subtask input
        const existing = itemEl.querySelector('.lijsten-screen__subtask-form');
        if (existing) {
          existing.remove();
          return;
        }
        const form = document.createElement('div');
        form.className = 'lijsten-screen__subtask-form';
        form.innerHTML = `<input type="text" class="form-input lijsten-screen__subtask-input" placeholder="Subtaak..." maxlength="200" autocomplete="off" />`;
        itemEl.appendChild(form);
        const input = form.querySelector('input');
        input.focus();
        input.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            await addSubtask(parentId, text);
            eventBus.emit('lists:changed');
          }
          if (e.key === 'Escape') {
            form.remove();
          }
        });
      });
    });

    // Drag-to-reorder on active top-level items
    setupDragReorder(mainEl);

    // Rename list
    mainEl.querySelector('.lijsten-screen__rename-btn')?.addEventListener('click', async () => {
      const newName = await showPrompt('Nieuwe naam:', list.name);
      if (newName?.trim()) {
        await updateList(list.id, { name: newName.trim() });
        eventBus.emit('lists:changed');
      }
    });

    // Delete list
    mainEl.querySelector('.lijsten-screen__delete-btn')?.addEventListener('click', async () => {
      const ok = await showConfirm(`"${list.name}" verwijderen? Alle items worden verwijderd.`, { danger: true });
      if (ok) {
        await deleteList(list.id);
        selectedListId = null;
        eventBus.emit('lists:changed');
      }
    });

    // Auto-focus add input
    setTimeout(() => addInput?.focus(), 50);
  }

  // ── Drag-to-reorder ─────────────────────────────────────────

  function setupDragReorder(root) {
    const itemList = root.querySelector('.lijsten-screen__items:not(.lijsten-screen__items--done)');
    if (!itemList) return;

    const draggableItems = itemList.querySelectorAll(':scope > .lijsten-screen__item:not(.lijsten-screen__item--done)');
    draggableItems.forEach((itemEl) => {
      const handle = itemEl.querySelector('.lijsten-screen__drag-handle');
      if (!handle) return;

      handle.addEventListener('mousedown', () => { itemEl.draggable = true; });
      handle.addEventListener('touchstart', () => { itemEl.draggable = true; }, { passive: true });

      itemEl.addEventListener('dragstart', (e) => {
        dragItemId = itemEl.dataset.itemId;
        itemEl.classList.add('lijsten-screen__item--dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      itemEl.addEventListener('dragend', () => {
        itemEl.draggable = false;
        itemEl.classList.remove('lijsten-screen__item--dragging');
        dragItemId = null;
        // Remove all drag-over indicators
        itemList.querySelectorAll('.lijsten-screen__item--drag-over').forEach((el) => {
          el.classList.remove('lijsten-screen__item--drag-over');
        });
      });

      itemEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (itemEl.dataset.itemId !== dragItemId) {
          itemEl.classList.add('lijsten-screen__item--drag-over');
        }
      });

      itemEl.addEventListener('dragleave', () => {
        itemEl.classList.remove('lijsten-screen__item--drag-over');
      });

      itemEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        itemEl.classList.remove('lijsten-screen__item--drag-over');
        if (!dragItemId || dragItemId === itemEl.dataset.itemId) return;

        // Collect current order, then move dragItemId before drop target
        const currentOrder = Array.from(
          itemList.querySelectorAll(':scope > .lijsten-screen__item:not(.lijsten-screen__item--done)')
        ).map((el) => el.dataset.itemId);

        const fromIdx = currentOrder.indexOf(dragItemId);
        const toIdx = currentOrder.indexOf(itemEl.dataset.itemId);
        if (fromIdx === -1 || toIdx === -1) return;

        currentOrder.splice(fromIdx, 1);
        currentOrder.splice(toIdx, 0, dragItemId);

        await reorderItems(currentOrder);
        eventBus.emit('lists:changed');
      });
    });
  }

  // ── Render helpers ──────────────────────────────────────────

  function renderItemWithSubtasks(item, subtasks) {
    const subtaskCount = subtasks.length;
    const subtaskDone = subtasks.filter((s) => s.done).length;
    const hasSubtasks = subtaskCount > 0;

    return `
      ${renderItem(item, hasSubtasks, subtaskCount, subtaskDone)}
      ${hasSubtasks ? `
        <ul class="lijsten-screen__subtasks">
          ${subtasks.map((sub) => renderSubtaskItem(sub)).join('')}
        </ul>
      ` : ''}
    `;
  }

  function renderItem(item, hasSubtasks = false, subtaskCount = 0, subtaskDone = 0) {
    const priority = item.priority ?? 4;
    const meta = PRIORITY_META.find((p) => p.value === priority);
    const priorityClass = meta ? `lijsten-screen__item--${meta.className}` : '';
    const doneClass = item.done ? 'lijsten-screen__item--done' : '';
    const dueDateStr = item.dueDate || '';
    const isOverdue = dueDateStr && !item.done && dueDateStr < new Date().toISOString().slice(0, 10);
    const dueLabel = dueDateStr ? formatDueDate(dueDateStr) : '';
    const subtaskLabel = hasSubtasks ? `${subtaskDone}/${subtaskCount}` : '';

    return `
      <li class="lijsten-screen__item ${doneClass} ${priorityClass}" data-item-id="${item.id}">
        ${!item.done ? `<span class="lijsten-screen__drag-handle" aria-label="Versleep item" data-tooltip="Versleep">⠿</span>` : ''}
        <button type="button" class="lijsten-screen__check" aria-label="${item.done ? 'Markeer ongedaan' : 'Markeer gedaan'}">
          ${item.done ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
        </button>
        <div class="lijsten-screen__item-content">
          <span class="lijsten-screen__item-text">${escapeHTML(item.text)}</span>
          <span class="lijsten-screen__item-meta">
            ${dueLabel ? `<span class="lijsten-screen__item-due ${isOverdue ? 'lijsten-screen__item-due--overdue' : ''}">${escapeHTML(dueLabel)}</span>` : ''}
            ${subtaskLabel ? `<span class="lijsten-screen__item-subtask-count">${subtaskLabel}</span>` : ''}
          </span>
        </div>
        ${priority < 4 && !item.done ? `
          <button type="button" class="lijsten-screen__item-priority" data-priority="${priority}" data-tooltip="${meta.label}" style="color:${meta.color}">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 14V3L8 6L14 3V14"/></svg>
          </button>
        ` : ''}
        ${!item.done ? `
          <button type="button" class="lijsten-screen__subtask-add" aria-label="Subtaak toevoegen" data-tooltip="Subtaak">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="6" y1="2" x2="6" y2="10"/><line x1="2" y1="6" x2="10" y2="6"/></svg>
          </button>
        ` : ''}
        <button type="button" class="lijsten-screen__item-delete" aria-label="Verwijder">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </li>
    `;
  }

  function renderSubtaskItem(item) {
    const doneClass = item.done ? 'lijsten-screen__item--done' : '';
    return `
      <li class="lijsten-screen__item lijsten-screen__item--subtask ${doneClass}" data-item-id="${item.id}">
        <button type="button" class="lijsten-screen__check lijsten-screen__check--sm" aria-label="${item.done ? 'Markeer ongedaan' : 'Markeer gedaan'}">
          ${item.done ? '<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
        </button>
        <div class="lijsten-screen__item-content">
          <span class="lijsten-screen__item-text">${escapeHTML(item.text)}</span>
        </div>
        <button type="button" class="lijsten-screen__item-delete" aria-label="Verwijder">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
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
