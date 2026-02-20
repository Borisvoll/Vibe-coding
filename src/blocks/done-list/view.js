import { escapeHTML, getToday } from '../../utils.js';
import { getAll, put } from '../../db.js';
import { generateId } from '../../utils.js';

export function renderDoneList(container, context) {
  const { eventBus, modeManager } = context;

  const wrapper = document.createElement('article');
  wrapper.className = 'done-list os-mini-card';

  async function render() {
    const today = getToday();
    const mode = modeManager?.getMode() || 'School';
    const allTasks = await getAll('os_tasks').catch(() => []);
    const doneTasks = allTasks
      .filter(t => t.status === 'done' && t.date === today)
      .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

    const count = doneTasks.length;

    wrapper.innerHTML = `
      <div class="done-list__header">
        <h3 class="done-list__title">Gedaan vandaag</h3>
        <span class="done-list__count">${count}</span>
      </div>
      <form class="done-list__form">
        <input type="text" class="done-list__input" placeholder="Wat heb je gedaan?" maxlength="140" />
        <button type="submit" class="done-list__add">+</button>
      </form>
      <div class="done-list__items">
        ${doneTasks.map(t => `
          <div class="done-list__item">
            <span class="done-list__check">✓</span>
            <span class="done-list__text">${escapeHTML(t.text)}</span>
          </div>
        `).join('')}
        ${count === 0 ? '<p class="done-list__empty">Nog niks — en dat is oké</p>' : ''}
      </div>
    `;

    const form = wrapper.querySelector('.done-list__form');
    const input = wrapper.querySelector('.done-list__input');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const now = new Date().toISOString();
      await put('os_tasks', {
        id: generateId(),
        text,
        mode,
        status: 'done',
        priority: 3,
        date: today,
        doneAt: now,
        createdAt: now,
        updated_at: now,
      });

      input.value = '';
      eventBus?.emit('tasks:changed');
      render();
    });
  }

  const unsub = eventBus?.on('tasks:changed', () => render());
  render();
  container.appendChild(wrapper);

  return {
    unmount() {
      unsub?.();
      wrapper.remove();
    },
  };
}
