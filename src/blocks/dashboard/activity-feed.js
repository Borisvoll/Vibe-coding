import { getAll } from '../../db.js';

/**
 * Get recent activity across stores for the dashboard feed.
 * Returns an array of { icon, text, timeAgo, timestamp } sorted by recency.
 */
export async function getRecentActivity(limit = 10) {
  const [tasks, inbox, projects] = await Promise.all([
    getAll('os_tasks').catch(() => []),
    getAll('os_inbox').catch(() => []),
    getAll('os_projects').catch(() => []),
  ]);

  const items = [];
  const now = Date.now();

  // Recently completed tasks
  for (const t of tasks) {
    if (t.status === 'done' && t.doneAt) {
      items.push({
        icon: '\u2705',
        text: `Taak afgerond: ${t.text}`,
        timestamp: new Date(t.doneAt).getTime(),
      });
    }
  }

  // Recently added inbox items
  for (const i of inbox) {
    if (i.createdAt) {
      const verb = i.status === 'promoted' ? 'Inbox gepromoveerd' : i.status === 'archived' ? 'Inbox gearchiveerd' : 'Inbox vastgelegd';
      items.push({
        icon: i.status === 'promoted' ? '\uD83D\uDCE4' : '\uD83D\uDCE5',
        text: `${verb}: ${i.text}`,
        timestamp: new Date(i.createdAt).getTime(),
      });
    }
  }

  // Recently updated projects
  for (const p of projects) {
    if (p.updatedAt) {
      const verb = p.status === 'done' ? 'Project afgerond' : p.status === 'paused' ? 'Project gepauzeerd' : 'Project bijgewerkt';
      items.push({
        icon: '\uD83D\uDE80',
        text: `${verb}: ${p.title}`,
        timestamp: new Date(p.updatedAt).getTime(),
      });
    }
  }

  // Sort by most recent, limit
  items.sort((a, b) => b.timestamp - a.timestamp);
  const recent = items.slice(0, limit);

  // Add relative time labels
  for (const item of recent) {
    item.timeAgo = formatTimeAgo(now - item.timestamp);
  }

  return recent;
}

function formatTimeAgo(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Zojuist';
  if (mins < 60) return `${mins}m geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}u geleden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Gisteren';
  if (days < 7) return `${days}d geleden`;
  return `${Math.floor(days / 7)}w geleden`;
}
