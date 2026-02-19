import { getAll } from '../db.js';

/**
 * Global search across all major stores.
 * Returns results grouped by type, sorted by relevance (text match position).
 */
export async function globalSearch(query) {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim().toLowerCase();
  const results = [];

  function safeGetAll(store) {
    return getAll(store).catch(() => []);
  }

  // ── Tasks ──────────────────────────────────────────────────
  const tasks = await safeGetAll('os_tasks');
  for (const t of tasks) {
    const score = matchScore(t.text, q);
    if (score >= 0) {
      results.push({
        type: 'task',
        id: t.id,
        title: t.text,
        subtitle: `${t.mode || ''} · ${t.status}`,
        date: t.date,
        score,
      });
    }
  }

  // ── Inbox ──────────────────────────────────────────────────
  const inbox = await safeGetAll('os_inbox');
  for (const item of inbox) {
    const score = matchScore(item.text, q);
    if (score >= 0) {
      results.push({
        type: 'inbox',
        id: item.id,
        title: item.text,
        subtitle: `${item.type || 'gedachte'} · ${item.status}`,
        date: item.createdAt?.slice(0, 10),
        score,
      });
    }
  }

  // ── Projects ───────────────────────────────────────────────
  const projects = await safeGetAll('os_projects');
  for (const p of projects) {
    const titleScore = matchScore(p.title, q);
    const goalScore = matchScore(p.goal, q);
    const score = Math.min(
      titleScore >= 0 ? titleScore : 999,
      goalScore >= 0 ? goalScore : 999,
    );
    if (score < 999) {
      results.push({
        type: 'project',
        id: p.id,
        title: p.title,
        subtitle: `${p.mode || ''} · ${p.status}`,
        date: p.updated_at?.slice(0, 10),
        score,
      });
    }
  }

  // ── Hours / BPV entries ────────────────────────────────────
  const hours = await safeGetAll('hours');
  for (const h of hours) {
    const score = matchScore(h.note || h.description || '', q);
    if (score >= 0) {
      results.push({
        type: 'hours',
        id: h.id,
        title: h.note || h.description || `${h.type} — ${h.date}`,
        subtitle: `BPV · ${h.date}`,
        date: h.date,
        score,
      });
    }
  }

  // ── Logbook ────────────────────────────────────────────────
  const logbook = await safeGetAll('logbook');
  for (const entry of logbook) {
    const textScore = matchScore(entry.text || entry.description || '', q);
    const tagScore = (entry.tags || []).some((tag) => tag.toLowerCase().includes(q)) ? 0 : -1;
    const score = Math.min(
      textScore >= 0 ? textScore : 999,
      tagScore >= 0 ? tagScore : 999,
    );
    if (score < 999) {
      results.push({
        type: 'logbook',
        id: entry.id,
        title: entry.text || entry.description || `Logboek ${entry.date}`,
        subtitle: `Logboek · ${entry.date}`,
        date: entry.date,
        score,
      });
    }
  }

  // ── Daily plans ────────────────────────────────────────────
  const dailyPlans = await safeGetAll('dailyPlans');
  for (const dp of dailyPlans) {
    const tasks = dp.tasks || [];
    const matched = tasks.some((t) => (t.text || '').toLowerCase().includes(q));
    const evalMatch = matchScore(dp.evaluation || '', q);
    if (matched || evalMatch >= 0) {
      results.push({
        type: 'daily',
        id: dp.id,
        title: tasks.map((t) => t.text).join(', ') || `Dagplan ${dp.date}`,
        subtitle: `Dagplan · ${dp.date}`,
        date: dp.date,
        score: matched ? 0 : evalMatch,
      });
    }
  }

  // ── Wellbeing (journal/gratitude/reflection) ───────────────
  const wellbeing = await safeGetAll('os_personal_wellbeing');
  for (const w of wellbeing) {
    const fields = [w.gratitude, w.reflection, w.journalNote, w.mood].filter(Boolean);
    let bestScore = 999;
    for (const f of fields) {
      const s = matchScore(f, q);
      if (s >= 0 && s < bestScore) bestScore = s;
    }
    if (bestScore < 999) {
      results.push({
        type: 'journal',
        id: w.id,
        title: w.journalNote || w.gratitude || w.reflection || `Wellbeing ${w.date || w.id}`,
        subtitle: `Dagboek · ${w.date || w.id}`,
        date: w.date || w.id,
        score: bestScore,
      });
    }
  }

  // Sort by score (lower = more relevant), then by date (newer first)
  results.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return (b.date || '').localeCompare(a.date || '');
  });

  return results;
}

/**
 * Simple match score: returns position of match, or -1 if no match.
 * Lower = better (exact start match > middle match).
 */
function matchScore(text, query) {
  if (!text) return -1;
  const idx = text.toLowerCase().indexOf(query);
  return idx;
}
