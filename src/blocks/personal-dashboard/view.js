import {
  getPersonalDashboardData,
  saveTodayEntry,
  toggleHabit,
} from './store.js';
import { getSetting, setSetting } from '../../db.js';
import { escapeHTML } from '../../utils.js';

const HABIT_META = {
  water:    { label: 'Water',     icon: '💧' },
  movement: { label: 'Bewegen',   icon: '🚶' },
  focus:    { label: 'Focustijd', icon: '🎯' },
};

const GOALS_KEY = 'os_personal_weekly_goals';

async function getWeeklyGoals() {
  const raw = await getSetting(GOALS_KEY);
  return Array.isArray(raw) ? raw : [];
}

async function saveWeeklyGoals(goals) {
  return setSetting(GOALS_KEY, goals);
}

async function addWeeklyGoal(text) {
  const goals = await getWeeklyGoals();
  goals.push({ id: crypto.randomUUID(), text, done: false });
  return saveWeeklyGoals(goals);
}

async function toggleWeeklyGoal(id) {
  const goals = await getWeeklyGoals();
  const idx = goals.findIndex((g) => g.id === id);
  if (idx !== -1) goals[idx] = { ...goals[idx], done: !goals[idx].done };
  return saveWeeklyGoals(goals);
}

async function deleteWeeklyGoal(id) {
  const goals = await getWeeklyGoals();
  return saveWeeklyGoals(goals.filter((g) => g.id !== id));
}

export function mountPersonalDashboard(container, { eventBus }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card personal-dash';
  container.appendChild(wrapper);

  let debounceTimers = {};

  async function render() {
    const [data, goals] = await Promise.all([
      getPersonalDashboardData(),
      getWeeklyGoals(),
    ]);
    const { today, sparks, habitsComplete, habitsTotal, streaks = {} } = data;
    const habits = today.habits || { water: false, movement: false, focus: false };
    const doneGoals = goals.filter((g) => g.done).length;

    wrapper.innerHTML = `
      <div class="personal-dash__header">
        <span class="personal-dash__icon">🌱</span>
        <h3 class="personal-dash__title">Persoonlijk</h3>
        <span class="personal-dash__habit-count">${habitsComplete}/${habitsTotal}</span>
      </div>

      <!-- Weekly Goals -->
      <div class="personal-dash__section">
        <div class="pd-goals-header">
          <span class="personal-dash__label" style="margin:0">Doelen deze week</span>
          <span class="pd-goals-count">${doneGoals}/${goals.length}</span>
        </div>
        <div class="pd-goals-add">
          <input type="text" class="form-input" id="pd-goal-input"
            placeholder="Weekdoel toevoegen..." style="flex:1;min-width:0" />
          <button type="button" class="btn btn-secondary btn-sm" id="pd-goal-add">+</button>
        </div>
        ${goals.length === 0
          ? `<p class="pd-goals-empty">Stel je eerste weekdoel in</p>`
          : `<ul class="pd-goals-list">
            ${goals.map((g) => `
              <li class="pd-goal ${g.done ? 'pd-goal--done' : ''}">
                <button type="button" class="pd-goal__check" data-goal-toggle="${g.id}"
                  aria-pressed="${g.done}">${g.done ? '✓' : ''}</button>
                <span class="pd-goal__text">${escapeHTML(g.text)}</span>
                <button type="button" class="pd-goal__del btn btn-ghost btn-sm"
                  data-goal-del="${g.id}" aria-label="Verwijder">×</button>
              </li>
            `).join('')}
          </ul>`}
      </div>

      <!-- Habits with streaks -->
      <div class="personal-dash__section">
        <span class="personal-dash__label">Gewoontes</span>
        <div class="personal-dash__habits">
          ${Object.entries(HABIT_META).map(([key, meta]) => {
            const streak = streaks[key] || 0;
            return `
              <button type="button" class="personal-dash__habit ${habits[key] ? 'personal-dash__habit--done' : ''}"
                data-habit="${key}" aria-pressed="${habits[key]}">
                <span class="personal-dash__habit-icon">${meta.icon}</span>
                <span class="personal-dash__habit-label">${meta.label}</span>
                ${streak >= 2 ? `<span class="pd-streak">🔥${streak}</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Gratitude -->
      <div class="personal-dash__section">
        <label class="personal-dash__label" for="pd-gratitude">Dankbaarheid</label>
        <textarea class="personal-dash__textarea" id="pd-gratitude"
          placeholder="Waar ben je dankbaar voor vandaag?"
          rows="2">${escapeHTML(today.gratitude || '')}</textarea>
      </div>

      <!-- Reflection -->
      <div class="personal-dash__section">
        <label class="personal-dash__label" for="pd-reflection">Reflectie</label>
        <textarea class="personal-dash__textarea" id="pd-reflection"
          placeholder="Hoe voel je je? Wat houd je bezig?"
          rows="2">${escapeHTML(today.reflection || '')}</textarea>
      </div>

      <!-- Journal -->
      <div class="personal-dash__section">
        <label class="personal-dash__label" for="pd-journal">Dagboek</label>
        <textarea class="personal-dash__textarea personal-dash__textarea--tall" id="pd-journal"
          placeholder="Vrij schrijven..."
          rows="3">${escapeHTML(today.journalNote || '')}</textarea>
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

    // ── Goals handlers ─────────────────────────────────────────
    wrapper.querySelector('#pd-goal-add')?.addEventListener('click', async () => {
      const input = wrapper.querySelector('#pd-goal-input');
      const text = input.value.trim();
      if (!text) return;
      await addWeeklyGoal(text);
      input.value = '';
      render();
    });
    wrapper.querySelector('#pd-goal-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') wrapper.querySelector('#pd-goal-add')?.click();
    });
    wrapper.querySelectorAll('[data-goal-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await toggleWeeklyGoal(btn.dataset.goalToggle);
        render();
      });
    });
    wrapper.querySelectorAll('[data-goal-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteWeeklyGoal(btn.dataset.goalDel);
        render();
      });
    });

    // ── Habit toggles ──────────────────────────────────────────
    wrapper.querySelectorAll('[data-habit]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.habit;
        await toggleHabit(key);
        await render();
      });
    });

    // ── Auto-save textareas on input (debounced) ───────────────
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

