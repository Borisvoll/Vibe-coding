import { getAll, getByIndexRange } from '../db.js';

const THRESHOLD = 0.3;
const DEFAULT_SEARCH_LIMIT = 30;
const SEARCH_DATE_WINDOW_DAYS = 365;

/**
 * Maps each result type to display metadata and navigation target.
 * Exported for use in command-palette, tests, and Web Worker.
 */
export const GROUP_META = {
  project: { label: 'Projecten', icon: '🚀', tab: 'projects', focus: null },
  task:    { label: 'Taken',     icon: '✓',  tab: 'today',    focus: 'tasks' },
  inbox:   { label: 'Inbox',     icon: '📥', tab: 'inbox',    focus: null },
  daily:   { label: 'Dagplannen',icon: '📅', tab: 'today',    focus: null },
  journal: { label: 'Dagboek',   icon: '📓', tab: 'today',    focus: 'reflection' },
  hours:   { label: 'Uren',      icon: '⏱',  tab: 'today',    focus: 'mode' },
  logbook: { label: 'Logboek',   icon: '📋', tab: 'today',    focus: 'mode' },
};

// Preferred display order for groups in the palette
export const GROUP_ORDER = ['project', 'task', 'inbox', 'daily', 'journal', 'hours', 'logbook'];

/**
 * Fuzzy match score — returns 0.0–1.0, or -1 if no match / below threshold.
 *
 * Scoring:
 *  • Exact full-string match        → 1.0
 *  • Exact substring at word-start  → 1.0
 *  • Exact substring mid-string     → 0.7–1.0 (position-adjusted)
 *  • Ordered subsequence match      → 0.3–0.65 (density + boundary bonuses)
 *  • No match / below threshold     → -1
 *
 * Exported for use in the Web Worker (no DB dependency, pure function).
 */
export function fuzzyScore(text, query) {
  if (!text || !query) return -1;
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  if (t === q) return 1.0;

  // Exact substring match
  const exactIdx = t.indexOf(q);
  if (exactIdx >= 0) {
    if (exactIdx === 0) return 1.0; // starts the string — top relevance
    if (t[exactIdx - 1] === ' ' || t[exactIdx - 1] === '-') return 0.95; // word boundary
    // Mid-string: decrease slightly with depth
    const pos = exactIdx / Math.max(t.length - q.length, 1);
    return Math.max(0.7, 0.94 - pos * 0.24);
  }

  // Subsequence: all query chars must appear in-order within text
  let qi = 0;
  let consecutive = 0;
  let bonus = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      consecutive++;
      if (consecutive > 1) bonus += 0.05 * consecutive;
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-' || t[ti - 1] === '_') {
        bonus += 0.1; // word-boundary bonus
      }
      qi++;
    } else {
      consecutive = 0;
    }
  }

  if (qi < q.length) return -1; // not all chars matched

  // Density: matched chars vs total text length, capped below exact-match range
  const density = q.length / t.length;
  const score = Math.min(0.65, density * 1.5 + bonus);
  return score >= THRESHOLD ? score : -1;
}

/**
 * Returns the best fuzzy score across multiple text fields.
 * Exported for use in the Web Worker.
 */
export function fuzzyScoreMulti(fields, query) {
  let best = -1;
  for (const f of fields) {
    const s = fuzzyScore(f, query);
    if (s > best) best = s;
  }
  return best;
}

function safeGetAll(store) {
  return getAll(store).catch(() => []);
}

function safeGetByRange(store, index, lower, upper) {
  return getByIndexRange(store, index, lower, upper).catch(() => []);
}

function dateNDaysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

/**
 * Global fuzzy search across all major stores.
 * Returns flat array sorted by score (desc) then date (desc).
 *
 * Uses date-bounded queries for time-series stores to avoid full scans.
 * Results capped at `limit` (default 30).
 */
export async function globalSearch(query, { limit = DEFAULT_SEARCH_LIMIT } = {}) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const dateFloor = dateNDaysAgo(SEARCH_DATE_WINDOW_DAYS);

  // Use bounded queries for time-series stores; full scan only for small stores
  const [tasks, inbox, projects, hours, logbook, dailyPlans, wellbeing] = await Promise.all([
    safeGetByRange('os_tasks', 'date', dateFloor, '9999-12-31'),
    safeGetAll('os_inbox'),
    safeGetAll('os_projects'),
    safeGetByRange('hours', 'date', dateFloor, '9999-12-31'),
    safeGetByRange('logbook', 'date', dateFloor, '9999-12-31'),
    safeGetByRange('dailyPlans', 'date', dateFloor, '9999-12-31'),
    safeGetAll('os_personal_wellbeing'),
  ]);

  const results = [];

  for (const t of tasks) {
    const score = fuzzyScore(t.text, q);
    if (score >= 0) results.push({ type: 'task', id: t.id, title: t.text, subtitle: `${t.mode || ''} · ${t.status}`, date: t.date, score });
  }

  for (const item of inbox) {
    const score = fuzzyScore(item.text, q);
    if (score >= 0) results.push({ type: 'inbox', id: item.id, title: item.text, subtitle: `${item.type || 'gedachte'} · ${item.status}`, date: item.createdAt?.slice(0, 10), score });
  }

  for (const p of projects) {
    const score = fuzzyScoreMulti([p.title, p.goal], q);
    if (score >= 0) results.push({ type: 'project', id: p.id, title: p.title, subtitle: `${p.mode || ''} · ${p.status}`, date: p.updated_at?.slice(0, 10), score });
  }

  for (const h of hours) {
    const score = fuzzyScore(h.note || h.description || '', q);
    if (score >= 0) results.push({ type: 'hours', id: h.id, title: h.note || h.description || `${h.type} — ${h.date}`, subtitle: `BPV · ${h.date}`, date: h.date, score });
  }

  for (const entry of logbook) {
    const fields = [entry.text || entry.description || '', ...(entry.tags || [])];
    const score = fuzzyScoreMulti(fields, q);
    if (score >= 0) results.push({ type: 'logbook', id: entry.id, title: entry.text || entry.description || `Logboek ${entry.date}`, subtitle: `Logboek · ${entry.date}`, date: entry.date, score });
  }

  for (const dp of dailyPlans) {
    const taskTexts = (dp.tasks || []).map((t) => t.text || '').filter(Boolean);
    const fields = [...taskTexts, dp.evaluation || ''];
    const score = fuzzyScoreMulti(fields, q);
    if (score >= 0) results.push({ type: 'daily', id: dp.id, title: taskTexts.join(', ') || `Dagplan ${dp.date}`, subtitle: `Dagplan · ${dp.date}`, date: dp.date, score });
  }

  for (const w of wellbeing) {
    const fields = [w.gratitude, w.reflection, w.journalNote, w.mood].filter(Boolean);
    const score = fuzzyScoreMulti(fields, q);
    if (score >= 0) results.push({ type: 'journal', id: w.id, title: w.journalNote || w.gratitude || w.reflection || `Wellbeing ${w.date || w.id}`, subtitle: `Dagboek · ${w.date || w.id}`, date: w.date || w.id, score });
  }

  // Higher score = more relevant; ties (same score) broken by recency
  results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return (b.date || '').localeCompare(a.date || '');
  });

  return results.slice(0, limit);
}

/**
 * Grouped search results for the command palette.
 *
 * Returns an array of group objects:
 *   { type, label, icon, tab, focus, items, visibleCount }
 *
 * - `items`        — full list of matching items (sorted by recency)
 * - `visibleCount` — how many the UI should show initially (= Math.min(items.length, maxPerGroup))
 *
 * The UI can increment `visibleCount` for "Show more" without re-querying.
 */
export async function globalSearchGrouped(query, { maxPerGroup = 6 } = {}) {
  if (!query || query.trim().length < 2) return [];
  const flat = await globalSearch(query);

  // Group by type
  const byType = new Map();
  for (const result of flat) {
    if (!byType.has(result.type)) byType.set(result.type, []);
    byType.get(result.type).push(result);
  }

  // Sort within each group by recency (newest first)
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
      visibleCount: Math.min(items.length, maxPerGroup),
    });
  }

  return groups;
}
