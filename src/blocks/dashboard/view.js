import { escapeHTML, getToday, formatDateLong, formatDateISO } from '../../utils.js';
import { getTodaySnapshot, getWeekFocus, getProjectsPulse, getBPVPulse } from '../../os/dashboardData.js';
import { getCockpitItems } from '../../os/cockpitData.js';
import { getInboxCount, addInboxItem } from '../../stores/inbox.js';
import { getMomentumPulse } from '../../stores/momentum.js';
import { getActiveProjects } from '../../stores/projects.js';
import { renderSparkline } from '../../ui/sparkline.js';
import { WEEKDAY_FULL } from '../../constants.js';
import { getRecentActivity } from './activity-feed.js';
import { getAll } from '../../db.js';

const MODE_META = {
  School: { label: 'School', emoji: '📚', color: 'var(--color-purple)', colorLight: 'var(--color-purple-light)' },
  Personal: { label: 'Persoonlijk', emoji: '🌱', color: 'var(--color-emerald)', colorLight: 'var(--color-emerald-light)' },
  BPV: { label: 'BPV', emoji: '🏢', color: 'var(--color-blue)', colorLight: 'var(--color-blue-light)' },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

function getDayName() {
  const d = new Date(getToday() + 'T00:00:00');
  const dayIdx = (d.getDay() + 6) % 7;
  return WEEKDAY_FULL[dayIdx] || '';
}

/**
 * Render the Life Dashboard — a calm, layered overview above all modes.
 *
 * Layer 1: Intent & Focus — greeting + mode badge + Top 3 outcomes
 * Layer 2: Snapshot Overview — one-line per-mode pulse summaries
 * Layer 3: Collapsible Depth — week stats, projects, inbox (closed by default)
 */
export function renderDashboard(container, context) {
  const mountId = `life-dash-${Date.now()}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'life-dash';
  wrapper.id = mountId;

  wrapper.innerHTML = `
    <div class="life-dash__layer life-dash__layer--intent">
      <div class="life-dash__greeting">
        <h2 class="life-dash__hello">${escapeHTML(getGreeting())}</h2>
        <span class="life-dash__date">${escapeHTML(getDayName())} ${escapeHTML(formatDateLong(getToday()))}</span>
      </div>
      <div class="life-dash__mode-badge" data-life-mode></div>
      <div class="life-dash__top3" data-life-top3>
        <p class="life-dash__loading">Laden\u2026</p>
      </div>
      <div class="life-dash__stat-strip" data-life-stats></div>
    </div>

    <div class="life-dash__layer life-dash__layer--snapshot">
      <div class="life-dash__pulses" data-life-pulses>
        <p class="life-dash__loading">Laden\u2026</p>
      </div>
    </div>

    <div class="life-dash__layer life-dash__layer--insights">
      <div class="life-dash__weektrend" data-life-weektrend></div>
      <div class="life-dash__project-health" data-life-project-health></div>
    </div>

    <div class="life-dash__layer life-dash__layer--capture">
      <div class="life-dash__capture-wrap">
        <svg class="life-dash__capture-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <input type="text" class="life-dash__capture-input" placeholder="Vang iets op\u2026 (Enter)" data-life-capture autocomplete="off" />
      </div>
    </div>

    <div class="life-dash__layer life-dash__layer--activity">
      <button type="button" class="life-dash__activity-toggle" data-activity-toggle aria-expanded="false">
        <span class="life-dash__toggle-label">Recente activiteit</span>
        <svg class="life-dash__toggle-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="life-dash__activity-feed" data-activity-feed hidden></div>
    </div>

    <div class="life-dash__layer life-dash__layer--depth">
      <button type="button" class="life-dash__toggle" data-life-toggle aria-expanded="false">
        <span class="life-dash__toggle-label">Meer details</span>
        <svg class="life-dash__toggle-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="life-dash__details" data-life-details hidden>
        <p class="life-dash__loading">Laden\u2026</p>
      </div>
    </div>
  `;

  container.appendChild(wrapper);

  // Layer 3 collapse toggle
  const toggleBtn = wrapper.querySelector('[data-life-toggle]');
  const detailsEl = wrapper.querySelector('[data-life-details]');

  toggleBtn?.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    detailsEl.hidden = expanded;
    if (!expanded && !detailsEl.dataset.loaded) {
      loadDetails();
    }
  });

  // Quick-capture: Enter key saves to inbox without leaving dashboard
  const captureInput = wrapper.querySelector('[data-life-capture]');
  captureInput?.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const text = captureInput.value.trim();
    if (!text) return;
    captureInput.value = '';
    const mode = context.modeManager?.getMode() || null;
    await addInboxItem(text, mode);
    context.eventBus?.emit('inbox:changed');
    captureInput.placeholder = 'Opgeslagen \u2713';
    setTimeout(() => { captureInput.placeholder = 'Vang iets op\u2026 (Enter)'; }, 1500);
  });

  // Activity feed toggle
  const activityToggle = wrapper.querySelector('[data-activity-toggle]');
  const activityFeed = wrapper.querySelector('[data-activity-feed]');
  let activityLoaded = false;

  activityToggle?.addEventListener('click', () => {
    const expanded = activityToggle.getAttribute('aria-expanded') === 'true';
    activityToggle.setAttribute('aria-expanded', String(!expanded));
    activityFeed.hidden = expanded;
    if (!expanded && !activityLoaded) {
      loadActivityFeed();
    }
  });

  async function loadActivityFeed() {
    activityLoaded = true;
    try {
      const items = await getRecentActivity(10);
      if (items.length === 0) {
        activityFeed.innerHTML = '<p class="life-dash__meta">Nog geen activiteit vandaag.</p>';
        return;
      }
      activityFeed.innerHTML = `
        <div class="life-dash__activity-list">
          ${items.map((item) => `
            <div class="life-dash__activity-item">
              <span class="life-dash__activity-icon">${item.icon}</span>
              <div class="life-dash__activity-body">
                <span class="life-dash__activity-text">${escapeHTML(item.text)}</span>
                <span class="life-dash__activity-time">${escapeHTML(item.timeAgo)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch {
      activityFeed.innerHTML = '<p class="life-dash__meta">Kon activiteit niet laden.</p>';
    }
  }

  function navigateTo(tab, focus) {
    const shell = document.querySelector('#new-os-shell');
    if (!shell) return;
    shell.querySelectorAll('[data-os-tab]').forEach((btn) => {
      if (btn.getAttribute('data-os-tab') === tab) btn.click();
    });
    if (focus) {
      setTimeout(() => {
        const el = shell.querySelector(`[data-vandaag-zone="${focus}"]`) || shell.querySelector(`#${focus}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  async function loadLayers() {
    const mode = context.modeManager?.getMode() || 'School';
    const meta = MODE_META[mode] || MODE_META.School;

    try {
      const [today, cockpit, projects, bpv, inboxCount] = await Promise.all([
        getTodaySnapshot(mode),
        getCockpitItems(mode).catch(() => []),
        getProjectsPulse(),
        getBPVPulse(),
        getInboxCount(),
      ]);

      // Layer 1: Intent & Focus
      const modeBadgeEl = wrapper.querySelector('[data-life-mode]');
      if (modeBadgeEl) {
        modeBadgeEl.innerHTML = `
          <span class="life-dash__badge" style="--badge-color:${meta.color};--badge-color-light:${meta.colorLight}">
            ${meta.emoji} ${escapeHTML(meta.label)}
          </span>`;
      }

      const top3El = wrapper.querySelector('[data-life-top3]');
      if (top3El) {
        const outcomes = (today.outcomes || []).filter((o) => o && o.trim());
        if (outcomes.length > 0) {
          top3El.innerHTML = `
            <div class="life-dash__outcomes">
              ${outcomes.map((o, i) => `
                <div class="life-dash__outcome">
                  <span class="life-dash__outcome-num" style="color:${meta.color}">${i + 1}</span>
                  <span class="life-dash__outcome-text">${escapeHTML(o)}</span>
                </div>
              `).join('')}
            </div>`;
        } else {
          top3El.innerHTML = `
            <button type="button" class="life-dash__cta" data-action="set-outcomes">
              Stel je Top 3 in voor vandaag
            </button>`;
          top3El.querySelector('[data-action="set-outcomes"]')?.addEventListener('click', () => {
            navigateTo('today', 'tasks');
          });
        }
      }

      // Stat strip — quick numbers at a glance
      const statStripEl = wrapper.querySelector('[data-life-stats]');
      if (statStripEl) {
        const tasksDone = today.tasksDone || 0;
        const tasksTotal = today.tasksTotal || 0;
        const openProjects = projects.activeCount || 0;
        const inboxBadge = inboxCount > 0 ? inboxCount : '✓';
        statStripEl.innerHTML = `
          <div class="life-dash__stat">
            <span class="life-dash__stat-num" style="color:${meta.color}">${tasksDone}/${tasksTotal}</span>
            <span class="life-dash__stat-label">Taken</span>
          </div>
          <div class="life-dash__stat">
            <span class="life-dash__stat-num">${openProjects}</span>
            <span class="life-dash__stat-label">Projecten</span>
          </div>
          <div class="life-dash__stat">
            <span class="life-dash__stat-num" style="${inboxCount > 5 ? 'color:var(--color-warning)' : ''}">${inboxBadge}</span>
            <span class="life-dash__stat-label">Inbox</span>
          </div>
        `;
      }

      // Layer 2: Snapshot Overview
      const pulsesEl = wrapper.querySelector('[data-life-pulses]');
      if (pulsesEl) {
        const openCockpit = cockpit.filter((i) => !i.done);
        const doneCockpit = cockpit.length - openCockpit.length;

        const pulseRows = [];

        const taskLabel = today.tasksTotal === 0
          ? 'Geen taken vandaag'
          : today.tasksDone === today.tasksTotal
            ? `Alle ${today.tasksTotal} taken klaar`
            : `${today.tasksDone}/${today.tasksTotal} taken klaar`;
        const cockpitLabel = cockpit.length === 0 ? '' : ` \u00b7 ${doneCockpit}/${cockpit.length} stappen`;

        pulseRows.push({
          emoji: '\uD83D\uDCCB',
          label: 'Vandaag',
          value: taskLabel + cockpitLabel,
          tab: 'today',
        });

        const projLabel = projects.activeCount === 0
          ? 'Geen actieve projecten'
          : `${projects.activeCount} actief${projects.atRiskCount > 0 ? `, ${projects.atRiskCount} zonder actie` : ''}`;

        pulseRows.push({
          emoji: '\uD83D\uDE80',
          label: 'Projecten',
          value: projLabel,
          tab: 'today',
          focus: 'projects',
        });

        const inboxLabel = inboxCount === 0
          ? 'Inbox is leeg'
          : `${inboxCount} item${inboxCount === 1 ? '' : 's'} wachten`;

        pulseRows.push({
          emoji: '\uD83D\uDCE5',
          label: 'Inbox',
          value: inboxLabel,
          tab: 'inbox',
          warn: inboxCount > 5,
        });

        if (mode === 'BPV' || bpv.totalMinutes > 0) {
          const pct = Math.min(bpv.percentComplete, 100);
          pulseRows.push({
            emoji: '\uD83C\uDFE2',
            label: 'BPV uren',
            value: `${bpv.formattedTotal} / 40u (${pct}%)`,
            tab: 'today',
            focus: 'mode',
          });
        }

        pulsesEl.innerHTML = pulseRows.map((row) => `
          <button type="button" class="life-dash__pulse" data-nav-tab="${row.tab}" ${row.focus ? `data-nav-focus="${row.focus}"` : ''}>
            <span class="life-dash__pulse-emoji">${row.emoji}</span>
            <span class="life-dash__pulse-body">
              <span class="life-dash__pulse-label">${escapeHTML(row.label)}</span>
              <span class="life-dash__pulse-value${row.warn ? ' life-dash__pulse-value--warn' : ''}">${escapeHTML(row.value)}</span>
            </span>
            <span class="life-dash__pulse-arrow" aria-hidden="true">›</span>
          </button>
        `).join('');

        pulsesEl.querySelectorAll('.life-dash__pulse').forEach((btn) => {
          btn.addEventListener('click', () => {
            navigateTo(btn.dataset.navTab, btn.dataset.navFocus || null);
          });
        });
      }
    } catch (err) {
      console.error('[life-dashboard] Failed to load data:', err);
    }
  }

  async function loadDetails() {
    const mode = context.modeManager?.getMode() || 'School';

    try {
      const [week, projects, bpv, momentum] = await Promise.all([
        getWeekFocus(),
        getProjectsPulse(),
        getBPVPulse(),
        getMomentumPulse(mode),
      ]);

      if (!detailsEl) return;
      detailsEl.dataset.loaded = '1';

      const sections = [];

      sections.push(`
        <div class="life-dash__detail-section">
          <h4 class="life-dash__detail-title">Deze week</h4>
          <div class="life-dash__detail-metrics">
            <span class="life-dash__metric">${week.completedTaskCount} taken gedaan</span>
            <span class="life-dash__metric">${week.habitsComplete}/${week.habitsTotal} gewoontes</span>
            <span class="life-dash__metric">${week.reflectionDays} reflectiedagen</span>
          </div>
        </div>
      `);

      if (projects.activeCount > 0) {
        // Top active projects with momentum sparklines
        const topList = momentum.topActive.map((p) => {
          const spark = renderSparkline(p.weeklyActivity, { isStalled: p.isStalled });
          const risk = projects.active.find((a) => a.id === p.id)?.hasNextAction === false
            ? ' <span class="life-dash__risk">!</span>' : '';
          return `
            <div class="life-dash__momentum-row">
              ${spark}
              <span class="life-dash__project-item">${escapeHTML(p.title)}${risk}</span>
            </div>`;
        }).join('');

        // Stalled projects
        const stalledList = momentum.stalled.map((p) => {
          const days = p.daysSince != null ? `${p.daysSince}d stil` : 'geen activiteit';
          return `
            <div class="life-dash__momentum-row life-dash__momentum-row--stalled">
              ${renderSparkline(p.weeklyActivity, { isStalled: true })}
              <span class="life-dash__project-item">${escapeHTML(p.title)}</span>
              <span class="life-dash__stalled-label">${escapeHTML(days)}</span>
            </div>`;
        }).join('');

        sections.push(`
          <div class="life-dash__detail-section">
            <h4 class="life-dash__detail-title">Projecten</h4>
            <div class="life-dash__momentum-list">${topList}</div>
            ${stalledList ? `
              <h4 class="life-dash__detail-title life-dash__detail-title--stalled">Stilgevallen</h4>
              <div class="life-dash__momentum-list">${stalledList}</div>
            ` : ''}
          </div>
        `);
      }

      if (mode === 'BPV' || bpv.totalMinutes > 0) {
        const pct = Math.min(bpv.percentComplete, 100);
        const barColor = pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
        sections.push(`
          <div class="life-dash__detail-section">
            <h4 class="life-dash__detail-title">BPV voortgang</h4>
            <div class="life-dash__bar">
              <div class="life-dash__bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <span class="life-dash__metric">${bpv.formattedTotal} / 40u \u00b7 ${pct}%</span>
            ${bpv.lastLogbookDate ? `<span class="life-dash__meta">Laatst: ${escapeHTML(bpv.lastLogbookDate)}</span>` : ''}
          </div>
        `);
      }

      detailsEl.innerHTML = sections.join('');
    } catch (err) {
      console.error('[life-dashboard] Failed to load details:', err);
      detailsEl.innerHTML = '<p class="life-dash__meta">Kon details niet laden.</p>';
    }
  }

  async function loadInsights() {
    const mode = context.modeManager?.getMode() || 'School';

    // Weektrend: tasks completed per week over last 8 weeks
    const weekTrendEl = wrapper.querySelector('[data-life-weektrend]');
    if (weekTrendEl) {
      try {
        const allPlans = await getAll('dailyPlans');
        const now = new Date();
        const weekLabels = [];
        const weekCounts = [];

        for (let w = 7; w >= 0; w--) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay() + 1 - (w * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          const startISO = formatDateISO(weekStart);
          const endISO = formatDateISO(weekEnd);

          let count = 0;
          for (const plan of allPlans) {
            if (plan.mode === mode && plan.date >= startISO && plan.date <= endISO) {
              count += (plan.todos || []).filter((t) => t.done).length;
            }
          }
          weekLabels.push(`W${getWeekNum(weekStart)}`);
          weekCounts.push(count);
        }

        const maxCount = Math.max(...weekCounts, 1);
        const barsHtml = weekCounts.map((count, i) => {
          const h = Math.max(Math.round((count / maxCount) * 48), count > 0 ? 3 : 0);
          const isCurrent = i === weekCounts.length - 1;
          return `<div class="life-dash__trend-col">
            <span class="life-dash__trend-bar ${isCurrent ? 'life-dash__trend-bar--current' : ''}" style="height:${h}px"></span>
            <span class="life-dash__trend-label">${weekLabels[i]}</span>
          </div>`;
        }).join('');

        const total = weekCounts.reduce((a, b) => a + b, 0);
        weekTrendEl.innerHTML = `
          <h4 class="life-dash__insight-title">Weektrend</h4>
          <p class="life-dash__insight-sub">${total} taken in 8 weken</p>
          <div class="life-dash__trend-chart">${barsHtml}</div>
        `;
      } catch { weekTrendEl.innerHTML = ''; }
    }

    // Project health
    const healthEl = wrapper.querySelector('[data-life-project-health]');
    if (healthEl) {
      try {
        const [projects, momentum] = await Promise.all([
          getActiveProjects(mode),
          getMomentumPulse(mode),
        ]);

        if (projects.length === 0) {
          healthEl.innerHTML = '';
          return;
        }

        const healthRows = projects.map((p) => {
          const isStalled = momentum.stalled.some((s) => s.id === p.id);
          const stalledInfo = momentum.stalled.find((s) => s.id === p.id);
          const topInfo = momentum.topActive.find((t) => t.id === p.id);
          const hasNextAction = !!p.nextActionId;

          let statusIcon, statusClass;
          if (isStalled) {
            statusIcon = '⚠';
            statusClass = 'life-dash__health-status--warn';
          } else if (!hasNextAction) {
            statusIcon = '○';
            statusClass = 'life-dash__health-status--idle';
          } else {
            statusIcon = '●';
            statusClass = 'life-dash__health-status--ok';
          }

          const detail = isStalled
            ? `${stalledInfo?.daysSince || '?'}d stil`
            : !hasNextAction
              ? 'Geen actie'
              : '';

          return `<div class="life-dash__health-row">
            <span class="life-dash__health-status ${statusClass}">${statusIcon}</span>
            <span class="life-dash__health-name">${escapeHTML(p.title)}</span>
            ${detail ? `<span class="life-dash__health-detail">${escapeHTML(detail)}</span>` : ''}
          </div>`;
        }).join('');

        const stalledCount = momentum.stalled.length;
        const healthLabel = stalledCount > 0
          ? `${stalledCount} project${stalledCount === 1 ? '' : 'en'} stagneert`
          : 'Alles loopt';

        healthEl.innerHTML = `
          <h4 class="life-dash__insight-title">Project health</h4>
          <p class="life-dash__insight-sub">${escapeHTML(healthLabel)}</p>
          <div class="life-dash__health-list">${healthRows}</div>
        `;
      } catch { healthEl.innerHTML = ''; }
    }
  }

  function getWeekNum(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const w1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
  }

  loadLayers();
  loadInsights();

  const unsubs = [];
  const refresh = () => {
    loadLayers();
    loadInsights();
    if (detailsEl && !detailsEl.hidden && detailsEl.dataset.loaded) {
      loadDetails();
    }
  };

  if (context.eventBus) {
    unsubs.push(context.eventBus.on('mode:changed', refresh));
    unsubs.push(context.eventBus.on('tasks:changed', refresh));
    unsubs.push(context.eventBus.on('inbox:changed', refresh));
    unsubs.push(context.eventBus.on('projects:changed', refresh));
    unsubs.push(context.eventBus.on('bpv:changed', refresh));
    unsubs.push(context.eventBus.on('daily:changed', refresh));
  }

  return {
    unmount() {
      unsubs.forEach((fn) => fn?.());
      wrapper?.remove();
    },
  };
}
