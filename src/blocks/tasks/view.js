import { getTasksForToday, addTask, toggleTask } from './store.js';
import { getTaskCap } from '../../core/modeCaps.js';
import { escapeHTML } from '../../utils.js';

const MODE_LABELS = { BPV: 'BPV', School: 'School', Personal: 'Persoonlijk' };

export function renderTasks(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;

  container.insertAdjacentHTML('beforeend', `
    <article class="tasks-block os-mini-card" data-mount-id="${mountId}">
      <div class="tasks-block__header">
        <h3 class="tasks-block__title">Taken</h3>
        <span class="tasks-block__mode-label"></span>
      </div>
      <form class="tasks-block__form">
        <input type="text" class="form-input tasks-block__input" placeholder="Nieuwe taak..." autocomplete="off" />
      </form>
      <div class="tasks-block__list"></div>
      <p class="tasks-block__cap-hint"></p>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const form = el.querySelector('.tasks-block__form');
  const input = el.querySelector('.tasks-block__input');
  const listEl = el.querySelector('.tasks-block__list');
  const modeLabel = el.querySelector('.tasks-block__mode-label');
  const capHint = el.querySelector('.tasks-block__cap-hint');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const mode = modeManager.getMode();
    const cap = getTaskCap(mode);
    const tasks = await getTasksForToday(mode);
    const active = tasks.filter((t) => t.status !== 'done');
    if (active.length >= cap) return;
    await addTask(text, mode);
    input.value = '';
    await render();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  async function render() {
    const mode = modeManager.getMode();
    const cap = getTaskCap(mode);
    modeLabel.textContent = MODE_LABELS[mode] || mode;

    const tasks = await getTasksForToday(mode);
    const active = tasks.filter((t) => t.status !== 'done');
    const done = tasks.filter((t) => t.status === 'done');
    const sorted = [...active, ...done];

    if (active.length >= cap) {
      input.disabled = true;
      input.placeholder = `Maximum ${cap} taken bereikt`;
      capHint.textContent = `Focus: maximaal ${cap} taken per dag in ${MODE_LABELS[mode] || mode} modus`;
      capHint.hidden = false;
    } else {
      input.disabled = false;
      input.placeholder = 'Nieuwe taak...';
      capHint.hidden = true;
    }

    if (sorted.length === 0) {
      listEl.innerHTML = '<p class="tasks-block__empty">Nog geen taken voor vandaag</p>';
      return;
    }

    listEl.innerHTML = sorted.map((task) => `
      <label class="tasks-block__item ${task.status === 'done' ? 'tasks-block__item--done' : ''}" data-task-id="${task.id}">
        <input type="checkbox" class="tasks-block__checkbox" ${task.status === 'done' ? 'checked' : ''} />
        <span class="tasks-block__item-text">${escapeHTML(task.text)}</span>
      </label>
    `).join('');

    listEl.querySelectorAll('.tasks-block__checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', async () => {
        const taskId = checkbox.closest('[data-task-id]').getAttribute('data-task-id');
        await toggleTask(taskId);
        await render();
      });
    });
  }

  const unsubMode = eventBus.on('mode:changed', () => render());
  const unsubTasks = eventBus.on('tasks:changed', () => render());

  render();

  return {
    unmount() {
      unsubMode?.();
      unsubTasks?.();
      el?.remove();
    },
  };
}
