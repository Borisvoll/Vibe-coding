import { getAll } from '../db.js';

const INBOX_STORE = 'os_inbox';

// Dutch and English stop words — too common to be conceptually interesting
const STOP_WORDS = new Set([
  // Dutch
  'de', 'het', 'een', 'van', 'in', 'is', 'en', 'dat', 'op', 'te', 'voor',
  'met', 'zijn', 'ze', 'er', 'maar', 'ook', 'als', 'aan', 'door', 'dit',
  'bij', 'om', 'al', 'dan', 'nog', 'wel', 'niet', 'naar', 'je', 'ik',
  'we', 'hij', 'zo', 'kan', 'wat', 'hoe', 'wie', 'was', 'had', 'of',
  'heeft', 'meer', 'geen', 'over', 'zou', 'want', 'uit', 'werd', 'heb',
  'die', 'worden', 'wordt', 'zich', 'mijn', 'jouw', 'onze', 'hun',
  'toch', 'soms', 'altijd', 'heel', 'goed', 'even', 'eens', 'gewoon',
  'iets', 'iemand', 'elke', 'andere', 'veel', 'weinig', 'graag', 'zelf',
  // English (captures are often mixed-language)
  'the', 'and', 'or', 'but', 'not', 'for', 'with', 'this', 'that',
  'have', 'from', 'they', 'been', 'when', 'will', 'would', 'could',
  'should', 'there', 'their', 'what', 'about', 'which', 'into', 'very',
  'just', 'also', 'than', 'then', 'some', 'more', 'like', 'make',
]);

/**
 * Stable random seed from today's date (YYYY-MM-DD → integer).
 * Same day always returns the same value — no re-entry flicker.
 */
function getDaySeed() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return parseInt(d, 10) % 10000;
}

/**
 * Pick a deterministic item from an array using today's date as seed.
 */
function seedPick(arr) {
  if (!arr.length) return null;
  return arr[getDaySeed() % arr.length];
}

/**
 * Quiet relative date string in Dutch — no urgency, just orientation.
 * e.g. "37 dagen geleden", "2 maanden geleden"
 */
export function relativeDate(isoString) {
  const days = Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000);
  if (days < 1)  return 'vandaag';
  if (days === 1) return 'gisteren';
  if (days < 7)  return `${days} dagen geleden`;
  if (days < 14) return 'een week geleden';
  if (days < 30) return `${Math.floor(days / 7)} weken geleden`;
  if (days < 60) return 'een maand geleden';
  return `${Math.floor(days / 30)} maanden geleden`;
}

/**
 * VONK — A single old inbox capture from 14+ days ago.
 * Seeded by today's date so it's stable within a day.
 * Returns null when no old captures exist.
 *
 * @returns {Promise<{ text: string, dateLabel: string } | null>}
 */
export async function getVonk() {
  try {
    const all = await getAll(INBOX_STORE);
    const cutoff = Date.now() - 14 * 86400000;
    const old = all.filter(item => new Date(item.createdAt).getTime() < cutoff);
    const picked = seedPick(old);
    if (!picked) return null;
    return {
      text: picked.text,
      dateLabel: relativeDate(picked.createdAt),
    };
  } catch { return null; }
}

/**
 * DRAAD — The conceptual thread running through your captures.
 * Finds the most frequent meaningful word across all inbox items
 * (appearing in 2+ separate captures). Returns the word, its count,
 * and up to 2 example captures containing it.
 *
 * @returns {Promise<{ word: string, count: number, examples: string[] } | null>}
 */
export async function getDraad() {
  try {
    const all = await getAll(INBOX_STORE);
    if (all.length < 2) return null;

    const freq = {};
    const itemsByWord = {};

    for (const item of all) {
      const words = item.text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !STOP_WORDS.has(w));

      // Count each word once per item (not per occurrence)
      const seenInItem = new Set();
      for (const word of words) {
        if (seenInItem.has(word)) continue;
        seenInItem.add(word);
        freq[word] = (freq[word] || 0) + 1;
        if (!itemsByWord[word]) itemsByWord[word] = [];
        itemsByWord[word].push(item.text);
      }
    }

    // Find the word that appears in the most separate captures
    const top = Object.entries(freq)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])[0];

    if (!top) return null;

    const [word, count] = top;
    return { word, count, examples: itemsByWord[word].slice(0, 2) };
  } catch { return null; }
}

/**
 * VERGETEN — The oldest unprocessed inbox item, still quietly waiting.
 * Returns null when inbox is empty.
 *
 * @returns {Promise<{ text: string, dateLabel: string } | null>}
 */
export async function getVergeten() {
  try {
    const all = await getAll(INBOX_STORE);
    const active = all
      .filter(item => item.status === 'inbox')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    if (!active.length) return null;

    const oldest = active[0];
    return {
      text: oldest.text,
      dateLabel: relativeDate(oldest.createdAt),
    };
  } catch { return null; }
}

/**
 * ECHO — A capture from the same weekday, 4–8 weeks ago.
 * Surfaces your past self thinking on the same kind of day.
 * Returns null when no temporal match is found.
 *
 * @returns {Promise<{ text: string, weeksAgo: number, dateLabel: string } | null>}
 */
export async function getEcho() {
  try {
    const all = await getAll(INBOX_STORE);
    const now = Date.now();
    const todayWeekday = new Date().getDay();

    const candidates = all.filter(item => {
      const then = new Date(item.createdAt);
      const days = Math.floor((now - then.getTime()) / 86400000);
      return then.getDay() === todayWeekday && days >= 28 && days <= 56;
    });

    const picked = seedPick(candidates);
    if (!picked) return null;

    const weeksAgo = Math.round((now - new Date(picked.createdAt).getTime()) / (7 * 86400000));
    return {
      text: picked.text,
      weeksAgo,
      dateLabel: relativeDate(picked.createdAt),
    };
  } catch { return null; }
}
