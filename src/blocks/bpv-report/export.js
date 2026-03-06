/**
 * BPV Report Export — generates a printable HTML document
 * styled with the  corporate identity.
 *
 * Brand specs (from WSC-O house style):
 *   Lettertype koppen:  Fritz Quadrata Medium
 *   Lettertype body:    Helvetica Neue Lt Std Condensed
 *   Rood (R):           CMYK 13 97 83 3  → RGB #DA1A32
 *   Zwart (Z):          CMYK 30 30 30 100 → RGB #000000
 *   Blauw (B):          CMYK 79 26 0 0   → RGB #0099CC
 */
import { escapeHTML } from '../../utils.js';
import {
  REPORT_SECTIONS,
  STUDENT_DEFAULTS,
  getReportSection,
} from '../../stores/report.js';

// ──  brand colors (CMYK → RGB approximations) ──
const BRAND = {
  red:   '#DA1A32', // CMYK 13 97 83 3
  black: '#000000', // CMYK 30 30 30 100
  blue:  '#0099CC', // CMYK 79 26 0 0
  fontHeading: "'Helvetica Neue', 'HelveticaNeue-CondensedBold', 'Arial Narrow', Arial, sans-serif",
  fontBody:    "'Helvetica Neue', 'HelveticaNeue-Light', 'Helvetica', Arial, sans-serif",
};

// Section group metadata for the export layout
const EXPORT_GROUPS = [
  { label: null, sections: ['titelpagina'] },
  { label: 'Opdracht 1 — Persoonlijke leerdoelen & bedrijfsoriëntatie', sections: ['bedrijfsbeschrijving', 'bedrijfsprocessen', 'competenties', 'leerdoelen', 'motivatie'] },
  { label: 'Opdracht 2 — Productgericht werken en verbeteren', sections: ['product_machines', 'product_proces', 'product_assemblage', 'product_verbetering', 'product_engels'] },
  { label: 'Opdracht 4 — Terugkomdag presentatie', sections: ['presentatie'] },
  { label: 'Reflectie', sections: ['reflectie'] },
];

/**
 * Generate a full printable HTML report from saved data.
 * Opens in a new tab ready for print / save as PDF.
 */
export async function exportReport() {
  // Load all section data
  const dataMap = {};
  for (const section of REPORT_SECTIONS) {
    const record = await getReportSection(section.id);
    dataMap[section.id] = record?.data || {};
  }

  const title = `BPV Stageverslag — ${STUDENT_DEFAULTS.naam}`;
  const html = buildHTML(dataMap, title);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  // Clean up after a delay
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return win;
}

function buildHTML(dataMap, title) {
  const coverData = dataMap.titelpagina || {};

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
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: ${BRAND.fontBody};
    font-size: 11pt;
    line-height: 1.6;
    color: ${BRAND.black};
    background: #fff;
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
  }

  .cover__accent-bar {
    width: 80px;
    height: 4px;
    background: ${BRAND.red};
    margin-bottom: 2rem;
  }

  .cover__title {
    font-family: ${BRAND.fontHeading};
    font-size: 28pt;
    font-weight: 700;
    color: ${BRAND.red};
    margin-bottom: 0.5rem;
    letter-spacing: -0.01em;
  }

  .cover__subtitle {
    font-size: 14pt;
    color: #444;
    margin-bottom: 3rem;
  }

  .cover__meta {
    font-size: 11pt;
    line-height: 2;
    color: #333;
  }

  .cover__meta strong {
    color: ${BRAND.black};
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
    font-size: 14pt;
    font-weight: 600;
    color: ${BRAND.black};
    margin: 1.5rem 0 0.3rem;
    page-break-after: avoid;
  }

  .section-desc {
    font-size: 9pt;
    color: #666;
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
    color: #aaa;
    font-style: italic;
    font-size: 10pt;
  }

  /* ── Footer ── */
  .page-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 8pt;
    color: #999;
    padding: 0.5rem;
  }

  /* ── Print tweaks ── */
  @media print {
    body { font-size: 10pt; }
    .cover { min-height: 98vh; }
    .no-print { display: none !important; }
  }

  /* ── Screen: print button ── */
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
  <span>Stageverslag — ${escapeHTML(STUDENT_DEFAULTS.naam)} — </span>
  <button onclick="window.print()">Afdrukken / PDF opslaan</button>
</div>

<!-- Cover page -->
<div class="cover">
  <div class="cover__accent-bar"></div>
  <h1 class="cover__title">BPV Stageverslag</h1>
  <p class="cover__subtitle"></p>
  <div class="cover__meta">
    <strong>Naam:</strong> ${escapeHTML(coverData.naam || STUDENT_DEFAULTS.naam)}<br>
    <strong>Studentnummer:</strong> ${escapeHTML(coverData.studentnummer || STUDENT_DEFAULTS.studentnummer)}<br>
    <strong>Bedrijf:</strong> ${escapeHTML(coverData.bedrijf || STUDENT_DEFAULTS.bedrijf)}<br>
    <strong>Periode:</strong> ${escapeHTML(coverData.periode || STUDENT_DEFAULTS.periode)}<br>
    <strong>Opleiding:</strong> LiS — Leidse instrumentmakers School
  </div>
</div>

${renderGroups(dataMap)}

</body>
</html>`;
}

function renderGroups(dataMap) {
  return EXPORT_GROUPS
    .filter(g => g.label) // skip titelpagina (already on cover)
    .map(group => {
      const groupHTML = group.sections.map(sectionId => {
        const sectionDef = REPORT_SECTIONS.find(s => s.id === sectionId);
        if (!sectionDef) return '';
        const data = dataMap[sectionId] || {};
        return renderSection(sectionDef, data);
      }).join('');

      return `
        <h2 class="group-header">${escapeHTML(group.label)}</h2>
        ${groupHTML}
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
