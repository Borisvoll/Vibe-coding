import { getDailyEntriesPage } from '../../stores/daily.js';
import { escapeHTML } from '../../utils.js';

const PAGE_SIZE = 10;
const MODE_BADGE = {
  School:   { emoji: '📚', label: 'School' },
  Personal: { emoji: '🌱', label: 'Persoonlijk' },
  BPV:      { emoji: '🏢', label: 'BPV' },
};

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function renderEntry(entry) {
  const badge = MODE_BADGE[entry.mode] || { emoji: '', label: entry.mode || '' };
  const outcomes = (entry.outcomes || []).filter(Boolean);
  const todos = entry.todos || [];
  const doneCount = todos.filter((t) => t.done).length;

  return `
    <details class="history-entry">
      <summary class="history-entry__summary">
        <span class="history-entry__date">${formatDate(entry.date)}</span>
        <span class="history-entry__badge">${badge.emoji} ${escapeHTML(badge.label)}</span>
        ${outcomes.length > 0 ? `<span class="history-entry__preview">${escapeHTML(outcomes[0])}</span>` : ''}
        ${todos.length > 0 ? `<span class="history-entry__todos">${doneCount}/${todos.length}</span>` : ''}
      </summary>
      <div class="history-entry__detail">
        ${outcomes.length > 0 ? `
          <div class="history-entry__section">
            <strong>Top 3</strong>
            <ol class="history-entry__outcomes">${outcomes.map((o) => `<li>${escapeHTML(o)}</li>`).join('')}</ol>
          </div>
        ` : ''}
        ${todos.length > 0 ? `
          <div class="history-entry__section">
            <strong>Taken (${doneCount}/${todos.length})</strong>
            <ul class="history-entry__todo-list">${todos.map((t) => `
              <li class="${t.done ? 'history-entry__todo--done' : ''}">${t.done ? '✓' : '○'} ${escapeHTML(t.text)}</li>
            `).join('')}</ul>
          </div>
        ` : ''}
        ${entry.notes ? `
          <div class="history-entry__section">
            <strong>Notities</strong>
            <p>${escapeHTML(entry.notes)}</p>
          </div>
        ` : ''}
      </div>
    </details>
  `;
}

export function renderHistoryBrowser(container, context) {
  const mountId = crypto.randomUUID();

  container.insertAdjacentHTML('beforeend', `
    <article class="history-browser os-mini-card" data-mount-id="${mountId}">
      <div class="history-browser__filters">
        <button type="button" class="history-browser__filter history-browser__filter--active" data-days="7">7 dagen</button>
        <button type="button" class="history-browser__filter" data-days="30">30 dagen</button>
        <button type="button" class="history-browser__filter" data-days="0">Alles</button>
      </div>
      <div class="history-browser__list"></div>
      <button type="button" class="history-browser__load-more" hidden>Laad meer</button>
      <p class="history-browser__empty" hidden>Geen dagplannen gevonden.</p>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const listEl = el.querySelector('.history-browser__list');
  const loadMoreBtn = el.querySelector('.history-browser__load-more');
  const emptyEl = el.querySelector('.history-browser__empty');
  const filterBtns = el.querySelectorAll('.history-browser__filter');

  let offset = 0;
  let activeDays = 7;
  let allLoaded = false;

  function getDateCutoff(days) {
    if (!days) return null;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  async function loadPage(append = false) {
    const entries = await getDailyEntriesPage(offset, PAGE_SIZE);
    const cutoff = getDateCutoff(activeDays);
    const filtered = cutoff ? entries.filter((e) => e.date >= cutoff) : entries;

    if (!append) listEl.innerHTML = '';

    if (filtered.length === 0 && offset === 0) {
      emptyEl.hidden = false;
      loadMoreBtn.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    listEl.insertAdjacentHTML('beforeend', filtered.map(renderEntry).join(''));
    offset += entries.length;

    // If we got fewer entries than page size, or all filtered out by cutoff, we're done
    if (entries.length < PAGE_SIZE) {
      allLoaded = true;
      loadMoreBtn.hidden = true;
    } else if (cutoff && filtered.length === 0) {
      // All entries in this page were outside the cutoff — stop
      allLoaded = true;
      loadMoreBtn.hidden = true;
    } else {
      loadMoreBtn.hidden = false;
    }
  }

  loadMoreBtn.addEventListener('click', () => loadPage(true));

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('history-browser__filter--active'));
      btn.classList.add('history-browser__filter--active');
      activeDays = parseInt(btn.dataset.days, 10);
      offset = 0;
      allLoaded = false;
      loadPage(false);
    });
  });

  loadPage(false);

  return {
    unmount() {
      el?.remove();
    },
  };
}
