# Personal OS / Second Brain — Todo

## Completed: MVP Sprint 1 (M0–M6)

<details>
<summary>All done — click to expand</summary>

### M0: Shell Extraction + OS Enablement
- [x] Extract `initNewOSShell()` from `main.js` into `src/os/shell.js`
- [x] Add try/catch fallback to legacy in `main.js`
- [x] Change `enableNewOS` default to `true`
- [x] Add `today-sections` host (vertical stack layout)
- [x] Add date display in header
- [x] Remove "experimenteel" label

### M1: Database Schema v5 + Store Modules
- [x] Bump DB_VERSION to 5 in `db.js`
- [x] Add `os_inbox` store with indexes (mode, status, updated_at)
- [x] Add `os_tasks` store with indexes (mode, status, date, updated_at)
- [x] Add new stores to `clearAllData` and `exportAllData`
- [x] Create `src/stores/tasks.js` CRUD module
- [x] Create `src/stores/inbox.js` CRUD module

### M2: Inbox Block
- [x] Create `src/blocks/inbox/` (index, store, view, styles)
- [x] Quick capture input with mode tagging
- [x] Progressive disclosure (collapsed item list)
- [x] Promote-to-task and archive actions
- [x] Register in `registerBlocks.js`

### M3: Tasks Block
- [x] Create `src/blocks/tasks/` (index, store, view, styles)
- [x] Mode-filtered task list
- [x] Task cap enforcement via `modeCaps.js`
- [x] Checkbox done/undone toggle
- [x] Listen to `mode:changed` event for re-render
- [x] Register in `registerBlocks.js`

### M4: BPV Log Summary Block
- [x] Create `src/blocks/bpv-log-summary/` (index, store, view, styles)
- [x] Read from legacy `hours` and `logbook` stores
- [x] Compact summary with deep links to legacy pages
- [x] BPV-mode only
- [x] Register in `registerBlocks.js`

### M5: Today Page Composition
- [x] Add `today-sections` host to existing today blocks
- [x] Add `order` property to all blocks for deterministic rendering
- [x] Order-aware block sorting in shell `renderHosts()`

### M6: Documentation
- [x] Create `tasks/todo.md`
- [x] Create `tasks/lessons.md`
- [x] Create `docs/architecture.md`
- [x] Create `docs/design-principles.md`

</details>

---

## Roadmap

### Milestone 1: Today Page MVP (Minimal, Solid, Tested)
> Fix regressions, add persistence layer, add tests, document storage.

### Milestone 2: Module Boundaries + Planning Tab
> Formalize kernel + modules structure, build Planning tab, add Ctrl+K inbox shortcut.

### Milestone 3: Cloudflare Deployment + Sync
> Deploy to Cloudflare Pages, set up D1 sync backend, enable multi-device.

---

## Milestone 1: Today Page MVP — Checklist

### 1.0 Critical Fixes
- [x] Fix dark mode regression — extract `applyUserSettings()` in `main.js`
- [x] Rewrite `docs/architecture.md` — kernel + 7 modules, data model, storage strategy
- [x] Create `docs/current-state.md` — full repo inventory
- [x] Create `docs/risks.md` — top 10 risks with mitigations

### 1.1 Persistence Layer (Local-First)
- [x] Create `src/stores/validate.js` — shared validation (ValidationError, field checks)
- [x] Add basic validation to `src/stores/inbox.js` (required fields, type checks)
- [x] Add basic validation to `src/stores/tasks.js` (required fields, type checks)
- [x] Create `src/stores/daily.js` — DailyEntry CRUD adapter (wraps `dailyPlans` store)
- [x] Create `src/stores/tracker.js` — TrackerEntry CRUD adapter (wraps `hours` + `logbook`)
- [x] Write `docs/storage.md` — how data is stored, how to export, schema per entity

### 1.2 Testing Foundation
- [x] Install Vitest + fake-indexeddb as devDependencies
- [x] Create `tests/setup.js` — fake-indexeddb auto + DB reset between tests
- [x] Create `tests/stores/validate.test.js` — 26 validation rule tests
- [x] Create `tests/stores/inbox.test.js` — add/promote/archive lifecycle (9 tests)
- [x] Create `tests/stores/tasks.test.js` — add/toggle/delete + mode filtering (9 tests)
- [x] Create `tests/stores/daily.test.js` — load/save DailyEntry (10 tests)
- [x] Create `tests/stores/tracker.test.js` — hours + logbook lifecycle (16 tests)
- [x] Create `tests/schema.test.js` — all 28 stores created, data persists (5 tests)
- [x] Add `test` + `test:watch` scripts to `package.json`
- [x] All 75 tests green

### 1.3 Data Integrity
- [x] Migrate `os_personal_tasks` data into `os_tasks` (mode='Personal')
- [x] Add `device_id` generation in OS shell path (moved to shared `init()`)
- [x] Add auto-export reminder (weekly toast if > 7 days since last backup)
- [x] Track `last_export_date` in settings on every export (plain + encrypted)

### 1.4 Today Page Blocks
- [x] Create `daily-outcomes` block — Top 3 editable outcomes (order 5)
- [x] Create `daily-reflection` block — 2-line evaluation textarea (order 50)
- [x] Create `schedule-placeholder` block — Agenda placeholder (order 25)
- [x] Register all 3 new blocks in `registerBlocks.js`
- [x] Block ordering: outcomes → inbox → tasks → schedule → bpv-log → reflection

### 1.5 Dark Mode + Code Quality Fixes
- [x] Replace hardcoded hex colors in mini-card CSS with CSS variables
- [x] Fix undefined `--color-text-primary` → `--color-text` in planning.js
- [x] Fix undefined `--color-bg-secondary` → `--color-surface-hover` in planning.js
- [x] Replace hardcoded energy colors with CSS variables in planning.js
- [x] Add hover/transition to OS nav buttons
- [x] Add explicit `background: var(--color-bg)` to OS shell
- [x] Add desktop-responsive media query for OS shell (wider padding, larger grid)

### 1.6 Testing
- [x] Add `daily-outcomes.test.js` — 7 integration tests for outcomes + reflection
- [x] Add `migration.test.js` — 5 tests for data migration + settings
- [x] All 87 tests green

### 1.7 Polish
- [x] `npm run build` passes clean
- [x] Update `tasks/todo.md` with sprint notes

---

### Review Notes — Today Page + Dark Mode Sprint

**What was built:**
- 3 new OS blocks: `daily-outcomes`, `daily-reflection`, `schedule-placeholder`
- Each follows gold-standard pattern from `tasks/view.js` (mountId, eventBus cleanup, unmount)
- Dark mode fixes: all hardcoded hex colors replaced with CSS variables
- OS shell responsive improvements: desktop gets wider padding and grid columns
- 87 tests total (12 new) — all passing

**Dark mode root causes fixed:**
1. `applyUserSettings()` (from previous sprint) ensures theme loads on OS path
2. Mini-card border colors were hardcoded hex — now use `--color-blue/purple/emerald`
3. `planning.js` referenced undefined vars `--color-text-primary` and `--color-bg-secondary`
4. Energy level colors were hardcoded hex — now use semantic CSS variables

**Design decisions:**
- Daily Outcomes block (order 5) sits at the top — first thing you see
- Schedule Placeholder (order 25) between tasks and BPV log — ready for calendar API
- Daily Reflection (order 50) at the bottom — end-of-day prompt
- All blocks share the DailyEntry store via `stores/daily.js`

---

### Review Notes — Data Integrity Sprint

**What was built:**
- One-time migration: `os_personal_tasks` → `os_tasks` with `mode='Personal'`
- Device ID generation moved from `initLegacy()` to shared `init()` — both OS and legacy paths get it
- Weekly export reminder toast (shows if `last_export_date` > 7 days ago)
- `last_export_date` tracking on every export (plain + encrypted) in `export.js`
- 5 new migration tests — all passing

**Design decisions:**
- Migration is idempotent: guarded by `migration_personal_tasks_done` setting flag
- Migration maps old field names (`title` → `text`, `created_at` → `createdAt`)
- Export reminder doesn't nag new users (skips if no `last_export_date` exists)
- Reminder shows 2 seconds after init to avoid blocking startup

**Milestone 1 is now complete.** All checklist items done.

---

## Inbox Screen + Processing Sprint

### Inbox Processing Flow
- [x] Extend `src/stores/inbox.js` — add `getInboxItemById`, `getInboxCount`, `saveToReference`, `deleteItem`
- [x] Extend `promoteToTask` to accept optional explicit mode parameter
- [x] Add 'inbox' tab to OS shell (`SHELL_TABS`, nav button, section with `inbox-screen` host)
- [x] Add nav badge with live item count (`os-nav__badge`)
- [x] Create `src/blocks/inbox-screen/` — full processing screen (view, index, styles)
- [x] Item list with keyboard selection (J/K navigation, highlight)
- [x] Processing panel (Enter) — mode selector, task/reference/archive/delete actions
- [x] Quick-action shortcuts: T=task, R=reference, A=archive, D=delete
- [x] Register `inbox-screen` block in `registerBlocks.js`

### Shortcuts + Quick Actions
- [x] Add `inbox:open` event listener in OS shell (switches to inbox tab)
- [x] Add global `Ctrl+I` shortcut in OS shell (opens inbox, focuses capture input)
- [x] Add "Verwerk" quick-action button on Today page inbox block (emits `inbox:open`)

### Testing
- [x] Create `tests/stores/inbox-processing.test.js` — 14 tests for state transitions
- [x] Test: getInboxItemById, getInboxCount, promoteToTask mode override/fallback
- [x] Test: saveToReference (creates ref, archives item, link content, custom category)
- [x] Test: deleteItem (permanent removal)
- [x] Test: full processing flow (add 3 → promote/reference/delete → inbox empty)
- [x] All 101 tests green

### Documentation
- [x] Create `docs/demo.md` — manual demo script with 12 verification steps
- [x] Update `tasks/todo.md` with sprint checklist

---

### Review Notes — Inbox Processing Sprint

**What was built:**
- Full Inbox screen as dedicated OS tab with keyboard-driven processing
- GTD-style flow: capture → process → task/reference/archive/delete
- Keyboard shortcuts for speed: J/K navigate, T/R/A/D quick-process, Enter for panel, Esc to close
- Ctrl+I global shortcut opens inbox from any tab and focuses capture input
- "Verwerk" button on Today page inbox block for zero-friction access
- Nav badge with live unprocessed count
- 14 new tests covering all state transitions (101 total)
- Manual demo script with 12 verification steps

**Files created:**
- `src/blocks/inbox-screen/index.js` — block registration on `inbox-screen` host
- `src/blocks/inbox-screen/view.js` — full rendering with keyboard shortcuts (~305 lines)
- `src/blocks/inbox-screen/styles.css` — styles for screen, items, processing panel, badge
- `tests/stores/inbox-processing.test.js` — 14 state transition tests
- `docs/demo.md` — manual demo script

**Files modified:**
- `src/stores/inbox.js` — 4 new exports, mode parameter for promoteToTask
- `src/os/shell.js` — inbox tab, section, badge, Ctrl+I shortcut, inbox:open listener
- `src/blocks/inbox/view.js` — "Verwerk" quick-action button
- `src/blocks/inbox/styles.css` — header layout for new button
- `src/blocks/registerBlocks.js` — inbox-screen registration

**Design decisions:**
- Processing shortcuts work directly from list (T/R/A/D) for speed, no panel needed
- Enter opens full panel for mode selection or when user wants to review before acting
- Ctrl+I is the global entry point — works from any tab, focuses capture input
- Nav badge hidden when count is 0 (clean, minimal)
- Empty state is encouraging: "Inbox is leeg — goed bezig!"

---

## Milestone 2: Module Boundaries + Planning Tab (Future)

- [ ] Create `src/modules/` folder structure with `index.js` per domain
- [ ] Refactor `main.js` → module init functions replace `registerDefaultBlocks()`
- [ ] Emit `settings:changed` event from settings panel
- [ ] OS shell subscribes to `settings:changed` (live theme switch, no reload)
- [ ] Keyboard shortcut (Ctrl+K) for quick inbox capture
- [ ] Build Planning tab with weekly planning blocks
- [ ] Build Reflectie tab with weekly reflection blocks
- [ ] Embed legacy pages in OS shell detail panel

---

## Milestone 3: Cloudflare Deployment + Sync (Future)

- [ ] Deploy to Cloudflare Pages (static hosting, free tier)
- [ ] Set up Cloudflare D1 database for sync backend
- [ ] Implement `/api/sync` Worker endpoint
- [ ] Add Cloudflare Turnstile for auth protection
- [ ] Implement IndexedDB ↔ D1 sync protocol (last-write-wins)
- [ ] Cloudflare R2 for photo/file sync
- [ ] Offline queue with retry on reconnect
