import { getAll, put, remove } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import { generateId, escapeHTML } from '../utils.js';

const SEED_DATA = [
  { term: 'G00', category: 'G-codes', explanation: 'Snelle positionering (ijlgang)', usage: 'Verplaatsing zonder bewerking', example: 'G00 X100 Y50 Z5' },
  { term: 'G01', category: 'G-codes', explanation: 'Lineaire interpolatie (rechte lijn)', usage: 'Rechte snede met voeding', example: 'G01 X50 Y30 F200' },
  { term: 'G02', category: 'G-codes', explanation: 'Cirkelvormige interpolatie (CW)', usage: 'Boog met de klok mee', example: 'G02 X30 Y20 R15' },
  { term: 'G03', category: 'G-codes', explanation: 'Cirkelvormige interpolatie (CCW)', usage: 'Boog tegen de klok in', example: 'G03 X30 Y20 R15' },
  { term: 'G28', category: 'G-codes', explanation: 'Referentiepunt nadering', usage: 'Machine home positie', example: 'G28 Z0' },
  { term: 'G40', category: 'G-codes', explanation: 'Radiuscorrectie uit', usage: 'Geen gereedschapscompensatie', example: 'G40' },
  { term: 'G41', category: 'G-codes', explanation: 'Radiuscorrectie links', usage: 'Gereedschap links van werkstuk', example: 'G41 D01' },
  { term: 'G54', category: 'G-codes', explanation: 'Werkstuk nulpunt 1', usage: 'Eerste coördinatensysteem', example: 'G54' },
  { term: 'G90', category: 'G-codes', explanation: 'Absoluut programmeren', usage: 'Coördinaten t.o.v. nulpunt', example: 'G90' },
  { term: 'G91', category: 'G-codes', explanation: 'Incrementeel programmeren', usage: 'Coördinaten t.o.v. huidige positie', example: 'G91' },
  { term: 'M03', category: 'M-codes', explanation: 'Spindel aan (CW)', usage: 'Start spindel rechtsom', example: 'M03 S1500' },
  { term: 'M05', category: 'M-codes', explanation: 'Spindel stop', usage: 'Stop spindelrotatie', example: 'M05' },
  { term: 'M06', category: 'M-codes', explanation: 'Gereedschapswissel', usage: 'Wissel naar volgend gereedschap', example: 'M06 T02' },
  { term: 'M08', category: 'M-codes', explanation: 'Koelvloeistof aan', usage: 'Start koeling', example: 'M08' },
  { term: 'M30', category: 'M-codes', explanation: 'Programma einde + reset', usage: 'Einde van CNC programma', example: 'M30' },
  { term: 'Schuifmaat', category: 'Meetgereedschap', explanation: 'Precisie meetinstrument voor in-/uitwendige maten en diepte', usage: 'Lengte, diameter, diepte meten', example: 'Nauwkeurigheid 0.02mm' },
  { term: 'Micrometer', category: 'Meetgereedschap', explanation: 'Zeer nauwkeurig meetinstrument', usage: 'Nauwkeurige diameter/dikte meting', example: 'Nauwkeurigheid 0.01mm' },
  { term: 'Hoogtepasser', category: 'Meetgereedschap', explanation: 'Meetinstrument voor hoogte en vlakheid', usage: 'Referentiehoogte meten op vlakplaat', example: 'Digitale hoogtepasser' },
  { term: 'Tolerantie', category: 'CNC Termen', explanation: 'Toegestane afwijking van nominale maat', usage: 'H7 = +0.000/+0.025 bij Ø25', example: 'Ø25 H7 (+0.000/+0.025)' },
  { term: 'Voeding (F)', category: 'CNC Termen', explanation: 'Snelheid waarmee gereedschap beweegt', usage: 'mm/min of mm/omw', example: 'F200 = 200 mm/min' },
  { term: 'Toerental (S)', category: 'CNC Termen', explanation: 'Rotatiesnelheid van spindel', usage: 'Omwentelingen per minuut', example: 'S1500 = 1500 rpm' },
  { term: 'Snijsnelheid (Vc)', category: 'CNC Termen', explanation: 'Snelheid aan snijkant (m/min)', usage: 'Vc = π × D × n / 1000', example: 'Staal: 80-120 m/min' },
];

export function createPage(container) {
  let unsub;
  let editingId = null;
  let searchQuery = '';
  let filterCategory = null;

  async function render() {
    let items = (await getAll('reference')).sort((a, b) => (a.term || '').localeCompare(b.term || ''));

    const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        (i.term || '').toLowerCase().includes(q) ||
        (i.explanation || '').toLowerCase().includes(q) ||
        (i.usage || '').toLowerCase().includes(q)
      );
    }
    if (filterCategory) {
      items = items.filter(i => i.category === filterCategory);
    }

    if (editingId !== null) {
      renderForm(editingId === 'new' ? null : items.find(i => i.id === editingId));
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>Naslagwerk</h2>
        <p>G-codes, meetgereedschap en CNC termen</p>
      </div>

      ${items.length === 0 && !searchQuery && !filterCategory && (await getAll('reference')).length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('book', 48)}</div>
          <h3>Naslagwerk is leeg</h3>
          <p>Laad de standaard CNC woordenlijst of voeg handmatig termen toe.</p>
          <div style="display:flex; gap:var(--space-3); justify-content:center">
            <button class="btn btn-primary" data-action="load-seed">Standaard laden (${SEED_DATA.length} termen)</button>
            <button class="btn btn-secondary" data-action="add">Handmatig toevoegen</button>
          </div>
        </div>
      ` : `
        <div style="display:flex; gap:var(--space-3); margin-bottom:var(--space-4); flex-wrap:wrap; align-items:center">
          <input type="search" class="form-input" id="ref-search" placeholder="Zoeken..." value="${escapeHTML(searchQuery)}" style="max-width:250px">
          <button class="btn btn-primary btn-sm" data-action="add">${icon('plus', 14)} Toevoegen</button>
          <button class="btn btn-secondary btn-sm" data-action="load-seed">Seed laden</button>
        </div>

        ${categories.length > 1 ? `
          <div style="display:flex; gap:var(--space-2); margin-bottom:var(--space-4); flex-wrap:wrap">
            <button class="btn ${!filterCategory ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-cat="">Alle</button>
            ${categories.map(c => `
              <button class="btn ${filterCategory === c ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-cat="${c}">${c}</button>
            `).join('')}
          </div>
        ` : ''}

        <div style="display:flex; flex-direction:column; gap:var(--space-3)">
          ${items.map(i => `
            <div class="card" style="border-left: 3px solid var(--color-cyan)">
              <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <div>
                  <h4 style="margin-bottom:var(--space-1)">${escapeHTML(i.term)}</h4>
                  <span class="badge badge-cyan" style="margin-bottom:var(--space-2)">${escapeHTML(i.category || '')}</span>
                </div>
                <div style="display:flex; gap:var(--space-2)">
                  <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${i.id}">${icon('edit', 14)}</button>
                  <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${i.id}">${icon('trash', 14)}</button>
                </div>
              </div>
              <p style="font-size:0.875rem; margin-bottom:var(--space-1)"><strong>Uitleg:</strong> ${escapeHTML(i.explanation || '')}</p>
              ${i.usage ? `<p style="font-size:0.875rem; margin-bottom:var(--space-1)"><strong>Gebruik:</strong> ${escapeHTML(i.usage)}</p>` : ''}
              ${i.example ? `<p style="font-size:0.8125rem; color:var(--color-text-secondary)"><code>${escapeHTML(i.example)}</code></p>` : ''}
            </div>
          `).join('')}
        </div>
      `}
    `;

    bindEvents();
  }

  function renderForm(item) {
    const isNew = !item;
    const i = item || { term: '', category: '', explanation: '', usage: '', example: '' };

    container.innerHTML = `
      <div class="hours-entry-header">
        <button class="btn btn-icon btn-ghost" data-action="back">${icon('arrow-left')}</button>
        <div class="hours-entry-date">${isNew ? 'Nieuw item' : 'Item bewerken'}</div>
      </div>

      <form id="ref-form">
        <div class="form-group">
          <label class="form-label" for="r-term">Term / naam *</label>
          <input type="text" id="r-term" class="form-input" value="${escapeHTML(i.term)}" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="r-category">Categorie</label>
          <input type="text" id="r-category" class="form-input" value="${escapeHTML(i.category || '')}" placeholder="G-codes, Meetgereedschap, CNC Termen...">
        </div>
        <div class="form-group">
          <label class="form-label" for="r-explanation">Uitleg *</label>
          <textarea id="r-explanation" class="form-textarea" rows="3" required>${escapeHTML(i.explanation || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="r-usage">Gebruik</label>
          <textarea id="r-usage" class="form-textarea" rows="2">${escapeHTML(i.usage || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="r-example">Voorbeeld</label>
          <input type="text" id="r-example" class="form-input" value="${escapeHTML(i.example || '')}">
        </div>

        <div class="hours-entry-actions">
          <button type="submit" class="btn btn-primary">${icon('save', 16)} Opslaan</button>
        </div>
      </form>
    `;

    container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      editingId = null;
      render();
    });

    container.querySelector('#ref-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const record = {
        id: item?.id || generateId(),
        term: document.getElementById('r-term').value.trim(),
        category: document.getElementById('r-category').value.trim() || 'Overig',
        explanation: document.getElementById('r-explanation').value.trim(),
        usage: document.getElementById('r-usage').value.trim(),
        example: document.getElementById('r-example').value.trim(),
        createdAt: item?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      await put('reference', record);
      editingId = null;
      emit('reference:updated');
      showToast('Item opgeslagen', { type: 'success' });
      render();
    });
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
        await remove('reference', btn.dataset.id);
        emit('reference:updated');
        showToast('Item verwijderd', { type: 'info' });
        render();
      });
    });
    container.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        filterCategory = btn.dataset.cat || null;
        render();
      });
    });

    container.querySelector('#ref-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
    });

    container.querySelectorAll('[data-action="load-seed"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        for (const seed of SEED_DATA) {
          await put('reference', {
            id: generateId(),
            term: seed.term,
            category: seed.category,
            explanation: seed.explanation,
            usage: seed.usage,
            example: seed.example,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
        emit('reference:updated');
        showToast(`${SEED_DATA.length} termen geladen`, { type: 'success' });
        render();
      });
    });
  }

  render();
  unsub = on('reference:updated', render);
  return { destroy() { if (unsub) unsub(); } };
}
