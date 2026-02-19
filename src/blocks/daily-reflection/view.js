import { getDailyEntry, saveNotes } from '../../stores/daily.js';
import { getToday, escapeHTML } from '../../utils.js';

const NOTES_MAX = 500;

export function renderDailyReflection(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;
  const today = getToday();

  container.insertAdjacentHTML('beforeend', `
    <article class="daily-reflection os-mini-card" data-mount-id="${mountId}">
      <div class="daily-reflection__header">
        <h3 class="daily-reflection__title">Notitie</h3>
        <span class="daily-reflection__counter">0/${NOTES_MAX}</span>
      </div>
      <textarea class="form-textarea daily-reflection__input" rows="2"
        maxlength="${NOTES_MAX}"
        placeholder="Korte notitie — wat neem je mee van vandaag?"></textarea>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const textarea = el.querySelector('.daily-reflection__input');
  const counter = el.querySelector('.daily-reflection__counter');

  let debounceTimer = null;

  function updateCounter() {
    const len = textarea.value.length;
    counter.textContent = `${len}/${NOTES_MAX}`;
    counter.classList.toggle('daily-reflection__counter--near', len > NOTES_MAX * 0.85);
  }

  async function render() {
    const mode = modeManager.getMode();
    const entry = await getDailyEntry(mode, today);
    textarea.value = entry?.notes || '';
    updateCounter();
  }

  textarea.addEventListener('input', () => {
    updateCounter();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const mode = modeManager.getMode();
      await saveNotes(mode, today, textarea.value);
      eventBus.emit('daily:changed', { mode, date: today });
    }, 500);
  });

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
