import { getAll, put, remove } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import { generateId, escapeHTML } from '../utils.js';

const QUALITY_FIELDS = [
  { key: 'meetgereedschap', label: 'Meetgereedschap', type: 'textarea', hint: 'Welke meetinstrumenten gebruik je?' },
  { key: 'meetlijst', label: 'Meetlijst / richtlijn', type: 'textarea', hint: 'Welke normen of richtlijnen volg je?' },
  { key: 'materiaal', label: 'Materiaal / conditie', type: 'textarea', hint: 'Welk materiaal, in welke conditie?' },
  { key: 'toleranties', label: 'Toleranties', type: 'textarea', hint: 'Welke toleranties zijn vereist?' },
  { key: 'meetproces', label: 'Meetproces (wat/hoe)', type: 'textarea', hint: 'Wat meet je en hoe meet je het?' },
  { key: 'meetmomenten', label: 'Meetmomenten + frequentie', type: 'textarea', hint: 'Wanneer en hoe vaak meet je?' },
  { key: 'acceptatiecriteria', label: 'Acceptatiecriteria', type: 'textarea', hint: 'Wanneer is de kwaliteit voldoende?' },
  { key: 'balans', label: 'Balans', type: 'textarea', hint: 'Minimale metingen, maximale zekerheid — hoe bereik je dat?' },
];

export function createPage(container) {
  let unsub;
  let editingId = null;

  async function render() {
    const items = await getAll('quality');

    if (!editingId) {
      container.innerHTML = `
        <div class="page-header">
          <h2>Kwaliteitsborging</h2>
          <p>Meetplannen en kwaliteitscontrole</p>
        </div>

        ${items.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">${icon('shield', 48)}</div>
            <h3>Nog geen meetplannen</h3>
            <p>Voeg een kwaliteitsborging / meetplan toe.</p>
            <button class="btn btn-primary" data-action="add">${icon('plus', 16)} Nieuw meetplan</button>
          </div>
        ` : `
          <button class="btn btn-primary btn-sm" data-action="add" style="margin-bottom:var(--space-6)">
            ${icon('plus', 14)} Nieuw meetplan
          </button>

          <div style="display:flex; flex-direction:column; gap:var(--space-4)">
            ${items.map(q => `
              <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-3)">
                  <h3>${escapeHTML(q.title || 'Meetplan')}</h3>
                  <div style="display:flex; gap:var(--space-2)">
                    <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${q.id}">${icon('edit', 14)}</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${q.id}">${icon('trash', 14)}</button>
                  </div>
                </div>
                <div style="display:grid; gap:var(--space-2); font-size:0.875rem">
                  ${QUALITY_FIELDS.filter(f => q.fields?.[f.key]).map(f => `
                    <div>
                      <span style="color:var(--color-text-secondary); font-weight:500">${f.label}:</span>
                      <span>${escapeHTML(q.fields[f.key])}</span>
                    </div>
                  `).join('')}
                </div>
                ${q.linkedLogbook ? `<div class="form-hint" style="margin-top:var(--space-2)">Gekoppeld: ${escapeHTML(q.linkedLogbook)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      `;
    } else {
      renderForm(items.find(q => q.id === editingId));
    }

    bindEvents();
  }

  function renderForm(item) {
    const isNew = !item;
    const q = item || { title: '', fields: {}, linkedLogbook: '' };

    container.innerHTML = `
      <div class="hours-entry-header">
        <button class="btn btn-icon btn-ghost" data-action="back">${icon('arrow-left')}</button>
        <div class="hours-entry-date">${isNew ? 'Nieuw meetplan' : 'Meetplan bewerken'}</div>
      </div>

      <form id="quality-form">
        <div class="form-group">
          <label class="form-label" for="q-title">Titel / project</label>
          <input type="text" id="q-title" class="form-input" value="${escapeHTML(q.title || '')}" placeholder="Bijv. 'Serieproductie asbussen'">
        </div>

        ${QUALITY_FIELDS.map(f => `
          <div class="form-group">
            <label class="form-label" for="q-${f.key}">${f.label}</label>
            <textarea id="q-${f.key}" class="form-textarea" rows="2" placeholder="${f.hint || ''}">${escapeHTML(q.fields?.[f.key] || '')}</textarea>
          </div>
        `).join('')}

        <div class="form-group">
          <label class="form-label" for="q-linked">Koppeling logboek/project</label>
          <input type="text" id="q-linked" class="form-input" value="${escapeHTML(q.linkedLogbook || '')}" placeholder="Verwijzing naar logboekitems, datums...">
        </div>

        <div class="hours-entry-actions">
          <button type="submit" class="btn btn-primary" data-action="save">${icon('save', 16)} Opslaan</button>
        </div>
      </form>
    `;
  }

  function bindEvents() {
    container.querySelectorAll('[data-action="add"]').forEach(btn => {
      btn.addEventListener('click', () => { editingId = 'new'; render(); });
    });

    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); editingId = btn.dataset.id; render(); });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await remove('quality', btn.dataset.id);
        emit('quality:updated');
        showToast('Meetplan verwijderd', { type: 'info' });
        render();
      });
    });

    container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      editingId = null;
      render();
    });

    container.querySelector('#quality-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const existing = editingId !== 'new' ? (await getAll('quality')).find(q => q.id === editingId) : null;

      const fields = {};
      QUALITY_FIELDS.forEach(f => {
        fields[f.key] = document.getElementById(`q-${f.key}`)?.value.trim() || '';
      });

      const record = {
        id: existing?.id || generateId(),
        title: document.getElementById('q-title').value.trim() || 'Meetplan',
        fields,
        linkedLogbook: document.getElementById('q-linked')?.value.trim() || '',
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      await put('quality', record);
      editingId = null;
      emit('quality:updated');
      showToast('Meetplan opgeslagen', { type: 'success' });
      render();
    });
  }

  render();
  unsub = on('quality:updated', render);
  return { destroy() { if (unsub) unsub(); } };
}
