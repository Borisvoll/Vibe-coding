/**
 * Report store — BPV internship report CRUD
 *
 * Persists report sections to the `os_report` IndexedDB store.
 * Each section is stored as a separate record keyed by section id.
 * All mutations go through this module; UI never writes directly.
 */
import { getAll, getByKey, put, remove } from '../db.js';
import { ASSIGNMENT_TYPES, BPV_START, BPV_END } from '../constants.js';

const STORE = 'os_report';

/**
 * Report section definitions — the LiS internship report structure.
 * Each section has an id, title, and fields array.
 */
export const REPORT_SECTIONS = [
  {
    id: 'inleiding',
    title: '1. Inleiding',
    description: 'Korte uitleg over je stage, het bedrijf en de periode.',
    fields: [
      { key: 'stage_uitleg', label: 'Wat voor stage doe/deed je?', type: 'textarea', hint: 'Korte omschrijving van je stageplaats en wat je er doet.' },
      { key: 'bedrijf', label: 'Bij welk bedrijf?', type: 'textarea', hint: 'Naam, locatie, branche.' },
      { key: 'periode', label: 'Stageperiode', type: 'text', hint: `Bijv. ${BPV_START} t/m ${BPV_END}` },
    ],
  },
  {
    id: 'bedrijfsorientatie',
    title: '2. Bedrijfsoriëntatie',
    description: 'Wat doet het bedrijf, welke afdelingen zijn er, en waar zit jij?',
    fields: [
      { key: 'wat_doet_bedrijf', label: 'Wat doet het bedrijf?', type: 'textarea', hint: 'Producten, diensten, klanten.' },
      { key: 'afdelingen', label: 'Welke afdelingen zijn er?', type: 'textarea', hint: 'Bijv. productie, kwaliteit, assemblage, kantoor.' },
      { key: 'jouw_plek', label: 'Jouw plek binnen het bedrijf', type: 'textarea', hint: 'Op welke afdeling werk je? Wat is je rol?' },
    ],
  },
  {
    id: 'bedrijfsprocessen',
    title: '3. Bedrijfsprocessen',
    description: 'Hoe werkt het bedrijf? Productie, kwaliteit, workflow.',
    fields: [
      { key: 'productieproces', label: 'Productieproces', type: 'textarea', hint: 'Beschrijf het productieproces stap voor stap.' },
      { key: 'kwaliteit', label: 'Kwaliteitscontrole', type: 'textarea', hint: 'Hoe wordt kwaliteit gewaarborgd? Meetinstrumenten, toleranties.' },
      { key: 'machines', label: 'Machines & gereedschappen', type: 'textarea', hint: 'Welke machines en gereedschappen worden er gebruikt?' },
      { key: 'workflow', label: 'Workflow / werkstroom', type: 'textarea', hint: 'Hoe gaat een opdracht van begin tot eind?' },
    ],
  },
  {
    id: 'leerdoelen',
    title: '4. Persoonlijke leerdoelen',
    description: 'Jouw SMART leerdoelen voor de stage.',
    fields: ASSIGNMENT_TYPES.leerdoelen.fields,
  },
  {
    id: 'product',
    title: '5. Product / Project',
    description: 'Beschrijf een product of project waar je aan gewerkt hebt.',
    fields: ASSIGNMENT_TYPES.productgericht.fields,
  },
  {
    id: 'engels',
    title: '6. Engelse productuitleg',
    description: 'Beschrijf een product of proces in het Engels (120-180 woorden).',
    fields: [
      { key: 'english_description', label: 'Product/process description (English)', type: 'textarea', hint: 'Write 120-180 words in English explaining a product or process you worked on.' },
    ],
  },
  {
    id: 'reflectie',
    title: '7. Reflectie',
    description: 'Terugblik op je stage-ervaring.',
    fields: ASSIGNMENT_TYPES.reflectie.fields,
  },
  {
    id: 'bijlagen',
    title: '8. Bijlagen',
    description: "Foto's, tekeningen, schema's — beschrijf wat je wilt bijvoegen.",
    fields: [
      { key: 'bijlagen_notities', label: 'Bijlagen notities', type: 'textarea', hint: "Beschrijf welke foto's, tekeningen of schema's je wilt bijvoegen." },
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
