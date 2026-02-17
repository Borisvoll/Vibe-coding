import { getAll, getByIndex, put } from '../db.js';
import { icon } from '../icons.js';
import { emit, on } from '../state.js';
import { showToast } from '../toast.js';
import { generateId, escapeHTML } from '../utils.js';
import { ASSIGNMENT_TYPES } from '../constants.js';

export function createPage(container) {
  let unsub;
  let activeType = null;

  async function render() {
    const assignments = await getAll('assignments');

    if (!activeType) {
      // Show type selector
      container.innerHTML = `
        <div class="page-header">
          <h2>Opdrachten</h2>
          <p>BPV stageopdrachten</p>
        </div>

        <div class="assignment-type-selector">
          ${Object.entries(ASSIGNMENT_TYPES).map(([key, config]) => {
            const existing = assignments.find(a => a.type === key);
            const status = existing ? 'In bewerking' : 'Niet gestart';
            const badgeClass = existing ? 'badge-success' : 'badge-default';
            return `
              <div class="card card-clickable assignment-type-card" data-type="${key}">
                <h3>${config.label}</h3>
                <p>${config.description}</p>
                <span class="badge ${badgeClass}" style="margin-top:var(--space-3)">${status}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;

      container.querySelectorAll('.assignment-type-card').forEach(card => {
        card.addEventListener('click', () => {
          activeType = card.dataset.type;
          render();
        });
      });
    } else {
      await renderForm(assignments);
    }
  }

  async function renderForm(assignments) {
    const config = ASSIGNMENT_TYPES[activeType];
    if (!config) { activeType = null; render(); return; }

    let assignment = assignments.find(a => a.type === activeType);
    const fields = assignment?.fields || {};

    container.innerHTML = `
      <div class="hours-entry-header">
        <button class="btn btn-icon btn-ghost" data-action="back">
          ${icon('arrow-left')}
        </button>
        <div class="hours-entry-date">${config.label}</div>
      </div>

      <p style="color: var(--color-text-secondary); margin-bottom: var(--space-6)">${config.description}</p>

      <form id="assignment-form">
        ${config.fields.map(f => `
          <div class="form-group">
            <label class="form-label" for="field-${f.key}">${f.label}</label>
            ${f.type === 'textarea'
              ? `<textarea id="field-${f.key}" class="form-textarea" rows="4" placeholder="${f.hint || ''}">${escapeHTML(fields[f.key] || '')}</textarea>`
              : `<input type="text" id="field-${f.key}" class="form-input" value="${escapeHTML(fields[f.key] || '')}" placeholder="${f.hint || ''}">`
            }
            ${f.hint ? `<div class="form-hint">${f.hint}</div>` : ''}
          </div>
        `).join('')}

        <div class="hours-entry-actions">
          <button type="submit" class="btn btn-primary" data-action="save">
            ${icon('save', 16)} Opslaan
          </button>
        </div>
      </form>
    `;

    // Back
    container.querySelector('[data-action="back"]').addEventListener('click', () => {
      activeType = null;
      render();
    });

    // Save
    container.querySelector('#assignment-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const newFields = {};
      config.fields.forEach(f => {
        const el = document.getElementById(`field-${f.key}`);
        newFields[f.key] = el ? el.value.trim() : '';
      });

      const record = {
        id: assignment?.id || generateId(),
        type: activeType,
        title: config.label,
        fields: newFields,
        draft: true,
        createdAt: assignment?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await put('assignments', record);
      emit('assignments:updated');
      showToast('Opdracht opgeslagen', { type: 'success' });
    });
  }

  render();
  unsub = on('assignments:updated', render);

  return {
    destroy() { if (unsub) unsub(); }
  };
}
