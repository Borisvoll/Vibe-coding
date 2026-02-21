/**
 * BPV module — TrackerEntry CRUD
 *
 * Wraps the existing `hours` and `logbook` IndexedDB stores with a clean,
 * typed API. All mutations go through this module; blocks never write
 * directly to the raw stores.
 */
import {
  getAll, getByKey, put, remove,
  getHoursByDate, getHoursByWeek, getLogbookByWeek,
  getAllHoursSorted,
} from '../db.js';
import {
  getISOWeek, getWeekDates, calcNetMinutes, formatMinutes,
} from '../utils.js';
import { WEEKLY_GOAL_HOURS } from '../constants.js';

const HOURS_STORE = 'hours';
const LOGBOOK_STORE = 'logbook';
const WEEKLY_TARGET_MINUTES = WEEKLY_GOAL_HOURS * 60;

// ─── Hours entries (TrackerEntry) ────────────────────────────────────────────

/**
 * Upsert a hours entry for a given date.
 * If an entry already exists for that date its id is preserved (update).
 */
export async function addHoursEntry(date, {
  type = 'work',
  startTime = null,
  endTime = null,
  breakMinutes = 0,
  note = '',
} = {}) {
  if (!date) throw new Error('date: required');
  const week = getISOWeek(date);
  const isWork = type === 'work';
  const netMinutes = (isWork && startTime && endTime)
    ? calcNetMinutes(startTime, endTime, Number(breakMinutes))
    : 0;

  const existing = await getHoursByDate(date);
  const now = new Date().toISOString();
  const entry = {
    id: existing?.id || crypto.randomUUID(),
    date,
    week,
    type,
    startTime: isWork ? (startTime || null) : null,
    endTime: isWork ? (endTime || null) : null,
    breakMinutes: isWork ? Number(breakMinutes) : 0,
    netMinutes,
    note: String(note || '').trim(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await put(HOURS_STORE, entry);
  return entry;
}

export async function getHoursEntry(date) {
  return getHoursByDate(date);
}

export async function updateHoursEntry(id, changes) {
  const entry = await getByKey(HOURS_STORE, id);
  if (!entry) return null;
  const now = new Date().toISOString();
  const updated = { ...entry, ...changes, id, updatedAt: now };
  const isWork = updated.type === 'work';
  if (isWork && updated.startTime && updated.endTime) {
    updated.netMinutes = calcNetMinutes(
      updated.startTime, updated.endTime, updated.breakMinutes || 0,
    );
  } else if (!isWork) {
    updated.netMinutes = 0;
    updated.startTime = null;
    updated.endTime = null;
  }
  await put(HOURS_STORE, updated);
  return updated;
}

export async function deleteHoursEntry(id) {
  return remove(HOURS_STORE, id);
}

// ─── Weekly overview ──────────────────────────────────────────────────────────

const DAY_LABELS_NL = ['ma', 'di', 'wo', 'do', 'vr'];

/**
 * Aggregate hours + logbook for a given ISO week string ("YYYY-Wnn").
 * Returns:
 *   { weekStr, totalMinutes, targetMinutes, percentComplete,
 *     days: [{date, day, type, netMinutes, logged, hasLogbook}],
 *     highlights: [{date, text}] }
 */
export async function getWeeklyOverview(weekStr) {
  const [hoursRecords, logbookRecords] = await Promise.all([
    getHoursByWeek(weekStr),
    getLogbookByWeek(weekStr),
  ]);

  const weekDates = getWeekDates(weekStr);
  const days = weekDates.map((date, i) => {
    const h = hoursRecords.find((r) => r.date === date) || null;
    const lb = logbookRecords.find((r) => r.date === date) || null;
    return {
      date,
      day: DAY_LABELS_NL[i],
      type: h?.type || null,
      netMinutes: h?.netMinutes || 0,
      formattedTime: h ? formatMinutes(h.netMinutes || 0) : null,
      logged: h !== null,
      hasLogbook: lb !== null,
    };
  });

  // Sum all records for the week (including weekends), not just Mon-Fri grid
  const totalMinutes = hoursRecords.reduce((sum, r) => sum + (r.netMinutes || 0), 0);
  const percentComplete = Math.min(100, Math.round((totalMinutes / WEEKLY_TARGET_MINUTES) * 100));

  const highlights = logbookRecords
    .filter((r) => r.description)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      text: r.description.length > 120
        ? r.description.slice(0, 120) + '…'
        : r.description,
    }));

  return {
    weekStr,
    totalMinutes,
    targetMinutes: WEEKLY_TARGET_MINUTES,
    formattedTotal: formatMinutes(totalMinutes),
    formattedTarget: formatMinutes(WEEKLY_TARGET_MINUTES),
    percentComplete,
    days,
    highlights,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Export all hours (+ matching logbook) as CSV or JSON string.
 * @param {'csv'|'json'} format
 * @returns {string}
 */
export async function exportEntries(format = 'csv') {
  const [allHours, allLogbook] = await Promise.all([
    getAllHoursSorted(),
    getAll(LOGBOOK_STORE),
  ]);

  const rows = allHours.map((h) => {
    const lb = allLogbook.find((l) => l.date === h.date);
    return {
      date: h.date,
      week: h.week,
      type: h.type,
      startTime: h.startTime || '',
      endTime: h.endTime || '',
      breakMinutes: h.breakMinutes ?? 0,
      netMinutes: h.netMinutes ?? 0,
      netHours: +((h.netMinutes || 0) / 60).toFixed(2),
      note: h.note || '',
      description: lb?.description || '',
      tags: lb?.tags || [],
    };
  });

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  // CSV
  const header = 'datum,week,type,start,einde,pauze_min,netto_min,netto_uren,notitie,omschrijving,tags';
  const csvRows = rows.map((r) => [
    r.date,
    r.week,
    r.type,
    r.startTime,
    r.endTime,
    r.breakMinutes,
    r.netMinutes,
    r.netHours,
    `"${r.note.replace(/"/g, '""')}"`,
    `"${r.description.replace(/"/g, '""')}"`,
    `"${r.tags.join(', ')}"`,
  ].join(','));

  return [header, ...csvRows].join('\n');
}
