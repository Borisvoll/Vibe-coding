import { getWeeklyOverview, exportEntries } from '../../stores/bpv.js';
import { getCurrentWeek, getPrevWeek, getNextWeek, getWeekDates, formatDateShort, escapeHTML } from '../../utils.js';

const DAY_TYPE_ICON = {
  work: '✓',
  sick: '🤒',
  absent: '–',
  holiday: '☀',
};

const DAY_TYPE_TITLE = {
  work: 'Gewerkt',
  sick: 'Ziek gemeld',
  absent: 'Afwezig',
  holiday: 'Vrij / Feestdag',
};

export function renderBPVWeeklyOverview(container, context) {
  const mountId = `bpv-wo-${crypto.randomUUID()}`;
  const { eventBus } = context;

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-wo os-mini-card" data-mount-id="${mountId}">
      <div class="bpv-wo__header">
        <div class="bpv-wo__nav">
          <button type="button" class="btn btn-ghost btn-sm bpv-wo__nav-btn" data-nav="prev"
            aria-label="Vorige week">‹</button>
          <span class="bpv-wo__week-label" data-week-label>—</span>
          <button type="button" class="btn btn-ghost btn-sm bpv-wo__nav-btn" data-nav="next"
            aria-label="Volgende week">›</button>
        </div>
        <div class="bpv-wo__export-btns">
          <button type="button" class="btn btn-ghost btn-sm" data-export="csv" title="Download uren als CSV">CSV</button>
          <button type="button" class="btn btn-ghost btn-sm" data-export="json" title="Download uren als JSON">JSON</button>
        </div>
      </div>
      <div class="bpv-wo__body" data-body>
        <div class="bpv-wo__loading">Laden…</div>
      </div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const weekLabel = el.querySelector('[data-week-label]');
  const body = el.querySelector('[data-body]');

  let currentWeek = getCurrentWeek();

  function progressColor(pct) {
    if (pct >= 80) return 'var(--color-success)';
    if (pct >= 50) return 'var(--color-warning)';
    return 'var(--color-error)';
  }

  function getWeekDateRange(weekStr) {
    const dates = getWeekDates(weekStr);
    if (dates.length < 5) return weekStr;
    return `${formatDateShort(dates[0])} – ${formatDateShort(dates[4])}`;
  }

  async function render() {
    const dateRange = getWeekDateRange(currentWeek);
    weekLabel.textContent = dateRange;
    weekLabel.title = currentWeek;
    body.innerHTML = '<div class="bpv-wo__loading">Laden…</div>';

    const ov = await getWeeklyOverview(currentWeek);

    const daysHTML = ov.days.map((d) => {
      const icon = d.logged ? (DAY_TYPE_ICON[d.type] || '?') : '·';
      const cls = d.logged ? `bpv-wo__day--${d.type}` : 'bpv-wo__day--empty';
      const typeTitle = d.logged ? (DAY_TYPE_TITLE[d.type] || d.type) : 'Niet ingevuld';
      const lbDot = d.hasLogbook
        ? '<span class="bpv-wo__lb-dot" title="Logboek ingevuld">📝</span>'
        : '';
      const actDot = d.hasActivities
        ? '<span class="bpv-wo__act-dot" title="Activiteiten ingevuld">●</span>'
        : '';
      return `
        <div class="bpv-wo__day ${cls}" title="${escapeHTML(typeTitle)}${d.formattedTime ? ' — ' + escapeHTML(d.formattedTime) : ''}">
          <span class="bpv-wo__day-name">${d.day}</span>
          <span class="bpv-wo__day-icon">${icon}</span>
          <span class="bpv-wo__day-time">${d.formattedTime || '—'}</span>
          <div class="bpv-wo__day-indicators">${actDot}${lbDot}</div>
        </div>
      `;
    }).join('');

    const highlightsHTML = ov.highlights.length
      ? `<div class="bpv-wo__highlights">
          <p class="bpv-wo__highlights-label">Highlights</p>
          <ul class="bpv-wo__highlights-list">
            ${ov.highlights.map((h) => `<li>${escapeHTML(h.text)}</li>`).join('')}
          </ul>
        </div>`
      : '';

    // Activities summary for the week
    const weekActivities = ov.days
      .filter(d => d.hasActivities)
      .flatMap(d => d.activities.filter(a => a && a.trim()));
    const activitiesHTML = weekActivities.length > 0
      ? `<div class="bpv-wo__highlights">
          <p class="bpv-wo__highlights-label">Activiteiten deze week</p>
          <ul class="bpv-wo__highlights-list">
            ${weekActivities.slice(0, 10).map(a => `<li>${escapeHTML(a)}</li>`).join('')}
            ${weekActivities.length > 10 ? `<li class="bpv-wo__more">+${weekActivities.length - 10} meer</li>` : ''}
          </ul>
        </div>`
      : '';

    body.innerHTML = `
      <div class="bpv-wo__progress-row">
        <div class="bpv-wo__progress-bar" role="progressbar"
          aria-valuenow="${ov.percentComplete}" aria-valuemin="0" aria-valuemax="100">
          <div class="bpv-wo__progress-fill"
            style="width:${ov.percentComplete}%;background:${progressColor(ov.percentComplete)}"></div>
        </div>
        <span class="bpv-wo__progress-label">
          ${escapeHTML(ov.formattedTotal)} / ${escapeHTML(ov.formattedTarget)}
          <span class="bpv-wo__pct">(${ov.percentComplete}%)</span>
        </span>
      </div>
      <div class="bpv-wo__days">${daysHTML}</div>
      ${activitiesHTML}
      ${highlightsHTML}
    `;
  }

  // Navigation
  el.querySelector('[data-nav="prev"]').addEventListener('click', () => {
    currentWeek = getPrevWeek(currentWeek);
    render();
  });
  el.querySelector('[data-nav="next"]').addEventListener('click', () => {
    currentWeek = getNextWeek(currentWeek);
    render();
  });

  // Export
  el.querySelector('[data-export="csv"]').addEventListener('click', async () => {
    const csv = await exportEntries('csv');
    downloadFile(csv, 'bpv-uren.csv', 'text/csv;charset=utf-8;');
  });
  el.querySelector('[data-export="json"]').addEventListener('click', async () => {
    const json = await exportEntries('json');
    downloadFile(json, 'bpv-uren.json', 'application/json');
  });

  const unsubBPV = eventBus?.on('bpv:changed', () => render());

  render();

  return {
    unmount() {
      unsubBPV?.();
      el?.remove();
    },
  };
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
