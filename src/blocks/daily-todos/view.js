import { getDailyEntry, addTodo, toggleTodo, deleteTodo } from '../../stores/daily.js';
import { getToday, escapeHTML } from '../../utils.js';

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
        <input type="text" class="form-input daily-todos__input"
          placeholder="Taak toevoegen..." maxlength="200" />
        <button type="button" class="btn btn-ghost btn-sm daily-todos__add-btn" aria-label="Taak toevoegen" data-tooltip="Taak toevoegen">+</button>
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

  async function render() {
    const mode = modeManager.getMode();
    const meta = MODE_META[mode] || MODE_META.School;
    const entry = await getDailyEntry(mode, today);
    const todos = entry?.todos || [];

    const done = todos.filter((t) => t.done).length;

    titleEl.textContent = 'Taken vandaag';
    titleEl.style.color = meta.color;
    countEl.textContent = todos.length > 0 ? `${done}/${todos.length}` : '';
    countEl.style.color = done === todos.length && todos.length > 0
      ? meta.color
      : 'var(--color-text-tertiary)';

    listEl.innerHTML = todos.map((todo) => `
      <li class="daily-todos__item ${todo.done ? 'daily-todos__item--done' : ''}" data-id="${escapeHTML(todo.id)}">
        <button type="button" class="daily-todos__check" aria-label="${todo.done ? 'Markeer ongedaan' : 'Markeer gedaan'}"
          style="--todo-color:${meta.color}">
          ${todo.done ? '✓' : ''}
        </button>
        <span class="daily-todos__text">${escapeHTML(todo.text)}</span>
        <button type="button" class="daily-todos__pomo-btn" aria-label="Focus op deze taak met Pomodoro" title="🍅 Focus">🍅</button>
        <button type="button" class="daily-todos__delete" aria-label="Verwijder taak">×</button>
      </li>
    `).join('');

    listEl.querySelectorAll('.daily-todos__check').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.daily-todos__item').dataset.id;
        const currentMode = modeManager.getMode();
        await toggleTodo(currentMode, today, id);
        eventBus.emit('daily:changed', { mode: currentMode, date: today });
      });
    });

    listEl.querySelectorAll('.daily-todos__delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.daily-todos__item').dataset.id;
        const currentMode = modeManager.getMode();
        await deleteTodo(currentMode, today, id);
        eventBus.emit('daily:changed', { mode: currentMode, date: today });
      });
    });

    // Pomodoro link buttons — emit event so the floating widget can pick it up
    listEl.querySelectorAll('.daily-todos__pomo-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.daily-todos__item');
        const id = item.dataset.id;
        const text = item.querySelector('.daily-todos__text')?.textContent || '';
        eventBus.emit('pomodoro:link-task', { id, text });
      });
    });
  }

  async function handleAdd() {
    const text = inputEl.value.trim();
    if (!text) return;
    const mode = modeManager.getMode();
    inputEl.value = '';
    await addTodo(mode, today, text);
    eventBus.emit('daily:changed', { mode, date: today });
  }

  addBtn.addEventListener('click', handleAdd);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
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
