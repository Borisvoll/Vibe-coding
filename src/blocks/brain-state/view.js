import { getToday } from '../../utils.js';
import { getAll, put } from '../../db.js';

const STATES = {
  green: {
    label: 'Groen',
    emoji: '🟢',
    color: '#10b981',
    colorLight: '#d1fae5',
    action: 'Top! Pak je belangrijkste taak.',
  },
  orange: {
    label: 'Oranje',
    emoji: '🟠',
    color: '#f59e0b',
    colorLight: '#fef3c7',
    action: 'Even ademhalen. Kleine taak eerst.',
  },
  red: {
    label: 'Rood',
    emoji: '🔴',
    color: '#ef4444',
    colorLight: '#fee2e2',
    action: '10 min weg. Oorkappen. Simpele handeling.',
  },
};

export function renderBrainState(container) {
  const wrapper = document.createElement('article');
  wrapper.className = 'brain-state os-mini-card';

  async function getTodayWellbeing() {
    const today = getToday();
    const all = await getAll('os_personal_wellbeing').catch(() => []);
    return all.find(w => w.id === today || w.date === today) || null;
  }

  async function render() {
    const entry = await getTodayWellbeing();
    const current = entry?.brainState || null;
    const stateInfo = current ? STATES[current] : null;

    wrapper.innerHTML = `
      <div class="brain-state__header">
        <h3 class="brain-state__title">Hoe voelt je hoofd?</h3>
      </div>
      <div class="brain-state__buttons">
        ${Object.entries(STATES).map(([key, s]) => `
          <button type="button" class="brain-state__btn${current === key ? ' brain-state__btn--active' : ''}"
            data-state="${key}" style="--state-color:${s.color};--state-light:${s.colorLight}">
            <span class="brain-state__emoji">${s.emoji}</span>
            <span class="brain-state__label">${s.label}</span>
          </button>
        `).join('')}
      </div>
      ${stateInfo ? `
        <div class="brain-state__action" style="--action-color:${stateInfo.color};--action-light:${stateInfo.colorLight}">
          <span class="brain-state__action-text">${stateInfo.action}</span>
        </div>
      ` : ''}
    `;

    wrapper.querySelectorAll('.brain-state__btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const state = btn.dataset.state;
        const today = getToday();
        const existing = await getTodayWellbeing();
        const now = new Date().toISOString();

        const record = {
          ...(existing || {}),
          id: today,
          date: today,
          brainState: state,
          updated_at: now,
        };

        await put('os_personal_wellbeing', record);
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
