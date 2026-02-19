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
- [ ] Migrate `os_personal_tasks` data into `os_tasks` (mode='Personal')
- [ ] Add `device_id` generation in OS shell path (currently only in legacy)
- [ ] Add auto-export reminder (weekly prompt to save JSON backup)

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
- [x] All 82 tests green

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
- 82 tests total (7 new) — all passing

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

**What's left for M1:**
- M1.3: Data migration (os_personal_tasks → os_tasks) + device_id in OS path
- These are data integrity tasks, not blocking for daily use

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
