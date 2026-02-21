/**
 * BORIS Kernel — framework-agnostic domain layer.
 *
 * Owns: persistence, domain logic, command handling, event emission.
 * Does NOT own: UI, React, blocks, DOM, styles.
 *
 * Usage:
 *   import { createKernel } from './kernel/index.js';
 *   const kernel = createKernel(eventBus);
 *   await kernel.init(savedMode);
 *   kernel.commands.tasks.add('Do thing', 'School');
 *   kernel.subscribe('tasks:changed', handler);
 */

import { initDB } from './db.js';
import { createModeManager } from './mode.js';

// Command creators
import { createCommands as createTaskCommands } from './commands/tasks.js';
import { createCommands as createInboxCommands } from './commands/inbox.js';
import { createCommands as createProjectCommands } from './commands/projects.js';
import { createCommands as createListCommands } from './commands/lists.js';
import { createCommands as createDailyCommands } from './commands/daily.js';
import { createCommands as createBpvCommands } from './commands/bpv.js';
import { createCommands as createPersonalCommands } from './commands/personal.js';
import { createCommands as createBackupCommands } from './commands/backup.js';

// Query re-exports
import * as dashboardQueries from './queries/dashboard.js';
import * as cockpitQueries from './queries/cockpit.js';
import * as searchQueries from './queries/search.js';
import * as weeklyReviewQueries from './queries/weekly-review.js';

// Read-only re-exports from command modules (store queries)
import { getTasksByMode, getTasksForToday, getTasksByProject } from './commands/tasks.js';
import { getInboxItems, getInboxItemById, getInboxCount } from './commands/inbox.js';
import { getProjects, getActiveProjects, getProjectById, getPinnedProject } from './commands/projects.js';
import { getLists, getListById, getItemsByList, getSubtasks, getItemCount } from './commands/lists.js';
import { getDailyEntry, getAllDailyEntries } from './commands/daily.js';
import { getHoursEntry, getWeeklyOverview, exportEntries } from './commands/bpv.js';
import { getTodayEntry, getCreativeSparks, getRecentEntries, getPersonalDashboardData } from './commands/personal.js';
import { exportBundle, validateBundle, readBundleFile } from './commands/backup.js';

/**
 * Create a kernel instance.
 *
 * IMPORTANT: Reuses the existing eventBus instance — does NOT create a new one.
 * There must be exactly ONE eventBus in the entire app.
 *
 * @param {Object} eventBus — the shared eventBus instance (created in main.js)
 * @returns {Object} kernel
 */
export function createKernel(eventBus) {
  if (!eventBus || typeof eventBus.on !== 'function' || typeof eventBus.emit !== 'function') {
    throw new Error('createKernel requires a valid eventBus instance with on/off/emit');
  }

  const commands = {
    tasks: createTaskCommands(eventBus),
    inbox: createInboxCommands(eventBus),
    projects: createProjectCommands(eventBus),
    lists: createListCommands(eventBus),
    daily: createDailyCommands(eventBus),
    bpv: createBpvCommands(eventBus),
    personal: createPersonalCommands(eventBus),
    backup: createBackupCommands(eventBus),
  };

  const queries = {
    // Aggregation queries
    dashboard: dashboardQueries,
    cockpit: cockpitQueries,
    search: searchQueries,
    weeklyReview: weeklyReviewQueries,

    // Domain queries (from stores, read-only)
    tasks: { getTasksByMode, getTasksForToday, getTasksByProject },
    inbox: { getInboxItems, getInboxItemById, getInboxCount },
    projects: { getProjects, getActiveProjects, getProjectById, getPinnedProject },
    lists: { getLists, getListById, getItemsByList, getSubtasks, getItemCount },
    daily: { getDailyEntry, getAllDailyEntries },
    bpv: { getHoursEntry, getWeeklyOverview, exportEntries },
    personal: { getTodayEntry, getCreativeSparks, getRecentEntries, getPersonalDashboardData },
    backup: { exportBundle, validateBundle, readBundleFile },
  };

  let modeManager = null;

  return {
    /**
     * Initialize the kernel: open DB, create mode manager.
     * @param {string} [savedMode] — persisted mode from previous session
     * @returns {{ modeManager }}
     */
    async init(savedMode) {
      await initDB();
      modeManager = createModeManager(eventBus, savedMode || 'School');
      return { modeManager };
    },

    /** Subscribe to a kernel/domain event. Returns unsubscribe function. */
    subscribe: eventBus.on.bind(eventBus),

    /** Emit a domain event (prefer commands which auto-emit). */
    emit: eventBus.emit.bind(eventBus),

    /** The shared event bus instance. */
    eventBus,

    /** Write operations — auto-emit events after mutation. */
    commands,

    /** Read operations — no side effects. */
    queries,

    /** Access the mode manager (available after init). */
    get mode() {
      return modeManager;
    },
  };
}
