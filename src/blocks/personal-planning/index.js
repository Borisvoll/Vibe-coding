import { getAll, put, softDelete } from '../../db.js';
import { icon } from '../../icons.js';
import { on, emit } from '../../core/eventBus.js';
import { generateId, getToday, getISOWeek, getWeekDates, formatDateShort } from '../../utils.js';
import { showToast } from '../../toast.js';

export function createPage(container) {
  const unsubs = [];
  let editingGoalId = null;

  async function render() {
    const today = getToday();
    const currentWeek = getISOWeek(today);
    const weekDates = getWeekDates(currentWeek);

    const [allTasks, allGoals] = await Promise.all([
      getAll('personalTasks').catch(() => []),
      getAll('personalGoals').catch(() => []),
    ]);

    // Group tasks by date
    const tasksByDate = {};
    for (const date of weekDates) {
      tasksByDate[date] = allTasks
        .filter(t => t.date === date)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    }

    // Sort goals: active first, then paused, then completed
    const statusOrder = { active: 0, paused: 1, completed: 2 };
    const goals = [...allGoals].sort((a, b) =>
      (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
    );

    function statusBadge(status) {
      if (status === 'completed') return `<span class="badge badge-emerald">${icon('check-circle', 12)} Voltooid</span>`;
      if (status === 'paused') return `<span class="badge badge-default">${icon('clock', 12)} Gepauzeerd</span>`;
      return `<span class="badge badge-teal">${icon('sun', 12)} Actief</span>`;
    }

    function truncateText(str, max = 80) {
      if (!str || str.length <= max) return str || '';
      return str.slice(0, max) + '...';
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>${icon('target', 22)} Planning</h2>
        <p>Weekoverzicht en levensdoelen</p>
      </div>

      <!-- Week Overview -->
      <div style="margin-bottom: var(--space-8)">
        <h3 style="font-size: 0.875rem; color: var(--color-teal); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-4)">${icon('clock', 14)} Weekoverzicht</h3>

        ${weekDates.map(date => {
          const tasks = tasksByDate[date] || [];
          const isToday = date === today;
          return `
            <div class="card" style="margin-bottom: var(--space-3); border-left: 3px solid ${isToday ? 'var(--color-teal)' : 'var(--color-border)'}">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: ${tasks.length > 0 ? 'var(--space-3)' : '0'}">
                <span style="font-weight: 600; font-size: 0.875rem; ${isToday ? 'color: var(--color-teal)' : ''}">${formatDateShort(date)}${isToday ? ' (vandaag)' : ''}</span>
                <button class="btn btn-secondary btn-sm" data-add-task="${date}" title="Taak toevoegen">${icon('plus', 14)}</button>
              </div>

              ${tasks.length > 0 ? `
                <div style="display:flex; flex-direction:column; gap: var(--space-2)">
                  ${tasks.map(t => `
                    <div style="display:flex; align-items:center; gap: var(--space-2)">
                      <input type="checkbox" ${t.done ? 'checked' : ''} data-toggle-task="${t.id}" style="cursor:pointer; accent-color: var(--color-teal)">
                      <span style="flex:1; font-size: 0.875rem; ${t.done ? 'text-decoration: line-through; color: var(--color-text-tertiary)' : ''}">${t.title}</span>
                      <button class="btn btn-secondary btn-sm" data-delete-task="${t.id}" title="Verwijderen" style="padding: 2px 4px">${icon('trash', 12)}</button>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <div data-task-form="${date}" style="display:none; margin-top: var(--space-3)">
                <div style="display:flex; gap: var(--space-2)">
                  <input type="text" class="form-input" data-task-input="${date}" placeholder="Nieuwe taak..." maxlength="200" style="flex:1; font-size: 0.875rem">
                  <button class="btn btn-primary btn-sm" data-save-task="${date}">${icon('save', 14)}</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Life Goals -->
      <div>
        <h3 style="font-size: 0.875rem; color: var(--color-teal); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-4)">${icon('target', 14)} Levensdoelen</h3>

        <button class="btn btn-primary" id="new-goal-btn" style="margin-bottom: var(--space-4)">
          ${icon('plus', 14)} Nieuw doel
        </button>

        <div id="goal-form" style="display:none" class="card" style="margin-bottom: var(--space-4)">
          <h3 id="goal-form-title">Nieuw doel</h3>
          <div class="form-group" style="margin-top: var(--space-4)">
            <label class="form-label">Titel</label>
            <input type="text" class="form-input" id="goal-title" placeholder="Wat wil je bereiken?" maxlength="200">
          </div>
          <div class="form-group">
            <label class="form-label">Beschrijving</label>
            <textarea class="form-textarea" id="goal-description" rows="3" placeholder="Beschrijf je doel in meer detail..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Tijdsbestek (optioneel)</label>
            <input type="text" class="form-input" id="goal-timeframe" placeholder="bijv. 1 jaar, voor de zomer, 2026">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-input" id="goal-status">
              <option value="active">Actief</option>
              <option value="paused">Gepauzeerd</option>
              <option value="completed">Voltooid</option>
            </select>
          </div>
          <div style="display:flex; gap: var(--space-2); margin-top: var(--space-4)">
            <button class="btn btn-primary" id="save-goal-btn">${icon('save', 14)} Opslaan</button>
            <button class="btn btn-secondary" id="cancel-goal-btn">Annuleren</button>
          </div>
        </div>

        <div id="goals-list">
          ${goals.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">${icon('target', 40)}</div>
              <h3>Nog geen doelen</h3>
              <p>Voeg je eerste levensdoel toe om richting te geven aan je planning.</p>
            </div>
          ` : goals.map(g => `
            <div class="card" style="margin-bottom: var(--space-3); border-left: 3px solid ${g.status === 'completed' ? 'var(--color-emerald)' : g.status === 'paused' ? 'var(--color-text-tertiary)' : 'var(--color-teal)'}">
              <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <div style="flex:1; min-width:0">
                  <h4 style="margin-bottom: var(--space-1); ${g.status === 'completed' ? 'text-decoration: line-through; color: var(--color-text-tertiary)' : ''}">${g.title || 'Naamloos'}</h4>
                  <div style="display:flex; gap: var(--space-3); align-items:center; flex-wrap:wrap; font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: var(--space-1)">
                    ${statusBadge(g.status || 'active')}
                    ${g.timeframe ? `<span>${icon('clock', 12)} ${g.timeframe}</span>` : ''}
                  </div>
                  ${g.description ? `<p style="color: var(--color-text-tertiary); font-size: 0.8125rem; margin-top: var(--space-2)">${truncateText(g.description)}</p>` : ''}
                </div>
                <div style="display:flex; gap: var(--space-1); flex-shrink:0; margin-left: var(--space-2)">
                  <button class="btn btn-secondary btn-sm" data-toggle-goal-status="${g.id}" title="Status wijzigen">${icon('check-circle', 14)}</button>
                  <button class="btn btn-secondary btn-sm" data-edit-goal="${g.id}" title="Bewerken">${icon('edit', 14)}</button>
                  <button class="btn btn-secondary btn-sm" data-delete-goal="${g.id}" title="Verwijderen">${icon('trash', 14)}</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // === Task event handlers ===

    // Add task buttons
    container.querySelectorAll('[data-add-task]').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.addTask;
        const form = container.querySelector(`[data-task-form="${date}"]`);
        if (form) {
          form.style.display = form.style.display === 'none' ? 'block' : 'none';
          if (form.style.display === 'block') {
            const input = container.querySelector(`[data-task-input="${date}"]`);
            if (input) input.focus();
          }
        }
      });
    });

    // Save task buttons
    container.querySelectorAll('[data-save-task]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const date = btn.dataset.saveTask;
        const input = container.querySelector(`[data-task-input="${date}"]`);
        const title = input?.value.trim();
        if (!title) { showToast('Vul een taak in', 'warning'); return; }

        const record = {
          id: generateId(),
          title,
          date,
          done: false,
          meaningful: false,
          mode: 'personal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await put('personalTasks', record);
        emit('personalTasks:updated');
        showToast('Taak toegevoegd');
        render();
      });
    });

    // Enter key on task inputs
    container.querySelectorAll('[data-task-input]').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const date = input.dataset.taskInput;
          const btn = container.querySelector(`[data-save-task="${date}"]`);
          if (btn) btn.click();
        }
      });
    });

    // Toggle task done
    container.querySelectorAll('[data-toggle-task]').forEach(cb => {
      cb.addEventListener('change', async () => {
        const task = allTasks.find(t => t.id === cb.dataset.toggleTask);
        if (!task) return;
        task.done = cb.checked;
        task.updatedAt = new Date().toISOString();
        await put('personalTasks', task);
        emit('personalTasks:updated');
        render();
      });
    });

    // Delete task
    container.querySelectorAll('[data-delete-task]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await softDelete('personalTasks', btn.dataset.deleteTask);
        emit('personalTasks:updated');
        showToast('Taak verwijderd');
        render();
      });
    });

    // === Goal event handlers ===

    const goalFormEl = container.querySelector('#goal-form');

    // New goal button
    container.querySelector('#new-goal-btn').addEventListener('click', () => {
      editingGoalId = null;
      container.querySelector('#goal-form-title').textContent = 'Nieuw doel';
      goalFormEl.style.display = 'block';
      container.querySelector('#goal-title').value = '';
      container.querySelector('#goal-description').value = '';
      container.querySelector('#goal-timeframe').value = '';
      container.querySelector('#goal-status').value = 'active';
    });

    // Cancel goal
    container.querySelector('#cancel-goal-btn').addEventListener('click', () => {
      goalFormEl.style.display = 'none';
      editingGoalId = null;
    });

    // Save goal
    container.querySelector('#save-goal-btn').addEventListener('click', async () => {
      const title = container.querySelector('#goal-title').value.trim();
      if (!title) { showToast('Vul een titel in', 'warning'); return; }

      const existing = editingGoalId ? allGoals.find(g => g.id === editingGoalId) : null;

      const record = {
        id: editingGoalId || generateId(),
        title,
        description: container.querySelector('#goal-description').value.trim(),
        status: container.querySelector('#goal-status').value,
        timeframe: container.querySelector('#goal-timeframe').value.trim() || null,
        mode: 'personal',
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await put('personalGoals', record);
      emit('personalGoals:updated');
      showToast('Doel opgeslagen');
      editingGoalId = null;
      render();
    });

    // Edit goal
    container.querySelectorAll('[data-edit-goal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = allGoals.find(goal => goal.id === btn.dataset.editGoal);
        if (!g) return;
        editingGoalId = g.id;
        container.querySelector('#goal-form-title').textContent = 'Doel bewerken';
        goalFormEl.style.display = 'block';
        container.querySelector('#goal-title').value = g.title || '';
        container.querySelector('#goal-description').value = g.description || '';
        container.querySelector('#goal-timeframe').value = g.timeframe || '';
        container.querySelector('#goal-status').value = g.status || 'active';
      });
    });

    // Toggle goal status: active → completed, completed → paused, paused → active
    container.querySelectorAll('[data-toggle-goal-status]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const g = allGoals.find(goal => goal.id === btn.dataset.toggleGoalStatus);
        if (!g) return;

        const nextStatus = { active: 'completed', completed: 'paused', paused: 'active' };
        g.status = nextStatus[g.status] || 'active';
        g.updatedAt = new Date().toISOString();
        await put('personalGoals', g);
        emit('personalGoals:updated');

        const labels = { active: 'Actief', completed: 'Voltooid', paused: 'Gepauzeerd' };
        showToast(`Status: ${labels[g.status]}`);
        render();
      });
    });

    // Delete goal
    container.querySelectorAll('[data-delete-goal]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Doel verwijderen?')) return;
        await softDelete('personalGoals', btn.dataset.deleteGoal);
        emit('personalGoals:updated');
        showToast('Doel verwijderd');
        render();
      });
    });
  }

  render();
  unsubs.push(on('personalTasks:updated', render));
  unsubs.push(on('personalGoals:updated', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
