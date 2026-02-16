import { getAll, put, remove } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import { generateId, escapeHTML, getToday, formatDateShort } from '../utils.js';

const MOMENT_TAGS = ['fout', 'inzicht', 'terugkerend', 'proces', 'communicatie', 'kwaliteit', 'veiligheid', 'machine'];

export function createPage(container) {
  let unsub;
  let editingId = null;
  let filterTag = null;

  async function render() {
    let items = (await getAll('learningMoments')).sort((a, b) => b.date.localeCompare(a.date));
    if (filterTag) items = items.filter(m => (m.tags || []).includes(filterTag));

    if (editingId !== null) {
      renderForm(editingId === 'new' ? null : items.find(m => m.id === editingId));
      return;
    }

    const allTags = {};
    (await getAll('learningMoments')).forEach(m => (m.tags || []).forEach(t => { allTags[t] = (allTags[t] || 0) + 1; }));

    container.innerHTML = `
      <div class="page-header">
        <h2>Fouten & Leeranalyse</h2>
        <p>Leer van fouten, herken patronen</p>
      </div>

      ${items.length === 0 && !filterTag ? `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('target', 48)}</div>
          <h3>Nog geen leermomenten</h3>
          <p>Registreer fouten en inzichten om patronen te herkennen.</p>
          <button class="btn btn-primary" data-action="add">${icon('plus', 16)} Nieuw leermoment</button>
        </div>
      ` : `
        <div style="display:flex; gap:var(--space-3); margin-bottom:var(--space-4); flex-wrap:wrap; align-items:center">
          <button class="btn btn-primary btn-sm" data-action="add">${icon('plus', 14)} Nieuw leermoment</button>
          ${Object.keys(allTags).length > 0 ? `
            <div style="display:flex; gap:var(--space-2); flex-wrap:wrap">
              <button class="btn ${!filterTag ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-filter="">Alle</button>
              ${Object.entries(allTags).sort((a,b)=>b[1]-a[1]).map(([tag, count]) => `
                <button class="btn ${filterTag === tag ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-filter="${tag}">${tag} (${count})</button>
              `).join('')}
            </div>
          ` : ''}
        </div>

        ${items.length === 0 ? `<p style="color:var(--color-text-tertiary)">Geen items voor dit filter.</p>` : ''}

        <div style="display:flex; flex-direction:column; gap:var(--space-4)">
          ${items.map(m => `
            <div class="card" style="border-left: 3px solid var(--color-rose)">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--space-2)">
                <div>
                  <span style="font-size:0.8125rem; color:var(--color-text-secondary)">${formatDateShort(m.date)}</span>
                  ${(m.tags || []).map(t => `<span class="badge badge-rose" style="margin-left:var(--space-2)">${t}</span>`).join('')}
                </div>
                <div style="display:flex; gap:var(--space-2)">
                  <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${m.id}">${icon('edit', 14)}</button>
                  <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${m.id}">${icon('trash', 14)}</button>
                </div>
              </div>
              <h4 style="margin-bottom:var(--space-2)">${escapeHTML(m.what || '')}</h4>
              ${m.cause ? `<p style="font-size:0.875rem"><strong>Oorzaak:</strong> ${escapeHTML(m.cause)}</p>` : ''}
              ${m.adjustment ? `<p style="font-size:0.875rem"><strong>Aanpassing:</strong> ${escapeHTML(m.adjustment)}</p>` : ''}
              ${m.prevention ? `<p style="font-size:0.875rem"><strong>Preventie:</strong> ${escapeHTML(m.prevention)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `}
    `;

    bindEvents();
  }

  function renderForm(item) {
    const isNew = !item;
    const m = item || { date: getToday(), what: '', cause: '', adjustment: '', prevention: '', tags: [] };

    container.innerHTML = `
      <div class="hours-entry-header">
        <button class="btn btn-icon btn-ghost" data-action="back">${icon('arrow-left')}</button>
        <div class="hours-entry-date">${isNew ? 'Nieuw leermoment' : 'Leermoment bewerken'}</div>
      </div>

      <form id="moment-form">
        <div class="form-group">
          <label class="form-label" for="m-date">Datum</label>
          <input type="date" id="m-date" class="form-input" value="${m.date}">
        </div>
        <div class="form-group">
          <label class="form-label" for="m-what">Wat ging er fout / wat was het inzicht? *</label>
          <textarea id="m-what" class="form-textarea" rows="3" required placeholder="Beschrijf wat er gebeurde...">${escapeHTML(m.what || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="m-cause">Oorzaak</label>
          <textarea id="m-cause" class="form-textarea" rows="2" placeholder="Waarom gebeurde dit?">${escapeHTML(m.cause || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="m-adjustment">Aanpassing / actie</label>
          <textarea id="m-adjustment" class="form-textarea" rows="2" placeholder="Wat heb je anders gedaan?">${escapeHTML(m.adjustment || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="m-prevention">Preventie</label>
          <textarea id="m-prevention" class="form-textarea" rows="2" placeholder="Hoe voorkom je dit in de toekomst?">${escapeHTML(m.prevention || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Tags</label>
          <div style="display:flex; gap:var(--space-2); flex-wrap:wrap">
            ${MOMENT_TAGS.map(t => `
              <label class="tag-toggle ${(m.tags || []).includes(t) ? 'active' : ''}">
                <input type="checkbox" name="tags" value="${t}" ${(m.tags || []).includes(t) ? 'checked' : ''}>
                ${t}
              </label>
            `).join('')}
          </div>
        </div>

        <div class="hours-entry-actions">
          <button type="submit" class="btn btn-primary">${icon('save', 16)} Opslaan</button>
        </div>
      </form>
    `;

    bindFormEvents(item);
  }

  function bindEvents() {
    container.querySelectorAll('[data-action="add"]').forEach(btn => {
      btn.addEventListener('click', () => { editingId = 'new'; render(); });
    });
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => { editingId = btn.dataset.id; render(); });
    });
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await remove('learningMoments', btn.dataset.id);
        emit('learning:updated');
        showToast('Leermoment verwijderd', { type: 'info' });
        render();
      });
    });
    container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        filterTag = btn.dataset.filter || null;
        render();
      });
    });
  }

  function bindFormEvents(existing) {
    container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      editingId = null;
      render();
    });

    container.querySelector('#moment-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tags = Array.from(container.querySelectorAll('input[name="tags"]:checked')).map(i => i.value);

      const record = {
        id: existing?.id || generateId(),
        date: document.getElementById('m-date').value,
        what: document.getElementById('m-what').value.trim(),
        cause: document.getElementById('m-cause').value.trim(),
        adjustment: document.getElementById('m-adjustment').value.trim(),
        prevention: document.getElementById('m-prevention').value.trim(),
        tags,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await put('learningMoments', record);
      editingId = null;
      emit('learning:updated');
      showToast('Leermoment opgeslagen', { type: 'success' });
      render();
    });
  }

  render();
  unsub = on('learning:updated', render);
  return { destroy() { if (unsub) unsub(); } };
}
