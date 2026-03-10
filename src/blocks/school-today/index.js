import { getAll, put, getByIndex, getSetting } from '../../db.js';
import { icon } from '../../icons.js';
import { navigate } from '../../router.js';
import { on } from '../../core/eventBus.js';
import { getToday, formatDateShort, generateId } from '../../utils.js';

export function createPage(container) {
  const unsubs = [];
  const today = getToday();

  async function render() {
    const [tasks, notes, projects, userName] = await Promise.all([
      getAll('schoolTasks').then(t => t.filter(x => x.date === today)).catch(() => []),
      getAll('schoolNotes').then(n => n.filter(x => x.date === today)).catch(() => []),
      getAll('schoolProjects').catch(() => []),
      getSetting('user_name'),
    ]);

    const activeProject = projects.find(p => p.status === 'active') || projects[0] || null;
    const openTasks = tasks.filter(t => !t.done);
    const doneTasks = tasks.filter(t => t.done);

    container.innerHTML = `
      <div class="hub-header">
        <div class="hub-header-text">
          <h2>${userName ? `Hoi ${userName}` : 'Vandaag'}</h2>
          <p>${formatDateShort(today)} — School modus</p>
        </div>
      </div>

      ${activeProject ? `
        <div class="card" style="border-left: 3px solid var(--color-purple); margin-bottom: var(--space-6)">
          <div style="font-size: 0.75rem; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-2)">Huidig project</div>
          <h3 style="margin-bottom: var(--space-2)">${activeProject.name || 'Naamloos project'}</h3>
          ${activeProject.description ? `<p style="color: var(--color-text-secondary); font-size: 0.875rem">${activeProject.description}</p>` : ''}
          ${activeProject.nextMilestone ? `<p style="color: var(--color-purple); font-size: 0.8125rem; margin-top: var(--space-2)">${icon('target', 14)} Volgende: ${activeProject.nextMilestone}</p>` : ''}
        </div>
      ` : ''}

      <div class="hub-section">
        <div class="hub-section-header">
          <h3>${icon('clipboard-check', 18)} Focus taken (max 3)</h3>
          <span class="hub-section-badge ${openTasks.length === 0 && doneTasks.length > 0 ? 'badge-emerald' : 'badge-purple'}">${doneTasks.length}/${tasks.length || 0}</span>
        </div>

        <div class="hub-tasks">
          ${tasks.length === 0 ? `
            <div style="padding: var(--space-4); color: var(--color-text-tertiary); text-align: center">
              Nog geen taken voor vandaag
            </div>
          ` : tasks.map(task => `
            <div class="hub-task ${task.done ? 'hub-task-done' : ''}" data-task-id="${task.id}">
              <div class="hub-task-check" style="--task-color: var(--color-purple)">
                ${task.done
                  ? `<span class="hub-check-filled">${icon('check-circle', 20)}</span>`
                  : `<span class="hub-check-empty"></span>`
                }
              </div>
              <span class="hub-task-label ${task.done ? 'hub-task-struck' : ''}">${task.title}</span>
            </div>
          `).join('')}
        </div>

        ${tasks.length < 3 ? `
          <div style="margin-top: var(--space-3)">
            <div class="inline-add-form" id="add-task-form">
              <input type="text" class="form-input" id="new-task-input" placeholder="Nieuwe taak..." maxlength="200" style="flex:1">
              <button class="btn btn-primary btn-sm" id="add-task-btn">${icon('plus', 14)} Toevoegen</button>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="hub-section">
        <div class="hub-section-header">
          <h3>${icon('book', 18)} Wat heb ik vandaag begrepen?</h3>
        </div>
        <div style="margin-top: var(--space-2)">
          <textarea class="form-textarea" id="understanding-input" rows="3" placeholder="Schrijf op wat je vandaag hebt geleerd of begrepen...">${notes[0]?.understanding || ''}</textarea>
        </div>
      </div>

      <div class="hub-section">
        <div class="hub-section-header">
          <h3>${icon('edit', 18)} Snelle notities</h3>
        </div>
        <div style="margin-top: var(--space-2)">
          <textarea class="form-textarea" id="quicknotes-input" rows="3" placeholder="Vrije notities...">${notes[0]?.quickNotes || ''}</textarea>
        </div>
      </div>

      <div class="hub-section">
        <div class="hub-section-header">
          <h3>${icon('zap', 18)} Snel naar</h3>
        </div>
        <div class="hub-modules">
          <div class="hub-module" data-nav="projects"><div class="hub-module-icon" style="color:var(--color-purple)">${icon('target', 20)}</div><span>Projecten</span></div>
          <div class="hub-module" data-nav="concepts"><div class="hub-module-icon" style="color:var(--color-blue)">${icon('book', 20)}</div><span>Concepten</span></div>
          <div class="hub-module" data-nav="skills"><div class="hub-module-icon" style="color:var(--color-emerald)">${icon('chart', 20)}</div><span>Skills</span></div>
          <div class="hub-module" data-nav="school-reflectie"><div class="hub-module-icon" style="color:var(--color-amber)">${icon('edit', 20)}</div><span>Reflectie</span></div>
        </div>
      </div>
    `;

    // Toggle task done
    container.querySelectorAll('.hub-task').forEach(el => {
      el.addEventListener('click', async () => {
        const id = el.dataset.taskId;
        const task = tasks.find(t => t.id === id);
        if (task) {
          task.done = !task.done;
          task.updatedAt = new Date().toISOString();
          await put('schoolTasks', task);
          render();
        }
      });
    });

    // Add task
    const addBtn = container.querySelector('#add-task-btn');
    const taskInput = container.querySelector('#new-task-input');
    if (addBtn && taskInput) {
      const addTask = async () => {
        const title = taskInput.value.trim();
        if (!title) return;
        await put('schoolTasks', {
          id: generateId(),
          title,
          date: today,
          done: false,
          mode: 'school',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        render();
      };
      addBtn.addEventListener('click', addTask);
      taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
    }

    // Auto-save notes with debounce
    let saveTimer;
    const saveNotes = async () => {
      const understanding = container.querySelector('#understanding-input')?.value || '';
      const quickNotes = container.querySelector('#quicknotes-input')?.value || '';
      const existing = notes[0] || { id: generateId(), date: today, mode: 'school', createdAt: new Date().toISOString() };
      await put('schoolNotes', { ...existing, understanding, quickNotes, updatedAt: new Date().toISOString() });
    };
    container.querySelectorAll('#understanding-input, #quicknotes-input').forEach(el => {
      el.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveNotes, 1000);
      });
    });

    // Navigation
    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.nav));
    });
  }

  render();
  unsubs.push(on('schoolTasks:updated', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
