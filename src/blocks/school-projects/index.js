import { getAll, put, softDelete } from '../../db.js';
import { icon } from '../../icons.js';
import { on, emit } from '../../core/eventBus.js';
import { generateId } from '../../utils.js';
import { showToast } from '../../toast.js';

export function createPage(container) {
  const unsubs = [];
  let editingId = null;

  async function render() {
    const projects = await getAll('schoolProjects').catch(() => []);
    projects.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    container.innerHTML = `
      <div class="page-header">
        <h2>Projecten</h2>
        <p>Wat je bouwt en waar je naartoe werkt</p>
      </div>

      <button class="btn btn-primary" id="new-project-btn" style="margin-bottom: var(--space-6)">
        ${icon('plus', 14)} Nieuw project
      </button>

      <div id="project-form" style="display:none" class="card" style="margin-bottom: var(--space-6)">
        <h3 id="form-title">Nieuw project</h3>
        <div class="form-group" style="margin-top: var(--space-4)">
          <label class="form-label">Projectnaam</label>
          <input type="text" class="form-input" id="proj-name" placeholder="Naam van je project" maxlength="200">
        </div>
        <div class="form-group">
          <label class="form-label">Wat bouw ik?</label>
          <textarea class="form-textarea" id="proj-building" rows="2" placeholder="Beschrijf kort wat je maakt..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Wat wil ik leren?</label>
          <textarea class="form-textarea" id="proj-learning" rows="2" placeholder="Welke vaardigheden/kennis..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Volgende mijlpaal</label>
          <input type="text" class="form-input" id="proj-milestone" placeholder="Eerstvolgende doel" maxlength="200">
        </div>
        <div class="form-group">
          <label class="form-label">Beschrijving</label>
          <textarea class="form-textarea" id="proj-description" rows="3" placeholder="Uitgebreidere beschrijving..."></textarea>
        </div>
        <div style="display:flex; gap: var(--space-2); margin-top: var(--space-4)">
          <button class="btn btn-primary" id="save-project-btn">${icon('save', 14)} Opslaan</button>
          <button class="btn btn-secondary" id="cancel-project-btn">Annuleren</button>
        </div>
      </div>

      <div id="projects-list">
        ${projects.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">${icon('target', 40)}</div>
            <h3>Nog geen projecten</h3>
            <p>Maak je eerste project aan om je school-werk te structureren.</p>
          </div>
        ` : projects.map(p => `
          <div class="card card-clickable" style="margin-bottom: var(--space-4); border-left: 3px solid ${p.status === 'active' ? 'var(--color-purple)' : 'var(--color-border)'}" data-project-id="${p.id}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start">
              <div>
                <h3>${p.name || 'Naamloos'}</h3>
                ${p.whatBuilding ? `<p style="color: var(--color-text-secondary); font-size: 0.875rem; margin-top: var(--space-1)">${p.whatBuilding}</p>` : ''}
                ${p.nextMilestone ? `<p style="color: var(--color-purple); font-size: 0.8125rem; margin-top: var(--space-2)">${icon('target', 14)} ${p.nextMilestone}</p>` : ''}
              </div>
              <div style="display:flex; gap: var(--space-1)">
                ${p.status !== 'active' ? `<button class="btn btn-secondary btn-sm" data-activate="${p.id}" title="Maak actief">${icon('check-circle', 14)}</button>` : '<span class="badge badge-purple">Actief</span>'}
                <button class="btn btn-secondary btn-sm" data-edit="${p.id}" title="Bewerken">${icon('edit', 14)}</button>
                <button class="btn btn-secondary btn-sm" data-delete="${p.id}" title="Verwijderen">${icon('trash', 14)}</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const formEl = container.querySelector('#project-form');
    const listEl = container.querySelector('#projects-list');

    container.querySelector('#new-project-btn').addEventListener('click', () => {
      editingId = null;
      container.querySelector('#form-title').textContent = 'Nieuw project';
      formEl.style.display = 'block';
      formEl.querySelector('#proj-name').value = '';
      formEl.querySelector('#proj-building').value = '';
      formEl.querySelector('#proj-learning').value = '';
      formEl.querySelector('#proj-milestone').value = '';
      formEl.querySelector('#proj-description').value = '';
    });

    container.querySelector('#cancel-project-btn').addEventListener('click', () => {
      formEl.style.display = 'none';
      editingId = null;
    });

    container.querySelector('#save-project-btn').addEventListener('click', async () => {
      const name = container.querySelector('#proj-name').value.trim();
      if (!name) { showToast('Vul een naam in', 'warning'); return; }

      const record = {
        id: editingId || generateId(),
        name,
        whatBuilding: container.querySelector('#proj-building').value.trim(),
        whatLearning: container.querySelector('#proj-learning').value.trim(),
        nextMilestone: container.querySelector('#proj-milestone').value.trim(),
        description: container.querySelector('#proj-description').value.trim(),
        status: editingId ? (projects.find(p => p.id === editingId)?.status || 'active') : 'active',
        mode: 'school',
        createdAt: editingId ? (projects.find(p => p.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await put('schoolProjects', record);
      emit('schoolProjects:updated');
      showToast('Project opgeslagen');
      editingId = null;
      render();
    });

    // Edit buttons
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = projects.find(pr => pr.id === btn.dataset.edit);
        if (!p) return;
        editingId = p.id;
        container.querySelector('#form-title').textContent = 'Project bewerken';
        formEl.style.display = 'block';
        container.querySelector('#proj-name').value = p.name || '';
        container.querySelector('#proj-building').value = p.whatBuilding || '';
        container.querySelector('#proj-learning').value = p.whatLearning || '';
        container.querySelector('#proj-milestone').value = p.nextMilestone || '';
        container.querySelector('#proj-description').value = p.description || '';
      });
    });

    // Activate buttons
    container.querySelectorAll('[data-activate]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Deactivate all, then activate the chosen one
        for (const p of projects) {
          if (p.status === 'active') {
            p.status = 'paused';
            await put('schoolProjects', p);
          }
        }
        const target = projects.find(p => p.id === btn.dataset.activate);
        if (target) {
          target.status = 'active';
          await put('schoolProjects', target);
        }
        emit('schoolProjects:updated');
        render();
      });
    });

    // Delete buttons
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Project verwijderen?')) return;
        await softDelete('schoolProjects', btn.dataset.delete);
        emit('schoolProjects:updated');
        showToast('Project verwijderd');
        render();
      });
    });
  }

  render();
  unsubs.push(on('schoolProjects:updated', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
