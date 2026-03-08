import { BPV_START, BPV_END, MONTHS_NL } from '../../constants.js';
import { getToday, formatDateISO, formatDateShort, escapeHTML } from '../../utils.js';
import { getAllHoursSorted } from '../../db.js';

/**
 * GitHub-style heatmap calendar for the entire BPV period.
 * Green = hours logged, red = missed weekday, grey = weekend/future.
 * Each cell is clickable to navigate to that day.
 */
export function renderBPVHeatmap(container, context) {
  const { eventBus } = context;
  const mountId = `bpv-hm-${crypto.randomUUID()}`;

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-heatmap os-mini-card" data-mount-id="${mountId}">
      <h3 class="bpv-heatmap__title">Uren kalender</h3>
      <div class="bpv-heatmap__body" data-body></div>
      <div class="bpv-heatmap__legend">
        <span class="bpv-heatmap__legend-item"><span class="bpv-heatmap__cell bpv-heatmap__cell--filled"></span> Ingevuld</span>
        <span class="bpv-heatmap__legend-item"><span class="bpv-heatmap__cell bpv-heatmap__cell--missed"></span> Gemist</span>
        <span class="bpv-heatmap__legend-item"><span class="bpv-heatmap__cell bpv-heatmap__cell--weekend"></span> Weekend/vrij</span>
        <span class="bpv-heatmap__legend-item"><span class="bpv-heatmap__cell bpv-heatmap__cell--future"></span> Toekomst</span>
      </div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const body = el.querySelector('[data-body]');

  async function render() {
    const today = getToday();
    const allHours = await getAllHoursSorted();
    const filledDates = new Set(allHours.map(h => h.date));

    // Build all days from BPV_START to BPV_END
    const startDate = new Date(BPV_START + 'T00:00:00');
    const endDate = new Date(BPV_END + 'T00:00:00');

    // Group by weeks (rows) with columns Mon-Sun
    const weeks = [];
    let currentWeekStart = new Date(startDate);
    // Align to Monday
    const startDow = (currentWeekStart.getDay() + 6) % 7; // 0=Mon
    if (startDow > 0) {
      currentWeekStart.setDate(currentWeekStart.getDate() - startDow);
    }

    while (currentWeekStart <= endDate) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + d);
        const dateStr = formatDateISO(date);
        const dow = date.getDay(); // 0=Sun, 6=Sat
        const isWeekend = dow === 0 || dow === 6;
        const inRange = dateStr >= BPV_START && dateStr <= BPV_END;
        const isFuture = dateStr > today;
        const isFilled = filledDates.has(dateStr);
        const isMissed = inRange && !isWeekend && !isFuture && !isFilled;

        let cls = 'bpv-heatmap__cell';
        if (!inRange) cls += ' bpv-heatmap__cell--outside';
        else if (isFilled) cls += ' bpv-heatmap__cell--filled';
        else if (isMissed) cls += ' bpv-heatmap__cell--missed';
        else if (isWeekend) cls += ' bpv-heatmap__cell--weekend';
        else if (isFuture) cls += ' bpv-heatmap__cell--future';

        const isToday = dateStr === today;
        if (isToday) cls += ' bpv-heatmap__cell--today';

        week.push({ dateStr, cls, inRange, isToday, label: formatDateShort(dateStr) });
      }
      weeks.push(week);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    // Month labels along the top
    const monthLabels = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      const mondayDate = weeks[w][0].dateStr;
      const month = new Date(mondayDate + 'T00:00:00').getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ col: w, label: MONTHS_NL[month] });
        lastMonth = month;
      }
    }

    const dayLabels = ['ma', '', 'wo', '', 'vr', '', ''];

    body.innerHTML = `
      <div class="bpv-heatmap__months">
        <span class="bpv-heatmap__day-spacer"></span>
        ${monthLabels.map(m => `<span class="bpv-heatmap__month" style="grid-column:${m.col + 2}">${m.label}</span>`).join('')}
      </div>
      <div class="bpv-heatmap__grid" style="grid-template-columns: auto repeat(${weeks.length}, 1fr)">
        ${dayLabels.map((lbl, row) => {
          const cells = weeks.map(week => {
            const cell = week[row];
            if (!cell.inRange && !cell.isToday) {
              return `<span class="${cell.cls}" title="${escapeHTML(cell.label)}"></span>`;
            }
            return `<span class="${cell.cls}" data-hm-date="${cell.dateStr}" title="${escapeHTML(cell.label)}" role="button" tabindex="0"></span>`;
          }).join('');
          return `<span class="bpv-heatmap__row-label">${lbl}</span>${cells}`;
        }).join('')}
      </div>
    `;

    // Click to navigate
    body.querySelectorAll('[data-hm-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const date = cell.dataset.hmDate;
        // Navigate to today tab with date focus via deep link
        window.location.hash = `#today?focus=mode&date=${date}`;
        eventBus?.emit('bpv:navigate-date', { date });
      });
    });
  }

  render();
  const unsub = eventBus?.on('bpv:changed', () => render());

  return {
    unmount() {
      unsub?.();
      el?.remove();
    },
  };
}
