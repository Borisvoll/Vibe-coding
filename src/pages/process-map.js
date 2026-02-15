import { getAll } from '../db.js';
import { icon } from '../icons.js';
import { on } from '../state.js';
import { escapeHTML, truncate, formatDateShort } from '../utils.js';

const PROCESS_STEPS = [
  { id: 'voorbereiding', label: 'Werkvoorbereiding', color: '#4f6ef7', icon: 'clipboard', tags: ['tekenen', 'programmeren'] },
  { id: 'opspanning', label: 'Opspanning', color: '#8b5cf6', icon: 'settings', tags: ['CNC', 'draaien', 'frezen'] },
  { id: 'nulpunt', label: 'Nulpunt instellen', color: '#06b6d4', icon: 'target', tags: ['CNC'] },
  { id: 'bewerking', label: 'Bewerking', color: '#10b981', icon: 'check-circle', tags: ['draaien', 'frezen', 'boren', 'zagen', 'slijpen'] },
  { id: 'meten', label: 'Meten & Controleren', color: '#f59e0b', icon: 'shield', tags: ['meten', 'kwaliteit'] },
  { id: 'vrijgave', label: 'Vrijgave', color: '#f43f5e', icon: 'check-circle', tags: ['kwaliteit'] },
];

export function createPage(container) {
  let unsubs = [];
  let selectedStep = null;

  async function render() {
    const allLogbook = await getAll('logbook');

    // Map logbook entries to steps based on tags
    const stepEntries = {};
    PROCESS_STEPS.forEach(s => { stepEntries[s.id] = []; });

    allLogbook.forEach(entry => {
      const entryTags = entry.tags || [];
      PROCESS_STEPS.forEach(step => {
        if (step.tags.some(t => entryTags.includes(t))) {
          stepEntries[step.id].push(entry);
        }
      });
    });

    container.innerHTML = `
      <div class="page-header">
        <h2>Proceskaart</h2>
        <p>CNC Productieproces — van tekening tot vrijgave</p>
      </div>

      <div class="process-map">
        ${PROCESS_STEPS.map((step, i) => `
          <div class="process-step ${selectedStep === step.id ? 'active' : ''}" data-step="${step.id}" style="--step-color: ${step.color}">
            <div class="process-step-icon" style="background: ${step.color}">${icon(step.icon, 20)}</div>
            <div class="process-step-content">
              <h4>${step.label}</h4>
              <span class="process-step-count">${stepEntries[step.id].length} entries</span>
            </div>
            ${i < PROCESS_STEPS.length - 1 ? '<div class="process-step-arrow">&rarr;</div>' : ''}
          </div>
        `).join('')}
      </div>

      ${selectedStep ? renderStepDetail(selectedStep, stepEntries[selectedStep]) : `
        <div class="card" style="margin-top:var(--space-6); text-align:center; padding:var(--space-8)">
          <p style="color:var(--color-text-secondary)">Klik op een processtap om gekoppelde logboek-entries te zien</p>
        </div>
      `}
    `;

    container.querySelectorAll('.process-step').forEach(el => {
      el.addEventListener('click', () => {
        selectedStep = selectedStep === el.dataset.step ? null : el.dataset.step;
        render();
      });
    });
  }

  function renderStepDetail(stepId, entries) {
    const step = PROCESS_STEPS.find(s => s.id === stepId);
    const sorted = entries.sort((a, b) => b.date.localeCompare(a.date));

    return `
      <div style="margin-top:var(--space-6)">
        <h3 style="margin-bottom:var(--space-4); color:${step.color}">${step.label} — ${sorted.length} logboek entries</h3>
        ${sorted.length === 0 ? `
          <p style="color:var(--color-text-tertiary)">Nog geen entries gekoppeld. Voeg logboek entries toe met tags: ${step.tags.join(', ')}</p>
        ` : `
          <div style="display:flex; flex-direction:column; gap:var(--space-3)">
            ${sorted.slice(0, 10).map(entry => `
              <div class="card" style="border-left: 3px solid ${step.color}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2)">
                  <span style="font-size:0.8125rem; color:var(--color-text-secondary)">${formatDateShort(entry.date)}</span>
                  <div style="display:flex; gap:var(--space-1)">
                    ${(entry.tags || []).map(t => `<span class="badge badge-default">${t}</span>`).join('')}
                  </div>
                </div>
                <p style="font-size:0.875rem">${escapeHTML(truncate(entry.description || entry.activity || '', 200))}</p>
              </div>
            `).join('')}
            ${sorted.length > 10 ? `<p style="color:var(--color-text-tertiary); text-align:center">+ ${sorted.length - 10} meer entries</p>` : ''}
          </div>
        `}
      </div>
    `;
  }

  render();
  unsubs.push(on('logbook:updated', render));
  return { destroy() { unsubs.forEach(fn => fn()); } };
}
