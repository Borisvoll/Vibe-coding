import { getDailyEntry, saveDailyEntry } from '../../stores/daily.js';
import { getToday, escapeHTML } from '../../utils.js';

export function renderDailyReflection(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus } = context;
  const today = getToday();

  container.insertAdjacentHTML('beforeend', `
    <article class="daily-reflection os-mini-card" data-mount-id="${mountId}">
      <h3 class="daily-reflection__title">Reflectie</h3>
      <textarea class="form-textarea daily-reflection__input" rows="2"
        placeholder="Hoe ging het vandaag? Wat neem je mee?"></textarea>
      <button type="button" class="btn btn-ghost btn-sm daily-reflection__save">Opslaan</button>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const textarea = el.querySelector('.daily-reflection__input');
  const saveBtn = el.querySelector('.daily-reflection__save');

  async function render() {
    const entry = await getDailyEntry(today);
    textarea.value = entry?.evaluation || '';
  }

  saveBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    const entry = await getDailyEntry(today);
    const tasks = entry?.tasks || [];
    if (tasks.length === 0 && !text) return;
    await saveDailyEntry({
      date: today,
      tasks: tasks.length > 0 ? tasks : [{ text: 'Geen taken', done: false }],
      evaluation: text || null,
    });
    eventBus.emit('daily:changed');
  });

  const unsubDaily = eventBus.on('daily:changed', () => render());

  render();

  return {
    unmount() {
      unsubDaily?.();
      el?.remove();
    },
  };
}
