import { getDailyEntry, addTodo, toggleTodo, deleteTodo } from '../../stores/daily.js';
import { getToday, escapeHTML } from '../../utils.js';
import { showUndoToast } from '../../toast.js';
import './styles.css';

const MODE_META = {
  School:   { emoji: '📚', color: 'var(--color-purple)',  label: 'School' },
  Personal: { emoji: '🌱', color: 'var(--color-emerald)', label: 'Persoonlijk' },
  BPV:      { emoji: '🏢', color: 'var(--color-blue)',    label: 'BPV' },
};

export function renderDailyTodos(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;
  const today = getToday();

  container.insertAdjacentHTML('beforeend', `
    <article class="daily-todos os-mini-card" data-mount-id="${mountId}">
      <div class="daily-todos__header">
        <h3 class="daily-todos__title"></h3>
        <span class="daily-todos__count"></span>
      </div>
      <div class="daily-todos__add-row">
        <input type="text" class="daily-todos__input"
          placeholder="Taak toevoegen..." maxlength="200" aria-label="Nieuwe taak" />
        <button type="button" class="daily-todos__add-btn" aria-label="Taak toevoegen">+</button>
      </div>
      <ul class="daily-todos__list"></ul>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const titleEl = el.querySelector('.daily-todos__title');
  const countEl = el.querySelector('.daily-todos__count');
  const inputEl = el.querySelector('.daily-todos__input');
  const addBtn = el.querySelector('.daily-todos__add-btn');
  const listEl = el.querySelector('.daily-todos__list');

  // Current todos cache for undo lookups
  let currentTodos = [];

  async function render() {
    const mode = modeManager.getMode();
    const meta = MODE_META[mode] || MODE_META.School;
    const entry = await getDailyEntry(mode, today);
    currentTodos = entry?.todos || [];

    const done = currentTodos.filter((t) => t.done).length;
    const hadFocus = document.activeElement === inputEl;

    titleEl.textContent = 'Taken vandaag';
    titleEl.style.color = meta.color;

    if (currentTodos.length === 0) {
      countEl.textContent = '';
      countEl.className = 'daily-todos__count';
    } else {
      countEl.textContent = `${done}/${currentTodos.length}`;
      countEl.className = done === currentTodos.length
        ? 'daily-todos__count count-badge count-badge--done'
        : 'daily-todos__count count-badge';
    }

    if (currentTodos.length === 0) {
      listEl.innerHTML = `<li class="daily-todos__empty">Voeg je eerste taak toe</li>`;
    } else {
      listEl.innerHTML = currentTodos.map((todo) => `
        <li class="daily-todos__item ${todo.done ? 'daily-todos__item--done' : ''}"
          data-id="${escapeHTML(todo.id)}" style="--todo-color:${meta.color}">
          <button type="button" class="daily-todos__check"
            aria-label="${todo.done ? 'Markeer ongedaan' : 'Markeer gedaan'}"
            aria-pressed="${todo.done}">
            ${todo.done ? '✓' : ''}
          </button>
          <span class="daily-todos__text">${escapeHTML(todo.text)}</span>
          <button type="button" class="daily-todos__delete" aria-label="Verwijder taak">×</button>
        </li>
      `).join('');
    }

    if (hadFocus) inputEl.focus();
  }

  // Event delegation — attach once, never re-attach
  listEl.addEventListener('click', async (e) => {
    const checkBtn = e.target.closest('.daily-todos__check');
    const deleteBtn = e.target.closest('.daily-todos__delete');
    if (!checkBtn && !deleteBtn) return;

    const item = e.target.closest('.daily-todos__item');
    const id = item?.dataset?.id;
    if (!id) return;

    const currentMode = modeManager.getMode();

    if (checkBtn) {
      await toggleTodo(currentMode, today, id);
      eventBus.emit('daily:changed', { mode: currentMode, date: today });
    } else if (deleteBtn) {
      const todo = currentTodos.find((t) => t.id === id);
      await deleteTodo(currentMode, today, id);
      eventBus.emit('daily:changed', { mode: currentMode, date: today });
      if (todo) {
        showUndoToast('Taak verwijderd', async () => {
          await addTodo(currentMode, today, todo.text);
          eventBus.emit('daily:changed', { mode: currentMode, date: today });
        });
      }
    }
  });

  async function handleAdd() {
    const text = inputEl.value.trim();
    if (!text) return;
    const mode = modeManager.getMode();
    inputEl.value = '';
    await addTodo(mode, today, text);
    eventBus.emit('daily:changed', { mode, date: today });
  }

  addBtn.addEventListener('click', handleAdd);
  inputEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') { e.preventDefault(); await handleAdd(); }
  });

  const unsubMode = eventBus.on('mode:changed', () => render());
  const unsubDaily = eventBus.on('daily:changed', ({ mode } = {}) => {
    if (!mode || mode === modeManager.getMode()) render();
  });

  render();

  return {
    unmount() {
      unsubMode?.();
      unsubDaily?.();
      el?.remove();
    },
  };
}
