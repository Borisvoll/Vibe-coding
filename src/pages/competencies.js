import { getAll, put, remove } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import { generateId, formatDateShort, formatDateISO } from '../utils.js';
import { COMPETENCY_LEVELS, DEFAULT_COMPETENCIES } from '../constants.js';

export function createPage(container) {
  let unsub;
  let editingId = null;

  async function render() {
    const competencies = await getAll('competencies');
    const hasData = competencies.length > 0;

    // Group by category
    const grouped = {};
    competencies.forEach(c => {
      const cat = c.category || 'Overig';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(c);
    });

    container.innerHTML = `
      <div class="page-header">
        <h2>Leermeter</h2>
        <p>Competenties en ontwikkeling</p>
      </div>

      ${!hasData ? `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('chart', 48)}</div>
          <h3>Nog geen competenties</h3>
          <p>Laad de standaard competentielijst of voeg er handmatig toe.</p>
          <div style="display:flex; gap:var(--space-3); justify-content:center">
            <button class="btn btn-primary" data-action="load-defaults">Standaard laden</button>
            <button class="btn btn-secondary" data-action="add-custom">Handmatig toevoegen</button>
          </div>
        </div>
      ` : `
        <div style="display:flex; gap:var(--space-3); margin-bottom:var(--space-6); flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" data-action="add-custom">
            ${icon('plus', 14)} Competentie toevoegen
          </button>
        </div>

        ${competencies.some(c => c.updatedAt) ? `
          <div style="margin-bottom: var(--space-8)">
            <h3 style="margin-bottom: var(--space-4); color: var(--color-text-secondary); font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.04em">Progressie-tijdlijn</h3>
            <div style="position:relative; padding-left:var(--space-6); border-left:2px solid var(--color-border)">
              ${competencies.filter(c => c.updatedAt).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 10).map(c => `
                <div style="margin-bottom:var(--space-4); position:relative">
                  <div style="position:absolute; left:calc(-1 * var(--space-6) - 5px); top:4px; width:10px; height:10px; border-radius:50%; background:var(--color-cyan)"></div>
                  <div style="font-size:0.75rem; color:var(--color-text-tertiary)">${formatDateShort(formatDateISO(new Date(c.updatedAt)))}</div>
                  <div style="font-weight:500">${c.name}</div>
                  <div style="font-size:0.8125rem; color:var(--color-cyan)">${COMPETENCY_LEVELS[c.level ?? 0]}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${Object.entries(grouped).map(([cat, items]) => `
          <div style="margin-bottom: var(--space-8)">
            <h3 style="margin-bottom: var(--space-4); color: var(--color-text-secondary); font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.04em">${cat}</h3>
            <div class="competency-list">
              ${items.map(c => renderCompetencyCard(c)).join('')}
            </div>
          </div>
        `).join('')}
      `}

      ${editingId !== null ? renderEditModal(competencies.find(c => c.id === editingId)) : ''}
    `;

    bindEvents();
  }

  function renderCompetencyCard(c) {
    const levelIdx = c.level ?? 0;
    return `
      <div class="card competency-card" data-id="${c.id}">
        <div class="competency-info">
          <div class="competency-name">${c.name}</div>
          <div class="competency-level-label">${COMPETENCY_LEVELS[levelIdx]}</div>
          ${c.notes ? `<div class="form-hint" style="margin-top:var(--space-1)">${c.notes}</div>` : ''}
        </div>
        <div class="level-indicator">
          ${COMPETENCY_LEVELS.map((_, i) => `
            <div class="level-dot level-${i} ${i <= levelIdx ? 'active' : ''}"></div>
          `).join('')}
        </div>
        <div class="competency-actions">
          <button class="btn btn-icon btn-ghost btn-sm" data-action="edit" data-id="${c.id}" title="Bewerken">
            ${icon('edit', 16)}
          </button>
          <button class="btn btn-icon btn-ghost btn-sm" data-action="delete" data-id="${c.id}" title="Verwijderen">
            ${icon('trash', 16)}
          </button>
        </div>
      </div>
    `;
  }

  function renderEditModal(comp) {
    const isNew = !comp;
    const name = comp?.name || '';
    const category = comp?.category || '';
    const level = comp?.level ?? 0;
    const notes = comp?.notes || '';
    const logbookRefs = comp?.logbookRefs || [];

    return `
      <div class="modal-overlay" id="edit-modal">
        <div class="modal">
          <h3>${isNew ? 'Competentie toevoegen' : 'Competentie bewerken'}</h3>
          <form id="comp-form">
            <div class="form-group">
              <label class="form-label" for="comp-name">Naam *</label>
              <input type="text" id="comp-name" class="form-input" value="${name}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-category">Categorie</label>
              <input type="text" id="comp-category" class="form-input" value="${category}" placeholder="Vakinhoudelijk, Persoonlijk, etc.">
            </div>
            <div class="form-group">
              <label class="form-label">Niveau</label>
              <div class="radio-group">
                ${COMPETENCY_LEVELS.map((lbl, i) => `
                  <label class="radio-option ${i === level ? 'selected' : ''}">
                    <input type="radio" name="level" value="${i}" ${i === level ? 'checked' : ''}>
                    ${lbl}
                  </label>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="comp-notes">Notities / bewijs</label>
              <textarea id="comp-notes" class="form-textarea" rows="3" placeholder="Voorbeelden uit het logboek, datums...">${notes}</textarea>
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
    // Load defaults
    container.querySelector('[data-action="load-defaults"]')?.addEventListener('click', async () => {
      for (const def of DEFAULT_COMPETENCIES) {
        await put('competencies', {
          id: generateId(),
          name: def.name,
          category: def.category,
          level: 0,
          notes: '',
          logbookRefs: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      showToast(`${DEFAULT_COMPETENCIES.length} competenties geladen`, { type: 'success' });
      render();
    });

    // Add custom
    container.querySelector('[data-action="add-custom"]')?.addEventListener('click', () => {
      editingId = 'new';
      render();
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
        await remove('competencies', btn.dataset.id);
        showToast('Competentie verwijderd', { type: 'info' });
        render();
      });
    });

    // Modal close
    const modal = container.querySelector('#edit-modal');
    if (modal) {
      modal.querySelector('.close-modal')?.addEventListener('click', () => {
        editingId = null;
        render();
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) { editingId = null; render(); }
      });

      // Radio group in modal
      modal.querySelectorAll('.radio-option').forEach(opt => {
        opt.addEventListener('click', () => {
          modal.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          opt.querySelector('input').checked = true;
        });
      });

      // Form submit
      modal.querySelector('#comp-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('comp-name').value.trim();
        if (!name) { showToast('Naam is verplicht', { type: 'error' }); return; }

        const existing = editingId !== 'new' ? await getAll('competencies').then(a => a.find(c => c.id === editingId)) : null;

        const record = {
          id: existing?.id || generateId(),
          name,
          category: document.getElementById('comp-category').value.trim() || 'Overig',
          level: parseInt(document.querySelector('#comp-form input[name="level"]:checked')?.value || '0', 10),
          notes: document.getElementById('comp-notes').value.trim(),
          logbookRefs: existing?.logbookRefs || [],
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now()
        };

        await put('competencies', record);
        editingId = null;
        emit('competencies:updated');
        showToast('Competentie opgeslagen', { type: 'success' });
        render();
      });
    }
  }

  render();
  unsub = on('competencies:updated', render);

  return {
    destroy() { if (unsub) unsub(); }
  };
}
