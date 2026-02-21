import { escapeHTML, getToday, formatDateLong } from '../../utils.js';
import { getTodaySnapshot, getWeekFocus, getProjectsPulse, getBPVPulse } from '../../os/dashboardData.js';
import { getCockpitItems } from '../../os/cockpitData.js';
import { getInboxCount } from '../../stores/inbox.js';
import { getMomentumPulse } from '../../stores/momentum.js';
import { renderSparkline } from '../../ui/sparkline.js';
import { WEEKDAY_FULL } from '../../constants.js';

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
    </div>

    <div class="life-dash__layer life-dash__layer--snapshot">
      <div class="life-dash__pulses" data-life-pulses>
        <p class="life-dash__loading">Laden\u2026</p>
      </div>
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
            <span class="life-dash__pulse-label">${escapeHTML(row.label)}</span>
            <span class="life-dash__pulse-value${row.warn ? ' life-dash__pulse-value--warn' : ''}">${escapeHTML(row.value)}</span>
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

  loadLayers();

  const unsubs = [];
  const refresh = () => {
    loadLayers();
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
