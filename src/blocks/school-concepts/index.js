import { getAll, put, softDelete } from '../../db.js';
import { icon } from '../../icons.js';
import { on, emit } from '../../core/eventBus.js';
import { generateId } from '../../utils.js';
import { showToast } from '../../toast.js';

const CATEGORIES = ['Wiskunde', 'Natuurkunde', 'Materiaalkunde', 'CNC', 'CAD', 'Meettechniek', 'Procestechniek', 'Anders'];
const CLARITY_LABELS = { 1: 'Vaag', 2: '', 3: 'Redelijk', 4: '', 5: 'Helder' };
const CLARITY_COLORS = ['var(--color-red, #e53e3e)', 'var(--color-orange, #dd6b20)', 'var(--color-amber, #d69e2e)', 'var(--color-emerald, #38a169)', 'var(--color-green, #2f855a)'];

export function createPage(container) {
  const unsubs = [];
  let editingId = null;
  let expandedId = null;
  let filterCategory = '';
  let sortMode = 'recent';
  let searchQuery = '';

  async function render() {
    let concepts = await getAll('schoolConcepts').catch(() => []);

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      concepts = concepts.filter(c =>
        (c.term || '').toLowerCase().includes(q) ||
        (c.explanation || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (filterCategory) {
      concepts = concepts.filter(c => c.category === filterCategory);
    }

    // Sort
    if (sortMode === 'recent') {
      concepts.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    } else if (sortMode === 'alpha') {
      concepts.sort((a, b) => (a.term || '').localeCompare(b.term || ''));
    } else if (sortMode === 'clarity') {
      concepts.sort((a, b) => (a.clarity || 1) - (b.clarity || 1));
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>${icon('book', 20)} Concept Vault</h2>
        <p>Leg concepten uit in je eigen woorden</p>
      </div>

      <div style="display:flex; flex-wrap:wrap; gap: var(--space-3); margin-bottom: var(--space-6); align-items:center">
        <div style="flex:1; min-width:180px; position:relative">
          <input type="text" class="form-input" id="concept-search" placeholder="Zoek concepten..." value="${searchQuery}" style="padding-left: var(--space-8)">
          <span style="position:absolute; left: var(--space-3); top:50%; transform:translateY(-50%); color:var(--color-text-tertiary); pointer-events:none">${icon('search', 14)}</span>
        </div>
        <div style="display:flex; gap: var(--space-2); align-items:center">
          <span style="color:var(--color-text-tertiary)">${icon('filter', 14)}</span>
          <select class="form-input" id="concept-filter-cat" style="min-width:130px">
            <option value="">Alle categorieen</option>
            ${CATEGORIES.map(c => `<option value="${c}" ${filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <select class="form-input" id="concept-sort" style="min-width:130px">
            <option value="recent" ${sortMode === 'recent' ? 'selected' : ''}>Nieuwste eerst</option>
            <option value="alpha" ${sortMode === 'alpha' ? 'selected' : ''}>Alfabetisch</option>
            <option value="clarity" ${sortMode === 'clarity' ? 'selected' : ''}>Helderheid (laag eerst)</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary" id="new-concept-btn" style="margin-bottom: var(--space-6); background: var(--color-purple)">
        ${icon('plus', 14)} Nieuw concept
      </button>

      <div id="concept-form" style="display:none" class="card" style="margin-bottom: var(--space-6)">
        <h3 id="concept-form-title">Nieuw concept</h3>
        <div class="form-group" style="margin-top: var(--space-4)">
          <label class="form-label">Term / begrip</label>
          <input type="text" class="form-input" id="concept-term" placeholder="Bijv. Tolerantie, Buigspanning..." maxlength="200">
        </div>
        <div class="form-group">
          <label class="form-label">Categorie</label>
          <select class="form-input" id="concept-category">
            ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Uitleg in eigen woorden</label>
          <textarea class="form-textarea" id="concept-explanation" rows="4" placeholder="Leg uit alsof je het aan een vriend uitlegt"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Helderheid: <span id="clarity-value-label">3 — Redelijk</span></label>
          <input type="range" min="1" max="5" value="3" id="concept-clarity" style="width:100%; accent-color: var(--color-purple)">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--color-text-tertiary)">
            <span>1 — Vaag</span>
            <span>3 — Redelijk</span>
            <span>5 — Helder</span>
          </div>
        </div>
        <div style="display:flex; gap: var(--space-2); margin-top: var(--space-4)">
          <button class="btn btn-primary" id="save-concept-btn" style="background: var(--color-purple)">${icon('save', 14)} Opslaan</button>
          <button class="btn btn-secondary" id="cancel-concept-btn">Annuleren</button>
        </div>
      </div>

      <div id="concepts-list">
        ${concepts.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">${icon('book', 40)}</div>
            <h3>Nog geen concepten</h3>
            <p>${searchQuery || filterCategory ? 'Geen concepten gevonden met deze filters.' : 'Voeg je eerste concept toe om je begrip te verdiepen.'}</p>
          </div>
        ` : concepts.map(c => {
          const isExpanded = expandedId === c.id;
          const clarityIdx = Math.max(0, Math.min(4, (c.clarity || 1) - 1));
          const dots = Array.from({ length: 5 }, (_, i) =>
            `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:2px; background:${i <= clarityIdx ? CLARITY_COLORS[clarityIdx] : 'var(--color-border)'}"></span>`
          ).join('');
          const snippet = (c.explanation || '').length > 100
            ? (c.explanation || '').slice(0, 100) + '...'
            : (c.explanation || '');

          return `
            <div class="card card-clickable" style="margin-bottom: var(--space-4); border-left: 3px solid var(--color-purple)" data-concept-id="${c.id}">
              <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <div style="flex:1; min-width:0">
                  <div style="display:flex; align-items:center; gap: var(--space-2); flex-wrap:wrap">
                    <h3 style="margin:0">${c.term || 'Naamloos'}</h3>
                    <span class="badge" style="background: var(--color-purple); color: white; font-size:0.6875rem">${c.category || ''}</span>
                  </div>
                  <div style="margin-top: var(--space-2)">${dots}</div>
                  ${!isExpanded ? `<p style="color: var(--color-text-secondary); font-size:0.875rem; margin-top: var(--space-2)">${snippet}</p>` : ''}
                </div>
                <div style="display:flex; gap: var(--space-1); flex-shrink:0; margin-left: var(--space-2)">
                  <button class="btn btn-secondary btn-sm" data-edit="${c.id}" title="Bewerken">${icon('edit', 14)}</button>
                  <button class="btn btn-secondary btn-sm" data-delete="${c.id}" title="Verwijderen">${icon('trash', 14)}</button>
                </div>
              </div>
              ${isExpanded ? `
                <div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border)">
                  <p style="white-space:pre-wrap; color: var(--color-text-secondary); line-height:1.6">${c.explanation || ''}</p>
                  <div style="margin-top: var(--space-3); font-size:0.75rem; color: var(--color-text-tertiary)">
                    Helderheid: ${c.clarity || 1}/5 ${CLARITY_LABELS[c.clarity] ? `— ${CLARITY_LABELS[c.clarity]}` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    // -- Event listeners --

    // Search
    const searchEl = container.querySelector('#concept-search');
    searchEl.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      render();
    });

    // Category filter
    container.querySelector('#concept-filter-cat').addEventListener('change', (e) => {
      filterCategory = e.target.value;
      render();
    });

    // Sort
    container.querySelector('#concept-sort').addEventListener('change', (e) => {
      sortMode = e.target.value;
      render();
    });

    // Form
    const formEl = container.querySelector('#concept-form');

    container.querySelector('#new-concept-btn').addEventListener('click', () => {
      editingId = null;
      container.querySelector('#concept-form-title').textContent = 'Nieuw concept';
      formEl.style.display = 'block';
      container.querySelector('#concept-term').value = '';
      container.querySelector('#concept-category').value = CATEGORIES[0];
      container.querySelector('#concept-explanation').value = '';
      container.querySelector('#concept-clarity').value = 3;
      updateClarityLabel(3);
    });

    container.querySelector('#cancel-concept-btn').addEventListener('click', () => {
      formEl.style.display = 'none';
      editingId = null;
    });

    // Clarity slider label
    const claritySlider = container.querySelector('#concept-clarity');
    claritySlider.addEventListener('input', (e) => {
      updateClarityLabel(parseInt(e.target.value, 10));
    });

    function updateClarityLabel(val) {
      const label = CLARITY_LABELS[val] ? `${val} — ${CLARITY_LABELS[val]}` : `${val}`;
      const labelEl = container.querySelector('#clarity-value-label');
      if (labelEl) labelEl.textContent = label;
    }

    // Save
    container.querySelector('#save-concept-btn').addEventListener('click', async () => {
      const term = container.querySelector('#concept-term').value.trim();
      if (!term) { showToast('Vul een term in', 'warning'); return; }

      const explanation = container.querySelector('#concept-explanation').value.trim();
      if (!explanation) { showToast('Vul een uitleg in', 'warning'); return; }

      const existing = editingId ? concepts.find(c => c.id === editingId) : null;

      const record = {
        id: editingId || generateId(),
        term,
        category: container.querySelector('#concept-category').value,
        explanation,
        clarity: parseInt(container.querySelector('#concept-clarity').value, 10),
        tags: existing ? (existing.tags || []) : [],
        mode: 'school',
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await put('schoolConcepts', record);
      emit('schoolConcepts:updated');
      showToast('Concept opgeslagen');
      editingId = null;
      formEl.style.display = 'none';
      render();
    });

    // Card click to expand/collapse
    container.querySelectorAll('[data-concept-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-edit]') || e.target.closest('[data-delete]')) return;
        const id = card.dataset.conceptId;
        expandedId = expandedId === id ? null : id;
        render();
      });
    });

    // Edit buttons
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const c = concepts.find(co => co.id === btn.dataset.edit);
        if (!c) return;
        editingId = c.id;
        container.querySelector('#concept-form-title').textContent = 'Concept bewerken';
        formEl.style.display = 'block';
        container.querySelector('#concept-term').value = c.term || '';
        container.querySelector('#concept-category').value = c.category || CATEGORIES[0];
        container.querySelector('#concept-explanation').value = c.explanation || '';
        container.querySelector('#concept-clarity').value = c.clarity || 3;
        updateClarityLabel(c.clarity || 3);
        formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    // Delete buttons
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Concept verwijderen?')) return;
        await softDelete('schoolConcepts', btn.dataset.delete);
        emit('schoolConcepts:updated');
        showToast('Concept verwijderd');
        if (expandedId === btn.dataset.delete) expandedId = null;
        render();
      });
    });

    // Restore focus to search if user was typing
    if (searchQuery) {
      const el = container.querySelector('#concept-search');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }

  render();
  unsubs.push(on('schoolConcepts:updated', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
