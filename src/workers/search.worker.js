/**
 * Search Web Worker — maintains an in-memory flat index for fast fuzzy search.
 *
 * Message protocol (main → worker):
 *   { type: 'SEARCH',        query: string, id: number }
 *   { type: 'REBUILD_STORE', store: string }
 *
 * Message protocol (worker → main):
 *   { type: 'RESULTS', id: number, groups: GroupResult[] }
 *   { type: 'READY' }
 *   { type: 'ERROR',  message: string }
 */

import { initDB, getAll } from '../db.js';
import { fuzzyScore, fuzzyScoreMulti, GROUP_META, GROUP_ORDER } from '../stores/search.js';

const THRESHOLD = 0.3;
const MAX_PER_GROUP = 6;

/** Flat in-memory index entry */
// { type, id, title, subtitle, date, fields: string[] }
let index = null;
let dbReady = false;
let initPromise = null;

async function ensureDB() {
  if (dbReady) return;
  if (initPromise) return initPromise;
  initPromise = initDB().then(() => { dbReady = true; });
  return initPromise;
}

function safeGetAll(store) {
  return getAll(store).catch(() => []);
}

/**
 * Build the full in-memory search index from IndexedDB.
 * Each entry has a `fields` array used for fuzzy matching.
 */
async function buildIndex() {
  await ensureDB();

  const [tasks, inbox, projects, hours, logbook, dailyPlans, wellbeing] = await Promise.all([
    safeGetAll('os_tasks'),
    safeGetAll('os_inbox'),
    safeGetAll('os_projects'),
    safeGetAll('hours'),
    safeGetAll('logbook'),
    safeGetAll('dailyPlans'),
    safeGetAll('os_personal_wellbeing'),
  ]);

  const entries = [];

  for (const t of tasks) {
    entries.push({ type: 'task', id: t.id, title: t.text, subtitle: `${t.mode || ''} · ${t.status}`, date: t.date, fields: [t.text] });
  }

  for (const item of inbox) {
    entries.push({ type: 'inbox', id: item.id, title: item.text, subtitle: `${item.type || 'gedachte'} · ${item.status}`, date: item.createdAt?.slice(0, 10), fields: [item.text] });
  }

  for (const p of projects) {
    entries.push({ type: 'project', id: p.id, title: p.title, subtitle: `${p.mode || ''} · ${p.status}`, date: p.updated_at?.slice(0, 10), fields: [p.title, p.goal].filter(Boolean) });
  }

  for (const h of hours) {
    const text = h.note || h.description || `${h.type} — ${h.date}`;
    entries.push({ type: 'hours', id: h.id, title: text, subtitle: `BPV · ${h.date}`, date: h.date, fields: [text] });
  }

  for (const entry of logbook) {
    const text = entry.text || entry.description || `Logboek ${entry.date}`;
    entries.push({ type: 'logbook', id: entry.id, title: text, subtitle: `Logboek · ${entry.date}`, date: entry.date, fields: [text, ...(entry.tags || [])] });
  }

  for (const dp of dailyPlans) {
    const taskTexts = (dp.tasks || []).map((t) => t.text || '').filter(Boolean);
    entries.push({ type: 'daily', id: dp.id, title: taskTexts.join(', ') || `Dagplan ${dp.date}`, subtitle: `Dagplan · ${dp.date}`, date: dp.date, fields: [...taskTexts, dp.evaluation || ''] });
  }

  for (const w of wellbeing) {
    const fields = [w.gratitude, w.reflection, w.journalNote, w.mood].filter(Boolean);
    const title = w.journalNote || w.gratitude || w.reflection || `Wellbeing ${w.date || w.id}`;
    entries.push({ type: 'journal', id: w.id, title, subtitle: `Dagboek · ${w.date || w.id}`, date: w.date || w.id, fields });
  }

  index = entries;
}

/**
 * Rebuild only the entries belonging to a specific IDB store name.
 * Called when the main thread signals an IDB mutation.
 */
async function rebuildStore(storeName) {
  if (!index) return; // full build hasn't run yet — next SEARCH will trigger it

  await ensureDB();
  const storeToType = {
    os_tasks: 'task',
    os_inbox: 'inbox',
    os_projects: 'project',
    hours: 'hours',
    logbook: 'logbook',
    dailyPlans: 'daily',
    os_personal_wellbeing: 'journal',
  };

  const type = storeToType[storeName];
  if (!type) return;

  // Remove stale entries for this type
  index = index.filter((e) => e.type !== type);

  // Re-read and append fresh entries
  const records = await safeGetAll(storeName);

  for (const r of records) {
    switch (type) {
      case 'task':
        index.push({ type: 'task', id: r.id, title: r.text, subtitle: `${r.mode || ''} · ${r.status}`, date: r.date, fields: [r.text] });
        break;
      case 'inbox':
        index.push({ type: 'inbox', id: r.id, title: r.text, subtitle: `${r.type || 'gedachte'} · ${r.status}`, date: r.createdAt?.slice(0, 10), fields: [r.text] });
        break;
      case 'project':
        index.push({ type: 'project', id: r.id, title: r.title, subtitle: `${r.mode || ''} · ${r.status}`, date: r.updated_at?.slice(0, 10), fields: [r.title, r.goal].filter(Boolean) });
        break;
      case 'hours': {
        const text = r.note || r.description || `${r.type} — ${r.date}`;
        index.push({ type: 'hours', id: r.id, title: text, subtitle: `BPV · ${r.date}`, date: r.date, fields: [text] });
        break;
      }
      case 'logbook': {
        const text = r.text || r.description || `Logboek ${r.date}`;
        index.push({ type: 'logbook', id: r.id, title: text, subtitle: `Logboek · ${r.date}`, date: r.date, fields: [text, ...(r.tags || [])] });
        break;
      }
      case 'daily': {
        const taskTexts = (r.tasks || []).map((t) => t.text || '').filter(Boolean);
        index.push({ type: 'daily', id: r.id, title: taskTexts.join(', ') || `Dagplan ${r.date}`, subtitle: `Dagplan · ${r.date}`, date: r.date, fields: [...taskTexts, r.evaluation || ''] });
        break;
      }
      case 'journal': {
        const fields = [r.gratitude, r.reflection, r.journalNote, r.mood].filter(Boolean);
        const title = r.journalNote || r.gratitude || r.reflection || `Wellbeing ${r.date || r.id}`;
        index.push({ type: 'journal', id: r.id, title, subtitle: `Dagboek · ${r.date || r.id}`, date: r.date || r.id, fields });
        break;
      }
    }
  }
}

/**
 * Search the in-memory index and return grouped results.
 */
function searchIndex(query) {
  if (!index || !query || query.trim().length < 2) return [];
  const q = query.trim();

  const flat = [];
  for (const entry of index) {
    const score = fuzzyScoreMulti(entry.fields, q);
    if (score >= THRESHOLD) {
      flat.push({ type: entry.type, id: entry.id, title: entry.title, subtitle: entry.subtitle, date: entry.date, score });
    }
  }

  // Sort: higher score first, ties broken by recency
  flat.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.05) return b.score - a.score;
    return (b.date || '').localeCompare(a.date || '');
  });

  // Group by type
  const byType = new Map();
  for (const result of flat) {
    if (!byType.has(result.type)) byType.set(result.type, []);
    byType.get(result.type).push(result);
  }

  // Sort within each group by recency
  for (const items of byType.values()) {
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  const seen = new Set();
  const groups = [];

  for (const type of [...GROUP_ORDER, ...byType.keys()]) {
    if (seen.has(type) || !byType.has(type)) continue;
    seen.add(type);

    const items = byType.get(type);
    const meta = GROUP_META[type] || { label: type, icon: '·', tab: 'today', focus: null };

    groups.push({
      type,
      label: meta.label,
      icon: meta.icon,
      tab: meta.tab,
      focus: meta.focus,
      items,
      visibleCount: Math.min(items.length, MAX_PER_GROUP),
    });
  }

  return groups;
}

// ── Message handler ────────────────────────────────────────────────────────

self.onmessage = async (e) => {
  const { type, query, id, store } = e.data;

  try {
    if (type === 'SEARCH') {
      if (!index) await buildIndex();
      const groups = searchIndex(query);
      self.postMessage({ type: 'RESULTS', id, groups });
      return;
    }

    if (type === 'REBUILD_STORE') {
      await rebuildStore(store);
      return;
    }

    if (type === 'INIT') {
      await buildIndex();
      self.postMessage({ type: 'READY' });
      return;
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', id, message: err.message });
  }
};
