/**
 * BPV Report Form — Internship report builder.
 *
 * Renders a multi-section form matching the LiS BPV OP3 assignments.
 * Each section auto-saves to IndexedDB via the report store.
 */
import { escapeHTML, debounce } from '../../utils.js';
import {
  REPORT_SECTIONS,
  getReportSection,
  saveReportSection,
  getReportProgress,
} from '../../stores/report.js';

// Assignment group labels for visual grouping in the nav
const SECTION_GROUPS = [
  { label: 'Gegevens', from: 0, to: 0 },
  { label: 'OP1 — Leerdoelen & Bedrijf', from: 1, to: 5 },
  { label: 'OP2 — Product & Verbeteren', from: 6, to: 10 },
  { label: 'OP4 — Presentatie', from: 11, to: 11 },
  { label: 'Reflectie', from: 12, to: 12 },
];

/**
 * Mount the report form into a container.
 * @param {HTMLElement} container
 * @param {{ eventBus: object }} context
 * @returns {{ unmount: () => void }}
 */
export function renderBPVReport(container, context) {
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
      <nav class="report-nav-groups" data-report-nav></nav>
      <div data-report-section-container></div>
    </div>
  `);

  const root = container.querySelector(`#report-${mountId}`);
  const navEl = root.querySelector('[data-report-nav]');
  const sectionContainer = root.querySelector('[data-report-section-container]');
  const progressFill = root.querySelector('[data-report-progress-fill]');
  const progressLabel = root.querySelector('[data-report-progress-label]');

  // ── Load all section data + apply prefills ─────────────────
  async function loadAllData() {
    for (const section of REPORT_SECTIONS) {
      const record = await getReportSection(section.id);
      const saved = record?.data || {};

      // Apply prefills for fields that have no saved value yet
      for (const field of section.fields) {
        if (field.prefill && !saved[field.key]) {
          saved[field.key] = field.prefill;
        }
      }

      sectionData[section.id] = saved;
    }

    // Auto-save prefilled sections so they persist
    for (const section of REPORT_SECTIONS) {
      const hasPrefills = section.fields.some(f => f.prefill);
      if (hasPrefills) {
        const existing = await getReportSection(section.id);
        if (!existing) {
          await saveReportSection(section.id, sectionData[section.id]);
        }
      }
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
    // Only count required fields (those without "optioneel" in label)
    const required = sectionDef.fields.filter(f => !f.label.toLowerCase().includes('optioneel'));
    if (required.length === 0) return sectionDef.fields.some(f => {
      const val = data[f.key];
      return val && String(val).trim().length > 0;
    });
    return required.every(f => {
      const val = data[f.key];
      return val && String(val).trim().length > 0;
    });
  }

  // ── Nav with grouped sections ──────────────────────────────
  function renderNav() {
    navEl.innerHTML = SECTION_GROUPS.map(group => {
      const pills = [];
      for (let i = group.from; i <= group.to && i < REPORT_SECTIONS.length; i++) {
        const section = REPORT_SECTIONS[i];
        const complete = isSectionComplete(section);
        const active = i === activeSection;
        const classes = [
          'report-nav__item',
          active ? 'report-nav__item--active' : '',
          complete ? 'report-nav__item--complete' : '',
        ].filter(Boolean).join(' ');
        // Show short label
        const shortTitle = section.title.replace(/^OP\d — /, '');
        pills.push(`<button type="button" class="${classes}" data-nav-index="${i}">${escapeHTML(shortTitle)}</button>`);
      }
      return `
        <div class="report-nav-group">
          <div class="report-nav-group__label">${escapeHTML(group.label)}</div>
          <div class="report-nav">${pills.join('')}</div>
        </div>
      `;
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
    listeners.forEach(fn => fn());
    listeners = [];

    const section = REPORT_SECTIONS[activeSection];
    const data = sectionData[section.id] || {};
    const autoSave = createAutoSave(section.id);

    const fieldsHTML = section.fields.map(field => {
      const value = escapeHTML(data[field.key] || '');
      const hintHTML = field.hint ? `<span class="report-field__hint">${escapeHTML(field.hint)}</span>` : '';
      const isEnglish = field.key === 'english_description';

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

        if (key === 'english_description') {
          updateWordCount(key, input.value);
        }
      };

      input.addEventListener('input', handler);
      listeners.push(() => input.removeEventListener('input', handler));

      if (key === 'english_description') {
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
