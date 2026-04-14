/**
 * Stageverslag Markdown generator
 *
 * Turns the saved `os_report` sections + hours data into a clean, structured
 * Markdown document. Uses the user's text AS-IS — no rewriting, no expansion.
 * Output structure (user specification):
 *   1. Titelpagina
 *   2. Inleiding
 *   3. Werkzaamheden  (= Opdracht 2 content)
 *   4. Leerdoelen (SMART)  (= Opdracht 1 content)
 *   5. Reflectie
 *   6. Ontwikkeling  (= Opdracht 4)
 *   7. Urenregistratie  (auto-berekend uit BORIS hours-store)
 *   8. Conclusie
 *
 * Hours default-day = 08:00–17:00 minus 00:15 + 00:30 pauze = 8u 15m (495 min).
 */

import { REPORT_SECTIONS, STUDENT_DEFAULTS, getReportSection } from '../../stores/report.js';
import { getAllHoursSorted } from '../../db.js';
import { formatMinutes, calcNetMinutes } from '../../utils.js';
import { BPV_START, BPV_END } from '../../constants.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAY_NAMES_NL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const TYPE_LABELS = {
  work: 'Werk',
  holiday: 'Vakantie',
  sick: 'Ziek',
  absence: 'Afwezig',
  school: 'School',
  other: 'Overig',
};

function fmtDateDDMMYYYY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

function fmtDateDDMM(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}-${m}`;
}

function dayNameFor(iso) {
  if (!iso) return '';
  return DAY_NAMES_NL[new Date(iso + 'T00:00:00').getDay()];
}

/**
 * Minimal grammar-level touch-ups — NO rewriting, NO expansion.
 * Only: trim leading/trailing whitespace, normalise double-spaces, and ensure
 * the first character of each paragraph is capitalised if it starts with a
 * plain letter. Everything the user wrote stays intact.
 */
function tidy(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.replace(/\r\n/g, '\n').trim();
  s = s.replace(/[ \t]+\n/g, '\n');     // strip trailing spaces on lines
  s = s.replace(/\n{3,}/g, '\n\n');     // collapse 3+ blank lines to 2
  s = s.replace(/[ \t]{2,}/g, ' ');     // collapse runs of spaces
  // Capitalise first visible char of each paragraph
  s = s.split('\n\n').map(p => {
    const t = p.trimStart();
    if (!t) return p;
    const first = t[0];
    if (first >= 'a' && first <= 'z') return t[0].toUpperCase() + t.slice(1);
    return t;
  }).join('\n\n');
  return s;
}

function getField(data, key) {
  const val = data?.[key];
  return (val && String(val).trim().length > 0) ? tidy(String(val)) : '';
}

function field(label, value) {
  if (!value) return `**${label}:** _Nog niet ingevuld_\n`;
  // Multiline field: label on own line, blank line, content
  if (value.includes('\n')) {
    return `**${label}:**\n\n${value}\n`;
  }
  return `**${label}:** ${value}\n`;
}

// ─── Markdown builders per section ─────────────────────────────────────────

function buildTitelpagina(dataMap) {
  const d = dataMap.titelpagina || {};
  const today = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  return [
    '# BPV Stageverslag',
    '',
    `**Naam:** ${getField(d, 'naam') || STUDENT_DEFAULTS.naam}`,
    `**Studentnummer:** ${getField(d, 'studentnummer') || STUDENT_DEFAULTS.studentnummer}`,
    `**Bedrijf:** ${getField(d, 'bedrijf') || STUDENT_DEFAULTS.bedrijf}`,
    `**Periode:** ${getField(d, 'periode') || STUDENT_DEFAULTS.periode}`,
    '**Opleiding:** LiS — Leidse instrumentmakers School',
    `**Datum:** ${today}`,
    '',
  ].join('\n');
}

function buildInleiding(dataMap) {
  const d = dataMap.bedrijfsbeschrijving || {};
  const lines = ['## Inleiding', ''];
  const bedrijf = getField(d, 'wat_doet_bedrijf');
  const afdelingen = getField(d, 'afdelingen');
  const rol = getField(d, 'jouw_rol');
  if (bedrijf) lines.push(field('Wat doet het bedrijf', bedrijf));
  if (afdelingen) lines.push(field('Afdelingen', afdelingen));
  if (rol) lines.push(field('Jouw rol en werkplek', rol));
  if (!bedrijf && !afdelingen && !rol) {
    lines.push('_Nog niet ingevuld. Vul de sectie "Bedrijfsbeschrijving" in bij het volledige verslag._');
  }
  lines.push('');
  return lines.join('\n');
}

function buildWerkzaamheden(dataMap) {
  const lines = ['## Werkzaamheden', ''];
  lines.push('_Productgericht werken en verbeteren (Opdracht 2)._');
  lines.push('');

  // OP2 — 1: Machines en materialen
  const m = dataMap.product_machines || {};
  lines.push('### Machines, gereedschappen en materialen');
  lines.push('');
  lines.push(field('Machines', getField(m, 'machines')));
  lines.push(field('Gereedschappen', getField(m, 'gereedschappen')));
  lines.push(field('Materialen', getField(m, 'materialen')));

  // OP2 — 2: Proces
  const p = dataMap.product_proces || {};
  lines.push('### Proces');
  lines.push('');
  lines.push(field('Opdracht', getField(p, 'opdracht')));
  lines.push(field('Processtappen', getField(p, 'processtappen')));
  lines.push(field('Werktekening / foto\'s', getField(p, 'tekening_fotos')));

  // OP2 — 3: Assemblage en testen
  const a = dataMap.product_assemblage || {};
  lines.push('### Assemblage en testen');
  lines.push('');
  lines.push(field('Assemblage', getField(a, 'assemblage')));
  lines.push(field('Controles en testen', getField(a, 'controles')));
  lines.push(field('Benodigde kennis/vaardigheden', getField(a, 'kennis')));

  // OP2 — 4: Verbetering
  const v = dataMap.product_verbetering || {};
  lines.push('### Verbetering en optimalisatie');
  lines.push('');
  lines.push(field('Wat kon beter', getField(v, 'wat_kon_beter')));
  lines.push(field('Verbetervoorstel', getField(v, 'verbetervoorstel')));
  lines.push(field('Risico\'s en impact', getField(v, 'risicos')));
  lines.push(field('KPI / meetmethode', getField(v, 'kpi')));

  // OP2 — 5: Engels
  const e = dataMap.product_engels || {};
  const eng = getField(e, 'english_description');
  if (eng) {
    lines.push('### Engelstalige productuitleg');
    lines.push('');
    lines.push(eng);
    lines.push('');
  }

  return lines.join('\n');
}

function buildLeerdoelen(dataMap) {
  const lines = ['## Leerdoelen (SMART)', ''];
  lines.push('_Persoonlijke leerdoelen & bedrijfsoriëntatie (Opdracht 1)._');
  lines.push('');

  const proc = dataMap.bedrijfsprocessen || {};
  const hasProc = ['offertes', 'kwaliteitsborging', 'cnc_toepassingen', 'admin_financieel']
    .some(k => getField(proc, k));
  if (hasProc) {
    lines.push('### Bedrijfsprocessen');
    lines.push('');
    lines.push(field('Offerteproces', getField(proc, 'offertes')));
    lines.push(field('Kwaliteitsborging', getField(proc, 'kwaliteitsborging')));
    lines.push(field('CNC-toepassingen', getField(proc, 'cnc_toepassingen')));
    lines.push(field('Administratieve/financiële stromen', getField(proc, 'admin_financieel')));
  }

  const comp = dataMap.competenties || {};
  const ld = dataMap.leerdoelen || {};
  const mot = dataMap.motivatie || {};

  // Combined per-competentie blocks: competentie → leerdoel → motivatie
  const items = [
    { ck: 'competentie1', lk: 'leerdoel1', mk: 'motivatie1', label: 'Competentie 1' },
    { ck: 'competentie2', lk: 'leerdoel2', mk: 'motivatie2', label: 'Competentie 2' },
    { ck: 'competentie3', lk: 'leerdoel3', mk: 'motivatie3', label: 'Competentie 3' },
    { ck: 'competentie4', lk: 'leerdoel4', mk: 'motivatie4', label: 'Competentie 4' },
  ];
  let rendered = 0;
  for (const item of items) {
    const c = getField(comp, item.ck);
    const l = getField(ld, item.lk);
    const mo = getField(mot, item.mk);
    if (!c && !l && !mo) continue;
    lines.push(`### ${item.label}`);
    lines.push('');
    lines.push(field('Competentie', c));
    lines.push(field('SMART-leerdoel', l));
    lines.push(field('Motivatie', mo));
    rendered++;
  }

  // Persoonlijk leerdoel
  const pl = getField(ld, 'leerdoel_persoonlijk');
  const pm = getField(mot, 'motivatie_persoonlijk');
  if (pl || pm) {
    lines.push('### Persoonlijk leerdoel');
    lines.push('');
    lines.push(field('Leerdoel', pl));
    lines.push(field('Motivatie', pm));
  }

  if (rendered === 0 && !pl && !pm && !hasProc) {
    lines.push('_Nog niet ingevuld._');
    lines.push('');
  }

  return lines.join('\n');
}

function buildReflectie(dataMap) {
  const r = dataMap.reflectie || {};
  const lines = ['## Reflectie', ''];
  const fields = [
    ['Wat ging goed', 'wat_goed'],
    ['Wat vond je lastig', 'wat_lastig'],
    ['Hoe ben je daarmee omgegaan', 'hoe_omgegaan'],
    ['Wat heb je geleerd', 'wat_geleerd'],
    ['Wat neem je mee naar de toekomst', 'wat_meenemen'],
    ['Wat wil je nog verdiepen', 'wat_verdiepen'],
  ];
  let any = false;
  for (const [label, key] of fields) {
    const val = getField(r, key);
    if (val) {
      lines.push(field(label, val));
      any = true;
    }
  }
  if (!any) lines.push('_Nog niet ingevuld._');
  lines.push('');
  return lines.join('\n');
}

function buildOntwikkeling(dataMap) {
  const p = dataMap.presentatie || {};
  const lines = ['## Ontwikkeling', ''];
  lines.push('_Terugkomdag presentatie (Opdracht 4)._');
  lines.push('');

  const fields = [
    ['1. Wat doet het bedrijf', 'wat_doet_bedrijf'],
    ['2. Jouw werkzaamheden', 'werkzaamheden'],
    ['3. Jouw werkdag', 'werkdag'],
    ['4. Samenwerking en overleg', 'samenwerken'],
    ['5. Werkcultuur', 'werkcultuur'],
    ['6. Beslissingsruimte', 'beslissingen'],
    ['7. Past het bedrijf bij jou', 'past_bij_jou'],
  ];
  let any = false;
  for (const [label, key] of fields) {
    const val = getField(p, key);
    if (val) {
      lines.push(`### ${label}`);
      lines.push('');
      lines.push(val);
      lines.push('');
      any = true;
    }
  }
  if (!any) lines.push('_Nog niet ingevuld._\n');
  return lines.join('\n');
}

function buildUrenregistratie(hoursRows) {
  const lines = ['## Urenregistratie', ''];
  lines.push(`_Periode: ${BPV_START} t/m ${BPV_END}. Standaard werkdag 08:00–17:00 minus pauze 10:00–10:15 en 12:00–12:30 = 8u 15m (495 min)._`);
  lines.push('');

  if (!hoursRows || hoursRows.length === 0) {
    lines.push('_Nog geen uren geregistreerd._');
    lines.push('');
    return lines.join('\n');
  }

  const sorted = [...hoursRows].sort((a, b) => a.date.localeCompare(b.date));

  // Group by week
  const weekMap = new Map();
  for (const r of sorted) {
    const week = r.week || 'onbekend';
    if (!weekMap.has(week)) weekMap.set(week, []);
    weekMap.get(week).push(r);
  }

  let grandTotal = 0;
  let workDays = 0;

  for (const [week, rows] of weekMap) {
    lines.push(`### Week ${week}`);
    lines.push('');
    lines.push('| Datum | Dag | Type | Tijd | Pauze | Netto | Activiteiten |');
    lines.push('|---|---|---|---|---|---|---|');
    let weekTotal = 0;
    for (const r of rows) {
      const typeLabel = TYPE_LABELS[r.type] || r.type || '';
      const time = (r.startTime && r.endTime) ? `${r.startTime}–${r.endTime}` : '—';
      const isWork = r.type === 'work';
      const pauseStr = isWork ? `${r.breakMinutes || 0}m` : '—';
      // Recompute defensively in case netMinutes is missing
      const net = (isWork && r.startTime && r.endTime)
        ? (Number.isFinite(r.netMinutes) && r.netMinutes > 0
            ? r.netMinutes
            : calcNetMinutes(r.startTime, r.endTime, Number(r.breakMinutes) || 0))
        : 0;
      const netStr = isWork ? formatMinutes(net) : '—';
      weekTotal += net;
      if (isWork) workDays++;
      const acts = Array.isArray(r.activities) ? r.activities.filter(a => a && a.trim()) : [];
      const actsStr = acts.join('; ').replace(/\|/g, '\\|');
      lines.push(`| ${fmtDateDDMM(r.date)} | ${dayNameFor(r.date)} | ${typeLabel} | ${time} | ${pauseStr} | ${netStr} | ${actsStr} |`);
    }
    lines.push(`| | | | | | **${formatMinutes(weekTotal)}** | _weektotaal_ |`);
    lines.push('');
    grandTotal += weekTotal;
  }

  lines.push('### Totaal');
  lines.push('');
  lines.push(`- **Gewerkte dagen:** ${workDays}`);
  lines.push(`- **Totaal netto tijd:** ${formatMinutes(grandTotal)} (${(grandTotal / 60).toFixed(1)} uur)`);
  lines.push('');
  return lines.join('\n');
}

function buildConclusie(dataMap) {
  // No dedicated "conclusie" section in os_report — reuse reflectie bullets where relevant
  const r = dataMap.reflectie || {};
  const lines = ['## Conclusie', ''];
  const geleerd = getField(r, 'wat_geleerd');
  const meenemen = getField(r, 'wat_meenemen');
  const verdiepen = getField(r, 'wat_verdiepen');
  if (geleerd) { lines.push(field('Wat ik heb geleerd', geleerd)); }
  if (meenemen) { lines.push(field('Wat ik meeneem', meenemen)); }
  if (verdiepen) { lines.push(field('Waar ik verder op wil verdiepen', verdiepen)); }
  if (!geleerd && !meenemen && !verdiepen) {
    lines.push('_Nog niet ingevuld. Vul de Reflectie-sectie in bij het volledige verslag._');
  }
  lines.push('');
  return lines.join('\n');
}

// ─── Public: build + download ──────────────────────────────────────────────

/**
 * Build the full markdown report as a string.
 */
export async function buildReportMarkdown() {
  const dataMap = {};
  for (const section of REPORT_SECTIONS) {
    const record = await getReportSection(section.id);
    dataMap[section.id] = record?.data || {};
  }

  let hoursRows = [];
  try {
    hoursRows = await getAllHoursSorted();
  } catch { /* no hours data */ }

  return [
    buildTitelpagina(dataMap),
    buildInleiding(dataMap),
    buildWerkzaamheden(dataMap),
    buildLeerdoelen(dataMap),
    buildReflectie(dataMap),
    buildOntwikkeling(dataMap),
    buildUrenregistratie(hoursRows),
    buildConclusie(dataMap),
  ].join('\n');
}

/**
 * Trigger a browser download of the report as a .md file.
 */
export async function downloadReportMarkdown() {
  const md = await buildReportMarkdown();
  const today = new Date().toISOString().slice(0, 10);
  const name = (STUDENT_DEFAULTS.naam || 'student').replace(/\s+/g, '_');
  const filename = `Stageverslag_${name}_${today}.md`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { filename, bytes: blob.size };
}
