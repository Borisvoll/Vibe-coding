/**
 * Report store — BPV internship report CRUD
 *
 * Persists report sections to the `os_report` IndexedDB store.
 * Each section is stored as a separate record keyed by section id.
 * Sections map 1:1 to the LiS BPV OP3 assignments.
 * All mutations go through this module; UI never writes directly.
 */
import { getAll, getByKey, put, remove } from '../db.js';
import { BPV_START, BPV_END } from '../constants.js';

const STORE = 'os_report';

/**
 * Pre-filled student data extracted from BPV Tijdverantwoording.
 */
export const STUDENT_DEFAULTS = {
  naam: '',
  studentnummer: '',
  bedrijf: '',
  periode: `${BPV_START} t/m ${BPV_END}`,
};

/**
 * Report section definitions — matches the 4 LiS BPV OP3 assignments exactly.
 *
 * Opdracht 1: Persoonlijke leerdoelen & bedrijfsoriëntatie (5 stappen)
 * Opdracht 2: Productgericht werken en verbeteren (5 onderdelen)
 * Opdracht 3: BPV Tijdverantwoording (handled by hours tracker)
 * Opdracht 4: Terugkomdag presentatie (7 vragen)
 */
export const REPORT_SECTIONS = [
  // ── Titelpagina & basisgegevens ────────────────────────────
  {
    id: 'titelpagina',
    title: 'Titelpagina',
    description: 'Jouw gegevens voor het verslag. Dit wordt automatisch ingevuld.',
    fields: [
      { key: 'naam', label: 'Naam student', type: 'text', hint: '', prefill: STUDENT_DEFAULTS.naam },
      { key: 'studentnummer', label: 'Studentnummer', type: 'text', hint: '', prefill: STUDENT_DEFAULTS.studentnummer },
      { key: 'bedrijf', label: 'Naam bedrijf', type: 'text', hint: '', prefill: STUDENT_DEFAULTS.bedrijf },
      { key: 'periode', label: 'Onderwijsperiode', type: 'text', hint: '', prefill: STUDENT_DEFAULTS.periode },
    ],
  },

  // ── Opdracht 1: Persoonlijke leerdoelen & bedrijfsoriëntatie ──
  {
    id: 'bedrijfsbeschrijving',
    title: 'OP1 — Stap 1: Bedrijfsbeschrijving',
    description: 'Beschrijf kort het bedrijf, de afdelingen en jouw rol. Voeg eventueel foto\'s van je werkplek toe.',
    fields: [
      { key: 'wat_doet_bedrijf', label: 'Wat doet het bedrijf?', type: 'textarea', hint: 'Producten, diensten, klanten, branche.' },
      { key: 'afdelingen', label: 'Welke afdelingen zijn er?', type: 'textarea', hint: 'Bijv. productie, kwaliteit, assemblage, kantoor, expeditie.' },
      { key: 'jouw_rol', label: 'Jouw rol en werkplek', type: 'textarea', hint: 'Op welke afdeling werk je? Wat doe je daar precies?' },
      { key: 'fotos_werkplek', label: 'Foto\'s werkplek', type: 'textarea', hint: 'Beschrijf welke foto\'s je wilt bijvoegen van je werkplek.' },
    ],
  },
  {
    id: 'bedrijfsprocessen',
    title: 'OP1 — Stap 2: Bedrijfsprocessen verkennen',
    description: 'Krijg inzicht in processen zoals offertes, kwaliteitsborging, CNC-toepassingen en administratieve/financiële stromen.',
    fields: [
      { key: 'offertes', label: 'Offerteproces', type: 'textarea', hint: 'Hoe komen opdrachten binnen? Van offerte tot productie.' },
      { key: 'kwaliteitsborging', label: 'Kwaliteitsborging', type: 'textarea', hint: 'Hoe wordt kwaliteit gewaarborgd? ISO-certificeringen, meetinstrumenten.' },
      { key: 'cnc_toepassingen', label: 'CNC-toepassingen', type: 'textarea', hint: 'Welke CNC-machines? Hoe worden programma\'s gemaakt/gebruikt?' },
      { key: 'admin_financieel', label: 'Administratieve/financiële stromen', type: 'textarea', hint: 'Facturering, werkbonnen, urenregistratie, inkoop.' },
    ],
  },
  {
    id: 'competenties',
    title: 'OP1 — Stap 3: Competenties kiezen',
    description: 'Selecteer 2-4 beroepscompetenties waarin je wilt groeien. Noteer jouw ontwikkelpunten.',
    fields: [
      { key: 'competentie1', label: 'Competentie 1', type: 'textarea', hint: 'Bijv. "Vakkennis & vaardigheden" — wat wil je hierin leren?' },
      { key: 'competentie2', label: 'Competentie 2', type: 'textarea', hint: 'Bijv. "Meten & controleren" — wat is je ontwikkelpunt?' },
      { key: 'competentie3', label: 'Competentie 3 (optioneel)', type: 'textarea', hint: 'Bijv. "Machines & gereedschappen"' },
      { key: 'competentie4', label: 'Competentie 4 (optioneel)', type: 'textarea', hint: 'Bijv. "Zelfstandigheid"' },
    ],
  },
  {
    id: 'leerdoelen',
    title: 'OP1 — Stap 4: SMART-leerdoelen formuleren',
    description: 'Maak per competentie een SMART-leerdoel en voeg één persoonlijk leerdoel toe (niet direct beroepsgerelateerd).',
    fields: [
      { key: 'leerdoel1', label: 'SMART-leerdoel 1 (bij competentie 1)', type: 'textarea', hint: 'Specifiek, Meetbaar, Acceptabel, Realistisch, Tijdgebonden' },
      { key: 'leerdoel2', label: 'SMART-leerdoel 2 (bij competentie 2)', type: 'textarea', hint: 'Specifiek, Meetbaar, Acceptabel, Realistisch, Tijdgebonden' },
      { key: 'leerdoel3', label: 'SMART-leerdoel 3 (bij competentie 3, optioneel)', type: 'textarea', hint: '' },
      { key: 'leerdoel4', label: 'SMART-leerdoel 4 (bij competentie 4, optioneel)', type: 'textarea', hint: '' },
      { key: 'leerdoel_persoonlijk', label: 'Persoonlijk leerdoel (niet-beroepsgerelateerd)', type: 'textarea', hint: 'Bijv. beter plannen, communicatie verbeteren, Nederlands spreken op de werkvloer.' },
    ],
  },
  {
    id: 'motivatie',
    title: 'OP1 — Stap 5: Motivatie per leerdoel',
    description: 'Leg uit waarom je elk doel kiest, hoe het aansluit bij jouw toekomst en hoe je het binnen het bedrijf kunt realiseren.',
    fields: [
      { key: 'motivatie1', label: 'Motivatie leerdoel 1', type: 'textarea', hint: 'Waarom dit doel? Hoe past het bij je toekomst? Hoe ga je het bereiken bij je stagebedrijf?' },
      { key: 'motivatie2', label: 'Motivatie leerdoel 2', type: 'textarea', hint: '' },
      { key: 'motivatie3', label: 'Motivatie leerdoel 3 (optioneel)', type: 'textarea', hint: '' },
      { key: 'motivatie4', label: 'Motivatie leerdoel 4 (optioneel)', type: 'textarea', hint: '' },
      { key: 'motivatie_persoonlijk', label: 'Motivatie persoonlijk leerdoel', type: 'textarea', hint: '' },
    ],
  },

  // ── Opdracht 2: Productgericht werken en verbeteren ────────
  {
    id: 'product_machines',
    title: 'OP2 — 1: Machines en materialen',
    description: 'Welke machines, gereedschappen en materialen zijn gebruikt?',
    fields: [
      { key: 'machines', label: 'Machines', type: 'textarea', hint: 'Bijv. CNC-draaibank (Mazak QT), conventionele draaibank, freesmachine.' },
      { key: 'gereedschappen', label: 'Gereedschappen', type: 'textarea', hint: 'Bijv. wisselplaten, boren, draadsnij-gereedschap, meetklok.' },
      { key: 'materialen', label: 'Materialen', type: 'textarea', hint: 'Bijv. RVS 316L, aluminium 6082, messing, Nitinol.' },
    ],
  },
  {
    id: 'product_proces',
    title: 'OP2 — 2: Proces',
    description: 'Hoe is het product tot stand gekomen? Voeg een werktekening of foto\'s toe.',
    fields: [
      { key: 'opdracht', label: 'Wat was de opdracht?', type: 'textarea', hint: 'Beschrijf het werkstuk/product en de eisen.' },
      { key: 'processtappen', label: 'Processtappen', type: 'textarea', hint: 'Stap voor stap: instellen, programmeren, verspanen, controleren.' },
      { key: 'tekening_fotos', label: 'Werktekening / foto\'s', type: 'textarea', hint: 'Beschrijf welke tekeningen of foto\'s je bijvoegt.' },
    ],
  },
  {
    id: 'product_assemblage',
    title: 'OP2 — 3: Assemblage en testen',
    description: 'Hoe is het product samengesteld en getest? Welke controles zijn uitgevoerd en welke kennis/vaardigheden waren nodig?',
    fields: [
      { key: 'assemblage', label: 'Assemblage', type: 'textarea', hint: 'Hoe is het product samengesteld? Welke stappen?' },
      { key: 'controles', label: 'Controles en testen', type: 'textarea', hint: 'Welke meetinstrumenten? Toleranties? Hoe gecontroleerd?' },
      { key: 'kennis', label: 'Benodigde kennis/vaardigheden', type: 'textarea', hint: 'Welke kennis en vaardigheden had je nodig?' },
    ],
  },
  {
    id: 'product_verbetering',
    title: 'OP2 — 4: Verbetering en optimalisatie',
    description: 'Reflecteer op het proces: wat kon beter? Welke verbeteringen stel je voor? Benoem ook risico\'s en prestatie-indicatoren.',
    fields: [
      { key: 'wat_kon_beter', label: 'Wat kon beter?', type: 'textarea', hint: 'Analyseer het proces kritisch.' },
      { key: 'verbetervoorstel', label: 'Verbetervoorstel', type: 'textarea', hint: 'Oorzaak → voorstel → verwacht resultaat.' },
      { key: 'risicos', label: 'Risico\'s en impact', type: 'textarea', hint: 'Welke risico\'s zijn er bij je verbetervoorstel?' },
      { key: 'kpi', label: 'KPI / meetmethode', type: 'textarea', hint: 'Hoe meet je of de verbetering werkt?' },
    ],
  },
  {
    id: 'product_engels',
    title: 'OP2 — 5: Engelstalige productuitleg',
    description: 'Schrijf een korte Engelse uitleg voor een klant: wat is het product, hoe werkt het, wat zijn de risico\'s, en geef contactinformatie. Gebruik duidelijke taal en ondersteun met afbeeldingen of schema\'s.',
    fields: [
      { key: 'english_description', label: 'Product/process description (English)', type: 'textarea', hint: 'Write 120-180 words: what is the product, how does it work, what are the risks, and provide contact information.' },
    ],
  },

  // ── Opdracht 4: Terugkomdag presentatie ────────────────────
  {
    id: 'presentatie',
    title: 'OP4 — Terugkomdag presentatie',
    description: 'Een presentatie over je stagebedrijf (PowerPoint/Prezi). Beantwoord de 7 vragen. Vervaldatum: 13 maart 2026.',
    fields: [
      { key: 'wat_doet_bedrijf', label: '1. Wat doet het bedrijf?', type: 'textarea', hint: '' },
      { key: 'werkzaamheden', label: '2. Wat zijn jouw werkzaamheden?', type: 'textarea', hint: '' },
      { key: 'werkdag', label: '3. Hoe ziet jouw werkdag eruit?', type: 'textarea', hint: '' },
      { key: 'samenwerken', label: '4. Op welke manier werk je samen / heb je overleg binnen het bedrijf?', type: 'textarea', hint: '' },
      { key: 'werkcultuur', label: '5. Hoe pas jij binnen de werkcultuur van het bedrijf?', type: 'textarea', hint: '' },
      { key: 'beslissingen', label: '6. Tot in welke mate kun je beslissingen maken binnen je werkzaamheden?', type: 'textarea', hint: '' },
      { key: 'past_bij_jou', label: '7. Past het bedrijf bij jou?', type: 'textarea', hint: '' },
    ],
  },

  // ── Reflectie (afsluiting verslag) ─────────────────────────
  {
    id: 'reflectie',
    title: 'Reflectie',
    description: 'Terugblik op je stage-ervaring (max 1 A4).',
    fields: [
      { key: 'wat_goed', label: 'Wat ging goed?', type: 'textarea', hint: '' },
      { key: 'wat_lastig', label: 'Wat vond je lastig?', type: 'textarea', hint: '' },
      { key: 'hoe_omgegaan', label: 'Hoe ben je daarmee omgegaan?', type: 'textarea', hint: '' },
      { key: 'wat_geleerd', label: 'Wat heb je geleerd?', type: 'textarea', hint: '' },
      { key: 'wat_meenemen', label: 'Wat neem je mee naar de toekomst?', type: 'textarea', hint: '' },
      { key: 'wat_verdiepen', label: 'Wat wil je nog verdiepen?', type: 'textarea', hint: '' },
    ],
  },
];

// ─── CRUD ────────────────────────────────────────────────────────────────────

/**
 * Get all saved report sections.
 * @returns {Promise<Object[]>}
 */
export async function getAllReportSections() {
  return getAll(STORE);
}

/**
 * Get a single report section by its section id.
 * @param {string} sectionId - e.g. 'inleiding', 'reflectie'
 * @returns {Promise<Object|null>}
 */
export async function getReportSection(sectionId) {
  return getByKey(STORE, sectionId);
}

/**
 * Save (upsert) a report section.
 * @param {string} sectionId
 * @param {Record<string,string>} data - field key → value map
 * @returns {Promise<Object>}
 */
export async function saveReportSection(sectionId, data) {
  if (!sectionId) throw new Error('sectionId: required');
  const sectionDef = REPORT_SECTIONS.find(s => s.id === sectionId);
  if (!sectionDef) throw new Error(`sectionId: unknown section "${sectionId}"`);

  const now = new Date().toISOString();
  const existing = await getByKey(STORE, sectionId);

  const record = {
    id: sectionId,
    data: data || {},
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await put(STORE, record);
  return record;
}

/**
 * Delete a report section.
 * @param {string} sectionId
 */
export async function deleteReportSection(sectionId) {
  return remove(STORE, sectionId);
}

/**
 * Get the completion percentage of the full report.
 * Counts filled fields across all sections.
 * @returns {Promise<{ filled: number, total: number, percent: number }>}
 */
export async function getReportProgress() {
  const allSections = await getAllReportSections();
  const dataMap = {};
  for (const s of allSections) {
    dataMap[s.id] = s.data || {};
  }

  let filled = 0;
  let total = 0;

  for (const section of REPORT_SECTIONS) {
    for (const field of section.fields) {
      total++;
      const val = dataMap[section.id]?.[field.key];
      if (val && String(val).trim().length > 0) {
        filled++;
      }
    }
  }

  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  return { filled, total, percent };
}
