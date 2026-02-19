import {
  getPersonalDashboardData,
  saveTodayEntry,
  toggleHabit,
} from './store.js';
import { escapeHTML } from '../../utils.js';

const HABIT_META = {
  water: { label: 'Water', icon: '💧' },
  movement: { label: 'Bewegen', icon: '🚶' },
  focus: { label: 'Focustijd', icon: '🎯' },
};

export function mountPersonalDashboard(container, { eventBus }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card personal-dash';
  container.appendChild(wrapper);

  let debounceTimers = {};

  async function render() {
    const data = await getPersonalDashboardData();
    const { today, sparks, habitsComplete, habitsTotal } = data;
    const habits = today.habits || { water: false, movement: false, focus: false };

    wrapper.innerHTML = `
      <div class="personal-dash__header">
        <span class="personal-dash__icon">🌱</span>
        <h3 class="personal-dash__title">Persoonlijk</h3>
        <span class="personal-dash__habit-count">${habitsComplete}/${habitsTotal}</span>
      </div>

      <!-- Gratitude -->
      <div class="personal-dash__section">
        <label class="personal-dash__label" for="pd-gratitude">Dankbaarheid</label>
        <textarea class="personal-dash__textarea" id="pd-gratitude"
          placeholder="Waar ben je dankbaar voor vandaag?"
          rows="2">${today.gratitude || ''}</textarea>
      </div>

      <!-- Reflection -->
      <div class="personal-dash__section">
        <label class="personal-dash__label" for="pd-reflection">Reflectie</label>
        <textarea class="personal-dash__textarea" id="pd-reflection"
          placeholder="Hoe voel je je? Wat houd je bezig?"
          rows="2">${today.reflection || ''}</textarea>
      </div>

      <!-- Journal -->
      <div class="personal-dash__section">
        <label class="personal-dash__label" for="pd-journal">Dagboek</label>
        <textarea class="personal-dash__textarea personal-dash__textarea--tall" id="pd-journal"
          placeholder="Vrij schrijven..."
          rows="3">${today.journalNote || ''}</textarea>
      </div>

      <!-- Habits -->
      <div class="personal-dash__section">
        <span class="personal-dash__label">Gewoontes</span>
        <div class="personal-dash__habits">
          ${Object.entries(HABIT_META).map(([key, meta]) => `
            <button type="button" class="personal-dash__habit ${habits[key] ? 'personal-dash__habit--done' : ''}"
              data-habit="${key}" aria-pressed="${habits[key]}">
              <span class="personal-dash__habit-icon">${meta.icon}</span>
              <span class="personal-dash__habit-label">${meta.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Creative sparks -->
      ${sparks.length > 0 ? `
        <div class="personal-dash__section personal-dash__section--last">
          <span class="personal-dash__label">Creatieve vonken</span>
          <ul class="personal-dash__sparks">
            ${sparks.map((s) => `
              <li class="personal-dash__spark">
                <span class="personal-dash__spark-icon">✦</span>
                <span class="personal-dash__spark-text">${escapeHTML(s.text)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    // ── Habit toggles ──────────────────────────────────
    wrapper.querySelectorAll('[data-habit]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.habit;
        await toggleHabit(key);
        await render();
      });
    });

    // ── Auto-save textareas on input (debounced) ───────
    const fields = [
      { id: 'pd-gratitude', key: 'gratitude' },
      { id: 'pd-reflection', key: 'reflection' },
      { id: 'pd-journal', key: 'journalNote' },
    ];

    fields.forEach(({ id, key }) => {
      const textarea = wrapper.querySelector(`#${id}`);
      if (!textarea) return;
      textarea.addEventListener('input', () => {
        clearTimeout(debounceTimers[key]);
        debounceTimers[key] = setTimeout(async () => {
          await saveTodayEntry({ [key]: textarea.value });
        }, 600);
      });
    });
  }

  render();

  const unsub = eventBus?.on('mode:changed', () => render());

  return {
    unmount() {
      unsub?.();
      Object.values(debounceTimers).forEach(clearTimeout);
      wrapper.remove();
    },
  };
}

