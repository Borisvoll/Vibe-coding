import { escapeHTML, getToday } from '../../utils.js';
import { getCockpitStats } from '../../os/cockpitData.js';
import { getAll } from '../../db.js';
import './styles.css';

const TIPS = [
  'Zorg goed voor jezelf, de rest volgt.',
  'Kleine momenten van rust tellen op.',
  'Je hoeft niet perfect te zijn.',
  'Ademhalen is ook productief.',
  'Dankbaarheid maakt je sterker.',
];

const BRAIN_LABELS = {
  green: { emoji: '🟢', text: 'Lekker bezig' },
  orange: { emoji: '🟠', text: 'Even rustig aan' },
  red: { emoji: '🔴', text: 'Pas op jezelf' },
};

export function renderPersonalMiniCard(container, context) {
  const mountId = `personal-mini-${crypto.randomUUID()}`;
  const { eventBus } = context || {};

  container.insertAdjacentHTML('beforeend',
    `<article class="os-mini-card os-mini-card--personal mini-card" data-mount-id="${mountId}"></article>`
  );

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function render() {
    const today = getToday();
    const [stats, wellbeingAll] = await Promise.all([
      getCockpitStats('Personal').catch(() => ({ done: 0, streak: 0, inbox: 0 })),
      getAll('os_personal_wellbeing').catch(() => []),
    ]);

    const todayEntry = wellbeingAll.find(w => w.id === today || w.date === today);
    const brain = todayEntry?.brainState ? BRAIN_LABELS[todayEntry.brainState] : null;

    const tip = TIPS[new Date().getDate() % TIPS.length];

    el.innerHTML = `
      <div class="mini-card__row">
        <span class="mini-card__icon">🌱</span>
        <span class="mini-card__title">Persoonlijk</span>
      </div>
      <div class="mini-card__stats">
        <div class="mini-card__stat">
          <span class="mini-card__stat-value">${brain ? brain.emoji : '–'}</span>
          <span class="mini-card__stat-label">${brain ? escapeHTML(brain.text) : 'Hoofd?'}</span>
        </div>
        <div class="mini-card__stat">
          <span class="mini-card__stat-value">${stats.streak}d</span>
          <span class="mini-card__stat-label">Streak</span>
        </div>
        <div class="mini-card__stat">
          <span class="mini-card__stat-value">${stats.done}</span>
          <span class="mini-card__stat-label">Gedaan</span>
        </div>
      </div>
      <p class="mini-card__tip">${escapeHTML(tip)}</p>
    `;
  }

  render();

  const unsubDaily = eventBus?.on('daily:changed', () => render());

  return {
    unmount() {
      unsubDaily?.();
      el?.remove();
    },
  };
}
