import { getTasksByProject, addTask, toggleTask, deleteTask, updateTask } from '../../stores/tasks.js';
import { escapeHTML, getToday } from '../../utils.js';

export function renderProjectTasks(host, project, context) {
  const { eventBus, modeManager } = context;

  async function render() {
    const tasks = await getTasksByProject(project.id);
    const todo = tasks.filter((t) => t.status !== 'done').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const done = tasks.filter((t) => t.status === 'done');

    host.innerHTML = `
      <div class="project-tasks">
        <div class="project-tasks__header">
          <h4 class="project-tasks__title">Taken</h4>
          <span class="project-tasks__count">${todo.length} open${done.length ? `, ${done.length} afgerond` : ''}</span>
        </div>
        <form class="project-tasks__add-form" data-add-task>
          <input type="text" class="form-input project-tasks__input"
            placeholder="Nieuwe taak..." autocomplete="off" data-task-text />
          <input type="date" class="form-input project-tasks__date" data-task-date />
          <button type="submit" class="btn btn-primary btn-sm">Toevoegen</button>
        </form>
        <ul class="project-tasks__list">
          ${todo.map((t) => renderTaskItem(t)).join('')}
        </ul>
        ${done.length > 0 ? `
          <details class="project-tasks__done-section">
            <summary class="project-tasks__done-toggle">Afgerond (${done.length})</summary>
            <ul class="project-tasks__list project-tasks__list--done">
              ${done.map((t) => renderTaskItem(t)).join('')}
            </ul>
          </details>
        ` : ''}
      </div>
    `;

    // Bind add form
    const form = host.querySelector('[data-add-task]');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textInput = form.querySelector('[data-task-text]');
      const dateInput = form.querySelector('[data-task-date]');
      const text = textInput.value.trim();
      if (!text) return;
      const date = dateInput.value || null;
      const mode = project.mode || modeManager.getMode();
      await addTask(text, mode, date, project.id);
      eventBus.emit('tasks:changed');
      await render();
    });

    // Bind toggle
    host.querySelectorAll('[data-toggle-task]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await toggleTask(btn.dataset.toggleTask);
        eventBus.emit('tasks:changed');
        await render();
      });
    });

    // Bind delete
    host.querySelectorAll('[data-delete-task]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteTask(btn.dataset.deleteTask);
        eventBus.emit('tasks:changed');
        await render();
      });
    });

    // Bind date edit
    host.querySelectorAll('[data-edit-date]').forEach((input) => {
      input.addEventListener('change', async () => {
        await updateTask(input.dataset.editDate, { date: input.value || null });
        eventBus.emit('tasks:changed');
        await render();
      });
    });
  }

  render();

  return {
    unmount() { host.innerHTML = ''; },
  };
}

function renderTaskItem(task) {
  const isDone = task.status === 'done';
  const dateLabel = task.date ? `<span class="project-tasks__task-date">${task.date}</span>` : '';
  return `
    <li class="project-tasks__item ${isDone ? 'project-tasks__item--done' : ''}">
      <button type="button" class="project-tasks__check" data-toggle-task="${task.id}"
        aria-label="${isDone ? 'Markeer als open' : 'Markeer als klaar'}">
        ${isDone ? '✓' : '○'}
      </button>
      <span class="project-tasks__text">${escapeHTML(task.text)}</span>
      ${dateLabel}
      ${!isDone ? `<input type="date" class="project-tasks__date-edit" value="${task.date || ''}" data-edit-date="${task.id}" />` : ''}
      <button type="button" class="project-tasks__delete" data-delete-task="${task.id}" aria-label="Verwijder">×</button>
    </li>`;
}
