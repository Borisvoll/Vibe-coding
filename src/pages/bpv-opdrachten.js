import { getAll, put, softDelete, undoDelete, getSetting, getAllHoursSorted } from '../db.js';
import { icon } from '../icons.js';
import { emit, on } from '../state.js';
import { showToast } from '../toast.js';
import { navigate } from '../router.js';
import { generateId, escapeHTML, formatMinutes, formatHoursDecimal, getWeeksInBPV, weekNumber, getToday } from '../utils.js';
import { BPV_START, BPV_END, WEEKLY_GOAL_HOURS, COMPETENCY_LEVELS } from '../constants.js';

const LEERDOEL_STATUSES = [
  { value: 'in_progress', label: 'In uitvoering', color: 'var(--color-accent)' },
  { value: 'behaald', label: 'Behaald', color: 'var(--color-success)' },
  { value: 'niet_behaald', label: 'Niet behaald', color: 'var(--color-error)' },
];

const REFLECTIE_PERIODES = ['Week 1-2', 'Week 3-4', 'Week 5-6', 'Week 7-8', 'Week 9-10', 'Gehele stage'];

// Required BPV hours (11 weeks × 40 hours)
const BPV_TOTAL_REQUIRED_HOURS = 440;

export function createPage(container) {
  let activeTab = 'leerdoelen';
  let editingId = null;
  let unsubs = [];

  async function render() {
    const leerdoelen = await getAll('bpvLeerdoelen');
    const producten = await getAll('bpvProducten');
    const reflecties = await getAll('bpvReflecties');
    const bedrijfRecords = await getAll('bpvBedrijf');
    const bedrijf = bedrijfRecords[0] || null;

    // Progress per tab
    const ldProgress = calcLeerdoelenProgress(leerdoelen, bedrijf);
    const prProgress = calcProductenProgress(producten);
    const rfProgress = calcReflectieProgress(reflecties);

    container.innerHTML = `
      <div class="page-header">
        <h2>BPV Opdrachten</h2>
        <p style="color:var(--color-text-secondary)">LIS stageopdrachten — gestructureerd invullen</p>
      </div>

      <div class="bpv-tabs">
        <button class="bpv-tab ${activeTab === 'leerdoelen' ? 'active' : ''}" data-tab="leerdoelen">
          <span class="bpv-tab-label">Leerdoelen</span>
          <span class="bpv-tab-progress" style="color:${progressColor(ldProgress)}">${ldProgress}%</span>
        </button>
        <button class="bpv-tab ${activeTab === 'productgericht' ? 'active' : ''}" data-tab="productgericht">
          <span class="bpv-tab-label">Productgericht</span>
          <span class="bpv-tab-progress" style="color:${progressColor(prProgress)}">${prProgress}%</span>
        </button>
        <button class="bpv-tab ${activeTab === 'reflectie' ? 'active' : ''}" data-tab="reflectie">
          <span class="bpv-tab-label">Reflectie</span>
          <span class="bpv-tab-progress" style="color:${progressColor(rfProgress)}">${rfProgress}%</span>
        </button>
        <button class="bpv-tab ${activeTab === 'uren' ? 'active' : ''}" data-tab="uren">
          <span class="bpv-tab-label">Uren</span>
          ${icon('clock', 14)}
        </button>
      </div>

      <div id="bpv-tab-content"></div>
    `;

    container.querySelectorAll('.bpv-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        editingId = null;
        render();
      });
    });

    const content = container.querySelector('#bpv-tab-content');
    if (activeTab === 'leerdoelen') await renderLeerdoelen(content, leerdoelen, bedrijf);
    else if (activeTab === 'productgericht') await renderProducten(content, producten);
    else if (activeTab === 'reflectie') await renderReflectie(content, reflecties, leerdoelen);
    else if (activeTab === 'uren') await renderUren(content);
  }

  // ===== LEERDOELEN TAB =====

  async function renderLeerdoelen(el, leerdoelen, bedrijf) {
    if (editingId === 'bedrijf' || editingId === 'new-leerdoel' || (editingId && leerdoelen.find(l => l.id === editingId))) {
      if (editingId === 'bedrijf') return renderBedrijfForm(el, bedrijf);
      const existing = editingId === 'new-leerdoel' ? null : leerdoelen.find(l => l.id === editingId);
      return renderLeerdoelForm(el, existing);
    }

    el.innerHTML = `
      <!-- Bedrijfsorientatie -->
      <div class="card bpv-section">
        <div class="bpv-section-header">
          <h3>Bedrijfsorientatie</h3>
          <button class="btn btn-secondary btn-sm" data-action="edit-bedrijf">
            ${icon('edit', 14)} ${bedrijf ? 'Bewerken' : 'Invullen'}
          </button>
        </div>
        ${bedrijf ? `
          <div class="bpv-field-preview">
            <div class="bpv-field-row"><strong>Bedrijf:</strong> ${escapeHTML(bedrijf.bedrijfsnaam || '—')}</div>
            <div class="bpv-field-row"><strong>Beschrijving:</strong> ${escapeHTML((bedrijf.beschrijving || '').substring(0, 150))}${(bedrijf.beschrijving || '').length > 150 ? '...' : ''}</div>
            <div class="bpv-field-row"><strong>Processen:</strong> ${escapeHTML((bedrijf.processen || '').substring(0, 150))}${(bedrijf.processen || '').length > 150 ? '...' : ''}</div>
          </div>
        ` : `<p class="bpv-empty">Nog niet ingevuld — beschrijf je stagebedrijf</p>`}
      </div>

      <!-- Leerdoelen -->
      <div class="card bpv-section">
        <div class="bpv-section-header">
          <h3>SMART Leerdoelen</h3>
          <button class="btn btn-primary btn-sm" data-action="add-leerdoel">
            ${icon('plus', 14)} Leerdoel
          </button>
        </div>
        ${leerdoelen.length === 0 ? `
          <p class="bpv-empty">Voeg 2–4 SMART leerdoelen toe, elk gekoppeld aan een beroepscompetentie</p>
        ` : `
          <div class="bpv-items-list">
            ${leerdoelen.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).map((ld, i) => {
              const status = LEERDOEL_STATUSES.find(s => s.value === ld.status) || LEERDOEL_STATUSES[0];
              const filled = [ld.competentie, ld.specifiek, ld.meetbaar, ld.acceptabel, ld.realistisch, ld.tijdgebonden].filter(v => v?.trim()).length;
              return `
                <div class="bpv-item" data-id="${ld.id}">
                  <div class="bpv-item-main">
                    <div class="bpv-item-title">
                      <span class="bpv-item-num">${i + 1}</span>
                      ${escapeHTML(ld.competentie || 'Leerdoel ' + (i + 1))}
                    </div>
                    <div class="bpv-item-meta">
                      <span class="badge" style="background:${status.color}15;color:${status.color};border:1px solid ${status.color}30">${status.label}</span>
                      <span class="bpv-item-filled">${filled}/6 SMART</span>
                    </div>
                  </div>
                  <div class="bpv-item-actions">
                    <button class="btn btn-icon btn-ghost btn-sm" data-action="edit" data-id="${ld.id}" title="Bewerken">${icon('edit', 14)}</button>
                    <button class="btn btn-icon btn-ghost btn-sm" data-action="delete" data-id="${ld.id}" title="Verwijderen">${icon('trash', 14)}</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    el.querySelector('[data-action="edit-bedrijf"]')?.addEventListener('click', () => { editingId = 'bedrijf'; render(); });
    el.querySelector('[data-action="add-leerdoel"]')?.addEventListener('click', () => { editingId = 'new-leerdoel'; render(); });
    el.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => { editingId = btn.dataset.id; render(); });
    });
    el.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Leerdoel verwijderen?')) return;
        await softDelete('bpvLeerdoelen', btn.dataset.id);
        emit('bpv:updated');
        showToast('Leerdoel verwijderd', { type: 'info', action: { label: 'Ongedaan', fn: async () => { await undoDelete(btn.dataset.id); emit('bpv:updated'); } } });
      });
    });
  }

  function renderBedrijfForm(el, bedrijf) {
    el.innerHTML = `
      <div class="bpv-form-header">
        <button class="btn btn-icon btn-ghost" data-action="back">${icon('arrow-left')}</button>
        <h3>Bedrijfsorientatie</h3>
      </div>
      <form class="bpv-form" id="bedrijf-form">
        <div class="form-group">
          <label class="form-label">Bedrijfsnaam</label>
          <input type="text" class="form-input" name="bedrijfsnaam" value="${escapeHTML(bedrijf?.bedrijfsnaam || '')}" placeholder="Naam van het stagebedrijf">
        </div>
        <div class="form-group">
          <label class="form-label">Bedrijfsbeschrijving</label>
          <div class="form-hint">Wat doet het bedrijf? Producten, diensten, werkgebied, positie in de markt.</div>
          <textarea class="form-textarea" name="beschrijving" rows="5" placeholder="Beschrijf het bedrijf...">${escapeHTML(bedrijf?.beschrijving || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Bedrijfsprocessen</label>
          <div class="form-hint">Welke processen doorloopt een product/opdracht? Jouw plek daarin.</div>
          <textarea class="form-textarea" name="processen" rows="5" placeholder="Beschrijf de belangrijkste processen...">${escapeHTML(bedrijf?.processen || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Beroepscompetenties (2–4)</label>
          <div class="form-hint">Welke beroepscompetenties zijn relevant voor jouw stage?</div>
          <textarea class="form-textarea" name="competenties" rows="3" placeholder="Bijv. vakkennis, kwaliteitsbewustzijn, samenwerken...">${escapeHTML(bedrijf?.competenties || '')}</textarea>
        </div>
        <div class="bpv-form-actions">
          <button type="button" class="btn btn-secondary" data-action="back">Annuleren</button>
          <button type="submit" class="btn btn-primary">${icon('save', 14)} Opslaan</button>
        </div>
      </form>
    `;

    el.querySelectorAll('[data-action="back"]').forEach(b => b.addEventListener('click', () => { editingId = null; render(); }));
    el.querySelector('#bedrijf-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const record = {
        id: bedrijf?.id || generateId(),
        bedrijfsnaam: fd.get('bedrijfsnaam')?.trim() || '',
        beschrijving: fd.get('beschrijving')?.trim() || '',
        processen: fd.get('processen')?.trim() || '',
        competenties: fd.get('competenties')?.trim() || '',
        createdAt: bedrijf?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await put('bpvBedrijf', record);
      emit('bpv:updated');
      showToast('Bedrijfsinfo opgeslagen', { type: 'success' });
      editingId = null;
      render();
    });
  }

  function renderLeerdoelForm(el, existing) {
    const ld = existing || {};
    el.innerHTML = `
      <div class="bpv-form-header">
        <button class="btn btn-icon btn-ghost" data-action="back">${icon('arrow-left')}</button>
        <h3>${existing ? 'Leerdoel bewerken' : 'Nieuw leerdoel'}</h3>
      </div>
      <form class="bpv-form" id="leerdoel-form">
        <div class="form-group">
          <label class="form-label">Beroepscompetentie</label>
          <div class="form-hint">Aan welke competentie is dit leerdoel gekoppeld?</div>
          <input type="text" class="form-input" name="competentie" value="${escapeHTML(ld.competentie || '')}" placeholder="Bijv. Kwaliteitsbewustzijn" required>
        </div>

        <div class="bpv-smart-grid">
          <div class="form-group">
            <label class="form-label">S — Specifiek</label>
            <div class="form-hint">Wat wil je precies bereiken?</div>
            <textarea class="form-textarea" name="specifiek" rows="3" placeholder="Ik wil leren om...">${escapeHTML(ld.specifiek || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">M — Meetbaar</label>
            <div class="form-hint">Hoe meet je of het gelukt is?</div>
            <textarea class="form-textarea" name="meetbaar" rows="3" placeholder="Dit is bereikt als...">${escapeHTML(ld.meetbaar || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">A — Acceptabel</label>
            <div class="form-hint">Waarom wil je dit bereiken? Wie steunt je?</div>
            <textarea class="form-textarea" name="acceptabel" rows="3" placeholder="Dit is belangrijk omdat...">${escapeHTML(ld.acceptabel || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">R — Realistisch</label>
            <div class="form-hint">Is het haalbaar binnen de stage?</div>
            <textarea class="form-textarea" name="realistisch" rows="3" placeholder="Dit is haalbaar omdat...">${escapeHTML(ld.realistisch || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">T — Tijdgebonden</label>
            <div class="form-hint">Wanneer wil je het bereikt hebben?</div>
            <textarea class="form-textarea" name="tijdgebonden" rows="3" placeholder="Uiterlijk in week...">${escapeHTML(ld.tijdgebonden || '')}</textarea>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Motivatie</label>
          <textarea class="form-textarea" name="motivatie" rows="3" placeholder="Waarom is dit leerdoel belangrijk voor jou?">${escapeHTML(ld.motivatie || '')}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Status</label>
          <div class="radio-group">
            ${LEERDOEL_STATUSES.map(s => `
              <label class="radio-option ${(ld.status || 'in_progress') === s.value ? 'selected' : ''}">
                <input type="radio" name="status" value="${s.value}" ${(ld.status || 'in_progress') === s.value ? 'checked' : ''}>
                ${s.label}
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Bewijs / Evidence</label>
          <div class="form-hint">Links naar logboek entries, foto's, of andere bewijzen</div>
          <textarea class="form-textarea" name="evidence" rows="2" placeholder="Bijv. logboek 12 feb, foto meetresultaat...">${escapeHTML(ld.evidence || '')}</textarea>
        </div>

        <div class="bpv-form-actions">
          <button type="button" class="btn btn-secondary" data-action="back">Annuleren</button>
          <button type="submit" class="btn btn-primary">${icon('save', 14)} Opslaan</button>
        </div>
      </form>
    `;

    el.querySelectorAll('[data-action="back"]').forEach(b => b.addEventListener('click', () => { editingId = null; render(); }));
    el.querySelectorAll('.radio-option').forEach(opt => {
      opt.addEventListener('click', () => {
        el.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
      });
    });
    el.querySelector('#leerdoel-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const record = {
        id: existing?.id || generateId(),
        competentie: fd.get('competentie')?.trim() || '',
        specifiek: fd.get('specifiek')?.trim() || '',
        meetbaar: fd.get('meetbaar')?.trim() || '',
        acceptabel: fd.get('acceptabel')?.trim() || '',
        realistisch: fd.get('realistisch')?.trim() || '',
        tijdgebonden: fd.get('tijdgebonden')?.trim() || '',
        motivatie: fd.get('motivatie')?.trim() || '',
        status: fd.get('status') || 'in_progress',
        evidence: fd.get('evidence')?.trim() || '',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await put('bpvLeerdoelen', record);
      emit('bpv:updated');
      showToast('Leerdoel opgeslagen', { type: 'success' });
      editingId = null;
      render();
    });
  }

  // ===== PRODUCTGERICHT TAB =====

  async function renderProducten(el, producten) {
    if (editingId === 'new-product' || (editingId && producten.find(p => p.id === editingId))) {
      const existing = editingId === 'new-product' ? null : producten.find(p => p.id === editingId);
      return renderProductForm(el, existing);
    }

    el.innerHTML = `
      <div class="card bpv-section">
        <div class="bpv-section-header">
          <h3>Projecten & Werkzaamheden</h3>
          <button class="btn btn-primary btn-sm" data-action="add-product">
            ${icon('plus', 14)} Project
          </button>
        </div>
        ${producten.length === 0 ? `
          <p class="bpv-empty">Beschrijf minimaal 1 project met machines, materialen, processtappen, en kwaliteitscontrole</p>
        ` : `
          <div class="bpv-items-list">
            ${producten.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).map((pr, i) => {
              const filled = [pr.projectNaam, pr.machines, pr.materialen, pr.procesStappen, pr.assemblage, pr.testMethode, pr.verbeterpunten, pr.engelsToelichting].filter(v => v?.trim()).length;
              return `
                <div class="bpv-item" data-id="${pr.id}">
                  <div class="bpv-item-main">
                    <div class="bpv-item-title">
                      <span class="bpv-item-num">${i + 1}</span>
                      ${escapeHTML(pr.projectNaam || 'Project ' + (i + 1))}
                    </div>
                    <div class="bpv-item-meta">
                      <span class="bpv-item-filled">${filled}/8 velden</span>
                    </div>
                  </div>
                  <div class="bpv-item-actions">
                    <button class="btn btn-icon btn-ghost btn-sm" data-action="edit" data-id="${pr.id}">${icon('edit', 14)}</button>
                    <button class="btn btn-icon btn-ghost btn-sm" data-action="delete" data-id="${pr.id}">${icon('trash', 14)}</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    el.querySelector('[data-action="add-product"]')?.addEventListener('click', () => { editingId = 'new-product'; render(); });
    el.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => { editingId = btn.dataset.id; render(); });
    });
    el.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Project verwijderen?')) return;
        await softDelete('bpvProducten', btn.dataset.id);
        emit('bpv:updated');
        showToast('Project verwijderd', { type: 'info' });
      });
    });
  }

  function renderProductForm(el, existing) {
    const pr = existing || {};
    el.innerHTML = `
      <div class="bpv-form-header">
        <button class="btn btn-icon btn-ghost" data-action="back">${icon('arrow-left')}</button>
        <h3>${existing ? 'Project bewerken' : 'Nieuw project'}</h3>
      </div>
      <form class="bpv-form" id="product-form">
        <div class="form-group">
          <label class="form-label">Projectnaam</label>
          <input type="text" class="form-input" name="projectNaam" value="${escapeHTML(pr.projectNaam || '')}" placeholder="Naam van het project of werkzaamheid" required>
        </div>
        <div class="form-group">
          <label class="form-label">Machines & gereedschappen</label>
          <div class="form-hint">Welke machines en gereedschappen heb je gebruikt?</div>
          <textarea class="form-textarea" name="machines" rows="3" placeholder="Bijv. CNC-draaibank, schuifmaat, freesmachine...">${escapeHTML(pr.machines || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Materialen</label>
          <textarea class="form-textarea" name="materialen" rows="2" placeholder="Bijv. aluminium 6082, staal S235...">${escapeHTML(pr.materialen || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Processtappen</label>
          <div class="form-hint">Beschrijf de stappen van begin tot eind (in volgorde)</div>
          <textarea class="form-textarea" name="procesStappen" rows="5" placeholder="1. Tekening lezen&#10;2. Materiaal opspannen&#10;3. Bewerken&#10;4. Meten&#10;5. Afwerken">${escapeHTML(pr.procesStappen || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Assemblage & samenstelling</label>
          <textarea class="form-textarea" name="assemblage" rows="3" placeholder="Hoe worden onderdelen samengevoegd? Welke verbindingsmethoden?">${escapeHTML(pr.assemblage || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Test & kwaliteitscontrole</label>
          <div class="form-hint">Meetmethoden, toleranties, instrumenten, resultaat</div>
          <textarea class="form-textarea" name="testMethode" rows="3" placeholder="Bijv. meten met schuifmaat, tolerantie ±0.05mm...">${escapeHTML(pr.testMethode || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Verbeterpunten & optimalisatie</label>
          <div class="form-hint">Wat kan beter? Oorzaak, voorstel, risico, KPI</div>
          <textarea class="form-textarea" name="verbeterpunten" rows="4" placeholder="Oorzaak: ...&#10;Voorstel: ...&#10;Risico/impact: ...&#10;Meetmethode: ...">${escapeHTML(pr.verbeterpunten || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Product/Process Description (English)</label>
          <div class="form-hint">Write 120–180 words in English explaining this product or process</div>
          <textarea class="form-textarea" name="engelsToelichting" rows="6" placeholder="In English: describe the product, materials, process steps, and quality control...">${escapeHTML(pr.engelsToelichting || '')}</textarea>
          <div class="form-hint" style="text-align:right" id="eng-wordcount"></div>
        </div>
        <div class="form-group">
          <label class="form-label">Risico's</label>
          <textarea class="form-textarea" name="risicos" rows="2" placeholder="Welke risico's zijn er bij dit project?">${escapeHTML(pr.risicos || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">KPI's</label>
          <textarea class="form-textarea" name="kpis" rows="2" placeholder="Meetbare prestatie-indicatoren">${escapeHTML(pr.kpis || '')}</textarea>
        </div>
        <div class="bpv-form-actions">
          <button type="button" class="btn btn-secondary" data-action="back">Annuleren</button>
          <button type="submit" class="btn btn-primary">${icon('save', 14)} Opslaan</button>
        </div>
      </form>
    `;

    // English word count
    const engTextarea = el.querySelector('[name="engelsToelichting"]');
    const engCounter = el.querySelector('#eng-wordcount');
    function updateWordCount() {
      const words = (engTextarea.value || '').trim().split(/\s+/).filter(Boolean).length;
      const color = words >= 120 && words <= 180 ? 'var(--color-success)' : words > 0 ? 'var(--color-warning)' : 'var(--color-text-tertiary)';
      engCounter.innerHTML = `<span style="color:${color}">${words} woorden (doel: 120–180)</span>`;
    }
    engTextarea.addEventListener('input', updateWordCount);
    updateWordCount();

    el.querySelectorAll('[data-action="back"]').forEach(b => b.addEventListener('click', () => { editingId = null; render(); }));
    el.querySelector('#product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const record = {
        id: existing?.id || generateId(),
        projectNaam: fd.get('projectNaam')?.trim() || '',
        machines: fd.get('machines')?.trim() || '',
        materialen: fd.get('materialen')?.trim() || '',
        procesStappen: fd.get('procesStappen')?.trim() || '',
        assemblage: fd.get('assemblage')?.trim() || '',
        testMethode: fd.get('testMethode')?.trim() || '',
        verbeterpunten: fd.get('verbeterpunten')?.trim() || '',
        engelsToelichting: fd.get('engelsToelichting')?.trim() || '',
        risicos: fd.get('risicos')?.trim() || '',
        kpis: fd.get('kpis')?.trim() || '',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await put('bpvProducten', record);
      emit('bpv:updated');
      showToast('Project opgeslagen', { type: 'success' });
      editingId = null;
      render();
    });
  }

  // ===== REFLECTIE TAB =====

  async function renderReflectie(el, reflecties, leerdoelen) {
    if (editingId === 'new-reflectie' || (editingId && reflecties.find(r => r.id === editingId))) {
      const existing = editingId === 'new-reflectie' ? null : reflecties.find(r => r.id === editingId);
      return renderReflectieForm(el, existing, leerdoelen);
    }

    el.innerHTML = `
      <div class="card bpv-section">
        <div class="bpv-section-header">
          <h3>Reflecties</h3>
          <button class="btn btn-primary btn-sm" data-action="add-reflectie">
            ${icon('plus', 14)} Reflectie
          </button>
        </div>
        ${reflecties.length === 0 ? `
          <p class="bpv-empty">Schrijf reflecties over je stage-ervaring. Koppel leerdoelen aan behaalde resultaten.</p>
        ` : `
          <div class="bpv-items-list">
            ${reflecties.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).map((rf, i) => {
              const filled = [rf.watGingGoed, rf.watKanBeter, rf.feedbackBegeleider, rf.toekomstfocus].filter(v => v?.trim()).length;
              return `
                <div class="bpv-item" data-id="${rf.id}">
                  <div class="bpv-item-main">
                    <div class="bpv-item-title">
                      <span class="bpv-item-num">${i + 1}</span>
                      ${escapeHTML(rf.periode || 'Reflectie ' + (i + 1))}
                    </div>
                    <div class="bpv-item-meta">
                      <span class="bpv-item-filled">${filled}/4 velden</span>
                    </div>
                  </div>
                  <div class="bpv-item-actions">
                    <button class="btn btn-icon btn-ghost btn-sm" data-action="edit" data-id="${rf.id}">${icon('edit', 14)}</button>
                    <button class="btn btn-icon btn-ghost btn-sm" data-action="delete" data-id="${rf.id}">${icon('trash', 14)}</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    el.querySelector('[data-action="add-reflectie"]')?.addEventListener('click', () => { editingId = 'new-reflectie'; render(); });
    el.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => { editingId = btn.dataset.id; render(); });
    });
    el.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Reflectie verwijderen?')) return;
        await softDelete('bpvReflecties', btn.dataset.id);
        emit('bpv:updated');
        showToast('Reflectie verwijderd', { type: 'info' });
      });
    });
  }

  function renderReflectieForm(el, existing, leerdoelen) {
    const rf = existing || {};
    el.innerHTML = `
      <div class="bpv-form-header">
        <button class="btn btn-icon btn-ghost" data-action="back">${icon('arrow-left')}</button>
        <h3>${existing ? 'Reflectie bewerken' : 'Nieuwe reflectie'}</h3>
      </div>
      <form class="bpv-form" id="reflectie-form">
        <div class="form-group">
          <label class="form-label">Periode</label>
          <select class="form-input" name="periode">
            ${REFLECTIE_PERIODES.map(p => `<option value="${p}" ${rf.periode === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Wat ging goed?</label>
          <textarea class="form-textarea" name="watGingGoed" rows="4" placeholder="Beschrijf wat er goed ging tijdens deze periode...">${escapeHTML(rf.watGingGoed || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Wat kan beter?</label>
          <textarea class="form-textarea" name="watKanBeter" rows="4" placeholder="Wat waren de uitdagingen? Wat zou je anders doen?">${escapeHTML(rf.watKanBeter || '')}</textarea>
        </div>

        ${leerdoelen.length > 0 ? `
          <div class="form-group">
            <label class="form-label">Leerdoelen status</label>
            <div class="form-hint">Hoe staan je leerdoelen ervoor in deze periode?</div>
            <div class="bpv-leerdoel-status-list">
              ${leerdoelen.map(ld => {
                const currentStatus = rf.leerdoelenStatus?.find(ls => ls.id === ld.id)?.note || '';
                return `
                  <div class="bpv-leerdoel-status-item">
                    <strong>${escapeHTML(ld.competentie || 'Leerdoel')}</strong>
                    <span class="badge" style="font-size:0.6875rem">${(LEERDOEL_STATUSES.find(s => s.value === ld.status) || LEERDOEL_STATUSES[0]).label}</span>
                    <textarea class="form-textarea" name="ld-${ld.id}" rows="2" placeholder="Notitie over voortgang...">${escapeHTML(currentStatus)}</textarea>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label">Feedback praktijkbegeleider</label>
          <textarea class="form-textarea" name="feedbackBegeleider" rows="3" placeholder="Wat zegt je begeleider over je voortgang?">${escapeHTML(rf.feedbackBegeleider || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Toekomstfocus</label>
          <div class="form-hint">Wat neem je mee? Wat wil je nog leren?</div>
          <textarea class="form-textarea" name="toekomstfocus" rows="3" placeholder="Waar ga je je de komende periode op richten?">${escapeHTML(rf.toekomstfocus || '')}</textarea>
        </div>
        <div class="bpv-form-actions">
          <button type="button" class="btn btn-secondary" data-action="back">Annuleren</button>
          <button type="submit" class="btn btn-primary">${icon('save', 14)} Opslaan</button>
        </div>
      </form>
    `;

    el.querySelectorAll('[data-action="back"]').forEach(b => b.addEventListener('click', () => { editingId = null; render(); }));
    el.querySelector('#reflectie-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const leerdoelenStatus = leerdoelen.map(ld => ({
        id: ld.id,
        competentie: ld.competentie,
        status: ld.status,
        note: fd.get(`ld-${ld.id}`)?.trim() || '',
      }));
      const record = {
        id: existing?.id || generateId(),
        periode: fd.get('periode') || '',
        watGingGoed: fd.get('watGingGoed')?.trim() || '',
        watKanBeter: fd.get('watKanBeter')?.trim() || '',
        leerdoelenStatus,
        feedbackBegeleider: fd.get('feedbackBegeleider')?.trim() || '',
        toekomstfocus: fd.get('toekomstfocus')?.trim() || '',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await put('bpvReflecties', record);
      emit('bpv:updated');
      showToast('Reflectie opgeslagen', { type: 'success' });
      editingId = null;
      render();
    });
  }

  // ===== UREN TAB =====

  async function renderUren(el) {
    const hours = await getAllHoursSorted();
    const workHours = hours.filter(h => h.type === 'work');
    const totalMinutes = workHours.reduce((s, h) => s + (h.netMinutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const progressPct = Math.min(100, Math.round((totalHours / BPV_TOTAL_REQUIRED_HOURS) * 100));
    const weeks = getWeeksInBPV();

    const sickDays = hours.filter(h => h.type === 'sick').length;
    const absentDays = hours.filter(h => h.type === 'absent').length;
    const holidayDays = hours.filter(h => h.type === 'holiday').length;

    const weekData = weeks.map(w => {
      const wEntries = workHours.filter(h => h.week === w);
      const min = wEntries.reduce((s, h) => s + (h.netMinutes || 0), 0);
      return { week: w, minutes: min, entries: wEntries.length };
    });

    el.innerHTML = `
      <div class="card bpv-section">
        <h3>BPV Uren Voortgang</h3>
        <div class="bpv-uren-total">
          <div class="bpv-uren-big">${formatHoursDecimal(totalMinutes)}</div>
          <div class="bpv-uren-label">van ${BPV_TOTAL_REQUIRED_HOURS} uur</div>
        </div>
        <div class="progress-bar" style="height:12px;margin:var(--space-4) 0">
          <div class="progress-bar-fill ${progressPct >= 100 ? 'emerald' : progressPct >= 60 ? 'blue' : 'amber'}" style="width:${progressPct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.8125rem;color:var(--color-text-secondary)">
          <span>${progressPct}% voltooid</span>
          <span>${formatMinutes(Math.max(0, BPV_TOTAL_REQUIRED_HOURS * 60 - totalMinutes))} resterend</span>
        </div>
      </div>

      <div class="card bpv-section">
        <h3>Overzicht</h3>
        <div class="bpv-uren-stats">
          <div class="bpv-stat">
            <div class="bpv-stat-value">${workHours.length}</div>
            <div class="bpv-stat-label">Werkdagen</div>
          </div>
          <div class="bpv-stat">
            <div class="bpv-stat-value">${sickDays}</div>
            <div class="bpv-stat-label">Ziek</div>
          </div>
          <div class="bpv-stat">
            <div class="bpv-stat-value">${absentDays}</div>
            <div class="bpv-stat-label">Afwezig</div>
          </div>
          <div class="bpv-stat">
            <div class="bpv-stat-value">${holidayDays}</div>
            <div class="bpv-stat-label">Vrij</div>
          </div>
        </div>
      </div>

      <div class="card bpv-section">
        <div class="bpv-section-header">
          <h3>Per week</h3>
          <button class="btn btn-secondary btn-sm" data-action="go-hours">${icon('clock', 14)} Uren invoeren</button>
        </div>
        <table class="bpv-uren-table">
          <thead>
            <tr><th>Week</th><th>Dagen</th><th>Uren</th><th>Doel</th><th></th></tr>
          </thead>
          <tbody>
            ${weekData.map(w => {
              const hrs = w.minutes / 60;
              const pct = Math.min(100, Math.round((hrs / WEEKLY_GOAL_HOURS) * 100));
              return `
                <tr>
                  <td>W${weekNumber(w.week)}</td>
                  <td>${w.entries}</td>
                  <td>${formatHoursDecimal(w.minutes)}</td>
                  <td>${WEEKLY_GOAL_HOURS}u</td>
                  <td>
                    <div class="progress-bar" style="width:80px;height:6px">
                      <div class="progress-bar-fill ${pct >= 100 ? 'emerald' : pct >= 60 ? 'blue' : 'amber'}" style="width:${pct}%"></div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
            <tr style="font-weight:600;border-top:2px solid var(--color-border)">
              <td>Totaal</td>
              <td>${workHours.length}</td>
              <td>${formatHoursDecimal(totalMinutes)}</td>
              <td>${BPV_TOTAL_REQUIRED_HOURS}u</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    el.querySelector('[data-action="go-hours"]')?.addEventListener('click', () => navigate('hours'));
  }

  // ===== PROGRESS HELPERS =====

  function calcLeerdoelenProgress(leerdoelen, bedrijf) {
    let score = 0, total = 0;
    // Bedrijfsinfo: 3 fields
    total += 3;
    if (bedrijf?.bedrijfsnaam?.trim()) score++;
    if (bedrijf?.beschrijving?.trim()) score++;
    if (bedrijf?.processen?.trim()) score++;
    // Each leerdoel: 6 SMART fields + motivatie
    if (leerdoelen.length === 0) { total += 7; } // At least 1 expected
    else {
      for (const ld of leerdoelen) {
        total += 7;
        if (ld.competentie?.trim()) score++;
        if (ld.specifiek?.trim()) score++;
        if (ld.meetbaar?.trim()) score++;
        if (ld.acceptabel?.trim()) score++;
        if (ld.realistisch?.trim()) score++;
        if (ld.tijdgebonden?.trim()) score++;
        if (ld.motivatie?.trim()) score++;
      }
    }
    return total > 0 ? Math.round((score / total) * 100) : 0;
  }

  function calcProductenProgress(producten) {
    if (producten.length === 0) return 0;
    let score = 0, total = 0;
    for (const pr of producten) {
      total += 8;
      if (pr.projectNaam?.trim()) score++;
      if (pr.machines?.trim()) score++;
      if (pr.materialen?.trim()) score++;
      if (pr.procesStappen?.trim()) score++;
      if (pr.assemblage?.trim()) score++;
      if (pr.testMethode?.trim()) score++;
      if (pr.verbeterpunten?.trim()) score++;
      if (pr.engelsToelichting?.trim()) score++;
    }
    return total > 0 ? Math.round((score / total) * 100) : 0;
  }

  function calcReflectieProgress(reflecties) {
    if (reflecties.length === 0) return 0;
    let score = 0, total = 0;
    for (const rf of reflecties) {
      total += 4;
      if (rf.watGingGoed?.trim()) score++;
      if (rf.watKanBeter?.trim()) score++;
      if (rf.feedbackBegeleider?.trim()) score++;
      if (rf.toekomstfocus?.trim()) score++;
    }
    return total > 0 ? Math.round((score / total) * 100) : 0;
  }

  function progressColor(pct) {
    if (pct >= 80) return 'var(--color-success)';
    if (pct >= 40) return 'var(--color-accent)';
    return 'var(--color-text-tertiary)';
  }

  render();
  const u1 = on('bpv:updated', render);
  const u2 = on('hours:updated', () => { if (activeTab === 'uren') render(); });
  unsubs.push(u1, u2);

  return {
    destroy() { unsubs.forEach(fn => fn()); }
  };
}
