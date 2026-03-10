import { getAll, put, softDelete } from '../../db.js';
import { icon } from '../../icons.js';
import { on, emit } from '../../core/eventBus.js';
import { generateId, formatDateShort, getToday } from '../../utils.js';
import { showToast } from '../../toast.js';

export function createPage(container) {
  const unsubs = [];
  let editingId = null;

  async function render() {
    const today = getToday();
    const [milestones, tasks, projects] = await Promise.all([
      getAll('schoolMilestones').catch(() => []),
      getAll('schoolTasks').catch(() => []),
      getAll('schoolProjects').catch(() => []),
    ]);

    // Sort milestones by deadline
    milestones.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));

    // Group milestones by project
    const projectMap = {};
    for (const p of projects) {
      projectMap[p.id] = p;
    }

    const grouped = {};
    const noProject = [];
    for (const m of milestones) {
      if (m.projectId && projectMap[m.projectId]) {
        if (!grouped[m.projectId]) grouped[m.projectId] = [];
        grouped[m.projectId].push(m);
      } else {
        noProject.push(m);
      }
    }

    // Upcoming deadlines (future or today, not done)
    const upcoming = milestones
      .filter(m => m.deadline && m.deadline >= today && m.status !== 'done')
      .slice(0, 5);

    // Count linked tasks per milestone
    function taskCount(milestoneId) {
      return tasks.filter(t => t.milestoneId === milestoneId).length;
    }

    function statusBadge(status) {
      if (status === 'done') return `<span class="badge badge-emerald">${icon('check-circle', 12)} Klaar</span>`;
      if (status === 'in-progress') return `<span class="badge badge-purple">${icon('clock', 12)} Bezig</span>`;
      return `<span class="badge badge-default">${icon('target', 12)} Te doen</span>`;
    }

    function nextStatus(status) {
      if (status === 'todo') return 'in-progress';
      if (status === 'in-progress') return 'done';
      return 'todo';
    }

    function renderMilestone(m) {
      const overdue = m.deadline && m.deadline < today && m.status !== 'done';
      return `
        <div class="card card-clickable" style="margin-bottom: var(--space-3); border-left: 3px solid ${m.status === 'done' ? 'var(--color-emerald)' : overdue ? 'var(--color-red, #ef4444)' : 'var(--color-purple)'}" data-milestone-id="${m.id}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start">
            <div style="flex:1; min-width:0">
              <h4 style="margin-bottom: var(--space-1)">${m.title || 'Naamloos'}</h4>
              <div style="display:flex; gap: var(--space-3); align-items:center; flex-wrap:wrap; font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: var(--space-1)">
                ${m.deadline ? `<span style="${overdue ? 'color: var(--color-red, #ef4444); font-weight: 500' : ''}">${icon('calendar', 12)} ${formatDateShort(m.deadline)}</span>` : ''}
                <span>${icon('target', 12)} ${taskCount(m.id)} taken</span>
                ${statusBadge(m.status || 'todo')}
              </div>
              ${m.notes ? `<p style="color: var(--color-text-tertiary); font-size: 0.8125rem; margin-top: var(--space-2)">${m.notes}</p>` : ''}
            </div>
            <div style="display:flex; gap: var(--space-1); flex-shrink:0; margin-left: var(--space-2)">
              <button class="btn btn-secondary btn-sm" data-toggle-status="${m.id}" title="Status wijzigen">${icon('clock', 14)}</button>
              <button class="btn btn-secondary btn-sm" data-edit-milestone="${m.id}" title="Bewerken">${icon('edit', 14)}</button>
              <button class="btn btn-secondary btn-sm" data-delete-milestone="${m.id}" title="Verwijderen">${icon('trash', 14)}</button>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>Planning</h2>
        <p>Mijlpalen, tijdlijn en deadlines</p>
      </div>

      ${upcoming.length > 0 ? `
        <div class="card" style="margin-bottom: var(--space-6); border-left: 3px solid var(--color-purple)">
          <div style="font-size: 0.75rem; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-3)">${icon('calendar', 14)} Komende deadlines</div>
          ${upcoming.map(m => {
            const daysLeft = Math.ceil((new Date(m.deadline) - new Date(today)) / (1000 * 60 * 60 * 24));
            const urgency = daysLeft <= 2 ? 'color: var(--color-red, #ef4444); font-weight: 500' : daysLeft <= 7 ? 'color: var(--color-amber)' : '';
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light, var(--color-border))">
                <div>
                  <span style="font-size: 0.875rem">${m.title}</span>
                  ${projectMap[m.projectId] ? `<span style="font-size: 0.75rem; color: var(--color-text-tertiary); margin-left: var(--space-2)">${projectMap[m.projectId].name}</span>` : ''}
                </div>
                <span style="font-size: 0.8125rem; ${urgency}">${formatDateShort(m.deadline)} ${daysLeft === 0 ? '(vandaag)' : daysLeft === 1 ? '(morgen)' : `(${daysLeft} dagen)`}</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <button class="btn btn-primary" id="new-milestone-btn" style="margin-bottom: var(--space-6)">
        ${icon('plus', 14)} Nieuw
      </button>

      <div id="milestone-form" style="display:none" class="card" style="margin-bottom: var(--space-6)">
        <h3 id="milestone-form-title">Nieuwe mijlpaal</h3>
        <div class="form-group" style="margin-top: var(--space-4)">
          <label class="form-label">Titel</label>
          <input type="text" class="form-input" id="ms-title" placeholder="Naam van de mijlpaal" maxlength="200">
        </div>
        <div class="form-group">
          <label class="form-label">Deadline</label>
          <input type="date" class="form-input" id="ms-deadline">
        </div>
        <div class="form-group">
          <label class="form-label">Project</label>
          <select class="form-input" id="ms-project">
            <option value="">— Geen project —</option>
            ${projects.map(p => `<option value="${p.id}">${p.name || 'Naamloos'}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Notities</label>
          <textarea class="form-textarea" id="ms-notes" rows="3" placeholder="Extra informatie over deze mijlpaal..."></textarea>
        </div>
        <div style="display:flex; gap: var(--space-2); margin-top: var(--space-4)">
          <button class="btn btn-primary" id="save-milestone-btn">${icon('save', 14)} Opslaan</button>
          <button class="btn btn-secondary" id="cancel-milestone-btn">Annuleren</button>
        </div>
      </div>

      <div id="milestones-list">
        ${milestones.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">${icon('target', 40)}</div>
            <h3>Nog geen mijlpalen</h3>
            <p>Maak je eerste mijlpaal aan om je planning te structureren.</p>
          </div>
        ` : `
          ${Object.keys(grouped).map(projectId => `
            <div style="margin-bottom: var(--space-6)">
              <h3 style="font-size: 0.875rem; color: var(--color-purple); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-3)">${icon('target', 14)} ${projectMap[projectId]?.name || 'Project'}</h3>
              ${grouped[projectId].map(m => renderMilestone(m)).join('')}
            </div>
          `).join('')}
          ${noProject.length > 0 ? `
            <div style="margin-bottom: var(--space-6)">
              <h3 style="font-size: 0.875rem; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-3)">Zonder project</h3>
              ${noProject.map(m => renderMilestone(m)).join('')}
            </div>
          ` : ''}
        `}
      </div>
    `;

    // New milestone button
    const formEl = container.querySelector('#milestone-form');

    container.querySelector('#new-milestone-btn').addEventListener('click', () => {
      editingId = null;
      container.querySelector('#milestone-form-title').textContent = 'Nieuwe mijlpaal';
      formEl.style.display = 'block';
      container.querySelector('#ms-title').value = '';
      container.querySelector('#ms-deadline').value = '';
      container.querySelector('#ms-project').value = '';
      container.querySelector('#ms-notes').value = '';
    });

    container.querySelector('#cancel-milestone-btn').addEventListener('click', () => {
      formEl.style.display = 'none';
      editingId = null;
    });

    container.querySelector('#save-milestone-btn').addEventListener('click', async () => {
      const title = container.querySelector('#ms-title').value.trim();
      if (!title) { showToast('Vul een titel in', 'warning'); return; }

      const existing = editingId ? milestones.find(m => m.id === editingId) : null;

      const record = {
        id: editingId || generateId(),
        title,
        projectId: container.querySelector('#ms-project').value || null,
        deadline: container.querySelector('#ms-deadline').value || null,
        status: existing ? existing.status : 'todo',
        notes: container.querySelector('#ms-notes').value.trim(),
        mode: 'school',
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await put('schoolMilestones', record);
      emit('schoolMilestones:updated');
      showToast('Mijlpaal opgeslagen');
      editingId = null;
      render();
    });

    // Edit milestone
    container.querySelectorAll('[data-edit-milestone]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = milestones.find(ms => ms.id === btn.dataset.editMilestone);
        if (!m) return;
        editingId = m.id;
        container.querySelector('#milestone-form-title').textContent = 'Mijlpaal bewerken';
        formEl.style.display = 'block';
        container.querySelector('#ms-title').value = m.title || '';
        container.querySelector('#ms-deadline').value = m.deadline || '';
        container.querySelector('#ms-project').value = m.projectId || '';
        container.querySelector('#ms-notes').value = m.notes || '';
      });
    });

    // Toggle status
    container.querySelectorAll('[data-toggle-status]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const m = milestones.find(ms => ms.id === btn.dataset.toggleStatus);
        if (!m) return;
        m.status = nextStatus(m.status || 'todo');
        m.updatedAt = new Date().toISOString();
        await put('schoolMilestones', m);
        emit('schoolMilestones:updated');
        const labels = { 'todo': 'Te doen', 'in-progress': 'Bezig', 'done': 'Klaar' };
        showToast(`Status: ${labels[m.status]}`);
        render();
      });
    });

    // Delete milestone
    container.querySelectorAll('[data-delete-milestone]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Mijlpaal verwijderen?')) return;
        await softDelete('schoolMilestones', btn.dataset.deleteMilestone);
        emit('schoolMilestones:updated');
        showToast('Mijlpaal verwijderd');
        render();
      });
    });
  }

  render();
  unsubs.push(on('schoolMilestones:updated', render));
  unsubs.push(on('schoolProjects:updated', render));
  unsubs.push(on('schoolTasks:updated', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
