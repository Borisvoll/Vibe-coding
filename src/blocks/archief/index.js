import { getAll } from '../../db.js';
import { icon } from '../../icons.js';
import { on } from '../../core/eventBus.js';
import { getCurrentMode } from '../../core/modeManager.js';

const STORE_LABELS = {
  hours: 'Uren',
  logbook: 'Logboek',
  goals: 'Leerdoelen',
  competencies: 'Competenties',
  quality: 'Kwaliteit',
  dailyPlans: 'Dagplannen',
  weekReviews: 'Weekreviews',
  learningMoments: 'Leeranalyse',
  bpvLeerdoelen: 'BPV Leerdoelen',
  bpvProducten: 'BPV Producten',
  bpvReflecties: 'BPV Reflecties',
  schoolProjects: 'Projecten',
  schoolConcepts: 'Concepten',
  schoolSkills: 'Skills',
  schoolReflections: 'School Reflecties',
  schoolMilestones: 'Mijlpalen',
  personalTasks: 'Persoonlijke taken',
  personalGoals: 'Levensdoelen',
  personalReflections: 'Persoonlijke reflecties',
  energy: 'Energie & Stemming',
};

const MODE_STORES = {
  bpv: ['hours', 'logbook', 'goals', 'competencies', 'quality', 'dailyPlans', 'weekReviews', 'learningMoments', 'bpvLeerdoelen', 'bpvProducten', 'bpvReflecties'],
  school: ['schoolProjects', 'schoolConcepts', 'schoolSkills', 'schoolReflections', 'schoolMilestones'],
  personal: ['personalTasks', 'personalGoals', 'personalReflections', 'energy'],
};

export function createPage(container) {
  const unsubs = [];

  async function render() {
    const mode = getCurrentMode();
    const stores = MODE_STORES[mode] || [];
    const counts = {};

    for (const store of stores) {
      try {
        const records = await getAll(store);
        counts[store] = records.length;
      } catch {
        counts[store] = 0;
      }
    }

    const totalRecords = Object.values(counts).reduce((s, c) => s + c, 0);

    container.innerHTML = `
      <div class="page-header">
        <h2>Archief</h2>
        <p>Overzicht van al je opgeslagen data</p>
      </div>

      <div class="card" style="margin-bottom: var(--space-6)">
        <div style="display:flex; align-items:center; gap: var(--space-3)">
          <div style="font-size: 2rem; font-weight: 700; color: var(--color-accent)">${totalRecords}</div>
          <div>
            <div style="font-weight: 500">Totaal records</div>
            <div style="font-size: 0.8125rem; color: var(--color-text-secondary)">${stores.length} datastores in ${mode} modus</div>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        ${stores.map(store => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <h4>${STORE_LABELS[store] || store}</h4>
              <span class="badge">${counts[store] || 0}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  render();
  unsubs.push(on('mode:changed', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
