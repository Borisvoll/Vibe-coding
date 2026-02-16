import { getAll, put, remove } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import { generateId, escapeHTML } from '../utils.js';

const GOAL_STATUSES = [
  { value: 'gestart', label: 'Gestart', badge: 'badge-default' },
  { value: 'loopt', label: 'Loopt', badge: 'badge-accent' },
  { value: 'behaald', label: 'Behaald', badge: 'badge-success' },
];

// Default template goal
const TEMPLATE_GOAL = {
  title: 'Kwaliteit leveren / kwaliteit borgen',
  specifiek: 'Ik borg kwaliteit door meetplan + duidelijke acceptatiecriteria.',
  meetbaar: 'Ik kan aantonen wanneer een onderdeel \'voldoende\' is (tolerantie/criteria + meetmethode).',
  acceptabel: 'Ik neem genoeg tijd voor controle, maar verlies me niet in over-metingen.',
  realistisch: 'Aan het einde kan ik mijn eigen kwaliteit zelfstandig controleren en onderbouwen.',
  tijdgebonden: 'Binnen 10 weken.',
};

export function createPage(container) {
  let unsub;
  let editingId = null;

  async function render() {
    const goals = await getAll('goals');

    container.innerHTML = `
      <div class="page-header">
        <h2>SMART Leerdoelen</h2>
        <p>${goals.length} leerdoel${goals.length !== 1 ? 'en' : ''}</p>
      </div>

      ${goals.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('target', 48)}</div>
          <h3>Nog geen leerdoelen</h3>
          <p>Voeg je eerste SMART leerdoel toe, of laad het template.</p>
          <div style="display:flex; gap:var(--space-3); justify-content:center; flex-wrap:wrap">
            <button class="btn btn-primary" data-action="add">Nieuw leerdoel</button>
            <button class="btn btn-secondary" data-action="load-template">Template laden</button>
          </div>
        </div>
      ` : `
        <div style="display:flex; gap:var(--space-3); margin-bottom:var(--space-6); flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" data-action="add">${icon('plus', 14)} Nieuw leerdoel</button>
          <button class="btn btn-secondary btn-sm" data-action="load-template">Template laden</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:var(--space-4)">
          ${goals.map(g => `
            <div class="card" data-id="${g.id}" style="cursor:pointer">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-2)">
                <h3 style="flex:1">${escapeHTML(g.title)}</h3>
                <span class="badge ${GOAL_STATUSES.find(s => s.value === g.status)?.badge || 'badge-default'}">
                  ${GOAL_STATUSES.find(s => s.value === g.status)?.label || g.status}
                </span>
              </div>
              <div style="display:grid; grid-template-columns:auto 1fr; gap:var(--space-1) var(--space-3); font-size:0.875rem; color:var(--color-text-secondary)">
                <strong>S:</strong><span>${escapeHTML(g.specifiek || '').substring(0, 80)}${(g.specifiek || '').length > 80 ? '...' : ''}</span>
                <strong>M:</strong><span>${escapeHTML(g.meetbaar || '').substring(0, 80)}${(g.meetbaar || '').length > 80 ? '...' : ''}</span>
              </div>
              <div style="display:flex; gap:var(--space-2); margin-top:var(--space-3)">
                <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${g.id}">Bewerken</button>
                <button class="btn btn-danger btn-sm" data-action="delete" data-id="${g.id}">Verwijderen</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      ${editingId !== null ? renderModal(goals.find(g => g.id === editingId)) : ''}
    `;

    bindEvents();
  }

  function renderModal(goal) {
    const isNew = !goal;
    const g = goal || { title: '', specifiek: '', meetbaar: '', acceptabel: '', realistisch: '', tijdgebonden: '', status: 'gestart', bewijs: '' };

    return `
      <div class="modal-overlay" id="goal-modal">
        <div class="modal" style="max-width:560px">
          <h3>${isNew ? 'Nieuw SMART leerdoel' : 'Leerdoel bewerken'}</h3>
          <form id="goal-form">
            <div class="form-group">
              <label class="form-label" for="goal-title">Titel *</label>
              <input type="text" id="goal-title" class="form-input" value="${escapeHTML(g.title)}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="goal-s">Specifiek</label>
              <textarea id="goal-s" class="form-textarea" rows="2">${escapeHTML(g.specifiek)}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="goal-m">Meetbaar</label>
              <textarea id="goal-m" class="form-textarea" rows="2">${escapeHTML(g.meetbaar)}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="goal-a">Acceptabel</label>
              <textarea id="goal-a" class="form-textarea" rows="2">${escapeHTML(g.acceptabel)}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="goal-r">Realistisch</label>
              <textarea id="goal-r" class="form-textarea" rows="2">${escapeHTML(g.realistisch)}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="goal-t">Tijdgebonden</label>
              <textarea id="goal-t" class="form-textarea" rows="2">${escapeHTML(g.tijdgebonden)}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <div class="radio-group">
                ${GOAL_STATUSES.map(s => `
                  <label class="radio-option ${s.value === g.status ? 'selected' : ''}">
                    <input type="radio" name="status" value="${s.value}" ${s.value === g.status ? 'checked' : ''}>
                    ${s.label}
                  </label>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="goal-bewijs">Bewijs / koppeling logboek</label>
              <textarea id="goal-bewijs" class="form-textarea" rows="2" placeholder="Verwijs naar logboekitems, datums, resultaten...">${escapeHTML(g.bewijs || '')}</textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary close-modal">Annuleren</button>
              <button type="submit" class="btn btn-primary">Opslaan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    // Add
    container.querySelectorAll('[data-action="add"]').forEach(btn => {
      btn.addEventListener('click', () => { editingId = 'new'; render(); });
    });

    // Load template
    container.querySelectorAll('[data-action="load-template"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await put('goals', {
          id: generateId(),
          ...TEMPLATE_GOAL,
          status: 'gestart',
          bewijs: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        emit('goals:updated');
        showToast('Template leerdoel geladen', { type: 'success' });
        render();
      });
    });

    // Edit
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        editingId = btn.dataset.id;
        render();
      });
    });

    // Delete
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await remove('goals', btn.dataset.id);
        emit('goals:updated');
        showToast('Leerdoel verwijderd', { type: 'info' });
        render();
      });
    });

    // Modal
    const modal = container.querySelector('#goal-modal');
    if (modal) {
      modal.querySelector('.close-modal')?.addEventListener('click', () => { editingId = null; render(); });
      modal.addEventListener('click', (e) => { if (e.target === modal) { editingId = null; render(); } });

      modal.querySelectorAll('.radio-option').forEach(opt => {
        opt.addEventListener('click', () => {
          modal.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          opt.querySelector('input').checked = true;
        });
      });

      modal.querySelector('#goal-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('goal-title').value.trim();
        if (!title) { showToast('Titel is verplicht', { type: 'error' }); return; }

        const existing = editingId !== 'new' ? (await getAll('goals')).find(g => g.id === editingId) : null;
        const record = {
          id: existing?.id || generateId(),
          title,
          specifiek: document.getElementById('goal-s').value.trim(),
          meetbaar: document.getElementById('goal-m').value.trim(),
          acceptabel: document.getElementById('goal-a').value.trim(),
          realistisch: document.getElementById('goal-r').value.trim(),
          tijdgebonden: document.getElementById('goal-t').value.trim(),
          status: document.querySelector('#goal-form input[name="status"]:checked')?.value || 'gestart',
          bewijs: document.getElementById('goal-bewijs').value.trim(),
          startDate: existing?.startDate || new Date().toISOString().split('T')[0],
          endDate: existing?.endDate || '',
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await put('goals', record);
        editingId = null;
        emit('goals:updated');
        showToast('Leerdoel opgeslagen', { type: 'success' });
        render();
      });
    }
  }

  render();
  unsub = on('goals:updated', render);
  return { destroy() { if (unsub) unsub(); } };
}
