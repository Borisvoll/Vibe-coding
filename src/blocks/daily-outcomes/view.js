import { getDailyEntry, saveOutcomes } from '../../stores/daily.js';
import { getToday, escapeHTML } from '../../utils.js';
import './styles.css';

const MODE_ACCENT = {
  School:   { color: 'var(--color-purple)',  light: 'var(--color-purple-light)',  emoji: '📚', label: 'School' },
  Personal: { color: 'var(--color-emerald)', light: 'var(--color-emerald-light)', emoji: '🌱', label: 'Persoonlijk' },
  BPV:      { color: 'var(--color-blue)',    light: 'var(--color-blue-light)',    emoji: '🏢', label: 'BPV' },
};

const PLACEHOLDERS = [
  'Mijn belangrijkste uitkomst vandaag...',
  'Tweede prioriteit...',
  'Derde (optioneel)...',
];

export function renderDailyOutcomes(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;
  const today = getToday();

  container.insertAdjacentHTML('beforeend', `
    <article class="daily-outcomes os-mini-card" data-mount-id="${mountId}">
      <div class="daily-outcomes__header">
        <h3 class="daily-outcomes__title">Top 3 vandaag</h3>
        <span class="daily-outcomes__subtitle"></span>
      </div>
      <div class="daily-outcomes__list"></div>
      <div class="daily-outcomes__footer">Automatisch opgeslagen · Tab om door te gaan</div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const titleEl = el.querySelector('.daily-outcomes__title');
  const subtitleEl = el.querySelector('.daily-outcomes__subtitle');
  const listEl = el.querySelector('.daily-outcomes__list');

  let debounceTimer = null;

  async function save() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const currentMode = modeManager.getMode();
      const inputs = listEl.querySelectorAll('.daily-outcomes__input');
      const newOutcomes = Array.from(inputs).map((inp) => inp.value.trim());
      await saveOutcomes(currentMode, today, newOutcomes);
      // Update filled indicators without full re-render
      inputs.forEach((inp) => {
        inp.closest('.daily-outcomes__item')?.classList.toggle(
          'daily-outcomes__item--filled', inp.value.trim().length > 0
        );
      });
      eventBus.emit('daily:changed', { mode: currentMode, date: today });
    }, 500);
  }

  async function render() {
    const mode = modeManager.getMode();
    const meta = MODE_ACCENT[mode] || MODE_ACCENT.School;
    const entry = await getDailyEntry(mode, today);
    const outcomes = entry?.outcomes || ['', '', ''];
    const filledCount = outcomes.filter((o) => o && o.trim()).length;

    titleEl.style.color = meta.color;
    subtitleEl.textContent = filledCount === 3 ? `${meta.emoji} Alle 3 ingevuld` : `${filledCount}/3 ingevuld`;

    listEl.innerHTML = outcomes.map((val, i) => `
      <label class="daily-outcomes__item ${val.trim() ? 'daily-outcomes__item--filled' : ''}" data-idx="${i}">
        <span class="daily-outcomes__num-col">
          <span class="daily-outcomes__num" style="color:${meta.color}">${i + 1}</span>
        </span>
        <span class="daily-outcomes__input-col">
          <input type="text" class="daily-outcomes__input"
            data-idx="${i}" value="${escapeHTML(val)}"
            placeholder="${PLACEHOLDERS[i]}" />
          <span class="daily-outcomes__check" aria-hidden="true">✓</span>
        </span>
      </label>
    `).join('');

    listEl.querySelectorAll('.daily-outcomes__input').forEach((input) => {
      input.addEventListener('input', () => {
        // Update filled class immediately for snappy UI
        input.closest('.daily-outcomes__item')?.classList.toggle(
          'daily-outcomes__item--filled', input.value.trim().length > 0
        );
        save();
      });
      input.addEventListener('blur', save);
    });
  }

  const unsubMode = eventBus.on('mode:changed', () => render());
  const unsubDaily = eventBus.on('daily:changed', ({ mode } = {}) => {
    if (!mode || mode === modeManager.getMode()) render();
  });

  render();

  return {
    unmount() {
      clearTimeout(debounceTimer);
      unsubMode?.();
      unsubDaily?.();
      el?.remove();
    },
  };
}
