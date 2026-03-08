/**
 * BPV Report Export — generates a printable HTML document
 * styled with the Boers en Co. corporate identity.
 *
 * Brand specs (from WSC-O house style):
 *   Lettertype koppen:  Fritz Quadrata Medium
 *   Lettertype body:    Helvetica Neue Lt Std Condensed
 *   Rood (R):           CMYK 13 97 83 3  → RGB #DA1A32
 *   Zwart (Z):          CMYK 30 30 30 100 → RGB #000000
 *   Blauw (B):          CMYK 79 26 0 0   → RGB #0099CC
 */
import { escapeHTML, formatMinutes } from '../../utils.js';
import {
  REPORT_SECTIONS,
  STUDENT_DEFAULTS,
  getReportSection,
} from '../../stores/report.js';
import { exportEntries } from '../../stores/bpv.js';
import { DAY_TYPE_LABELS } from '../../constants.js';

// ── Boers en Co. brand colors (CMYK → RGB approximations) ──
const BRAND = {
  red:   '#DA1A32', // CMYK 13 97 83 3
  black: '#000000', // CMYK 30 30 30 100
  blue:  '#0099CC', // CMYK 79 26 0 0
  fontHeading: "'Helvetica Neue', 'HelveticaNeue-CondensedBold', 'Arial Narrow', Arial, sans-serif",
  fontBody:    "'Helvetica Neue', 'HelveticaNeue-Light', 'Helvetica', Arial, sans-serif",
};

// Section group metadata for the export layout
const EXPORT_GROUPS = [
  { label: null, sections: ['titelpagina'], tocLabel: null },
  { label: 'Opdracht 1 — Persoonlijke leerdoelen & bedrijfsoriëntatie', sections: ['bedrijfsbeschrijving', 'bedrijfsprocessen', 'competenties', 'leerdoelen', 'motivatie'], tocLabel: '1. Persoonlijke leerdoelen & bedrijfsoriëntatie' },
  { label: 'Opdracht 2 — Productgericht werken en verbeteren', sections: ['product_machines', 'product_proces', 'product_assemblage', 'product_verbetering', 'product_engels'], tocLabel: '2. Productgericht werken en verbeteren' },
  { label: 'Opdracht 4 — Terugkomdag presentatie', sections: ['presentatie'], tocLabel: '3. Terugkomdag presentatie' },
  { label: 'Reflectie', sections: ['reflectie'], tocLabel: '4. Reflectie' },
  { label: null, sections: ['_hours_table'], tocLabel: '5. Urenverantwoording' },
];

/**
 * Generate a full printable HTML report from saved data.
 * Opens in a new tab ready for print / save as PDF.
 */
export async function exportReport() {
  const dataMap = {};
  for (const section of REPORT_SECTIONS) {
    const record = await getReportSection(section.id);
    dataMap[section.id] = record?.data || {};
  }

  // Load hours data for the hours table
  let hoursRows = [];
  try {
    const json = await exportEntries('json');
    hoursRows = JSON.parse(json);
  } catch { /* no hours data */ }

  const title = `BPV Stageverslag — ${STUDENT_DEFAULTS.naam}`;
  const html = buildHTML(dataMap, title, hoursRows);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return win;
}

function buildHTML(dataMap, title, hoursRows = []) {
  const coverData = dataMap.titelpagina || {};
  const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(title)}</title>
<style>
  @page {
    margin: 2cm 2.5cm;
    size: A4;
    @bottom-center {
      content: counter(page);
      font-size: 8pt;
      color: #999;
    }
  }

  @page :first { @bottom-center { content: none; } }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: ${BRAND.fontBody};
    font-size: 11pt;
    line-height: 1.6;
    color: ${BRAND.black};
    background: #fff;
    counter-reset: page;
  }

  /* ── Cover page ── */
  .cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    text-align: center;
    page-break-after: always;
    position: relative;
  }

  .cover__top-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: ${BRAND.red};
  }

  .cover__accent-bar {
    width: 80px;
    height: 4px;
    background: ${BRAND.red};
    margin-bottom: 2rem;
  }

  .cover__title {
    font-family: ${BRAND.fontHeading};
    font-size: 32pt;
    font-weight: 700;
    color: ${BRAND.red};
    margin-bottom: 0.3rem;
    letter-spacing: -0.02em;
  }

  .cover__subtitle {
    font-size: 16pt;
    color: #444;
    margin-bottom: 3.5rem;
    font-weight: 300;
  }

  .cover__meta {
    font-size: 11pt;
    line-height: 2.2;
    color: #333;
    text-align: left;
    min-width: 280px;
  }

  .cover__meta-row {
    display: flex;
    gap: 0.5rem;
  }

  .cover__meta-label {
    color: ${BRAND.red};
    font-weight: 600;
    min-width: 130px;
    display: inline-block;
  }

  .cover__date {
    margin-top: 3rem;
    font-size: 9pt;
    color: #999;
  }

  /* ── Table of contents ── */
  .toc {
    page-break-after: always;
    padding-top: 2rem;
  }

  .toc__title {
    font-family: ${BRAND.fontHeading};
    font-size: 22pt;
    font-weight: 700;
    color: ${BRAND.red};
    margin-bottom: 2rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid ${BRAND.red};
  }

  .toc__group {
    margin-bottom: 1.2rem;
  }

  .toc__group-title {
    font-family: ${BRAND.fontHeading};
    font-size: 13pt;
    font-weight: 700;
    color: ${BRAND.black};
    margin-bottom: 0.3rem;
  }

  .toc__items {
    list-style: none;
    padding-left: 1.2rem;
  }

  .toc__item {
    font-size: 10pt;
    line-height: 1.8;
    color: #444;
    border-bottom: 1px dotted #ddd;
    padding: 0.1rem 0;
  }

  .toc__item::before {
    content: '—';
    color: ${BRAND.red};
    margin-right: 0.5rem;
  }

  /* ── Group headers ── */
  .group-header {
    font-family: ${BRAND.fontHeading};
    font-size: 18pt;
    font-weight: 700;
    color: ${BRAND.red};
    border-bottom: 2px solid ${BRAND.red};
    padding-bottom: 0.3rem;
    margin: 2.5rem 0 1rem;
    page-break-after: avoid;
  }

  /* ── Section headers ── */
  .section-title {
    font-family: ${BRAND.fontHeading};
    font-size: 13pt;
    font-weight: 600;
    color: ${BRAND.black};
    margin: 1.5rem 0 0.3rem;
    page-break-after: avoid;
  }

  .section-desc {
    font-size: 9pt;
    color: #888;
    margin-bottom: 0.8rem;
    font-style: italic;
  }

  /* ── Fields ── */
  .field {
    margin-bottom: 1rem;
    page-break-inside: avoid;
  }

  .field__label {
    font-weight: 600;
    font-size: 10pt;
    color: ${BRAND.red};
    margin-bottom: 0.15rem;
  }

  .field__value {
    font-size: 11pt;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .field__empty {
    color: #bbb;
    font-style: italic;
    font-size: 10pt;
  }

  /* ── Horizontal rule between groups ── */
  .group-break {
    page-break-before: always;
  }

  /* ── Hours table ── */
  .hours-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    margin: 1rem 0;
  }

  .hours-table th {
    background: ${BRAND.red};
    color: #fff;
    font-weight: 600;
    text-align: left;
    padding: 0.4rem 0.5rem;
    border: 1px solid ${BRAND.red};
  }

  .hours-table td {
    padding: 0.3rem 0.5rem;
    border: 1px solid #ddd;
    vertical-align: top;
  }

  .hours-table tr:nth-child(even) td {
    background: #f9f9f9;
  }

  .hours-table .hours-table__week-row td {
    background: #f0f0f0;
    font-weight: 600;
    font-size: 8pt;
    color: #555;
    border-top: 2px solid #ccc;
  }

  .hours-table__total td {
    background: ${BRAND.red} !important;
    color: #fff;
    font-weight: 700;
    border-color: ${BRAND.red};
  }

  .hours-table__missed td {
    color: ${BRAND.red};
    font-style: italic;
  }

  /* ── Print tweaks ── */
  @media print {
    body { font-size: 10pt; }
    .cover { min-height: 98vh; }
    .no-print { display: none !important; }
  }

  /* ── Screen: print button bar ── */
  .print-bar {
    position: sticky;
    top: 0;
    background: ${BRAND.red};
    color: #fff;
    padding: 0.75rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10pt;
    z-index: 100;
  }

  .print-bar button {
    background: #fff;
    color: ${BRAND.red};
    border: none;
    padding: 0.5rem 1.5rem;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    font-size: 10pt;
  }

  .print-bar button:hover { opacity: 0.9; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span>Stageverslag — ${escapeHTML(STUDENT_DEFAULTS.naam)} — Boers en Co.</span>
  <button onclick="window.print()">Afdrukken / PDF opslaan</button>
</div>

<!-- ═══ PAGE 1: VOORBLAD ═══ -->
<div class="cover">
  <div class="cover__top-bar"></div>
  <div class="cover__accent-bar"></div>
  <h1 class="cover__title">BPV Stageverslag</h1>
  <p class="cover__subtitle">Boers en Co.</p>
  <div class="cover__meta">
    <div class="cover__meta-row"><span class="cover__meta-label">Naam</span> ${escapeHTML(coverData.naam || STUDENT_DEFAULTS.naam)}</div>
    <div class="cover__meta-row"><span class="cover__meta-label">Studentnummer</span> ${escapeHTML(coverData.studentnummer || STUDENT_DEFAULTS.studentnummer)}</div>
    <div class="cover__meta-row"><span class="cover__meta-label">Bedrijf</span> ${escapeHTML(coverData.bedrijf || STUDENT_DEFAULTS.bedrijf)}</div>
    <div class="cover__meta-row"><span class="cover__meta-label">Periode</span> ${escapeHTML(coverData.periode || STUDENT_DEFAULTS.periode)}</div>
    <div class="cover__meta-row"><span class="cover__meta-label">Opleiding</span> LiS — Leidse instrumentmakers School</div>
  </div>
  <div class="cover__date">${escapeHTML(today)}</div>
</div>

<!-- ═══ PAGE 2: INHOUDSOPGAVE ═══ -->
${renderTOC()}

<!-- ═══ PAGES 3+: INHOUD ═══ -->
${renderGroups(dataMap)}

<!-- ═══ URENVERANTWOORDING ═══ -->
${renderHoursTable(hoursRows)}

</body>
</html>`;
}

function renderTOC() {
  const groups = EXPORT_GROUPS.filter(g => g.tocLabel);

  const items = groups.map(group => {
    const subItems = group.sections.map(sectionId => {
      const def = REPORT_SECTIONS.find(s => s.id === sectionId);
      return def ? `<li class="toc__item">${escapeHTML(def.title)}</li>` : '';
    }).join('');

    return `
      <div class="toc__group">
        <div class="toc__group-title">${escapeHTML(group.tocLabel)}</div>
        <ul class="toc__items">${subItems}</ul>
      </div>
    `;
  }).join('');

  return `
    <div class="toc">
      <h2 class="toc__title">Inhoudsopgave</h2>
      ${items}
    </div>
  `;
}

function renderGroups(dataMap) {
  return EXPORT_GROUPS
    .filter(g => g.label)
    .map((group, i) => {
      const groupHTML = group.sections.map(sectionId => {
        const sectionDef = REPORT_SECTIONS.find(s => s.id === sectionId);
        if (!sectionDef) return '';
        const data = dataMap[sectionId] || {};
        return renderSection(sectionDef, data);
      }).join('');

      return `
        <div class="${i > 0 ? 'group-break' : ''}">
          <h2 class="group-header">${escapeHTML(group.label)}</h2>
          ${groupHTML}
        </div>
      `;
    }).join('');
}

function renderSection(sectionDef, data) {
  const fieldsHTML = sectionDef.fields.map(field => {
    const val = data[field.key];
    const hasValue = val && String(val).trim().length > 0;

    return `
      <div class="field">
        <div class="field__label">${escapeHTML(field.label)}</div>
        ${hasValue
          ? `<div class="field__value">${escapeHTML(String(val))}</div>`
          : `<div class="field__empty">Nog niet ingevuld</div>`
        }
      </div>
    `;
  }).join('');

  return `
    <h3 class="section-title">${escapeHTML(sectionDef.title)}</h3>
    <p class="section-desc">${escapeHTML(sectionDef.description)}</p>
    ${fieldsHTML}
  `;
}

/**
 * Render the hours table grouped by week with totals.
 */
function renderHoursTable(rows) {
  if (!rows || rows.length === 0) {
    return `
      <div class="group-break">
        <h2 class="group-header">Opdracht 3 — Urenverantwoording</h2>
        <p class="section-desc">Nog geen uren geregistreerd.</p>
      </div>
    `;
  }

  // Sort by date
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  // Group by week
  const weekGroups = [];
  let currentWeek = null;
  let currentGroup = null;
  for (const row of sorted) {
    if (row.week !== currentWeek) {
      currentWeek = row.week;
      currentGroup = { week: row.week, rows: [] };
      weekGroups.push(currentGroup);
    }
    currentGroup.rows.push(row);
  }

  // Format date to "dd-mm"
  function fmtDate(dateStr) {
    const [, m, d] = dateStr.split('-');
    return `${d}-${m}`;
  }

  // Format day name
  const dayNames = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  function dayName(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return dayNames[d.getDay()];
  }

  let totalMinutesAll = 0;

  const tableRows = weekGroups.map(group => {
    let weekMinutes = 0;
    const dayRows = group.rows.map(r => {
      const typeLabel = DAY_TYPE_LABELS[r.type] || r.type;
      const time = r.startTime && r.endTime
        ? `${r.startTime} – ${r.endTime}`
        : '—';
      const brk = r.type === 'work' ? `${r.breakMinutes}m` : '—';
      const net = r.type === 'work' ? formatMinutes(r.netMinutes) : '—';
      weekMinutes += r.netMinutes || 0;
      const acts = Array.isArray(r.activities) ? r.activities.filter(a => a && a.trim()) : [];
      const activitiesText = acts.join('; ');
      const note = r.note || r.description || '';
      const isMissed = r.type !== 'work' && r.type !== 'holiday';

      return `<tr${isMissed ? ' class="hours-table__missed"' : ''}>
        <td>${escapeHTML(fmtDate(r.date))}</td>
        <td>${escapeHTML(dayName(r.date))}</td>
        <td>${escapeHTML(typeLabel)}</td>
        <td>${escapeHTML(time)}</td>
        <td>${escapeHTML(brk)}</td>
        <td>${escapeHTML(net)}</td>
        <td>${escapeHTML(activitiesText.length > 80 ? activitiesText.slice(0, 77) + '…' : activitiesText)}</td>
        <td>${escapeHTML(note.length > 60 ? note.slice(0, 57) + '…' : note)}</td>
      </tr>`;
    }).join('');

    totalMinutesAll += weekMinutes;

    return `
      <tr class="hours-table__week-row">
        <td colspan="5">${escapeHTML(group.week)}</td>
        <td>${escapeHTML(formatMinutes(weekMinutes))}</td>
        <td colspan="2"></td>
      </tr>
      ${dayRows}
    `;
  }).join('');

  return `
    <div class="group-break">
      <h2 class="group-header">Opdracht 3 — Urenverantwoording</h2>
      <p class="section-desc">Overzicht van alle geregistreerde uren tijdens de stageperiode.</p>
      <table class="hours-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Dag</th>
            <th>Type</th>
            <th>Tijd</th>
            <th>Pauze</th>
            <th>Netto</th>
            <th>Activiteiten</th>
            <th>Notitie</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          <tr class="hours-table__total">
            <td colspan="5">Totaal</td>
            <td>${escapeHTML(formatMinutes(totalMinutesAll))}</td>
            <td colspan="2">${sorted.length} dagen</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}
