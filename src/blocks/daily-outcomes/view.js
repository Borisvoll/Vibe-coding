import { getDailyEntry, saveOutcomes } from '../../stores/daily.js';
import { getToday, escapeHTML } from '../../utils.js';

const MODE_ACCENT = {
  School:   { color: 'var(--color-purple)',  light: 'var(--color-purple-light)',  emoji: '📚' },
  Personal: { color: 'var(--color-emerald)', light: 'var(--color-emerald-light)', emoji: '🌱' },
  BPV:      { color: 'var(--color-blue)',    light: 'var(--color-blue-light)',    emoji: '🏢' },
};

export function renderDailyOutcomes(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;
  const today = getToday();

  container.insertAdjacentHTML('beforeend', `
    <article class="daily-outcomes os-mini-card" data-mount-id="${mountId}">
      <h3 class="daily-outcomes__title"></h3>
      <div class="daily-outcomes__list"></div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const titleEl = el.querySelector('.daily-outcomes__title');
  const listEl = el.querySelector('.daily-outcomes__list');

  let debounceTimer = null;

  async function render() {
    const mode = modeManager.getMode();
    const meta = MODE_ACCENT[mode] || MODE_ACCENT.School;
    const entry = await getDailyEntry(mode, today);
    const outcomes = entry?.outcomes || ['', '', ''];

    // Update header with mode accent
    titleEl.textContent = 'Top 3 vandaag';
    titleEl.style.color = meta.color;

    const placeholders = [
      'Belangrijkste uitkomst...',
      'Tweede prioriteit...',
      'Derde (optioneel)...',
    ];

    listEl.innerHTML = outcomes.map((val, i) => `
      <label class="daily-outcomes__item">
        <span class="daily-outcomes__num" style="color:${meta.color}">${i + 1}</span>
        <input type="text" class="form-input daily-outcomes__input"
          data-idx="${i}" value="${escapeHTML(val)}"
          placeholder="${placeholders[i]}" />
      </label>
    `).join('');

    // Auto-save on blur
    listEl.querySelectorAll('.daily-outcomes__input').forEach((input) => {
      input.addEventListener('blur', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const currentMode = modeManager.getMode();
          const inputs = listEl.querySelectorAll('.daily-outcomes__input');
          const newOutcomes = Array.from(inputs).map((inp) => inp.value.trim());
          await saveOutcomes(currentMode, today, newOutcomes);
          eventBus.emit('daily:changed', { mode: currentMode, date: today });
        }, 300);
      });
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
