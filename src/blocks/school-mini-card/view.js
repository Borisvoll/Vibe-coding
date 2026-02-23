import { escapeHTML } from '../../utils.js';
import { getCockpitStats } from '../../os/cockpitData.js';
import { getActiveProjects } from '../../stores/projects.js';
import './styles.css';

const TIPS = [
  'Kennis is de beste investering.',
  'Eén concept per dag = 365 per jaar.',
  'Begin klein, denk groot.',
  'Verbind wat je leert aan wat je bouwt.',
  'Vragen stellen is ook leren.',
];

export function renderSchoolMiniCard(container, context) {
  const mountId = `school-mini-${crypto.randomUUID()}`;
  const { eventBus } = context || {};

  container.insertAdjacentHTML('beforeend',
    `<article class="os-mini-card os-mini-card--school mini-card" data-mount-id="${mountId}"></article>`
  );

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function render() {
    const [stats, projects] = await Promise.all([
      getCockpitStats('School').catch(() => ({ done: 0, streak: 0, inbox: 0, momentum: 0 })),
      getActiveProjects('School').catch(() => []),
    ]);

    const tip = TIPS[new Date().getDate() % TIPS.length];

    el.innerHTML = `
      <div class="mini-card__row">
        <span class="mini-card__icon">📚</span>
        <span class="mini-card__title">School</span>
      </div>
      <div class="mini-card__stats">
        <div class="mini-card__stat">
          <span class="mini-card__stat-value">${projects.length}</span>
          <span class="mini-card__stat-label">Projecten</span>
        </div>
        <div class="mini-card__stat">
          <span class="mini-card__stat-value">${stats.streak}d</span>
          <span class="mini-card__stat-label">Streak</span>
        </div>
        <div class="mini-card__stat">
          <span class="mini-card__stat-value">${stats.momentum}%</span>
          <span class="mini-card__stat-label">Momentum</span>
        </div>
      </div>
      <p class="mini-card__tip">${escapeHTML(tip)}</p>
    `;
  }

  render();

  const unsubProjects = eventBus?.on('projects:changed', () => render());
  const unsubTasks = eventBus?.on('tasks:changed', () => render());

  return {
    unmount() {
      unsubProjects?.();
      unsubTasks?.();
      el?.remove();
    },
  };
}
