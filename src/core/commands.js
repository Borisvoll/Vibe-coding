import { fuzzyScore } from '../stores/search.js';

/**
 * Command registry — kernel module for registering and executing palette commands.
 *
 * Commands are static actions (navigate, create) shown in the Ctrl+K palette.
 * Separate from the search system which queries IndexedDB data.
 *
 * @returns {{ register, getAll, filter, execute }}
 */
export function createCommandRegistry() {
  /** @type {Map<string, Command>} */
  const commands = new Map();

  /**
   * Register a command.
   *
   * @param {string} id       — Unique command ID (e.g. 'nav:dashboard')
   * @param {Object} opts
   * @param {string} opts.label    — Display label (Dutch)
   * @param {string} opts.icon     — Single char/emoji icon
   * @param {string} opts.group    — Group key ('navigate' | 'create')
   * @param {string[]} [opts.keywords] — Extra search terms
   * @param {string} [opts.shortcut]   — Keyboard hint (e.g. 'Alt+G')
   * @param {Function} opts.handler    — Async handler to execute
   */
  function register(id, { label, icon, group, keywords = [], shortcut = '', handler }) {
    if (!id || !label || !handler) return;
    commands.set(id, { id, label, icon, group, keywords, shortcut, handler });
  }

  /** Return all registered commands. */
  function getAll() {
    return [...commands.values()];
  }

  /**
   * Fuzzy-filter commands by query.
   * Matches against label + keywords. Returns sorted by score desc.
   */
  function filter(query) {
    if (!query || query.trim().length === 0) return getAll();
    const q = query.trim();

    const scored = [];
    for (const cmd of commands.values()) {
      const fields = [cmd.label, ...cmd.keywords];
      let best = -1;
      for (const f of fields) {
        const s = fuzzyScore(f, q);
        if (s > best) best = s;
      }
      if (best >= 0) scored.push({ ...cmd, score: best });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Execute a command by ID. Returns the handler's return value.
   * @param {string} id
   */
  async function execute(id) {
    const cmd = commands.get(id);
    if (!cmd) return undefined;
    return cmd.handler();
  }

  return { register, getAll, filter, execute };
}
