import { getSetting, setSetting } from '../db.js';
import { icon } from '../icons.js';
import { debounce } from '../utils.js';

const NOTEBOOK_SECTIONS = [
  { key: 'bedrijfsorientatie', title: 'Bedrijfsorientatie', color: '#4f6ef7', placeholder: 'Beschrijf het bedrijf: wat doet Boers & Co? Producten, diensten, jouw plek in de organisatie...' },
  { key: 'leerdoelen', title: 'SMART Leerdoelen', color: '#f43f5e', placeholder: 'Schrijf je SMART leerdoelen uit: Specifiek, Meetbaar, Acceptabel, Realistisch, Tijdgebonden...' },
  { key: 'werkzaamheden', title: 'Werkzaamheden & Cases', color: '#f97316', placeholder: 'Beschrijf je belangrijkste werkzaamheden, projecten en cases. Welke processtappen heb je doorlopen?' },
  { key: 'kwaliteitsborging', title: 'Kwaliteitsborging', color: '#6366f1', placeholder: 'Meetplan, meetgereedschap, toleranties, criteria, meetmomenten...' },
  { key: 'competenties', title: 'Competenties & Bewijs', color: '#06b6d4', placeholder: 'Welke competenties heb je ontwikkeld? Koppel bewijs aan je logboekitems...' },
  { key: 'reflectie', title: 'Reflectie', color: '#8b5cf6', placeholder: 'Wat ging goed? Wat was lastig? Wat heb je geleerd? Wat neem je mee naar de toekomst?' },
  { key: 'proces', title: 'Procesnotities', color: '#10b981', placeholder: 'Notities over processen, machines, G-codes, CNC, Mazatrol, nulpunten, programma\'s...' },
  { key: 'overig', title: 'Overige notities', color: '#ec4899', placeholder: 'Alles wat niet in een andere sectie past maar wel belangrijk is voor je verslag...' },
];

const STORAGE_KEY = 'notebook_data';

export function createPage(container) {
  let saveTimer = null;
  let notebookData = {};

  const debouncedSave = debounce(async (key, value) => {
    notebookData[key] = value;
    await setSetting(STORAGE_KEY, notebookData);
    const statusEl = container.querySelector(`[data-status="${key}"]`);
    if (statusEl) {
      statusEl.textContent = 'Opgeslagen';
      statusEl.classList.add('saved');
      setTimeout(() => {
        statusEl.textContent = '';
        statusEl.classList.remove('saved');
      }, 2000);
    }
  }, 600);

  async function render() {
    const saved = await getSetting(STORAGE_KEY);
    notebookData = saved || {};

    container.innerHTML = `
      <div class="page-header">
        <h2>Notebook</h2>
        <p>Notities voor je BPV-verslag — schrijf, bewaar, gebruik later</p>
      </div>

      <div class="notebook-container">
        <div class="notebook-sections">
          ${NOTEBOOK_SECTIONS.map(section => {
            const value = notebookData[section.key] || '';
            const charCount = value.length;
            return `
              <div class="card notebook-section" style="--section-color: ${section.color}">
                <div class="notebook-section-header">
                  <h3>
                    <span class="notebook-section-dot" style="background: ${section.color}"></span>
                    ${section.title}
                  </h3>
                  <span class="notebook-save-status" data-status="${section.key}"></span>
                </div>
                <textarea
                  class="notebook-textarea"
                  data-key="${section.key}"
                  placeholder="${section.placeholder}"
                  style="--section-color: ${section.color}"
                >${value}</textarea>
                <div class="notebook-meta">
                  <span data-count="${section.key}">${charCount} tekens</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Attach event listeners
    container.querySelectorAll('.notebook-textarea').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        const key = e.target.dataset.key;
        const value = e.target.value;
        const countEl = container.querySelector(`[data-count="${key}"]`);
        if (countEl) countEl.textContent = `${value.length} tekens`;
        debouncedSave(key, value);
      });
    });
  }

  render();

  return {
    destroy() {}
  };
}
