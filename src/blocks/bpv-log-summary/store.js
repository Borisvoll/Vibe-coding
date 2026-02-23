import { getHoursByDate, getAll } from '../../db.js';
import { getToday, formatMinutes } from '../../utils.js';

export async function getTodayHours() {
  const today = getToday();
  return getHoursByDate(today);
}

export async function getTodayLogbook() {
  const today = getToday();
  const all = await getAll('logbook');
  return all.find((entry) => entry.date === today) || null;
}

export function formatHoursSummary(hours) {
  if (!hours) return null;
  const net = hours.netMinutes || 0;
  return {
    formatted: formatMinutes(net),
    detail: hours.type === 'work'
      ? `${hours.startTime || '?'}–${hours.endTime || '?'}, ${hours.breakMinutes || 0}m pauze`
      : hours.type || 'werk',
  };
}
