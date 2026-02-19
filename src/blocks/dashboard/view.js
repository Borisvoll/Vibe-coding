import { escapeHTML } from '../../utils.js';
import { getTodaySnapshot, getWeekFocus, getProjectsPulse, getBPVPulse } from '../../os/dashboardData.js';
import { addInboxItem } from '../../stores/inbox.js';

const EXPLORE_PROMPTS = [
  { text: 'Bekijk 1 ding dat je deze week leerde', action: 'reflectie' },
  { text: 'Leg een nieuw idee vast', action: 'inbox' },
  { text: 'Stel 1 volgende actie in voor een project', action: 'planning' },
  { text: 'Schrijf iets waar je dankbaar voor bent', action: 'today' },
  { text: 'Controleer je inbox — verwerk 1 item', action: 'inbox' },
  { text: 'Bekijk je weekoverzicht', action: 'today' },
  { text: 'Neem even 2 minuten pauze', action: null },
  { text: 'Wat is het belangrijkste voor morgen?', action: 'planning' },
];

const MODE_LABELS = {
  BPV: 'BPV',
  School: 'School',
  Personal: 'Persoonlijk',
};

function getRandomPrompt() {
  return EXPLORE_PROMPTS[Math.floor(Math.random() * EXPLORE_PROMPTS.length)];
}

function renderWidgetSkeleton(id, icon, title, accentVar) {
  return `
    <button type="button" class="dash-widget" data-widget="${id}"
      style="--widget-accent:var(${accentVar});--widget-accent-light:var(${accentVar}-light)">
      <div class="dash-widget__icon">${icon}</div>
      <div class="dash-widget__body">
        <h3 class="dash-widget__title">${title}</h3>
        <div class="dash-widget__content" data-widget-content="${id}">
          <span class="dash-widget__loading">Laden\u2026</span>
        </div>
      </div>
    </button>`;
}

function fillTodayWidget(container, data) {
  const el = container.querySelector('[data-widget-content="today"]');
  if (!el) return;

  const outcomeText = data.outcomes.length > 0
    ? escapeHTML(data.outcomes[0])
    : '<em>Nog geen outcomes</em>';

  el.innerHTML = `
    <p class="dash-widget__stat">${outcomeText}</p>
    <div class="dash-widget__metrics">
      <span class="dash-widget__metric">${data.tasksDone}/${data.tasksTotal} taken</span>
      <span class="dash-widget__metric dash-widget__metric--inbox">${data.inboxCount} inbox</span>
    </div>`;
}

function fillWeekWidget(container, data) {
  const el = container.querySelector('[data-widget-content="week"]');
  if (!el) return;

  el.innerHTML = `
    <div class="dash-widget__metrics">
      <span class="dash-widget__metric">${data.completedTaskCount} klaar deze week</span>
      <span class="dash-widget__metric">${data.habitsComplete}/${data.habitsTotal} gewoontes</span>
    </div>
    <p class="dash-widget__hint">${data.reflectionDays} reflectiedagen</p>`;
}

function fillProjectsWidget(container, data) {
  const el = container.querySelector('[data-widget-content="projects"]');
  if (!el) return;

  if (data.activeCount === 0) {
    el.innerHTML = '<p class="dash-widget__empty">Geen actieve projecten</p>';
    return;
  }

  const projectList = data.active.slice(0, 3).map((p) => {
    const modeLabel = p.mode ? MODE_LABELS[p.mode] || p.mode : '';
    const risk = p.hasNextAction ? '' : ' <span class="dash-widget__risk">!</span>';
    return `<span class="dash-widget__project">${escapeHTML(p.title)}${risk}${modeLabel ? ` <span class="dash-widget__mode-chip">${escapeHTML(modeLabel)}</span>` : ''}</span>`;
  }).join('');

  el.innerHTML = `
    <div class="dash-widget__metrics">
      <span class="dash-widget__metric">${data.activeCount} actief</span>
      ${data.atRiskCount > 0 ? `<span class="dash-widget__metric dash-widget__metric--warn">${data.atRiskCount} zonder actie</span>` : ''}
    </div>
    <div class="dash-widget__project-list">${projectList}</div>`;
}

function fillBPVWidget(container, data) {
  const el = container.querySelector('[data-widget-content="bpv"]');
  if (!el) return;

  const pct = Math.min(data.percentComplete, 100);
  const barColor = pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)';

  el.innerHTML = `
    <div class="dash-widget__metrics">
      <span class="dash-widget__metric">${data.formattedTotal} / 40u</span>
      <span class="dash-widget__metric">${pct}%</span>
    </div>
    <div class="dash-widget__bar">
      <div class="dash-widget__bar-fill" style="width:${pct}%;background:${barColor}"></div>
    </div>
    ${data.lastLogbookDate ? `<p class="dash-widget__hint">Laatst: ${escapeHTML(data.lastLogbookDate)}</p>` : '<p class="dash-widget__hint">Nog geen logboek deze week</p>'}`;
}

function fillExploreWidget(container) {
  const el = container.querySelector('[data-widget-content="explore"]');
  if (!el) return;

  const prompt = getRandomPrompt();
  el.innerHTML = `<p class="dash-widget__prompt">${escapeHTML(prompt.text)}</p>`;
  el.dataset.exploreAction = prompt.action || '';
}

function setupCaptureWidget(container, context) {
  const el = container.querySelector('[data-widget-content="capture"]');
  if (!el) return;

  el.innerHTML = `
    <form class="dash-capture__form">
      <input type="text" class="dash-capture__input" placeholder="Leg iets vast\u2026" maxlength="280" autocomplete="off" />
      <button type="submit" class="dash-capture__btn">+</button>
    </form>
    <p class="dash-capture__confirm" hidden>Vastgelegd!</p>`;

  const form = el.querySelector('.dash-capture__form');
  const input = el.querySelector('.dash-capture__input');
  const confirm = el.querySelector('.dash-capture__confirm');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input?.value?.trim();
    if (!text) return;

    try {
      const mode = context.modeManager?.getMode() || null;
      await addInboxItem(text, mode);
      context.eventBus?.emit('inbox:changed');
      input.value = '';
      if (confirm) {
        confirm.hidden = false;
        setTimeout(() => { confirm.hidden = true; }, 1500);
      }
    } catch { /* non-critical */ }
  });
}

export function renderDashboard(container, context) {
  const mountId = `dash-${Date.now()}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'dash-grid';
  wrapper.id = mountId;

  wrapper.innerHTML = `
    ${renderWidgetSkeleton('today', '\u{1F4CB}', 'Vandaag', '--color-amber')}
    ${renderWidgetSkeleton('week', '\u{1F3AF}', 'Deze week', '--color-purple')}
    ${renderWidgetSkeleton('projects', '\u{1F680}', 'Projecten', '--color-cyan')}
    ${renderWidgetSkeleton('bpv', '\u{1F3E2}', 'BPV', '--color-blue')}
    ${renderWidgetSkeleton('explore', '\u2728', 'Verken', '--color-rose')}
    <div class="dash-widget dash-widget--capture"
      style="--widget-accent:var(--color-emerald);--widget-accent-light:var(--color-emerald-light)">
      <div class="dash-widget__icon">\u{1F4E5}</div>
      <div class="dash-widget__body">
        <h3 class="dash-widget__title">Snel vastleggen</h3>
        <div class="dash-widget__content" data-widget-content="capture"></div>
      </div>
    </div>`;

  container.appendChild(wrapper);

  // Deep link handlers
  wrapper.querySelectorAll('[data-widget]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      // Don't navigate if clicking inside the capture form
      if (e.target.closest('.dash-capture__form')) return;
      const widget = btn.dataset.widget;
      navigateWidget(widget, context);
    });
  });

  // Fill widgets with data
  async function loadData() {
    const mode = context.modeManager?.getMode() || 'School';
    const [today, week, projects, bpv] = await Promise.all([
      getTodaySnapshot(mode),
      getWeekFocus(),
      getProjectsPulse(),
      getBPVPulse(),
    ]);

    fillTodayWidget(wrapper, today);
    fillWeekWidget(wrapper, week);
    fillProjectsWidget(wrapper, projects);
    fillBPVWidget(wrapper, bpv);
    fillExploreWidget(wrapper);
    setupCaptureWidget(wrapper, context);
  }

  loadData();

  // Event subscriptions for live updates
  const unsubs = [];
  const refresh = () => loadData();

  if (context.eventBus) {
    unsubs.push(context.eventBus.on('mode:changed', refresh));
    unsubs.push(context.eventBus.on('tasks:changed', refresh));
    unsubs.push(context.eventBus.on('inbox:changed', refresh));
    unsubs.push(context.eventBus.on('projects:changed', refresh));
    unsubs.push(context.eventBus.on('bpv:changed', refresh));
  }

  return {
    unmount() {
      unsubs.forEach((fn) => fn?.());
      const el = container.querySelector(`#${mountId}`);
      el?.remove();
    },
  };
}

function navigateWidget(widget, context) {
  // Find setActiveTab by looking for the shell nav
  const shell = document.querySelector('#new-os-shell');
  if (!shell) return;

  function setTab(tab) {
    shell.querySelectorAll('[data-os-tab]').forEach((btn) => {
      if (btn.getAttribute('data-os-tab') === tab) btn.click();
    });
  }

  switch (widget) {
    case 'today':
      setTab('today');
      break;
    case 'week':
      setTab('today');
      setTimeout(() => {
        shell.querySelector('.weekly-review')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      break;
    case 'projects':
      setTab('today');
      setTimeout(() => {
        shell.querySelector('.projects-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      break;
    case 'bpv':
      window.location.hash = '#hours';
      break;
    case 'explore': {
      const el = shell.querySelector('[data-widget-content="explore"]');
      const action = el?.dataset.exploreAction;
      if (action === 'inbox') {
        context.eventBus?.emit('inbox:open');
      } else if (action === 'today' || action === 'planning' || action === 'reflectie') {
        setTab(action);
      }
      break;
    }
    default:
      break;
  }
}
