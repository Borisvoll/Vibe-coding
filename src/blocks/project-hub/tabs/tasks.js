import { getTasksByProject, addTask, toggleTask, deleteTask, updateTask } from '../../../stores/tasks.js';
import { escapeHTML, getToday } from '../../../utils.js';

const VISIBLE_INIT = 3;

/**
 * Tasks tab — shows project tasks with push-to-Today, inline add, toggle, delete.
 */
export function renderTasksTab(host, project, context) {
  const { eventBus, modeManager } = context;
  let showAll = false;

  async function render() {
    const today = getToday();
    const tasks = await getTasksByProject(project.id);
    const pending = tasks.filter((t) => t.status !== 'done');
    const done = tasks.filter((t) => t.status === 'done');
    const sorted = [...pending, ...done];

    const visible = showAll ? sorted : sorted.slice(0, VISIBLE_INIT);
    const hasMore = sorted.length > VISIBLE_INIT && !showAll;

    host.innerHTML = `
      <div class="hub-tasks">
        <div class="hub-tasks__list" data-tasks-list>
          ${visible.length === 0 ? '<p class="hub-tasks__empty">Geen taken voor dit project.</p>' : ''}
          ${visible.map((t) => {
            const isToday = t.date === today;
            const isDone = t.status === 'done';
            return `
              <div class="hub-tasks__item ${isDone ? 'hub-tasks__item--done' : ''}" data-task-id="${t.id}">
                <button type="button" class="hub-tasks__check" data-toggle title="${isDone ? 'Als openstaand markeren' : 'Markeer als gereed'}">
                  ${isDone
                    ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="var(--color-accent)" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                    : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="var(--color-border)" stroke-width="1.5"/></svg>'
                  }
                </button>
                <span class="hub-tasks__text">${escapeHTML(t.text)}</span>
                <div class="hub-tasks__actions">
                  ${!isDone ? `
                    <button type="button" class="hub-tasks__today-btn ${isToday ? 'hub-tasks__today-btn--active' : ''}"
                      data-push-today title="${isToday ? 'Al gepland voor vandaag' : 'Push naar vandaag'}">
                      ${isToday ? '📌' : '📅'}
                    </button>
                  ` : ''}
                  <button type="button" class="hub-tasks__delete" data-delete title="Verwijder taak">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${hasMore ? `<button type="button" class="hub-tasks__more-btn" data-show-all>Meer laden (${sorted.length - VISIBLE_INIT})</button>` : ''}
        ${showAll && sorted.length > VISIBLE_INIT ? `<button type="button" class="hub-tasks__more-btn" data-show-less>Minder tonen</button>` : ''}
        <form class="hub-tasks__add-form" data-add-form>
          <input type="text" class="form-input hub-tasks__add-input" placeholder="Taak toevoegen..." autocomplete="off" />
          <button type="submit" class="btn btn-primary btn-sm">+</button>
        </form>
      </div>
    `;

    bindEvents(today);
  }

  function bindEvents(today) {
    const listEl = host.querySelector('[data-tasks-list]');

    // Toggle done
    listEl?.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const taskId = btn.closest('[data-task-id]').dataset.taskId;
        await toggleTask(taskId);
        eventBus.emit('tasks:changed');
        await render();
      });
    });

    // Push to Today
    listEl?.querySelectorAll('[data-push-today]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const taskId = btn.closest('[data-task-id]').dataset.taskId;
        const isToday = btn.classList.contains('hub-tasks__today-btn--active');
        if (!isToday) {
          await updateTask(taskId, { date: today });
          eventBus.emit('tasks:changed');
          await render();
        }
      });
    });

    // Delete
    listEl?.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const taskId = btn.closest('[data-task-id]').dataset.taskId;
        await deleteTask(taskId);
        eventBus.emit('tasks:changed');
        await render();
      });
    });

    // Show all / less
    host.querySelector('[data-show-all]')?.addEventListener('click', () => {
      showAll = true;
      render();
    });
    host.querySelector('[data-show-less]')?.addEventListener('click', () => {
      showAll = false;
      render();
    });

    // Add task form
    const addForm = host.querySelector('[data-add-form]');
    addForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = addForm.querySelector('.hub-tasks__add-input');
      const text = input.value.trim();
      if (!text) return;
      const mode = project.mode || modeManager.getMode();
      await addTask(text, mode, null, project.id);
      input.value = '';
      eventBus.emit('tasks:changed');
      await render();
    });
  }

  const unsubTasks = eventBus.on('tasks:changed', () => render());

  render();

  return {
    unmount() {
      unsubTasks?.();
    },
  };
}
