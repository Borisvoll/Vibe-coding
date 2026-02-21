# Audit Fix Map — 5-Year Daily Use Hardening

**Date:** 2026-02-21
**Source:** `tasks/audits/boris-os-10year/risk-heatmap.md` (risk register #1–#16) + codebase exploration
**Purpose:** Map each audit point to exact files/functions, severity, proposed fix, and data risks.

---

## Architecture Note

The codebase is **100% vanilla JavaScript** (ES2022). There is no React, no JSX, no framework. The CLAUDE.md confirms: "Zero-dependency vanilla JavaScript modular monolith." All blocks use the vanilla `mount(container, context) → { unmount() }` contract. All fixes in this plan work within the existing vanilla architecture.

---

## Audit Point Mapping (#1–#16)

### #1 — globalSearch() Full-Table Scan
| | |
|---|---|
| **Severity** | **CRITICAL** |
| **File** | `src/stores/search.js:98-161` |
| **Function** | `globalSearch(query)` |
| **Problem** | Loads ALL records from 7 stores (`os_tasks`, `os_inbox`, `os_projects`, `hours`, `logbook`, `dailyPlans`, `os_personal_wellbeing`) into memory on every search keystroke. At 15K+ records (projected year 3-5), this causes 200ms+ lag and 25MB+ memory allocation per search. |
| **Called from** | `src/os/shell.js:324` (search bar, debounced 300ms), `src/ui/command-palette.js` via `globalSearchGrouped()` |
| **Proposed fix** | 1) Add early-exit `limit` parameter (default 30 results, stop scanning once hit). 2) Replace `getAll()` calls with date-range indexed queries for time-bounded stores (`os_tasks`, `dailyPlans`, `os_personal_wellbeing`). 3) Keep fuzzy scoring logic but apply to bounded result sets. |
| **Data risk** | None — read-only operation. |
| **Milestone** | **A (Performance)** |

---

### #2 — JS/CSS Bundles Not Pre-Cached by Service Worker
| | |
|---|---|
| **Severity** | **HIGH** |
| **File** | `public/sw.js` |
| **Problem** | SW pre-caches only 4 files (index.html, manifest.json, favicon.svg, base path). Vite-generated JS/CSS bundles are only runtime-cached. Offline-first breaks if bundle evicted before runtime cache. |
| **Proposed fix** | Generate asset manifest at build time, include in SW install handler. |
| **Data risk** | None. |
| **Milestone** | Out of scope for this hardening (deployment, not data/performance). Note for future. |

---

### #3 — jsonbin.io Service Dependency
| | |
|---|---|
| **Severity** | **HIGH** |
| **File** | `src/auto-sync.js` |
| **Problem** | Cloud sync relies entirely on jsonbin.io free tier. No SLA, service could shut down. |
| **Proposed fix** | Abstract sync backend behind an interface. Out of scope for data hardening milestones. |
| **Data risk** | Sync loss, not data loss (local data remains). |
| **Milestone** | Out of scope for this hardening. Note for future. |

---

### #4 — Dual Event Systems
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/core/eventBus.js` (OS path) vs `src/state.js` (legacy path) |
| **Problem** | Legacy pages use `state.js` pub/sub; OS blocks use `eventBus.js`. Changes in one path don't notify the other. |
| **Proposed fix** | Bridge the two systems or remove legacy path dependency. Since legacy is accessed via sidebar button only, low urgency. |
| **Data risk** | None — both paths share same IndexedDB. |
| **Milestone** | Out of scope (architectural, not stability/performance). |

---

### #5 — Import Clear-Then-Write Atomicity Gap
| | |
|---|---|
| **Severity** | **CRITICAL** |
| **File** | `src/stores/backup.js:119-152` |
| **Function** | `importBundle(bundle, { merge })` |
| **Problem** | Import calls `clearAllData()` then `importAll(bundle.stores)` as two separate operations. If the browser crashes or tab is closed between clear and import, all data is lost. The "safety backup" is stored in localStorage (5MB limit) — large datasets silently skip the safety backup (line 130: `if (safetyJson.length < 5_000_000)`). |
| **Called from** | Settings panel import UI |
| **Proposed fix** | 1) Remove localStorage safety blob (unreliable for >5MB). 2) Use IndexedDB transaction-based import: write to temp stores, then swap. Or use write guard (already exists in db.js:32-46) to ensure atomicity. 3) Show explicit size warning in UI before import. |
| **Data risk** | **HIGH** — This is the #1 data loss vector in the app. |
| **Milestone** | **B (Backup Safety)** |

---

### #6 — No Tests for crypto.js
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/crypto.js` |
| **Problem** | Security-critical encryption code has no test coverage. Regression could silently break sync encryption. |
| **Proposed fix** | Add `tests/crypto.test.js` with encrypt/decrypt roundtrip, wrong-password rejection. |
| **Data risk** | None from adding tests. |
| **Milestone** | Out of scope (testing, not stability). Note for future. |

---

### #7 — No Tests for auto-sync.js
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/auto-sync.js` |
| **Problem** | Sync logic untested. |
| **Proposed fix** | Add `tests/auto-sync.test.js`. |
| **Data risk** | None. |
| **Milestone** | Out of scope (testing). Note for future. |

---

### #8 — Shell.js God Module
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/os/shell.js` (~700+ lines) |
| **Problem** | Single file handles tab navigation, mode switching, Vandaag layout, search bar, Friday prompt, mode picker, theme, command palette, keyboard shortcuts, and deep links. Risky to modify. |
| **Proposed fix** | Extract into sub-modules (e.g., `vandaagLayout.js`, `modePicker.js`). Low urgency for stability hardening. |
| **Data risk** | None — UI-only. |
| **Milestone** | Out of scope (refactor). |

---

### #9 — Legacy Path Maintenance Burden
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/pages/*.js`, `src/router.js` |
| **Problem** | 18 hash-routed legacy pages still exist. Dead code increases review scope. |
| **Proposed fix** | Progressive removal. Out of scope. |
| **Data risk** | None. |
| **Milestone** | Out of scope. |

---

### #10 — Timestamp Naming Inconsistency
| | |
|---|---|
| **Severity** | **LOW** |
| **Files** | Various stores use `createdAt`, `created_at`, `updatedAt`, `updated_at` inconsistently |
| **Problem** | Confusing, but functionally harmless. |
| **Proposed fix** | Normalize on next major migration. |
| **Data risk** | Migration required — needs careful field mapping. |
| **Milestone** | Out of scope. |

---

### #11 — Default "alles" Preset for New Users
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/core/modulePresets.js` |
| **Problem** | New users see ALL blocks (~27+) on first load. Cognitive overload. |
| **Proposed fix** | Change default preset to match initial mode (School → "school" preset). |
| **Data risk** | None — UI preference only. |
| **Milestone** | **D (UX Softening)** — part of Vandaag complexity reduction |

---

### #12 — Ad-hoc Data Migrations in main.js
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/main.js:68-90` |
| **Function** | `migratePersonalTasks()` |
| **Problem** | Migration logic lives outside MigrationManager, untracked and untested. |
| **Proposed fix** | Move into MigrationManager's versioned pipeline. |
| **Data risk** | Low — migration is guarded by settings flag. |
| **Milestone** | Out of scope (migration infrastructure). |

---

### #13 — PBKDF2 Iterations Below OWASP
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/crypto.js` |
| **Problem** | Current iterations below OWASP 2023 recommendation (600K). |
| **Proposed fix** | Bump iterations, re-encrypt on next sync. |
| **Data risk** | Existing encrypted backups need forward-compatible handling. |
| **Milestone** | Out of scope (security). |

---

### #14 — Tombstone Store Grows Unbounded
| | |
|---|---|
| **Severity** | **CRITICAL** |
| **File** | `src/db.js:368-376` |
| **Function** | `purgeDeleted()` — **exists but is NEVER called** |
| **Problem** | Every soft-delete adds a record to the `deleted` store (line 322-339). `purgeDeleted()` is defined but never invoked anywhere in the app — not on startup, not on schedule, nowhere. After 5 years of daily use, the deleted store could contain 10K+ tombstones, slowing sync and export. |
| **Called from** | Nowhere. Dead code. |
| **Proposed fix** | 1) Implement `purgeDeletedOlderThan(days)` with date-range query on `deletedAt` index. 2) Call on app startup in `main.js:init()` with 30-day TTL. 3) Add test. |
| **Data risk** | LOW — purging tombstones >30 days old is safe. Undo window is realistically <1 hour. |
| **Milestone** | **A (Performance)** |

---

### #15 — APP_VERSION Management Unclear
| | |
|---|---|
| **Severity** | **LOW** |
| **File** | `src/version.js` |
| **Problem** | Version must be manually bumped. Stale version → stale SW. |
| **Proposed fix** | Auto-generate from git hash at build time. |
| **Data risk** | None. |
| **Milestone** | Out of scope (deployment). |

---

### #16 — EventBus No Per-Handler Error Isolation
| | |
|---|---|
| **Severity** | **LOW** |
| **File** | `src/core/eventBus.js` |
| **Problem** | If one event handler throws, subsequent handlers for the same event are skipped. |
| **Proposed fix** | Wrap each handler in try/catch. |
| **Data risk** | None. |
| **Milestone** | Out of scope for now (minor). |

---

## Additional Issues Discovered During Exploration

These are not in the original risk register but are critical for the 5-year daily-use hardening milestones.

### #A1 — weekly-review aggregateWeeklyReview() Full-Table Scans
| | |
|---|---|
| **Severity** | **CRITICAL** |
| **File** | `src/stores/weekly-review.js:35-127` |
| **Function** | `aggregateWeeklyReview(weekStr)` |
| **Problem** | Calls `getAll()` on 4 stores: `os_tasks` (line 43), `os_personal_wellbeing` (line 57), `os_projects` (line 86), `os_inbox` (line 90). Then filters in JS by date range. After 5 years: tasks store alone could have 5K+ records loaded just to find ~20 completed this week. |
| **Proposed fix** | Replace `getAll('os_tasks')` with indexed date-range query. `os_tasks` has `updated_at` index — add `doneAt` or `date` index and use cursor with range. Similarly for wellbeing (keyed by date, use range). |
| **Data risk** | None — read-only. |
| **Milestone** | **A (Performance)** |

### #A2 — personal.js getRecentEntries() and getCreativeSparks() Full Scans
| | |
|---|---|
| **Severity** | **HIGH** |
| **File** | `src/stores/personal.js:58-75` |
| **Functions** | `getRecentEntries(limit)`, `getCreativeSparks(limit)` |
| **Problem** | `getRecentEntries()` loads ALL wellbeing records (line 70) to return last 7. `getCreativeSparks()` loads ALL inbox items (line 59) to return last 5 thought-type items. |
| **Proposed fix** | Use reverse cursor on date-ordered index with early exit after `limit` matches. |
| **Data risk** | None — read-only. |
| **Milestone** | **A (Performance)** |

### #A3 — daily.js getAllDailyEntries() Unbounded
| | |
|---|---|
| **Severity** | **HIGH** |
| **File** | `src/stores/daily.js:16-19` |
| **Function** | `getAllDailyEntries()` |
| **Problem** | Returns ALL daily entries sorted by date desc. After 5 years with 3 modes = ~5,475 entries loaded. Used for any history browsing. |
| **Proposed fix** | Add paginated variant `getDailyEntriesPage(offset, limit)` with cursor. |
| **Data risk** | None — read-only. |
| **Milestone** | **A (Performance)** + **D (History browser)** |

### #B1 — Export Uses Pretty-Print JSON
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/stores/backup.js:37` |
| **Code** | `JSON.stringify(bundle, null, 2)` |
| **Problem** | Pretty-printed JSON is 30-50% larger than compact. At 50MB data, this means 65-75MB export file. Wasteful for a backup file that is never human-read. |
| **Proposed fix** | Use `JSON.stringify(bundle)` (no indentation). |
| **Data risk** | None — format change only, import already handles both. |
| **Milestone** | **B (Backup Safety)** |

### #B2 — localStorage Safety Backup Silently Fails for Large Datasets
| | |
|---|---|
| **Severity** | **HIGH** |
| **File** | `src/stores/backup.js:126-135` |
| **Code** | `if (safetyJson.length < 5_000_000) { localStorage.setItem(...) }` |
| **Problem** | Safety backup is silently skipped when data exceeds ~5MB. User has no idea their import has no safety net. Combined with the clear-then-write atomicity gap (#5), this is a data loss vector. |
| **Proposed fix** | Remove localStorage safety blob entirely. Replace with: (a) warn user if data is large, (b) use write guard for atomic import, (c) suggest manual export before import. |
| **Data risk** | Removes a (broken) safety net — but replaces with a reliable one. |
| **Milestone** | **B (Backup Safety)** |

### #C1 — Hardcoded MODES Constant in 3+ Files
| | |
|---|---|
| **Severity** | **HIGH** |
| **Files** | `src/core/modeManager.js:1` (`const MODES = ['BPV', 'School', 'Personal']`), `src/stores/validate.js:1` (`const VALID_MODES = ['BPV', 'School', 'Personal']`), `src/stores/daily.js:5` (`const VALID_MODES = ['BPV', 'School', 'Personal']`), `src/os/shell.js:15-37` (`MODE_META`), `src/blocks/inbox-screen/view.js:7` (`MODE_OPTIONS`), `src/core/modeCaps.js:1-5` (`MODE_TASK_CAPS`), `src/os/cockpitData.js:23-42` (`MODE_ITEMS`) |
| **Problem** | Mode list is hardcoded in 7+ files. Adding, removing, or renaming a mode requires touching all of them. BPV mode has a hard end date (`BPV_END = '2026-04-24'` in `src/constants.js:2`) but no mechanism to retire it gracefully. After BPV ends, the user is stuck with a dead mode forever. |
| **Proposed fix** | 1) Create single source of truth for modes (config in settings store or shared constant). 2) Make modeManager read from config. 3) Add mode lifecycle: active/archived. 4) BPV auto-archives after BPV_END. |
| **Data risk** | **MEDIUM** — existing records reference mode strings ('BPV', 'School', 'Personal'). Migration must preserve these as stable IDs while allowing display name changes. |
| **Milestone** | **C (Modes Mature)** |

### #D1 — Task Cap Disables Input Entirely
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/blocks/tasks/view.js:63-67` |
| **Code** | `input.disabled = true; input.placeholder = 'Maximum ${cap} taken bereikt';` |
| **Also** | `src/blocks/school-today/view.js:24` (Add button disabled at cap), `src/blocks/school-milestones/view.js:21` (same pattern) |
| **Problem** | When task cap is reached, the input is fully disabled. User cannot add even one more task. This is oppressive — discipline should guide, not block. Over 5 years, this becomes a source of frustration and workarounds. |
| **Proposed fix** | Replace disabled input with warning message + "Add anyway" override button. Keep cap as default guidance, allow override. Optionally add cap adjustment in Settings. |
| **Data risk** | None — UI behavior only. |
| **Milestone** | **D (UX Softening)** |

### #D2 — Friday Banner Has No Snooze/Disable
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/os/shell.js:673-699` |
| **Problem** | Friday banner appears every Friday if weekly review not sent. Has close button (removes for current session) but no snooze (1 week, 1 month) or permanent disable. Over 5 years, user who doesn't use weekly review sees this banner every single Friday — 260+ times. |
| **Proposed fix** | Add snooze options (1 week, 1 month) persisted in settings. Add disable toggle in Settings. |
| **Data risk** | None — UI/settings only. |
| **Milestone** | **D (UX Softening)** |

### #D3 — No History Browser for Past Daily Entries
| | |
|---|---|
| **Severity** | **MEDIUM** |
| **File** | `src/stores/daily.js:16-19` (`getAllDailyEntries()`) |
| **Problem** | Daily entries (Top 3, todos, notes) accumulate but there's no UI to browse past entries. The `getAllDailyEntries()` function exists but loads everything unbounded. User has no way to review their journey over time. |
| **Proposed fix** | 1) Add paginated `getDailyEntriesPage()`. 2) Add minimal "History" screen/tab with date-sorted list, view-only display, quick-jump (7d/30d). |
| **Data risk** | None — read-only feature. |
| **Milestone** | **D (UX Softening + History)** |

### #D4 — Vandaag Page Collapse Defaults May Be Too Aggressive
| | |
|---|---|
| **Severity** | **LOW** |
| **File** | `src/os/shell.js:246-250` (`COLLAPSE_DEFAULTS`) |
| **Also** | `src/ui/collapsible-section.js` (persistence logic) |
| **Problem** | Default collapse state shows 3 open sections + hero + cockpit. This is reasonable, but combined with the "alles" preset (#11), new users see 9+ blocks in open sections. Collapse persistence works correctly per-mode in localStorage. |
| **Proposed fix** | Reduce default-open sections for new users. Ensure "More" progressive disclosure pattern. Keep persistence working as-is. |
| **Data risk** | None — localStorage preferences only. |
| **Milestone** | **D (UX Softening)** |

### #D5 — No Morning Flow Configuration
| | |
|---|---|
| **Severity** | **LOW** |
| **File** | `src/os/shell.js:636-650` (init flow), `src/os/cockpitData.js` |
| **Problem** | On app open, user always lands on Vandaag tab (line 42: `let activeTab = 'today'`). The cockpit shows "Nog te doen" checklist. There's no explicit "morning flow" auto-open — it's implicit via default tab. However, there's no option for Strict (force morning routine) vs Gentle (nudge) vs Manual (just show the page). |
| **Proposed fix** | Add morning flow setting: Strict (show modal checklist), Gentle (default — show cockpit nudge), Manual (no auto-display). Persist in settings. |
| **Data risk** | None — settings only. |
| **Milestone** | **D (UX Softening)** |

---

## Summary by Milestone

| Milestone | Audit Points | Severity Mix |
|-----------|-------------|--------------|
| **A — Performance** | #1, #14, #A1, #A2, #A3 | 3 CRITICAL, 2 HIGH |
| **B — Backup Safety** | #5, #B1, #B2 | 1 CRITICAL, 1 HIGH, 1 MEDIUM |
| **C — Modes Mature** | #C1 | 1 HIGH |
| **D — UX Softening** | #11, #D1, #D2, #D3, #D4, #D5 | 4 MEDIUM, 2 LOW |
| **Out of scope** | #2, #3, #4, #6, #7, #8, #9, #10, #12, #13, #15, #16 | Deferred to future phases |

---

## In-Scope Points: 11 issues across 4 milestones

| # | Issue | File(s) | Milestone |
|---|-------|---------|-----------|
| 1 | globalSearch unbounded 7-store scan | `src/stores/search.js:98-161` | A |
| 14 | Tombstone store never purged | `src/db.js:368` (dead code) | A |
| A1 | Weekly review 4-store full scan | `src/stores/weekly-review.js:35-96` | A |
| A2 | Personal store full scans for recent/sparks | `src/stores/personal.js:58-75` | A |
| A3 | Daily entries unbounded load | `src/stores/daily.js:16-19` | A |
| 5 | Import atomicity gap + silent safety failure | `src/stores/backup.js:119-152` | B |
| B1 | Export pretty-print waste | `src/stores/backup.js:37` | B |
| B2 | localStorage safety blob 5MB limit | `src/stores/backup.js:126-135` | B |
| C1 | Hardcoded modes in 7+ files | `modeManager.js`, `validate.js`, `daily.js`, `shell.js`, etc. | C |
| 11 | Default "alles" preset | `src/core/modulePresets.js` | D |
| D1 | Task cap disables input | `src/blocks/tasks/view.js:63-67` | D |
| D2 | Friday banner no snooze | `src/os/shell.js:673-699` | D |
| D3 | No history browser | `src/stores/daily.js` | D |
| D4 | Vandaag collapse defaults aggressive | `src/os/shell.js:246-250` | D |
| D5 | No morning flow config | `src/os/shell.js:636-650` | D |

---

## Data Migration Strategy

| Change | Migration Needed? | Strategy |
|--------|:-:|---|
| Search limit/indexing | No | Pure code change, no schema |
| Tombstone purge | No | Deletes old records from `deleted` store |
| Weekly review indexed query | Maybe | May need `doneAt` index on `os_tasks` → DB version bump |
| Personal store cursor | No | Uses existing date-keyed records |
| Export compact JSON | No | Format change, import handles both |
| Remove localStorage safety blob | No | Just stop writing to localStorage |
| Import atomicity | No | Use existing write guard mechanism |
| Mode config store | Yes | New settings entries, migration from hardcoded → config |
| Task cap override | No | UI behavior change only |
| History browser | No | Uses existing `dailyPlans` store |

**Schema changes requiring DB version bump:** At most 1 (adding `doneAt` index to `os_tasks`). All other changes are code-only.
