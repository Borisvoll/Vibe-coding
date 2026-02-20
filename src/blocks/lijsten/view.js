import {
  getLists, addList, updateList, deleteList,
  getItemsByList, addItem, toggleItem, deleteItem, getItemCount,
} from '../../stores/lists.js';
import { escapeHTML } from '../../utils.js';

const DEFAULT_LISTS = [
  { name: 'Boodschappen', icon: '🛒' },
  { name: 'Te doen', icon: '✅' },
];

export function renderLijsten(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus } = context;

  let expandedListId = null;
  let creatingNew = false;

  container.insertAdjacentHTML('beforeend', `
    <article class="lijsten-block os-mini-card" data-mount-id="${mountId}">
      <div class="lijsten-block__header">
        <h3 class="lijsten-block__title">Lijsten</h3>
        <button type="button" class="lijsten-block__add-list btn btn-ghost btn-sm">+ Nieuw</button>
      </div>
      <div class="lijsten-block__new-form" hidden>
        <div class="lijsten-block__new-row">
          <input type="text" class="form-input lijsten-block__new-name" placeholder="Naam van de lijst..." autocomplete="off" maxlength="60" />
          <button type="button" class="btn btn-primary btn-sm lijsten-block__new-save">Maak</button>
          <button type="button" class="btn btn-ghost btn-sm lijsten-block__new-cancel">Annuleer</button>
        </div>
      </div>
      <div class="lijsten-block__lists"></div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const listsEl = el.querySelector('.lijsten-block__lists');
  const addListBtn = el.querySelector('.lijsten-block__add-list');
  const newForm = el.querySelector('.lijsten-block__new-form');
  const newNameInput = el.querySelector('.lijsten-block__new-name');
  const newSaveBtn = el.querySelector('.lijsten-block__new-save');
  const newCancelBtn = el.querySelector('.lijsten-block__new-cancel');

  // ── New list form ──────────────────────────────────────────

  addListBtn.addEventListener('click', () => {
    creatingNew = true;
    newForm.hidden = false;
    addListBtn.hidden = true;
    newNameInput.value = '';
    newNameInput.focus();
  });

  newCancelBtn.addEventListener('click', () => {
    creatingNew = false;
    newForm.hidden = true;
    addListBtn.hidden = false;
  });

  async function handleNewList() {
    const name = newNameInput.value.trim();
    if (!name) return;
    await addList(name);
    creatingNew = false;
    newForm.hidden = true;
    addListBtn.hidden = false;
    await render();
  }

  newSaveBtn.addEventListener('click', handleNewList);
  newNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleNewList(); }
    if (e.key === 'Escape') { newCancelBtn.click(); }
  });

  // ── Render ─────────────────────────────────────────────────

  async function ensureDefaults() {
    const lists = await getLists();
    if (lists.length > 0) return;
    for (const def of DEFAULT_LISTS) {
      await addList(def.name, def.icon);
    }
  }

  async function render() {
    await ensureDefaults();
    const lists = await getLists();

    if (lists.length === 0) {
      listsEl.innerHTML = '<p class="lijsten-block__empty">Nog geen lijsten</p>';
      return;
    }

    // Get counts for all lists
    const counts = {};
    for (const list of lists) {
      counts[list.id] = await getItemCount(list.id);
    }

    listsEl.innerHTML = lists.map((list) => {
      const c = counts[list.id] || { total: 0, done: 0 };
      const isExpanded = expandedListId === list.id;
      const countLabel = c.total > 0 ? `${c.done}/${c.total}` : '';
      const icon = list.icon ? `<span class="lijsten-block__list-icon">${escapeHTML(list.icon)}</span>` : '';

      return `
        <div class="lijsten-block__list ${isExpanded ? 'lijsten-block__list--expanded' : ''}" data-list-id="${list.id}">
          <button type="button" class="lijsten-block__list-header">
            ${icon}
            <span class="lijsten-block__list-name">${escapeHTML(list.name)}</span>
            <span class="lijsten-block__list-count">${countLabel}</span>
            <svg class="lijsten-block__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          ${isExpanded ? `<div class="lijsten-block__list-body" data-list-body="${list.id}"></div>` : ''}
        </div>
      `;
    }).join('');

    // Attach header click handlers
    listsEl.querySelectorAll('.lijsten-block__list-header').forEach((header) => {
      header.addEventListener('click', () => {
        const listId = header.closest('[data-list-id]').dataset.listId;
        expandedListId = expandedListId === listId ? null : listId;
        render();
      });
    });

    // Render expanded list body
    if (expandedListId) {
      const bodyEl = listsEl.querySelector(`[data-list-body="${expandedListId}"]`);
      if (bodyEl) await renderListBody(bodyEl, expandedListId);
    }
  }

  async function renderListBody(bodyEl, listId) {
    const items = await getItemsByList(listId);
    const list = await getLists().then((all) => all.find((l) => l.id === listId));

    bodyEl.innerHTML = `
      <div class="lijsten-block__add-row">
        <input type="text" class="form-input lijsten-block__item-input" placeholder="Item toevoegen..." autocomplete="off" maxlength="200" />
      </div>
      <ul class="lijsten-block__items">
        ${items.map((item) => `
          <li class="lijsten-block__item ${item.done ? 'lijsten-block__item--done' : ''}" data-item-id="${item.id}">
            <button type="button" class="lijsten-block__check" aria-label="${item.done ? 'Markeer ongedaan' : 'Markeer gedaan'}">
              ${item.done ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
            </button>
            <span class="lijsten-block__item-text">${escapeHTML(item.text)}</span>
            <button type="button" class="lijsten-block__item-delete" aria-label="Verwijder">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </li>
        `).join('')}
      </ul>
      <div class="lijsten-block__list-actions">
        <button type="button" class="btn btn-ghost btn-sm lijsten-block__delete-list" data-delete-list="${listId}">Lijst verwijderen</button>
      </div>
    `;

    // Add item
    const input = bodyEl.querySelector('.lijsten-block__item-input');
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        await addItem(listId, text);
        input.value = '';
        eventBus.emit('lists:changed');
      }
    });
    // Auto-focus the input when expanding
    setTimeout(() => input.focus(), 50);

    // Toggle items
    bodyEl.querySelectorAll('.lijsten-block__check').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const itemId = btn.closest('[data-item-id]').dataset.itemId;
        await toggleItem(itemId);
        eventBus.emit('lists:changed');
      });
    });

    // Delete items
    bodyEl.querySelectorAll('.lijsten-block__item-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const itemId = btn.closest('[data-item-id]').dataset.itemId;
        await deleteItem(itemId);
        eventBus.emit('lists:changed');
      });
    });

    // Delete list
    bodyEl.querySelector('.lijsten-block__delete-list')?.addEventListener('click', async () => {
      await deleteList(listId);
      expandedListId = null;
      eventBus.emit('lists:changed');
    });
  }

  const unsubLists = eventBus.on('lists:changed', () => render());

  render();

  return {
    unmount() {
      unsubLists?.();
      el?.remove();
    },
  };
}
