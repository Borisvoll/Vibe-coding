import { getTasksByProject, addTask, updateTask, deleteTask } from '../../../stores/tasks.js';
import { escapeHTML, getToday } from '../../../utils.js';

const COLUMNS = [
  { id: 'todo', label: 'Te doen', statuses: ['todo'] },
  { id: 'in_progress', label: 'Bezig', statuses: ['in_progress'] },
  { id: 'done', label: 'Klaar', statuses: ['done'] },
];

/**
 * Kanban tab — 3-column board with drag & drop.
 * Tasks can be moved between: Te doen → Bezig → Klaar.
 */
export function renderKanbanTab(host, project, context) {
  const { eventBus, modeManager } = context;
  let dragTaskId = null;

  async function render() {
    const tasks = await getTasksByProject(project.id);

    const columns = COLUMNS.map((col) => ({
      ...col,
      tasks: tasks.filter((t) => col.statuses.includes(t.status || 'todo'))
        .sort((a, b) => (b.updatedAt || b.updated_at || '').localeCompare(a.updatedAt || a.updated_at || '')),
    }));

    host.innerHTML = `
      <div class="kanban">
        <div class="kanban__board">
          ${columns.map((col) => `
            <div class="kanban__column" data-kanban-col="${col.id}">
              <div class="kanban__column-header">
                <span class="kanban__column-title">${col.label}</span>
                <span class="kanban__column-count">${col.tasks.length}</span>
              </div>
              <div class="kanban__column-body" data-kanban-drop="${col.id}">
                ${col.tasks.map((t) => renderCard(t, col.id)).join('')}
              </div>
              ${col.id === 'todo' ? `
                <form class="kanban__add-form" data-kanban-add>
                  <input type="text" class="form-input kanban__add-input" placeholder="Nieuwe taak..." autocomplete="off" />
                  <button type="submit" class="btn btn-primary btn-sm">+</button>
                </form>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderCard(task, colId) {
    const isDone = task.status === 'done';
    return `
      <div class="kanban__card ${isDone ? 'kanban__card--done' : ''}"
        draggable="true" data-kanban-task="${task.id}">
        <span class="kanban__card-text">${escapeHTML(task.text)}</span>
        ${task.date ? `<span class="kanban__card-date">${task.date}</span>` : ''}
        <button type="button" class="kanban__card-delete" data-kanban-delete="${task.id}" aria-label="Verwijder">\u00D7</button>
      </div>
    `;
  }

  function bindEvents() {
    // Add task form
    const addForm = host.querySelector('[data-kanban-add]');
    addForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = addForm.querySelector('.kanban__add-input');
      const text = input.value.trim();
      if (!text) return;
      const mode = project.mode || modeManager.getMode();
      await addTask(text, mode, getToday(), project.id);
      input.value = '';
      eventBus.emit('tasks:changed');
      await render();
    });

    // Delete task
    host.querySelectorAll('[data-kanban-delete]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteTask(btn.dataset.kanbanDelete);
        eventBus.emit('tasks:changed');
        await render();
      });
    });

    // Drag & drop
    const cards = host.querySelectorAll('[data-kanban-task]');
    const dropZones = host.querySelectorAll('[data-kanban-drop]');

    cards.forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        dragTaskId = card.dataset.kanbanTask;
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('kanban__card--dragging');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('kanban__card--dragging');
        dragTaskId = null;
        host.querySelectorAll('.kanban__column--drop-target').forEach((z) => {
          z.classList.remove('kanban__column--drop-target');
        });
      });
    });

    dropZones.forEach((zone) => {
      const col = zone.closest('[data-kanban-col]');
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col?.classList.add('kanban__column--drop-target');
      });
      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) {
          col?.classList.remove('kanban__column--drop-target');
        }
      });
      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        col?.classList.remove('kanban__column--drop-target');
        if (!dragTaskId) return;
        const targetStatus = zone.dataset.kanbanDrop;
        const changes = { status: targetStatus };
        if (targetStatus === 'done') {
          changes.doneAt = new Date().toISOString();
        } else {
          changes.doneAt = null;
        }
        await updateTask(dragTaskId, changes);
        dragTaskId = null;
        eventBus.emit('tasks:changed');
        await render();
      });
    });
  }

  const unsubTasks = eventBus.on('tasks:changed', () => render());

  render();

  return {
    unmount() {
      unsubTasks?.();
      host.innerHTML = '';
    },
  };
}
