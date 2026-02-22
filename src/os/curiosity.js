import './curiosity.css';
import { escapeHTML } from '../utils.js';

/**
 * Mount the Curiosity Studio page.
 *
 * Renders a skeleton layout immediately (zero query cost on mount),
 * then lazily loads data after first paint. The route never blocks.
 *
 * @param {HTMLElement} container
 * @returns {{ unmount(): void }}
 */
export function mountCuriosityPage(container) {
  container.innerHTML = `
    <div class="curiosity-page">
      <header class="curiosity-header">
        <h2 class="curiosity-header__title">Curiosity</h2>
        <p class="curiosity-header__sub">Fragmenten uit je denken. Niets om te doen.</p>
      </header>

      <!-- Word Cloud -->
      <div class="curiosity-cloud" id="cq-cloud">
        <span class="curiosity-widget__label">Woordwolk</span>
        ${skeletons(['wide', 'med', 'wide'])}
      </div>

      <div class="curiosity-grid">

        <!-- Vonk: one old capture resurfaces -->
        <div class="curiosity-widget curiosity-widget--primary" id="cq-vonk">
          <span class="curiosity-widget__label">Vonk</span>
          ${skeletons(['wide', 'wide', 'med'])}
        </div>

        <!-- Three small hint widgets -->
        <div class="curiosity-hints">

          <!-- Draad: the hidden conceptual thread -->
          <div class="curiosity-widget curiosity-widget--hint" id="cq-draad">
            <span class="curiosity-widget__label">Draad</span>
            ${skeletons(['wide', 'med'])}
          </div>

          <!-- Vergeten: oldest unprocessed capture -->
          <div class="curiosity-widget curiosity-widget--hint" id="cq-vergeten">
            <span class="curiosity-widget__label">Vergeten</span>
            ${skeletons(['wide', 'med'])}
          </div>

          <!-- Echo: same weekday, weeks ago -->
          <div class="curiosity-widget curiosity-widget--hint" id="cq-echo">
            <span class="curiosity-widget__label">Echo</span>
            ${skeletons(['wide', 'med'])}
          </div>

        </div>
      </div>
    </div>
  `;

  // Load data after first paint — route stays fast
  setTimeout(() => loadData(container), 0);

  return {
    unmount() {
      container.innerHTML = '';
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function skeletons(widths) {
  return widths.map(w => `<div class="curiosity-skeleton curiosity-skeleton--${w}"></div>`).join('');
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData(container) {
  // Dynamic import keeps the data layer out of the initial bundle parse
  const { getVonk, getDraad, getVergeten, getEcho, getWordCloud } = await import('../stores/curiosity-data.js');

  const [vonk, draad, vergeten, echo, cloud] = await Promise.all([
    getVonk(),
    getDraad(),
    getVergeten(),
    getEcho(),
    getWordCloud(),
  ]);

  renderCloud(container.querySelector('#cq-cloud'), cloud);
  renderVonk(container.querySelector('#cq-vonk'), vonk);
  renderDraad(container.querySelector('#cq-draad'), draad);
  renderVergeten(container.querySelector('#cq-vergeten'), vergeten);
  renderEcho(container.querySelector('#cq-echo'), echo);
}

// ── Widget renderers ──────────────────────────────────────────────────────────

function renderCloud(el, data) {
  if (!el) return;
  const label = el.querySelector('.curiosity-widget__label').outerHTML;

  if (!data || data.length === 0) {
    el.innerHTML = `${label}<p class="curiosity-widget__empty">Voeg meer gedachten toe — je woordwolk groeit vanzelf.</p>`;
    return;
  }

  // Shuffle deterministically using today's seed
  const shuffled = [...data].sort((a, b) => {
    const ha = hashCode(a.word);
    const hb = hashCode(b.word);
    return ha - hb;
  });

  const wordsHtml = shuffled.map((item) => {
    return `<span class="curiosity-cloud__word curiosity-cloud__word--s${item.size}" title="${item.count}× in je captures">${escapeHTML(item.word)}</span>`;
  }).join('');

  el.innerHTML = `${label}<div class="curiosity-cloud__words">${wordsHtml}</div>`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function renderVonk(el, data) {
  if (!el) return;
  const label = el.querySelector('.curiosity-widget__label').outerHTML;

  if (!data) {
    el.innerHTML = `${label}<p class="curiosity-widget__empty">Voeg gedachten toe aan je inbox — ze worden hier teruggebracht.</p>`;
    return;
  }

  const text = truncate(data.text, 240);
  el.innerHTML = `
    ${label}
    <blockquote class="curiosity-widget__quote">${escapeHTML(text)}</blockquote>
    <span class="curiosity-widget__date">${escapeHTML(data.dateLabel)}</span>
  `;
}

function renderDraad(el, data) {
  if (!el) return;
  const label = el.querySelector('.curiosity-widget__label').outerHTML;

  if (!data) {
    el.innerHTML = `${label}<p class="curiosity-widget__empty">Nog geen terugkerende concepten.</p>`;
    return;
  }

  const examples = data.examples
    .map(e => `<p class="curiosity-widget__hint-text">"${escapeHTML(truncate(e, 72))}"</p>`)
    .join('');

  el.innerHTML = `
    ${label}
    <p class="curiosity-widget__word">${escapeHTML(data.word)}</p>
    ${examples}
    <span class="curiosity-widget__hint-meta">${data.count}× in je captures</span>
  `;
}

function renderVergeten(el, data) {
  if (!el) return;
  const label = el.querySelector('.curiosity-widget__label').outerHTML;

  if (!data) {
    el.innerHTML = `${label}<p class="curiosity-widget__empty">Inbox is leeg.</p>`;
    return;
  }

  el.innerHTML = `
    ${label}
    <p class="curiosity-widget__hint-text">${escapeHTML(truncate(data.text, 110))}</p>
    <span class="curiosity-widget__hint-meta">${escapeHTML(data.dateLabel)}</span>
  `;
}

function renderEcho(el, data) {
  if (!el) return;
  const label = el.querySelector('.curiosity-widget__label').outerHTML;

  if (!data) {
    el.innerHTML = `${label}<p class="curiosity-widget__empty">Geen echo gevonden.</p>`;
    return;
  }

  el.innerHTML = `
    ${label}
    <span class="curiosity-widget__hint-meta">${escapeHTML(data.dateLabel)}</span>
    <p class="curiosity-widget__hint-text">${escapeHTML(truncate(data.text, 110))}</p>
  `;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max).trimEnd() + '\u2026' : str;
}
