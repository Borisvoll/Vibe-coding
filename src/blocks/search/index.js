import { getAll } from '../../db.js';
import { icon } from '../../icons.js';
import { navigate } from '../../router.js';
import { debounce, truncate, escapeHTML } from '../../utils.js';

const SEARCHABLE_STORES = [
  { store: 'logbook', label: 'Logboek', fields: ['title', 'content', 'description'], route: 'logbook' },
  { store: 'goals', label: 'Leerdoelen', fields: ['title', 'description'], route: 'goals' },
  { store: 'schoolProjects', label: 'Projecten', fields: ['name', 'description', 'whatBuilding', 'whatLearning'], route: 'projects' },
  { store: 'schoolConcepts', label: 'Concepten', fields: ['term', 'explanation'], route: 'concepts' },
  { store: 'schoolReflections', label: 'School Reflecties', fields: ['whatLearned', 'whereStuck', 'conceptClarity'], route: 'school-reflectie' },
  { store: 'personalGoals', label: 'Levensdoelen', fields: ['title', 'description'], route: 'personal-planning' },
  { store: 'personalReflections', label: 'Persoonlijke Reflecties', fields: ['lifeReview', 'gratitudes'], route: 'personal-reflectie' },
  { store: 'quality', label: 'Kwaliteit', fields: ['title', 'description', 'notes'], route: 'quality' },
  { store: 'reference', label: 'Naslagwerk', fields: ['title', 'content'], route: 'reference' },
];

export function createPage(container) {
  let results = [];

  async function search(query) {
    if (!query || query.length < 2) {
      results = [];
      renderResults();
      return;
    }

    const q = query.toLowerCase();
    results = [];

    for (const { store, label, fields, route } of SEARCHABLE_STORES) {
      try {
        const records = await getAll(store);
        for (const record of records) {
          for (const field of fields) {
            const value = record[field];
            if (value && typeof value === 'string' && value.toLowerCase().includes(q)) {
              const idx = value.toLowerCase().indexOf(q);
              const start = Math.max(0, idx - 40);
              const end = Math.min(value.length, idx + query.length + 40);
              const snippet = (start > 0 ? '...' : '') + value.slice(start, end) + (end < value.length ? '...' : '');

              results.push({
                store: label,
                title: record.name || record.title || record.term || 'Zonder titel',
                snippet,
                route,
                field,
                date: record.updatedAt || record.createdAt || ''
              });
              break; // One match per record is enough
            }
          }
        }
      } catch {
        // Store might not exist yet
      }
    }

    results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    renderResults();
  }

  function renderResults() {
    const resultsEl = container.querySelector('#search-results');
    if (!resultsEl) return;

    if (results.length === 0) {
      const query = container.querySelector('#search-input')?.value || '';
      resultsEl.innerHTML = query.length >= 2
        ? `<div class="empty-state"><h3>Geen resultaten</h3><p>Probeer andere zoektermen</p></div>`
        : `<div class="empty-state"><h3>Zoek door al je data</h3><p>Typ minimaal 2 tekens om te zoeken</p></div>`;
      return;
    }

    resultsEl.innerHTML = `
      <div style="font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: var(--space-4)">${results.length} resultaten</div>
      ${results.map(r => `
        <div class="card card-clickable" style="margin-bottom: var(--space-3)" data-nav="${r.route}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap: var(--space-3)">
            <div>
              <div style="font-weight: 500">${escapeHTML(r.title)}</div>
              <div style="font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: var(--space-1)">${escapeHTML(r.snippet)}</div>
            </div>
            <span class="badge" style="white-space:nowrap">${r.store}</span>
          </div>
        </div>
      `).join('')}
    `;

    resultsEl.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.nav));
    });
  }

  const debouncedSearch = debounce(search, 300);

  container.innerHTML = `
    <div class="page-header">
      <h2>Zoeken</h2>
      <p>Doorzoek al je data in alle modi</p>
    </div>

    <div class="form-group" style="margin-bottom: var(--space-6)">
      <div style="position:relative">
        <input type="text" class="form-input" id="search-input" placeholder="Zoek op trefwoord..." autofocus style="padding-left: 40px; font-size: 1rem">
        <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color: var(--color-text-tertiary)">${icon('search', 18)}</span>
      </div>
    </div>

    <div id="search-results">
      <div class="empty-state">
        <h3>Zoek door al je data</h3>
        <p>Typ minimaal 2 tekens om te zoeken</p>
      </div>
    </div>
  `;

  container.querySelector('#search-input').addEventListener('input', (e) => {
    debouncedSearch(e.target.value.trim());
  });

  return { destroy() {} };
}
