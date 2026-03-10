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
    const all = await getAll('schoolReflections').catch(() => []);
    return all.find(r => r.week === currentWeek) || null;
  }

  async function render() {
    currentReflection = await loadCurrentReflection();
    const allReflections = await getAll('schoolReflections').catch(() => []);

    const pastReflections = allReflections
      .filter(r => r.week !== currentWeek)
      .sort((a, b) => b.week.localeCompare(a.week));

    const wn = weekNumber(currentWeek);

    container.innerHTML = `
      <div class="page-header">
        <h2>${icon('edit', 22)} Reflectie</h2>
        <p>Wekelijkse leersynthese</p>
      </div>

      <div class="card" style="border-left: 3px solid var(--color-purple); margin-bottom: var(--space-6)">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4)">
          <h3 style="margin: 0; color: var(--color-purple)">Week ${wn}</h3>
          <span id="save-indicator" style="font-size: 0.75rem; color: var(--color-text-tertiary)"></span>
        </div>

        <div class="form-group">
          <label class="form-label">Wat heb ik deze week geleerd?</label>
          <textarea class="form-textarea" id="field-whatLearned" rows="3" placeholder="Beschrijf wat je deze week hebt geleerd...">${currentReflection?.whatLearned || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Welke concepten begrijp ik nu beter?</label>
          <textarea class="form-textarea" id="field-conceptClarity" rows="3" placeholder="Welke concepten zijn duidelijker geworden...">${currentReflection?.conceptClarity || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Waar loop ik vast?</label>
          <textarea class="form-textarea" id="field-whereStuck" rows="3" placeholder="Waar heb je moeite mee...">${currentReflection?.whereStuck || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Weekdoel: heb ik het gehaald?</label>
          <textarea class="form-textarea" id="field-weekGoal" rows="3" placeholder="Evalueer je weekdoel...">${currentReflection?.weekGoal || ''}</textarea>
        </div>

        <div class="form-group" style="margin-bottom: 0">
          <label class="form-label">Focus voor volgende week</label>
          <textarea class="form-textarea" id="field-nextWeekFocus" rows="3" placeholder="Wat wil je volgende week bereiken...">${currentReflection?.nextWeekFocus || ''}</textarea>
        </div>
      </div>

      ${pastReflections.length > 0 ? `
        <div style="margin-bottom: var(--space-4)">
          <h3 style="font-size: 0.875rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-3)">Eerdere reflecties</h3>
          ${pastReflections.map(r => {
            const pw = weekNumber(r.week);
            const preview = r.whatLearned
              ? (r.whatLearned.length > 80 ? r.whatLearned.slice(0, 80) + '...' : r.whatLearned)
              : 'Geen samenvatting';
            return `
              <div class="card past-reflection" data-id="${r.id}" style="margin-bottom: var(--space-3); cursor: pointer">
                <div class="past-reflection-header" style="display: flex; align-items: center; justify-content: space-between">
                  <div style="display: flex; align-items: center; gap: var(--space-2)">
                    <span class="past-chevron" style="transition: transform 0.2s; display: inline-flex">${icon('chevron-down', 16)}</span>
                    <strong style="color: var(--color-purple)">Week ${pw}</strong>
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
      { label: 'Wat heb ik geleerd?', value: r.whatLearned },
      { label: 'Concepten die ik beter begrijp', value: r.conceptClarity },
      { label: 'Waar loop ik vast?', value: r.whereStuck },
      { label: 'Weekdoel evaluatie', value: r.weekGoal },
      { label: 'Focus volgende week', value: r.nextWeekFocus },
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
    const fields = ['whatLearned', 'conceptClarity', 'whereStuck', 'weekGoal', 'nextWeekFocus'];
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
    const fields = ['whatLearned', 'conceptClarity', 'whereStuck', 'weekGoal', 'nextWeekFocus'];
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
          mode: 'school',
          createdAt: now,
          updatedAt: now,
        };

    await put('schoolReflections', record);
    currentReflection = record;

    if (indicator) {
      indicator.innerHTML = `${icon('check-circle', 12)} Opgeslagen`;
      setTimeout(() => { if (indicator) indicator.textContent = ''; }, 2000);
    }

    emit('schoolReflections:updated');
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
        await softDelete('schoolReflections', id);
        showToast('Reflectie verwijderd', { type: 'success' });
        emit('schoolReflections:updated');
        render();
      });
    });
  }

  render();
  unsubs.push(on('schoolReflections:updated', () => {}));

  return {
    destroy() {
      clearTimeout(saveTimer);
      unsubs.forEach(fn => fn());
    }
  };
}
