import {
  getHabitsByMode,
  addHabit,
  deleteHabit,
  toggleHabitLog,
  getHabitHistory,
  getStreak,
  getTodayCompletions,
} from '../../stores/habits.js';
import { escapeHTML, getToday } from '../../utils.js';

const MODE_COLORS = {
  School:   'var(--color-purple)',
  Personal: 'var(--color-emerald)',
  BPV:      'var(--color-blue)',
};

const HABIT_ICONS = ['✓', '🏃', '📚', '💧', '🧘', '🎯', '💪', '🌱'];

export function renderHabitsBlock(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;

  container.insertAdjacentHTML('beforeend', `
    <article class="habits-block os-mini-card" data-mount-id="${mountId}" style="--habit-color:var(--color-accent)">
      <div class="habits-block__header">
        <span class="habits-block__title">Gewoontes</span>
        <button type="button" class="habits-block__add-btn" aria-label="Gewoonte toevoegen" title="Gewoonte toevoegen">+</button>
      </div>
      <div class="habits-block__add-form" hidden>
        <input type="text" class="habits-block__input" placeholder="Nieuwe gewoonte..." maxlength="60" />
        <button type="button" class="habits-block__submit-btn">Voeg toe</button>
      </div>
      <ul class="habits-block__list" aria-label="Gewoontes voor vandaag"></ul>
    </article>
  `);

  const el       = container.querySelector(`[data-mount-id="${mountId}"]`);
  const addBtn   = el.querySelector('.habits-block__add-btn');
  const addForm  = el.querySelector('.habits-block__add-form');
  const inputEl  = el.querySelector('.habits-block__input');
  const submitBtn = el.querySelector('.habits-block__submit-btn');
  const listEl   = el.querySelector('.habits-block__list');

  let formVisible = false;

  function getModeColor() {
    const mode = modeManager.getMode();
    return MODE_COLORS[mode] || 'var(--color-accent)';
  }

  // ── Render ───────────────────────────────────────────────

  async function render() {
    const mode = modeManager.getMode();
    const color = getModeColor();
    el.style.setProperty('--habit-color', color);

    // Show skeleton while loading
    listEl.innerHTML = `
      ${[0,1,2].map(() => `
        <li class="habits-skeleton-item">
          <span class="habits-skeleton-circle"></span>
          <span class="habits-skeleton-line" style="width:${40 + Math.random() * 40}%"></span>
        </li>
      `).join('')}
    `;

    const [habits, completions] = await Promise.all([
      getHabitsByMode(mode),
      getTodayCompletions(mode),
    ]);

    if (habits.length === 0) {
      listEl.innerHTML = `
        <li class="habits-block__empty" role="listitem">
          <span class="habits-block__empty-icon">🌱</span>
          Nog geen gewoontes voor ${mode === 'School' ? 'School' : mode === 'Personal' ? 'Persoonlijk' : 'BPV'}.
          <span class="habits-block__empty-hint">Klik + om er een toe te voegen.</span>
        </li>
      `;
      return;
    }

    // Load history and streaks in parallel
    const [histories, streaks] = await Promise.all([
      Promise.all(habits.map((h) => getHabitHistory(h.id, 7))),
      Promise.all(habits.map((h) => getStreak(h.id))),
    ]);

    const today = getToday();
    const doneCount = [...completions.values()].filter(Boolean).length;

    listEl.innerHTML = habits.map((habit, i) => {
      const done = completions.get(habit.id) || false;
      const history = histories[i];
      const streak = streaks[i];

      const dayDots = history.map((day) => {
        const isToday = day.date === today;
        return `<span class="habits-block__day${day.completed ? ' habits-block__day--done' : ''}${isToday ? ' habits-block__day--today' : ''}" title="${day.date}"></span>`;
      }).join('');

      const streakHtml = streak > 0
        ? `<span class="habits-block__streak habits-block__streak--active" title="${streak} dagen op rij">🔥${streak}</span>`
        : `<span class="habits-block__streak" title="Geen streak">—</span>`;

      return `
        <li class="habits-block__item${done ? ' habits-block__item--done' : ''}" data-habit-id="${escapeHTML(habit.id)}">
          <button type="button"
            class="habits-block__check${done ? ' habits-block__check--done' : ''}"
            aria-label="${done ? 'Markeer niet gedaan' : 'Markeer gedaan'}: ${escapeHTML(habit.name)}"
            style="--habit-color:${color}">
            <svg class="habits-block__check-mark" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1.5 5 4 7.5 8.5 2.5"/>
            </svg>
            <span class="habits-block__check-inner"></span>
          </button>
          <div class="habits-block__info">
            <span class="habits-block__name">${escapeHTML(habit.name)}</span>
            <div class="habits-block__history" aria-label="Laatste 7 dagen">${dayDots}</div>
          </div>
          ${streakHtml}
          <button type="button" class="habits-block__delete-btn" aria-label="Verwijder gewoonte" data-habit-id="${escapeHTML(habit.id)}" title="Verwijderen">×</button>
        </li>
      `;
    }).join('');

    // Progress summary bar
    const pct = habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0;
    const summaryHtml = `
      <li class="habits-block__summary" role="listitem">
        <span>${doneCount}/${habits.length}</span>
        <div class="habits-block__summary-bar">
          <div class="habits-block__summary-fill" style="width:${pct}%;--habit-color:${color}"></div>
        </div>
        <span>${pct}%</span>
      </li>
    `;
    listEl.insertAdjacentHTML('beforeend', summaryHtml);

    attachListeners();
  }

  function attachListeners() {
    listEl.querySelectorAll('.habits-block__check').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.habits-block__item').dataset.habitId;
        await toggleHabitLog(id);
        eventBus.emit('habits:changed');
      });
    });

    listEl.querySelectorAll('.habits-block__delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.habitId;
        if (confirm('Gewoonte verwijderen?')) {
          await deleteHabit(id);
          eventBus.emit('habits:changed');
        }
      });
    });
  }

  // ── Add form ─────────────────────────────────────────────

  function toggleForm() {
    formVisible = !formVisible;
    addForm.hidden = !formVisible;
    if (formVisible) {
      inputEl.focus();
      addBtn.textContent = '×';
      addBtn.title = 'Annuleer';
    } else {
      addBtn.textContent = '+';
      addBtn.title = 'Gewoonte toevoegen';
      inputEl.value = '';
    }
  }

  async function handleSubmit() {
    const name = inputEl.value.trim();
    if (!name) { inputEl.focus(); return; }

    const mode = modeManager.getMode();
    await addHabit(name, mode);
    inputEl.value = '';
    toggleForm();
    eventBus.emit('habits:changed');
  }

  addBtn.addEventListener('click', toggleForm);
  submitBtn.addEventListener('click', handleSubmit);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') { toggleForm(); }
  });

  // ── Event subscriptions ───────────────────────────────────

  const unsubMode    = eventBus.on('mode:changed', () => render());
  const unsubHabits  = eventBus.on('habits:changed', () => render());

  render();

  return {
    unmount() {
      unsubMode?.();
      unsubHabits?.();
      el?.remove();
    },
  };
}
