/**
 * BPV Report Form — Internship report builder.
 *
 * Renders a multi-section form following the LiS report structure.
 * Each section auto-saves to IndexedDB via the report store.
 */
import { escapeHTML, debounce } from '../../utils.js';
import {
  REPORT_SECTIONS,
  getReportSection,
  saveReportSection,
  getReportProgress,
} from '../../stores/report.js';

/**
 * Mount the report form into a container.
 * @param {HTMLElement} container
 * @param {{ eventBus: object }} context
 * @returns {{ unmount: () => void }}
 */
export function renderBPVReport(container, context) {
  const { eventBus } = context;
  const mountId = crypto.randomUUID();
  let activeSection = 0;
  let sectionData = {};
  let listeners = [];

  container.insertAdjacentHTML('beforeend', `
    <div class="report-page" id="report-${mountId}">
      <div class="report-header">
        <h2 class="report-header__title">Stageverslag</h2>
        <p class="report-header__subtitle">Vul je verslag sectie voor sectie in. Alles wordt automatisch opgeslagen.</p>
      </div>
      <div class="report-progress">
        <div class="report-progress__bar"><div class="report-progress__fill" data-report-progress-fill></div></div>
        <div class="report-progress__label" data-report-progress-label></div>
      </div>
      <nav class="report-nav" data-report-nav></nav>
      <div data-report-section-container></div>
    </div>
  `);

  const root = container.querySelector(`#report-${mountId}`);
  const navEl = root.querySelector('[data-report-nav]');
  const sectionContainer = root.querySelector('[data-report-section-container]');
  const progressFill = root.querySelector('[data-report-progress-fill]');
  const progressLabel = root.querySelector('[data-report-progress-label]');

  // ── Load all section data ──────────────────────────────────
  async function loadAllData() {
    for (const section of REPORT_SECTIONS) {
      const record = await getReportSection(section.id);
      sectionData[section.id] = record?.data || {};
    }
  }

  // ── Progress bar ───────────────────────────────────────────
  async function updateProgress() {
    const { filled, total, percent } = await getReportProgress();
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressLabel) progressLabel.textContent = `${filled} van ${total} velden ingevuld (${percent}%)`;
  }

  // ── Section completeness check ─────────────────────────────
  function isSectionComplete(sectionDef) {
    const data = sectionData[sectionDef.id] || {};
    return sectionDef.fields.every(f => {
      const val = data[f.key];
      return val && String(val).trim().length > 0;
    });
  }

  // ── Nav pills ──────────────────────────────────────────────
  function renderNav() {
    navEl.innerHTML = REPORT_SECTIONS.map((section, i) => {
      const complete = isSectionComplete(section);
      const active = i === activeSection;
      const classes = [
        'report-nav__item',
        active ? 'report-nav__item--active' : '',
        complete ? 'report-nav__item--complete' : '',
      ].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-nav-index="${i}">${escapeHTML(section.title)}</button>`;
    }).join('');

    navEl.querySelectorAll('[data-nav-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSection = Number(btn.dataset.navIndex);
        renderSection();
        renderNav();
      });
    });
  }

  // ── Debounced save for a section ───────────────────────────
  function createAutoSave(sectionId) {
    return debounce(async () => {
      await saveReportSection(sectionId, sectionData[sectionId]);
      const statusEl = sectionContainer.querySelector('[data-report-status]');
      if (statusEl) {
        statusEl.textContent = 'Opgeslagen';
        statusEl.className = 'report-status report-status--saved';
        setTimeout(() => {
          if (statusEl) statusEl.textContent = '';
        }, 2500);
      }
      updateProgress();
      renderNav();
    }, 800);
  }

  // ── Render active section ──────────────────────────────────
  function renderSection() {
    // Clean up old listeners
    listeners.forEach(fn => fn());
    listeners = [];

    const section = REPORT_SECTIONS[activeSection];
    const data = sectionData[section.id] || {};
    const autoSave = createAutoSave(section.id);

    const fieldsHTML = section.fields.map(field => {
      const value = escapeHTML(data[field.key] || '');
      const hintHTML = field.hint ? `<span class="report-field__hint">${escapeHTML(field.hint)}</span>` : '';
      const isEnglish = field.key === 'english_description' || field.key === 'engelse_uitleg';

      if (field.type === 'textarea') {
        return `
          <div class="report-field">
            <label class="report-field__label">${escapeHTML(field.label)}</label>
            ${hintHTML}
            <textarea class="report-field__textarea" data-field-key="${field.key}" placeholder="${escapeHTML(field.hint || '')}">${value}</textarea>
            ${isEnglish ? `<div class="report-field__wordcount" data-wordcount="${field.key}"></div>` : ''}
          </div>
        `;
      }

      return `
        <div class="report-field">
          <label class="report-field__label">${escapeHTML(field.label)}</label>
          ${hintHTML}
          <input type="text" class="report-field__input" data-field-key="${field.key}" value="${value}" placeholder="${escapeHTML(field.hint || '')}">
        </div>
      `;
    }).join('');

    // Navigation buttons
    const hasPrev = activeSection > 0;
    const hasNext = activeSection < REPORT_SECTIONS.length - 1;
    const prevTitle = hasPrev ? REPORT_SECTIONS[activeSection - 1].title : '';
    const nextTitle = hasNext ? REPORT_SECTIONS[activeSection + 1].title : '';

    sectionContainer.innerHTML = `
      <div class="report-section">
        <h3 class="report-section__title">${escapeHTML(section.title)}</h3>
        <p class="report-section__desc">${escapeHTML(section.description)}</p>
        ${fieldsHTML}
        <div class="report-status" data-report-status></div>
        <div class="report-section__nav">
          ${hasPrev ? `<button type="button" class="report-section__nav-btn" data-report-prev>&larr; ${escapeHTML(prevTitle)}</button>` : '<span></span>'}
          ${hasNext ? `<button type="button" class="report-section__nav-btn report-section__nav-btn--primary" data-report-next>${escapeHTML(nextTitle)} &rarr;</button>` : '<span></span>'}
        </div>
      </div>
    `;

    // Wire up field inputs
    sectionContainer.querySelectorAll('[data-field-key]').forEach(input => {
      const key = input.dataset.fieldKey;

      const handler = () => {
        if (!sectionData[section.id]) sectionData[section.id] = {};
        sectionData[section.id][key] = input.value;
        autoSave();

        // Word count for English fields
        const isEnglish = key === 'english_description' || key === 'engelse_uitleg';
        if (isEnglish) {
          updateWordCount(key, input.value);
        }
      };

      input.addEventListener('input', handler);
      listeners.push(() => input.removeEventListener('input', handler));

      // Show initial word count for English fields
      const isEnglish = key === 'english_description' || key === 'engelse_uitleg';
      if (isEnglish) {
        updateWordCount(key, input.value);
      }
    });

    // Prev/next navigation
    const prevBtn = sectionContainer.querySelector('[data-report-prev]');
    const nextBtn = sectionContainer.querySelector('[data-report-next]');

    if (prevBtn) {
      const handler = () => { activeSection--; renderSection(); renderNav(); };
      prevBtn.addEventListener('click', handler);
      listeners.push(() => prevBtn.removeEventListener('click', handler));
    }
    if (nextBtn) {
      const handler = () => { activeSection++; renderSection(); renderNav(); };
      nextBtn.addEventListener('click', handler);
      listeners.push(() => nextBtn.removeEventListener('click', handler));
    }
  }

  // ── Word count helper ──────────────────────────────────────
  function updateWordCount(fieldKey, text) {
    const el = sectionContainer.querySelector(`[data-wordcount="${fieldKey}"]`);
    if (!el) return;
    const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
    el.textContent = `${words} woorden`;
    el.className = 'report-field__wordcount';
    if (words >= 120 && words <= 180) {
      el.classList.add('report-field__wordcount--ok');
    } else if (words > 0) {
      el.classList.add('report-field__wordcount--warning');
    }
  }

  // ── Init ───────────────────────────────────────────────────
  loadAllData().then(() => {
    renderNav();
    renderSection();
    updateProgress();
  });

  return {
    unmount() {
      listeners.forEach(fn => fn());
      listeners = [];
      root?.remove();
    },
  };
}
