import { getWeeklyOverview, exportEntries } from '../../stores/bpv.js';
import { getCurrentWeek, getPrevWeek, getNextWeek, escapeHTML } from '../../utils.js';

const DAY_TYPE_ICON = {
  work: '✓',
  sick: '🤒',
  absent: '–',
  holiday: '☀',
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
          <button type="button" class="btn btn-ghost btn-sm" data-export="csv">CSV</button>
          <button type="button" class="btn btn-ghost btn-sm" data-export="json">JSON</button>
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

  async function render() {
    weekLabel.textContent = currentWeek;
    body.innerHTML = '<div class="bpv-wo__loading">Laden…</div>';

    const ov = await getWeeklyOverview(currentWeek);

    const daysHTML = ov.days.map((d) => {
      const icon = d.logged ? (DAY_TYPE_ICON[d.type] || '?') : '·';
      const cls = d.logged ? `bpv-wo__day--${d.type}` : 'bpv-wo__day--empty';
      const lbDot = d.hasLogbook
        ? '<span class="bpv-wo__lb-dot" title="Logboek ingevuld">📝</span>'
        : '';
      return `
        <div class="bpv-wo__day ${cls}">
          <span class="bpv-wo__day-name">${d.day}</span>
          <span class="bpv-wo__day-icon">${icon}</span>
          <span class="bpv-wo__day-time">${d.formattedTime || '—'}</span>
          ${lbDot}
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
