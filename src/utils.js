import { BPV_START, BPV_END, WEEKDAYS, MONTHS_NL } from './constants.js';

/**
 * Generate a UUID v4
 */
export function generateId() {
  return crypto.randomUUID();
}

/**
 * Get ISO week string "YYYY-Wnn" for a given date string "YYYY-MM-DD"
 */
export function getISOWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  yearStart.setDate(yearStart.getDate() - ((yearStart.getDay() + 6) % 7));
  const weekNum = Math.round((d - yearStart) / 604800000) + 1;
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get array of 5 weekday date strings (Mon-Fri) for a given week string "YYYY-Wnn"
 */
export function getWeekDates(weekStr) {
  const [year, weekPart] = weekStr.split('-W');
  const weekNum = parseInt(weekPart, 10);

  // Find Jan 4 of the year (always in week 1)
  const jan4 = new Date(parseInt(year, 10), 0, 4);
  // Find Monday of week 1
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));

  // Go to the requested week
  const monday = new Date(mondayOfWeek1);
  monday.setDate(mondayOfWeek1.getDate() + (weekNum - 1) * 7);

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDateISO(d));
  }
  return dates;
}

/**
 * Format Date object to "YYYY-MM-DD"
 */
export function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format "YYYY-MM-DD" to readable Dutch: "ma 9 feb"
 */
export function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dayIdx = (d.getDay() + 6) % 7; // 0=Mon
  const dayName = WEEKDAYS[dayIdx] || '??';
  const dayNum = d.getDate();
  const month = MONTHS_NL[d.getMonth()];
  return `${dayName} ${dayNum} ${month}`;
}

/**
 * Format "YYYY-MM-DD" to "9 februari 2026"
 */
export function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const monthsFull = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${d.getDate()} ${monthsFull[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format "YYYY-MM-DD" to "(09-02-2026)" style reference
 */
export function formatDateRef(dateStr) {
  const parts = dateStr.split('-');
  return `(${parts[2]}-${parts[1]}-${parts[0]})`;
}

/**
 * Calculate net minutes from start/end time strings and break minutes
 */
export function calcNetMinutes(startTime, endTime, breakMinutes = 0) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, totalMin - breakMinutes);
}

/**
 * Format minutes to "7u 30m"
 */
export function formatMinutes(min) {
  if (min === 0) return '0u';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}u`;
  if (h === 0) return `${m}m`;
  return `${h}u ${m}m`;
}

/**
 * Format minutes to decimal hours "7.5"
 */
export function formatHoursDecimal(min) {
  return (min / 60).toFixed(1);
}

/**
 * Check if date is within BPV period
 */
export function isWithinBPV(dateStr) {
  return dateStr >= BPV_START && dateStr <= BPV_END;
}

/**
 * Get all week strings in the BPV period
 */
export function getWeeksInBPV() {
  const weeks = [];
  const start = new Date(BPV_START + 'T00:00:00');
  const end = new Date(BPV_END + 'T00:00:00');
  const current = new Date(start);

  const seen = new Set();
  while (current <= end) {
    const w = getISOWeek(formatDateISO(current));
    if (!seen.has(w)) {
      seen.add(w);
      weeks.push(w);
    }
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

/**
 * Get the current week string, clamped to BPV period
 */
export function getCurrentWeek() {
  const today = formatDateISO(new Date());
  const week = getISOWeek(today);
  const weeks = getWeeksInBPV();
  if (weeks.includes(week)) return week;
  // If before BPV, return first week; if after, return last
  if (today < BPV_START) return weeks[0];
  return weeks[weeks.length - 1];
}

/**
 * Get today's date as "YYYY-MM-DD"
 */
export function getToday() {
  return formatDateISO(new Date());
}

/**
 * Debounce a function
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Resize an image File/Blob to a thumbnail (max dimension)
 * Returns a Promise<Blob>
 */
export async function resizeImage(file, maxPx = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height) {
        if (width > maxPx) { height = (height * maxPx) / width; width = maxPx; }
      } else {
        if (height > maxPx) { width = (width * maxPx) / height; height = maxPx; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', 0.8);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

/**
 * Escape HTML entities
 */
export function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Truncate text to max length
 */
export function truncate(str, max = 120) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max) + '...';
}

/**
 * Parse week string to week number
 */
export function weekNumber(weekStr) {
  return parseInt(weekStr.split('-W')[1], 10);
}

/**
 * Days remaining in BPV from today
 */
export function daysRemainingInBPV() {
  const today = new Date();
  const end = new Date(BPV_END + 'T00:00:00');
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}
