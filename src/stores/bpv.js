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
  getAllHoursSorted, getPhotosByLogbookId,
} from '../db.js';
import {
  getISOWeek, getWeekDates, calcNetMinutes, formatMinutes, formatDateISO, getToday,
} from '../utils.js';
import { WEEKLY_GOAL_HOURS, BPV_TOTAL_GOAL_HOURS, BPV_START, BPV_END } from '../constants.js';

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
  activities = [],
} = {}) {
  if (!date) throw new Error('date: required');
  const week = getISOWeek(date);
  const isWork = type === 'work';
  const netMinutes = (isWork && startTime && endTime)
    ? calcNetMinutes(startTime, endTime, Number(breakMinutes))
    : 0;

  const existing = await getHoursByDate(date);
  const now = new Date().toISOString();
  // Sanitize activities: always an array of 3 strings
  const cleanActivities = normalizeActivities(activities, existing?.activities);
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
    activities: cleanActivities,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await put(HOURS_STORE, entry);
  return entry;
}

/**
 * Normalize activities to always be an array of 3 trimmed strings.
 * Merges with existing activities when the new array is empty.
 */
function normalizeActivities(incoming, existing) {
  const src = Array.isArray(incoming) && incoming.some(a => a && String(a).trim())
    ? incoming
    : (Array.isArray(existing) ? existing : []);
  const result = [];
  for (let i = 0; i < 3; i++) {
    result.push(String(src[i] || '').trim().slice(0, 200));
  }
  return result;
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
  if (changes.activities) {
    updated.activities = normalizeActivities(changes.activities, entry.activities);
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
    const acts = Array.isArray(h?.activities) ? h.activities : [];
    return {
      date,
      day: DAY_LABELS_NL[i],
      type: h?.type || null,
      netMinutes: h?.netMinutes || 0,
      formattedTime: h ? formatMinutes(h.netMinutes || 0) : null,
      logged: h !== null,
      hasLogbook: lb !== null,
      activities: acts,
      hasActivities: acts.some(a => a && a.trim()),
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

// ─── Photos ──────────────────────────────────────────────────────────────────

const PHOTOS_STORE = 'photos';

/**
 * Add a photo linked to a date's hours entry.
 * Uses the hours entry ID as the logbookId reference in the photos store.
 * @param {string} date - YYYY-MM-DD
 * @param {string} dataUrl - base64 data URL of the photo
 * @returns {Promise<Object>} the saved photo record
 */
export async function addPhoto(date, dataUrl) {
  if (!date || !dataUrl) throw new Error('date and dataUrl required');
  const hoursEntry = await getHoursByDate(date);
  const parentId = hoursEntry?.id || `photo-${date}`;
  const photo = {
    id: crypto.randomUUID(),
    logbookId: parentId,
    date,
    data: dataUrl,
    createdAt: new Date().toISOString(),
  };
  await put(PHOTOS_STORE, photo);
  return photo;
}

/**
 * Get all photos for a given date.
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function getPhotosForDate(date) {
  const hoursEntry = await getHoursByDate(date);
  if (!hoursEntry) {
    // Fallback: search by photo-{date} pattern
    const allPhotos = await getAll(PHOTOS_STORE);
    return allPhotos.filter(p => p.date === date);
  }
  const photos = await getPhotosByLogbookId(hoursEntry.id);
  // Also include any photos saved before an hours entry existed
  const fallback = await getAll(PHOTOS_STORE);
  const extraPhotos = fallback.filter(p => p.date === date && p.logbookId !== hoursEntry.id);
  return [...photos, ...extraPhotos];
}

/**
 * Delete a photo by ID.
 */
export async function deletePhoto(id) {
  return remove(PHOTOS_STORE, id);
}

// ─── Total BPV progress ──────────────────────────────────────────────────────

/**
 * Get total BPV progress: all hours logged across entire period vs goal.
 */
export async function getTotalProgress() {
  const allHours = await getAllHoursSorted();
  const totalMinutes = allHours.reduce((sum, h) => sum + (h.netMinutes || 0), 0);
  const goalMinutes = BPV_TOTAL_GOAL_HOURS * 60;
  const percentComplete = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100));
  const totalWorkDays = allHours.filter(h => h.type === 'work').length;

  // Calculate remaining weekdays in BPV
  const today = getToday();
  const end = new Date(BPV_END + 'T00:00:00');
  let remainingWorkdays = 0;
  const cursor = new Date(Math.max(new Date(today + 'T00:00:00'), new Date(BPV_START + 'T00:00:00')));
  while (cursor <= end) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) remainingWorkdays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  const remainingMinutes = Math.max(0, goalMinutes - totalMinutes);

  return {
    totalMinutes,
    goalMinutes,
    percentComplete,
    totalWorkDays,
    remainingMinutes,
    remainingWorkdays,
    formattedTotal: formatMinutes(totalMinutes),
    formattedGoal: formatMinutes(goalMinutes),
    formattedRemaining: formatMinutes(remainingMinutes),
  };
}

/**
 * Check if today has been logged.
 */
export async function isTodayLogged() {
  const today = getToday();
  const entry = await getHoursByDate(today);
  return !!entry;
}

/**
 * Get consecutive log streak (days in a row with entries, counting back from today).
 */
export async function getLogStreak() {
  const allHours = await getAllHoursSorted();
  const filledDates = new Set(allHours.map(h => h.date));
  const today = new Date();
  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const dateStr = formatDateISO(cursor);
    if (dateStr < BPV_START) break;
    const dow = cursor.getDay();
    // Skip weekends
    if (dow === 0 || dow === 6) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (filledDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Get unlogged weekdays in the current week.
 */
export async function getUnloggedDays(weekStr) {
  const dates = getWeekDates(weekStr);
  const today = getToday();
  const results = [];
  for (const date of dates) {
    if (date > today) continue;
    if (date < BPV_START || date > BPV_END) continue;
    const entry = await getHoursByDate(date);
    if (!entry) results.push(date);
  }
  return results;
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
    const acts = Array.isArray(h.activities) ? h.activities : [];
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
      activities: acts,
      description: lb?.description || '',
      tags: lb?.tags || [],
    };
  });

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  // CSV
  const header = 'datum,week,type,start,einde,pauze_min,netto_min,netto_uren,notitie,activiteit_1,activiteit_2,activiteit_3,omschrijving,tags';
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
    `"${(r.activities[0] || '').replace(/"/g, '""')}"`,
    `"${(r.activities[1] || '').replace(/"/g, '""')}"`,
    `"${(r.activities[2] || '').replace(/"/g, '""')}"`,
    `"${r.description.replace(/"/g, '""')}"`,
    `"${r.tags.join(', ')}"`,
  ].join(','));

  return [header, ...csvRows].join('\n');
}

/**
 * Generate HTML for a printable PDF BPV report.
 * Opens a new window with print-ready content (uren + activiteiten + logboek).
 */
export async function generatePDFReport() {
  const [allHours, allLogbook] = await Promise.all([
    getAllHoursSorted(),
    getAll(LOGBOOK_STORE),
  ]);

  const totalMinutes = allHours.reduce((sum, h) => sum + (h.netMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const workDays = allHours.filter(h => h.type === 'work').length;

  // Group by week
  const weekMap = new Map();
  for (const h of allHours) {
    if (!weekMap.has(h.week)) weekMap.set(h.week, []);
    weekMap.get(h.week).push(h);
  }

  const escHtml = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let weeksHTML = '';
  for (const [week, entries] of [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const weekMinutes = entries.reduce((s, e) => s + (e.netMinutes || 0), 0);
    const weekHours = (weekMinutes / 60).toFixed(1);

    let rowsHTML = '';
    for (const h of entries.sort((a, b) => a.date.localeCompare(b.date))) {
      const lb = allLogbook.find(l => l.date === h.date);
      const acts = Array.isArray(h.activities) ? h.activities.filter(a => a && a.trim()) : [];
      const typeLabel = h.type === 'work' ? '' : ` (${h.type})`;
      rowsHTML += `<tr>
        <td>${escHtml(h.date)}</td>
        <td>${escHtml(h.startTime || '-')} - ${escHtml(h.endTime || '-')}${escHtml(typeLabel)}</td>
        <td>${h.breakMinutes || 0}m</td>
        <td><strong>${formatMinutes(h.netMinutes || 0)}</strong></td>
        <td>${acts.map(a => escHtml(a)).join('<br>')}</td>
        <td>${escHtml(lb?.description || '')}</td>
      </tr>`;
    }

    weeksHTML += `
      <h3 style="margin-top:24px;color:#333;">Week ${escHtml(week)} — ${weekHours} uur</h3>
      <table>
        <thead><tr>
          <th>Datum</th><th>Tijden</th><th>Pauze</th><th>Netto</th><th>Activiteiten</th><th>Logboek</th>
        </tr></thead>
        <tbody>${rowsHTML}</tbody>
      </table>`;
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>BPV Urenverantwoording</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; font-size: 11px; color: #222; padding: 24px; line-height: 1.4; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #666; margin-bottom: 16px; font-weight: 400; }
    h3 { font-size: 13px; margin-bottom: 8px; }
    .summary { display: flex; gap: 32px; margin-bottom: 24px; padding: 12px 16px; background: #f5f5f5; border-radius: 6px; }
    .summary-item { display: flex; flex-direction: column; }
    .summary-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; }
    .summary-item .value { font-size: 18px; font-weight: 700; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
    th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; font-weight: 600; font-size: 9px; text-transform: uppercase; }
    tr:nth-child(even) { background: #fafafa; }
    @media print {
      body { padding: 0; }
      .summary { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>BPV Urenverantwoording</h1>
  <h2>Periode: ${escHtml(BPV_START)} t/m ${escHtml(BPV_END)}</h2>
  <div class="summary">
    <div class="summary-item"><span class="label">Totaal uren</span><span class="value">${totalHours}u</span></div>
    <div class="summary-item"><span class="label">Werkdagen</span><span class="value">${workDays}</span></div>
    <div class="summary-item"><span class="label">Doel</span><span class="value">${BPV_TOTAL_GOAL_HOURS}u</span></div>
    <div class="summary-item"><span class="label">Voortgang</span><span class="value">${Math.round((totalMinutes / (BPV_TOTAL_GOAL_HOURS * 60)) * 100)}%</span></div>
  </div>
  ${weeksHTML}
</body>
</html>`;
}
