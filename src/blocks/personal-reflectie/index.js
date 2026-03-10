import { getAll, put, softDelete } from '../../db.js';
import { icon } from '../../icons.js';
import { on, emit } from '../../core/eventBus.js';
import { generateId, getISOWeek, getToday, weekNumber } from '../../utils.js';
import { showToast } from '../../toast.js';

export function createPage(container) {
  const unsubs = [];
  const currentWeek = getISOWeek(getToday());
  let currentReflection = null;
  let saveTimer = null;

  async function loadCurrentReflection() {
    const all = await getAll('personalReflections').catch(() => []);
    return all.find(r => r.week === currentWeek) || null;
  }

  async function render() {
    currentReflection = await loadCurrentReflection();
    const allReflections = await getAll('personalReflections').catch(() => []);

    const pastReflections = allReflections
      .filter(r => r.week !== currentWeek)
      .sort((a, b) => b.week.localeCompare(a.week));

    const wn = weekNumber(currentWeek);

    container.innerHTML = `
      <div class="page-header" style="margin-bottom: var(--space-6)">
        <h2>${icon('sun', 22)} Reflectie</h2>
        <p>Wekelijkse levensreview</p>
      </div>

      <div class="card" style="border-left: 3px solid var(--color-teal); margin-bottom: var(--space-8); padding: var(--space-6)">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5)">
          <h3 style="margin: 0; color: var(--color-teal)">Week ${wn}</h3>
          <span id="save-indicator" style="font-size: 0.75rem; color: var(--color-text-tertiary)"></span>
        </div>

        <div class="form-group" style="margin-bottom: var(--space-5)">
          <label class="form-label">Hoe was mijn week?</label>
          <textarea class="form-textarea" id="field-lifeReview" rows="4" placeholder="Beschrijf hoe je week was...">${currentReflection?.lifeReview || ''}</textarea>
        </div>

        <div class="form-group" style="margin-bottom: var(--space-5)">
          <label class="form-label">Balans check: werk / rust / plezier</label>
          <textarea class="form-textarea" id="field-balanceCheck" rows="4" placeholder="Hoe was de balans tussen werk, rust en plezier...">${currentReflection?.balanceCheck || ''}</textarea>
        </div>

        <div class="form-group" style="margin-bottom: var(--space-5)">
          <label class="form-label">Waar ben ik dankbaar voor deze week?</label>
          <textarea class="form-textarea" id="field-gratitudes" rows="4" placeholder="Schrijf op waar je dankbaar voor bent...">${currentReflection?.gratitudes || ''}</textarea>
        </div>

        <div class="form-group" style="margin-bottom: var(--space-5)">
          <label class="form-label">Hoe was mijn energie?</label>
          <textarea class="form-textarea" id="field-energyReflection" rows="4" placeholder="Beschrijf je energieniveau deze week...">${currentReflection?.energyReflection || ''}</textarea>
        </div>

        <div class="form-group" style="margin-bottom: 0">
          <label class="form-label">Intentie voor volgende week</label>
          <textarea class="form-textarea" id="field-nextWeekIntention" rows="4" placeholder="Wat is je intentie voor volgende week...">${currentReflection?.nextWeekIntention || ''}</textarea>
        </div>
      </div>

      ${pastReflections.length > 0 ? `
        <div style="margin-bottom: var(--space-6)">
          <h3 style="font-size: 0.875rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-4)">Eerdere reflecties</h3>
          ${pastReflections.map(r => {
            const pw = weekNumber(r.week);
            const preview = r.lifeReview
              ? (r.lifeReview.length > 80 ? r.lifeReview.slice(0, 80) + '...' : r.lifeReview)
              : 'Geen samenvatting';
            return `
              <div class="card past-reflection" data-id="${r.id}" style="margin-bottom: var(--space-3); cursor: pointer; padding: var(--space-4)">
                <div class="past-reflection-header" style="display: flex; align-items: center; justify-content: space-between">
                  <div style="display: flex; align-items: center; gap: var(--space-2)">
                    <span class="past-chevron" style="transition: transform 0.2s; display: inline-flex">${icon('chevron-down', 16)}</span>
                    <strong style="color: var(--color-teal)">Week ${pw}</strong>
                  </div>
                  <button class="btn-icon delete-reflection" data-delete-id="${r.id}" title="Verwijderen" style="color: var(--color-text-tertiary)">${icon('trash', 16)}</button>
                </div>
                <p class="past-preview" style="margin: var(--space-2) 0 0 calc(16px + var(--space-2)); font-size: 0.8125rem; color: var(--color-text-secondary)">${preview}</p>
                <div class="past-detail" style="display: none; margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border)">
                  ${renderPastDetail(r)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    `;

    bindFormEvents();
    bindPastEvents();
  }

  function renderPastDetail(r) {
    const fields = [
      { label: 'Hoe was mijn week?', value: r.lifeReview },
      { label: 'Balans check', value: r.balanceCheck },
      { label: 'Dankbaarheid', value: r.gratitudes },
      { label: 'Energie', value: r.energyReflection },
      { label: 'Intentie volgende week', value: r.nextWeekIntention },
    ];
    return fields
      .filter(f => f.value)
      .map(f => `
        <div style="margin-bottom: var(--space-3)">
          <div style="font-size: 0.75rem; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1)">${f.label}</div>
          <p style="font-size: 0.875rem; color: var(--color-text-primary); white-space: pre-wrap; margin: 0">${f.value}</p>
        </div>
      `).join('');
  }

  function bindFormEvents() {
    const fields = ['lifeReview', 'balanceCheck', 'gratitudes', 'energyReflection', 'nextWeekIntention'];
    const indicator = container.querySelector('#save-indicator');

    fields.forEach(field => {
      const el = container.querySelector(`#field-${field}`);
      if (!el) return;
      el.addEventListener('input', () => {
        clearTimeout(saveTimer);
        if (indicator) indicator.textContent = 'Niet opgeslagen...';
        saveTimer = setTimeout(() => saveCurrentReflection(indicator), 1000);
      });
    });
  }

  async function saveCurrentReflection(indicator) {
    const fields = ['lifeReview', 'balanceCheck', 'gratitudes', 'energyReflection', 'nextWeekIntention'];
    const data = {};
    fields.forEach(field => {
      const el = container.querySelector(`#field-${field}`);
      data[field] = el ? el.value : '';
    });

    const now = new Date().toISOString();
    const record = currentReflection
      ? { ...currentReflection, ...data, updatedAt: now }
      : {
          id: generateId(),
          week: currentWeek,
          ...data,
          mode: 'personal',
          createdAt: now,
          updatedAt: now,
        };

    await put('personalReflections', record);
    currentReflection = record;

    if (indicator) {
      indicator.innerHTML = `${icon('check-circle', 12)} Opgeslagen`;
      setTimeout(() => { if (indicator) indicator.textContent = ''; }, 2000);
    }

    emit('personalReflections:updated');
  }

  function bindPastEvents() {
    // Toggle expand/collapse
    container.querySelectorAll('.past-reflection').forEach(card => {
      const header = card.querySelector('.past-reflection-header');
      const detail = card.querySelector('.past-detail');
      const preview = card.querySelector('.past-preview');
      const chevron = card.querySelector('.past-chevron');

      if (!header || !detail) return;

      header.addEventListener('click', (e) => {
        if (e.target.closest('.delete-reflection')) return;
        const isOpen = detail.style.display !== 'none';
        detail.style.display = isOpen ? 'none' : 'block';
        if (preview) preview.style.display = isOpen ? 'block' : 'none';
        if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
      });
    });

    // Delete buttons
    container.querySelectorAll('.delete-reflection').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        if (!confirm('Weet je zeker dat je deze reflectie wilt verwijderen?')) return;
        await softDelete('personalReflections', id);
        showToast('Reflectie verwijderd', { type: 'success' });
        emit('personalReflections:updated');
        render();
      });
    });
  }

  render();
  unsubs.push(on('personalReflections:updated', () => {}));

  return {
    destroy() {
      clearTimeout(saveTimer);
      unsubs.forEach(fn => fn());
    }
  };
}
