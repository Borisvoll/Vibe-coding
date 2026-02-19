import { getDailyEntry, saveDailyEntry } from '../../stores/daily.js';
import { getToday, escapeHTML } from '../../utils.js';

export function renderDailyOutcomes(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus } = context;
  const today = getToday();

  container.insertAdjacentHTML('beforeend', `
    <article class="daily-outcomes os-mini-card" data-mount-id="${mountId}">
      <h3 class="daily-outcomes__title">Top 3 vandaag</h3>
      <div class="daily-outcomes__list"></div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const listEl = el.querySelector('.daily-outcomes__list');

  async function render() {
    const entry = await getDailyEntry(today);
    const tasks = entry?.tasks || [];

    const slots = [0, 1, 2].map((i) => {
      const task = tasks[i];
      return `
        <label class="daily-outcomes__item">
          <input type="checkbox" class="daily-outcomes__checkbox"
            data-idx="${i}" ${task?.done ? 'checked' : ''} ${!task ? 'disabled' : ''} />
          <input type="text" class="form-input daily-outcomes__input"
            data-idx="${i}" value="${escapeHTML(task?.text || '')}"
            placeholder="${i === 0 ? 'Belangrijkste uitkomst...' : i === 1 ? 'Tweede prioriteit...' : 'Derde (optioneel)...'}" />
        </label>
      `;
    });

    listEl.innerHTML = `
      ${slots.join('')}
      <button type="button" class="btn btn-ghost btn-sm daily-outcomes__save">Opslaan</button>
    `;

    listEl.querySelector('.daily-outcomes__save').addEventListener('click', async () => {
      const inputs = listEl.querySelectorAll('.daily-outcomes__input');
      const checks = listEl.querySelectorAll('.daily-outcomes__checkbox');
      const newTasks = [];
      inputs.forEach((input, i) => {
        const text = input.value.trim();
        if (text) {
          newTasks.push({ text, done: checks[i].checked });
        }
      });
      if (newTasks.length === 0) return;
      await saveDailyEntry({ date: today, tasks: newTasks, evaluation: entry?.evaluation });
      eventBus.emit('daily:changed');
    });

    listEl.querySelectorAll('.daily-outcomes__checkbox').forEach((cb) => {
      cb.addEventListener('change', async () => {
        const idx = parseInt(cb.dataset.idx, 10);
        const currentEntry = await getDailyEntry(today);
        if (!currentEntry?.tasks[idx]) return;
        currentEntry.tasks[idx].done = cb.checked;
        await saveDailyEntry({
          date: today,
          tasks: currentEntry.tasks,
          evaluation: currentEntry.evaluation,
        });
        eventBus.emit('daily:changed');
      });
    });
  }

  const unsubMode = eventBus.on('mode:changed', () => render());
  const unsubDaily = eventBus.on('daily:changed', () => render());

  render();

  return {
    unmount() {
      unsubMode?.();
      unsubDaily?.();
      el?.remove();
    },
  };
}
