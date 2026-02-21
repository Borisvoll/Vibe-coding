# Mode System — Config-Driven Architecture

**Date:** 2026-02-21
**Milestone:** C (Modes Mature)

---

## Problem

Modes (BPV, School, Personal) were hardcoded in 7+ files. Adding, renaming, archiving, or retiring a mode required editing source code. When BPV internship ends (2026-04-24), the user has no way to retire the mode without losing data.

## Solution: Config-Driven Modes

### Single Source of Truth

`src/core/modeConfig.js` — all mode definitions live here. Stored in IDB settings as `mode_config`. Seeded with defaults on first run.

### Mode Schema

```javascript
{
  id: 'School',           // Stable internal ID — never changes
  name: 'School',         // Display name — can be renamed
  description: 'Opleiding & studie',
  color: 'var(--color-purple)',
  colorLight: 'var(--color-purple-light)',
  emoji: '📚',
  status: 'active',       // 'active' | 'archived'
  caps: { tasks: 3 },     // Task capacity per day
  order: 1,               // Display order
}
```

### Key Design Decisions

1. **ID is immutable.** All stored records reference mode by ID. Renaming only changes the display name.
2. **Archive, don't delete.** Archived modes are hidden from the picker but all data remains searchable and exportable.
3. **Sync fallback.** `isValidModeSync()` works without awaiting config — uses cached config or falls back to hardcoded list. This keeps synchronous validation fast.
4. **Deep copy defaults.** `getDefaultModes()` returns a deep copy so callers can't mutate the template.

### API Surface

| Function | Sync/Async | Purpose |
|----------|-----------|---------|
| `getModeConfig()` | async | Get all modes (cached after first read) |
| `saveModeConfig(config)` | async | Persist updated config |
| `seedModeConfigIfNeeded()` | async | First-run seeding |
| `getActiveModeIds()` | async | IDs of non-archived modes |
| `getAllModeIds()` | async | IDs of all modes including archived |
| `getModeById(id)` | async | Full mode object by ID |
| `getTaskCapFromConfig(id)` | async | Task cap for a mode (default: 5) |
| `renameMode(id, newName)` | async | Change display name |
| `archiveMode(id)` | async | Hide from picker, preserve data |
| `unarchiveMode(id)` | async | Restore to picker |
| `isValidModeSync(id)` | sync | Fast validation check |
| `getDefaultModes()` | sync | Deep copy of default modes |
| `_resetModeConfigCache()` | sync | Testing only |

### Integration Points

| File | Change |
|------|--------|
| `src/core/modeManager.js` | Uses `isValidModeSync()` for validation, `loadModes()` reads active modes from config |
| `src/core/modeCaps.js` | Re-exports `getTaskCapFromConfig` for async consumers |
| `src/stores/validate.js` | `requireValidMode()` uses `isValidModeSync()` |
| `src/stores/daily.js` | Mode validation via `isValidModeSync()` |
| `src/main.js` | Seeds mode config on startup, BPV auto-retirement check |

### BPV Auto-Retirement

On app startup, `main.js` checks if today is past `BPV_END` (2026-04-24). If so, it archives the BPV mode automatically. The user sees a one-time toast notification. All BPV data (hours, logbook, tasks) remains intact and searchable.

### No Schema Change Required

Mode config is stored in the existing `settings` object store (key: `mode_config`). No IDB version bump needed.
