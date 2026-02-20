import { escapeHTML, getToday } from '../../utils.js';

/**
 * Mode-specific checklists. Resets daily (no persistence — pure activation).
 * State saved only in localStorage for same-day session continuity.
 */

const CHECKLISTS = {
  BPV: [
    { id: 'pbm',     label: 'PBM gecontroleerd' },
    { id: 'logboek', label: 'Logboek bijgewerkt' },
    { id: 'uren',    label: 'Uren ingevoerd' },
    { id: 'learn',   label: '1 ding geleerd' },
  ],
  School: [
    { id: 'agenda',    label: 'Agenda gecheckt' },
    { id: 'huiswerk',  label: 'Huiswerk ingepland' },
    { id: 'deadlines', label: 'Deadlines bekeken' },
    { id: 'project',   label: 'Projectwerk gedaan' },
  ],
  Personal: [
    { id: 'water',    label: 'Water gedronken' },
    { id: 'bewegen',  label: 'Bewogen' },
    { id: 'opruimen', label: 'Iets opgeruimd' },
    { id: 'eten',     label: 'Gezond gegeten' },
  ],
};

const STORAGE_PREFIX = 'checklist_';

function getStorageKey(mode) {
  return `${STORAGE_PREFIX}${mode}_${getToday()}`;
}

function loadChecked(mode) {
  try {
    const raw = localStorage.getItem(getStorageKey(mode));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecked(mode, checked) {
  try {
    localStorage.setItem(getStorageKey(mode), JSON.stringify(checked));
  } catch { /* ignore */ }
}

export function renderContextChecklist(container, context) {
  const { modeManager } = context;

  const wrapper = document.createElement('article');
  wrapper.className = 'ctx-checklist os-mini-card';

  function render() {
    const mode = modeManager?.getMode() || 'School';
    const items = CHECKLISTS[mode] || CHECKLISTS.School;
    const checked = loadChecked(mode);
    const doneCount = items.filter(i => checked[i.id]).length;

    wrapper.innerHTML = `
      <div class="ctx-checklist__header">
        <h3 class="ctx-checklist__title">Dagchecklist</h3>
        <span class="ctx-checklist__progress">${doneCount}/${items.length}</span>
      </div>
      <div class="ctx-checklist__items">
        ${items.map(item => {
          const isDone = !!checked[item.id];
          return `
            <label class="ctx-checklist__item${isDone ? ' ctx-checklist__item--done' : ''}">
              <input type="checkbox" class="ctx-checklist__checkbox" data-item="${escapeHTML(item.id)}" ${isDone ? 'checked' : ''} />
              <span class="ctx-checklist__label">${escapeHTML(item.label)}</span>
            </label>`;
        }).join('')}
      </div>
      ${doneCount === items.length ? '<p class="ctx-checklist__complete">Alles afgevinkt!</p>' : ''}
    `;

    wrapper.querySelectorAll('.ctx-checklist__checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const current = loadChecked(mode);
        current[cb.dataset.item] = cb.checked;
        saveChecked(mode, current);
        render();
      });
    });
  }

  render();
  container.appendChild(wrapper);

  return {
    unmount() {
      wrapper.remove();
    },
  };
}
