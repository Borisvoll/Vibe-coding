# Personal OS / Second Brain — Todo

---

## Milestone 2 — Morning Flow Mode

**Branch:** `claude/fix-api-400-error-Bq2kH`
**Date:** 2026-02-21

### Summary

A calm, step-by-step morning planning flow that auto-opens once per day. Guides the user through setting their Top 3 outcomes, reviewing next actions, and optionally choosing a project focus. Ends with a summary focus card pinned on the Vandaag page.

### Design Decisions

| Question | Answer |
|----------|--------|
| Step order | Top 3 → Next Actions → Project Focus → Confirm |
| Auto vs manual | Auto-open 1x/day (when outcomes empty), + manual button |
| Project Focus | Optional — skip or choose |
| End state | Focus card on Vandaag with clean summary |

### Flow Steps

```
Step 1: Top 3 Outcomes
  ┌─────────────────────────────┐
  │  Wat wil je vandaag bereiken?│
  │  1. [_________________]     │
  │  2. [_________________]     │
  │  3. [_________________]     │
  │              [Volgende →]   │
  └─────────────────────────────┘

Step 2: Next Actions
  ┌─────────────────────────────┐
  │  Bekijk je volgende acties   │
  │  📚 Project A → "Actie X"  │
  │  📚 Project B → geen actie  │
  │              [Volgende →]   │
  └─────────────────────────────┘

Step 3: Project Focus (optional)
  ┌─────────────────────────────┐
  │  Kies een project als focus  │
  │  ○ Project A                │
  │  ○ Project B                │
  │  ○ Geen focus vandaag       │
  │              [Volgende →]   │
  └─────────────────────────────┘

Step 4: Confirm
  ┌─────────────────────────────┐
  │  ☀ Je ochtendplan            │
  │  Top 3: ...                  │
  │  Focus: Project A            │
  │         [Start je dag →]     │
  └─────────────────────────────┘
```

### Data Model

No schema changes. Uses existing stores:

| Data | Store | API |
|------|-------|-----|
| Top 3 outcomes | `dailyPlans` | `saveOutcomes(mode, date, outcomes)` |
| Project focus | `os_projects` | `setPinned(projectId, mode)` |
| Flow progress | `localStorage` | `boris_morning_${date}_${mode}` → `{ step, completed }` |

### Resume Logic

- `localStorage` key: `boris_morning_${date}_${mode}`
- Value: `{ step: 0-3, completed: false, dismissed: false }`
- On open: reads state, resumes at saved step
- Each step advance: saves `{ step: newStep }`
- On complete: saves `{ step: 3, completed: true }`
- On dismiss (Esc/backdrop): saves `{ dismissed: true }` — won't auto-open again

### Auto-Open Logic (shell.js)

After Vandaag tab mounts (~800ms delay):
1. Read `boris_morning_${today}_${mode}` from localStorage
2. If `completed` or `dismissed` → skip
3. If today's outcomes are all empty → auto-open morning flow
4. Also registers command in palette: "Start ochtendplan"

### Focus Card (morning-focus block)

Mounted in `vandaag-hero` (after daily-outcomes). Shows ONLY if morning flow is completed today:
- Clean summary: Top 3 outcomes (read-only, compact)
- Focus project name + next action (if set)
- Mode-colored accent

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/ui/morning-flow.js` | **NEW** | Stepper overlay UI + persistence |
| `src/ui/morning-flow.css` | **NEW** | Stepper styles |
| `src/blocks/morning-focus/index.js` | **NEW** | Block registration |
| `src/blocks/morning-focus/view.js` | **NEW** | Focus card after completion |
| `src/blocks/registerBlocks.js` | **MODIFY** | Register morning-focus block |
| `src/os/shell.js` | **MODIFY** | Auto-open logic + command registration |
| `tests/ui/morning-flow.test.js` | **NEW** | Tests for stepper + persistence |
| `docs/feature-specs/morning-flow.md` | **NEW** | Feature spec |
| `docs/demo.md` | **MODIFY** | QA script |

### Checklist

#### 1. Morning flow stepper — `src/ui/morning-flow.js`
- [x] `createMorningFlow({ modeManager, eventBus })` → `{ open, close, destroy }`
- [x] Step 1: Top 3 input fields, pre-fill from daily entry
- [x] Step 2: List active projects with next action status (read-only)
- [x] Step 3: Project picker (radio: projects + "Geen focus"), optional
- [x] Step 4: Summary card + "Start je dag" button
- [x] Step navigation: Back/Next buttons, progress dots
- [x] Keyboard: Escape dismisses, Enter advances
- [x] Persist step to localStorage on each advance
- [x] Resume from saved step on re-open
- [x] Save outcomes after step 1 completion
- [x] Pin project after step 3 completion
- [x] Mark completed in localStorage after step 4

#### 2. Morning focus card — `src/blocks/morning-focus/`
- [x] Block registration: hosts `vandaag-hero`, order 7 (after daily-outcomes)
- [x] Render only if flow completed today
- [x] Show: Top 3 compact, focus project, mode accent
- [x] "Herstart ochtendplan" link to re-open flow
- [x] Reactive: listens to `daily:changed`, `projects:changed`, `morning:completed`

#### 3. Shell integration — `src/os/shell.js`
- [x] Auto-open check on Vandaag mount (1s delay, skips first visit)
- [x] Register "Start ochtendplan" command in palette
- [x] Morning flow instance created and appended to shell

#### 4. Styles — `src/ui/morning-flow.css`
- [x] Overlay + backdrop (same z-index pattern as modal)
- [x] Panel with step content area
- [x] Progress dots
- [x] Mode-colored accent on confirm step
- [x] Smooth step transitions
- [x] Reduced-motion support

#### 5. Tests
- [x] `tests/ui/morning-flow.test.js` — 13 tests: persistence, resume, auto-open, data integration

#### 6. Docs
- [x] `docs/feature-specs/morning-flow.md`
- [x] Update `docs/demo.md` with QA script

### Acceptance Criteria

1. Morning flow auto-opens 1x/day on Vandaag (when outcomes empty)
2. Flow has 4 steps: Top 3 → Next Actions → Focus (optional) → Confirm
3. Each step persists to localStorage — resume works after reload
4. Dismissing (Esc/backdrop) prevents re-auto-open that day
5. Completing saves outcomes + pins project + shows focus card
6. Focus card on Vandaag shows clean summary of morning plan
7. "Start ochtendplan" available in command palette
8. All existing tests pass (499+)
9. No hardcoded colors — CSS variables only

---

## Milestone 1 — Command Palette Enhancement

**Branch:** `claude/fix-api-400-error-Bq2kH`
**Date:** 2026-02-21

### Summary

Enhance the existing Ctrl+K command palette with **navigation commands** and **create actions**. Currently the palette is search-only. After this milestone it becomes a true command palette: keyboard-first hub for navigation and quick creation.

### Architecture Decision

The project is a zero-dependency vanilla JS monolith. Rather than introducing React (3 new deps + build config changes) for a single component, we extend the existing `command-palette.js` with a new kernel module `src/core/commands.js`. This follows the established kernel pattern (`{ db, eventBus, modeManager, blockRegistry }`) and delivers all functional requirements as a small increment.

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/core/commands.js` | **NEW** | Command registry — register, filter, execute commands |
| `src/ui/command-palette.js` | **MODIFY** | Add commands section (empty-state + mixed results) |
| `src/ui/command-palette.css` | **MODIFY** | Styles for command items (icon, label, shortcut hint) |
| `src/os/shell.js` | **MODIFY** | Register nav + create commands, pass commands to palette |
| `tests/core/commands.test.js` | **NEW** | Tests for command registry |
| `tests/ui/command-palette.test.js` | **MODIFY** | Tests for command filtering + execution |
| `docs/feature-specs/command-palette.md` | **NEW** | Feature spec |
| `docs/demo.md` | **MODIFY** | Add manual QA script |

### Component Structure

```
src/core/commands.js (kernel module)
├── createCommandRegistry()
│   ├── register(id, { label, icon, keywords, group, handler, shortcut? })
│   ├── getAll() → Command[]
│   ├── filter(query) → Command[] (uses fuzzyScore from search.js)
│   └── execute(id) → Promise<void>
│
src/ui/command-palette.js (enhanced)
├── Empty state → shows all commands grouped by type
├── Typing → commands filtered first, then search results below
├── Command groups: "Navigatie" and "Aanmaken"
└── Keyboard: arrows navigate, Enter executes, Esc closes
```

### Commands v1

| ID | Group | Label | Icon | Action |
|----|-------|-------|------|--------|
| `nav:dashboard` | Navigatie | Ga naar Dashboard | `◫` | `setActiveTab('dashboard')` |
| `nav:today` | Navigatie | Ga naar Vandaag | `☀` | `setActiveTab('today')` |
| `nav:projects` | Navigatie | Ga naar Projecten | `🚀` | `setActiveTab('projects')` |
| `nav:settings` | Navigatie | Ga naar Instellingen | `⚙` | `setActiveTab('settings')` |
| `nav:inbox` | Navigatie | Ga naar Inbox | `📥` | `setActiveTab('inbox')` |
| `nav:planning` | Navigatie | Ga naar Planning | `📋` | `setActiveTab('planning')` |
| `create:task` | Aanmaken | Nieuwe taak | `+` | `showPrompt → addTask()` |
| `create:project` | Aanmaken | Nieuw project | `+` | `showPrompt → addProject()` |

### Checklist

#### 1. Command registry — `src/core/commands.js`
- [x] Create `createCommandRegistry()` factory
- [x] `register(id, opts)` — add command to registry
- [x] `getAll()` — return all commands
- [x] `filter(query)` — fuzzy filter using `fuzzyScore`
- [x] `execute(id)` — run handler, return result

#### 2. Enhanced command palette — `src/ui/command-palette.js`
- [x] Accept `commands` option (command registry instance)
- [x] Empty state: render all commands grouped by `group` field
- [x] Typing mode: show filtered commands above search results
- [x] Command items: distinct styling (icon + label + optional shortcut hint)
- [x] Click + Enter executes command
- [x] Escape closes palette

#### 3. Shell integration — `src/os/shell.js`
- [x] Create command registry instance
- [x] Register 6 navigation commands
- [x] Register 2 create commands (task + project via `showPrompt`)
- [x] Pass `commands` to `createCommandPalette()`
- [x] Emit `tasks:changed` / `projects:changed` after creates

#### 4. Styles — `src/ui/command-palette.css`
- [x] `.cmd-palette__item--command` — command item styling
- [x] `.cmd-palette__command-icon` — icon display
- [x] `.cmd-palette__command-shortcut` — keyboard hint (muted)
- [x] Group headers via existing `.cmd-palette__group-header`

#### 5. Tests
- [x] `tests/core/commands.test.js` — 12 tests (registry CRUD, filter, execute)
- [x] `tests/ui/command-palette.test.js` — 28 existing tests pass (no regressions)

#### 6. Docs
- [x] `docs/feature-specs/command-palette.md` — feature spec
- [x] Update `docs/demo.md` — manual QA script
- [x] Update this todo with completion status

### Acceptance Criteria

1. Ctrl+K / Cmd+K opens palette
2. Empty state shows all commands grouped (Navigatie, Aanmaken)
3. Typing filters commands + searches data simultaneously
4. Arrow keys navigate, Enter executes, Esc closes
5. Navigate commands switch tabs correctly
6. Create Task: prompts for text, creates task in current mode, emits `tasks:changed`
7. Create Project: prompts for title, creates project in current mode, emits `projects:changed`
8. All existing tests pass (298 tests)
9. New tests pass for commands module
10. No hardcoded colors — uses CSS variables only

---

## UI Fixes + Theme Studio — Implementation Plan

**Feature branch:** `claude/design-personal-os-ui-1hX66`
**Date:** 2026-02-21

### Phase 1 — Audit (DONE)
- [x] Root-cause "??" date in header → missing weekend days in WEEKDAYS array
- [x] Root-cause "Hoe voelt je hoofd" readability → hardcoded pastels + small fonts + no dark mode adaptation
- [x] Inventory Theme Studio → docs/audit/theme-studio-current-state.md
- [x] Document problems → docs/audit/theme-studio-problems.md

### Phase 2 — Design Decisions (WAITING)
- [ ] Get answers to 7 design questions before implementing Milestone 2

### Milestone 1 — Immediate UI Fixes

#### 1.1 Fix "??" date in header
- [ ] Add 'za' and 'zo' to `WEEKDAYS` in `src/constants.js:93`
- [ ] Verify `formatDateShort()` returns correct names for all 7 days
- [ ] Run tests, check no regressions

#### 1.2 Fix "Hoe voelt je hoofd" readability
- [ ] Replace hardcoded STATES colors with CSS token references (`--color-emerald-light` etc.)
- [ ] Add dark-mode-aware variants for action backgrounds
- [ ] Increase font sizes: button labels 11px→13px, action text 13px→14px
- [ ] Verify contrast in all presets and dark mode

#### 1.3 Verification & docs
- [ ] Run full test suite (298 tests, 21 files)
- [ ] Create/update `docs/a11y-contrast.md`
- [ ] Commit with descriptive message

### Milestone 2 — Theme Studio Redesign (blocked: awaiting design decisions)
_Details TBD after Phase 2 answers._

### Milestone 3 — Cleanup & Orphan Sweep
_Details TBD after Milestone 2._

---

## Project-Hub 2.0 — Implementation Plan

**Feature branch:** `claude/life-dashboard-modular-blocks-AOPzD`
**Date:** 2026-02-20

### Context
Most of Project Hub 2.0 is already implemented. This sprint closes 3 specific gaps:
1. **Banner tab** — separate tab for cover/accent (currently inside Files tab)
2. **Pin to Today** — project-level pin to Vandaag (one pin per mode)
3. **Manual accent picker** — hand-pick swatches + auto-extract in Banner tab

### Open Questions → Decisions
| Question | Decision | Rationale |
|----------|----------|-----------|
| Cover > 15 MB? | **No** — keep 15 MB cap | IndexedDB limits; mobile browsers |
| Accentkleur auto of hand-pick? | **Both** — auto-extract + 6 swatches | Best of both worlds |
| Pin to Today: één of meerdere? | **Één per modus** | Focused intent; BORIS philosophy |

### Checklist

#### 1. Store layer — `src/stores/projects.js`
- [ ] Add `setPinned(projectId, modeOrNull)` — sets `pinnedForMode` field, clears previous pin in same mode
- [ ] Add `getPinnedProject(mode)` — returns pinned project for mode (or null)
- [ ] `addProject()` gets `pinnedForMode: null` default field

#### 2. Banner tab — NEW `src/blocks/project-hub/tabs/banner.js`
- [ ] Cover upload section (image/PDF, max 15 MB, downscale >1MP)
- [ ] Auto-extract accent color on upload (existing `extractAvgRGB` logic, moved here)
- [ ] Manual accent swatches (6 preset colors + "auto" reset)
- [ ] Cover preview with remove button
- [ ] Return `{ unmount() }` contract

#### 3. Files tab — UPDATE `src/blocks/project-hub/tabs/files.js`
- [ ] Remove cover upload section (moved to Banner tab)
- [ ] Remove `extractAvgRGB` helper (move to `banner.js`)
- [ ] Keep file attachments section intact (no other changes)

#### 4. Detail view — UPDATE `src/blocks/project-hub/detail.js`
- [ ] Add `{ id: 'banner', label: 'Banner' }` as first item in TABS array
- [ ] Import and mount `renderBannerTab` from `./tabs/banner.js`
- [ ] Add Pin button to `hub-detail__topbar-actions`
- [ ] Pin button handler: calls `setPinned`, emits `projects:changed`, updates button state
- [ ] Show pinned badge (`📌 Vast in Vandaag`) below status in header when `project.pinnedForMode`

#### 5. List view — UPDATE `src/blocks/project-hub/list.js`
- [ ] Show 📌 pin indicator on cards where `project.pinnedForMode === currentMode`
- [ ] Remove/replace existing pin if clicking pin on a different card (handled by store)

#### 6. Styles — UPDATE `src/blocks/project-hub/styles.css`
- [ ] `.hub-banner` — Banner tab container styles
- [ ] `.hub-banner__accent-swatches` — color swatch grid
- [ ] `.hub-banner__swatch` + `--active` — individual color dot
- [ ] `.hub-detail__pin-btn` — pin button in topbar (uses `--project-accent`)
- [ ] `.hub-card__pin-indicator` — small 📌 on list cards

#### 7. Tests — UPDATE `tests/stores/project-hub.test.js`
- [ ] `setPinned` sets `pinnedForMode` on target project
- [ ] `setPinned` clears previous pin in same mode (only one pin per mode)
- [ ] `getPinnedProject(mode)` returns correct project
- [ ] `getPinnedProject(mode)` returns null when nothing pinned
- [ ] Pin is per-mode (BPV pin doesn't affect School)

#### 8. Verification
- [ ] All 478+ tests pass
- [ ] Timeline drag functional (HTML5 drag API, no rAF loops)
- [ ] Banner tab renders cover + swatches
- [ ] Pin button in detail updates Today view
- [ ] Git commit + push to `claude/life-dashboard-modular-blocks-AOPzD`

### Review Section
*(to be filled after implementation)*

---

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

## Projects Sprint + Deployment

### Deployment
- [x] Create `netlify.toml` — build command (`vite build --base=/`), publish dir, SPA redirect

### Mode Switcher
- [x] Restyle `.os-mode-switch` as a segmented control (inline-flex container, floating pill on active)

### Projects (DB v6)
- [x] Bump `DB_VERSION` to 6, add `os_projects` store (mode, status, updated_at indexes)
- [x] Update `clearAllData` and `exportAllData` to include `os_projects`
- [x] Create `src/stores/projects.js` — CRUD + `setNextAction` (one-next-action enforcement)
- [x] Create `src/blocks/projects/` (index, view, styles) — list + progressive disclosure detail
- [x] Projects block: status filter by mode, sorted active→paused→done
- [x] Project detail: goal, current next action, "set next action" form, status buttons
- [x] One-next-action rule: `setNextAction(projectId, taskId)` always replaces previous
- [x] Register `projects` block in `registerBlocks.js` (order 12, between inbox and tasks)
- [x] Update `schema.test.js` — expect version 6, 29 stores
- [x] Create `tests/stores/projects.test.js` — 18 tests covering CRUD + one-next-action rule
- [x] Update `docs/architecture.md` — DB v6, Module 6 includes projects
- [x] All 119 tests green, build clean

---

### Review Notes — Projects Sprint

**What was built:**
- `os_projects` IndexedDB store (DB v6, 29 stores total)
- `src/stores/projects.js`: addProject, getProjects, getActiveProjects, updateProject, setNextAction, clearNextAction, deleteProject
- One-next-action rule: `setNextAction(projectId, taskId)` always overwrites `nextActionId` on the project record — impossible to have two next actions for one project
- Projects block at order 12 (between Inbox and Tasks on Today page)
- Progressive disclosure: click project row → expands detail (goal + current next action + set-action form + status controls)
- Mode-aware: shows projects matching current mode (or mode=null) sorted active→paused→done
- 18 new tests — all passing (119 total)
- Smooth segmented-control mode switcher (pill highlights active mode with subtle shadow)
- `netlify.toml` ready for `netlify deploy --prod` (needs `netlify login` first)

**One-next-action constraint design:**
- Enforced at store level, not UI — `setNextAction` is the only write path
- Project record has single `nextActionId` field (string | null)
- Setting a new next action always clears the old one atomically
- Clearing is explicit: `clearNextAction(projectId)` sets to null
- Tests verify: initial null, set first, replace second, independent per project

---

## BPV Tracker Module Sprint

### Module Boundary
- [x] Identify all existing BPV functionality (hours, logbook, blocks, pages)
- [x] Create `src/stores/bpv.js` — clean TrackerEntry CRUD layer over `hours` + `logbook` stores

### TrackerEntry CRUD (`src/stores/bpv.js`)
- [x] `addHoursEntry(date, { type, startTime, endTime, breakMinutes, note })` — upsert by date
- [x] `getHoursEntry(date)` — fetch entry for a specific date
- [x] `updateHoursEntry(id, changes)` — update with netMinutes recalculation
- [x] `deleteHoursEntry(id)` — remove entry

### Weekly Overview (`getWeeklyOverview`)
- [x] Aggregate hours + logbook for a given ISO week string
- [x] Returns: totalMinutes, targetMinutes (40h), percentComplete, 5 day objects, highlights array
- [x] `getPrevWeek` / `getNextWeek` helpers added to `src/utils.js`

### Export (`exportEntries`)
- [x] CSV: date, week, type, start, end, break, net_min, net_hours, note, description, tags
- [x] JSON: same fields as array of objects, sorted by date

### BPV Views (OS Blocks)
- [x] `bpv-quick-log` block (order 8): today time entry form with live net calc, day-type switcher, note field — BPV mode, `today-sections` host
- [x] `bpv-weekly-overview` block (order 14): week navigation, progress bar (red/yellow/green), 5-day grid with logbook indicator, highlights section, CSV + JSON export buttons — BPV mode, `today-sections` host

### Testing
- [x] Create `tests/stores/bpv.test.js` — 20 tests covering:
  - TrackerEntry CRUD (add/get/update/delete, upsert, type validation)
  - getWeeklyOverview (empty week, totals, capped %, day shape, logged flag)
  - exportEntries (CSV header, row count, JSON parse, sorted dates)
- [x] All 139 tests green

### Documentation
- [x] Append BPV Tracker scenario to `docs/demo.md`
- [x] Update `docs/architecture.md` — Module 1 entry points, TrackerEntry schema
- [x] Update `tasks/todo.md` with sprint checklist

---

### Review Notes — BPV Tracker Module Sprint

**What was built:**
- `src/stores/bpv.js`: clean CRUD layer that wraps the legacy `hours` + `logbook` IndexedDB stores. All blocks now write through this module instead of calling `put()` directly.
- `bpv-quick-log` block: today-focused input with day-type pill switcher (Gewerkt / Ziek / Afwezig / Vrij), start/end time fields, break minutes, live net-hours display, note field. Upserts via `addHoursEntry`, emits `bpv:changed`.
- `bpv-weekly-overview` block: week navigation (‹ ›), progress bar color-coded (green ≥80%, yellow ≥50%, red <50%), 5-day grid showing type + hours + logbook indicator (📝), highlights from logbook, CSV and JSON export buttons.
- `getPrevWeek` / `getNextWeek` added to `src/utils.js` for week navigation.
- 20 new tests (139 total). All green.

**Files created:**
- `src/stores/bpv.js`
- `src/blocks/bpv-quick-log/` (index.js, view.js, styles.css)
- `src/blocks/bpv-weekly-overview/` (index.js, view.js, styles.css)
- `tests/stores/bpv.test.js`

**Files modified:**
- `src/utils.js` — `getPrevWeek`, `getNextWeek`
- `src/blocks/registerBlocks.js` — CSS imports + block registrations

**Design decisions:**
- `bpv-quick-log` upserts by date (no duplicate entries possible)
- Export downloads the entire history (not just one week) — useful for supervisor handoff
- `bpv:changed` event wires the two blocks together: saving in quick-log refreshes weekly overview
- Week navigation is unrestricted (allows browsing any week, not just BPV period)

---

## School Dashboard Sprint

### School Dashboard Block (`school-dashboard`, order 6, School mode, today-sections)
- [x] `src/blocks/school-dashboard/store.js` — `getSchoolDashboardData()` aggregates 4 sources
- [x] **Volgende actie** — first non-done School task (os_tasks, sorted by date → createdAt)
- [x] **Aankomende deadlines** — milestones + future School tasks within 14 days, sorted by date, max 5
- [x] **BPV week** — compact progress bar via `getWeeklyOverview(getCurrentWeek())` from bpv store
- [x] **Schoolprojecten** — active os_projects where mode='School' shown as purple chips
- [x] Mark-done button on next action (circle icon, toggles via `toggleTask`, emits `tasks:changed`)
- [x] Urgency badges: red 0–2 days, amber 3–7, grey 8–14
- [x] Reactives to `mode:changed`, `tasks:changed`, `bpv:changed` events
- [x] Register in `registerBlocks.js` (CSS import + function call)

### Testing
- [x] Create `tests/blocks/school-dashboard.test.js` — 13 tests covering:
  - Empty state (all null/empty)
  - nextAction: correct task, ignores other modes, priority by date
  - deadlines: future tasks included, today excluded, beyond-14d excluded, sorted, capped at 5
  - schoolProjects: only School+active
  - bpvWeek: structure, reflects logged hours
- [x] All 152 tests green

### Documentation
- [x] Append School Dashboard demo scenario to `docs/demo.md` (steps 21–26 + checklist)
- [x] Update `tasks/todo.md`
- [x] Rewrite `README.md` with app overview, features, run/deploy guide

---

### Review Notes — School Dashboard Sprint

**What was built:**
- `school-dashboard` block (order 6): appears first on School mode Today page
- 4 sections in a single minimal card: next action + deadlines + BPV progress + projects
- Next action mark-done circle button — one tap, no confirmation needed
- Deadline urgency badges auto-color by days remaining
- BPV week progress visible from School mode (cross-module view — helpful for students doing both)
- Purple chips for active School projects
- 13 new tests (152 total)

**Design decisions:**
- Sections separated by thin dividers (no cards-within-card); single `os-mini-card` container
- No forms or inputs in the dashboard block — it's read-only; editing happens in domain blocks
- `deadline.date > today` — today's tasks are the "next action", not deadlines
- BPV progress embedded even in School mode — avoids having to switch mode to check hours

---

## QoL + Personal Dashboard Sprint

### OS Shell Polish
- [x] Fix `applyDesignTokens()` — remove spacing/radius/motion inline styles that blocked `[data-compact="true"]` (same bug pattern as dark mode fix)
- [x] Constrain header + nav to `--max-content-width` via inner wrappers (no more full-width stretch on desktop)
- [x] Nav horizontal scroll with hidden scrollbar (mobile-friendly, no wrapping)
- [x] Nav buttons redesigned: borderless ghost style, accent-light active state
- [x] Ambient mode wash — Eno-inspired 600ms color pulse on mode switch (`os-mode-wash`)

### Settings Panel Cleanup
- [x] Remove legacy "Nieuwe OS inschakelen" toggle (OS is now default)
- [x] Remove "Focusmodus" toggle (feature removed)
- [x] Add mode switcher pills in Settings (same `modeManager.setMode()` as header pill)
- [x] Clean up density row (visual selected state update on click)

### Personal Mode Dashboard (`personal-dashboard`, order 5, Personal mode, today-sections)
- [x] Create `src/stores/personal.js` — personal dashboard aggregation layer:
  - `getTodayEntry()` / `saveTodayEntry(fields)` — upsert keyed by date in `os_personal_wellbeing`
  - `toggleHabit(key)` — toggle water/movement/focus booleans
  - `getCreativeSparks(limit)` — thought-type inbox items
  - `getRecentEntries(limit)` — entries with journal/gratitude/reflection content
  - `getPersonalDashboardData()` — full aggregation
- [x] Create `src/blocks/personal-dashboard/` (index.js, view.js, store.js, styles.css):
  - Dankbaarheid (gratitude textarea)
  - Reflectie (reflection textarea)
  - Dagboek (freeform journal textarea)
  - Gewoontes (3 habit pill toggles: Water, Bewegen, Focustijd)
  - Creatieve vonken (thought-type inbox items as spark list)
  - Auto-save on input (600ms debounce)
  - Register in `registerBlocks.js` (CSS import + function call)
- [x] Create `tests/stores/personal.test.js` — 15 tests covering:
  - getTodayEntry default shape + persistence
  - saveTodayEntry upsert + merge
  - toggleHabit on/off/independent
  - getCreativeSparks: empty, thought-only, limit
  - getRecentEntries: empty, with journal content
  - getPersonalDashboardData: shape, habitsComplete, sparks
- [x] All 167 tests green

---

### Review Notes — QoL + Personal Dashboard Sprint

**What was fixed:**
- `applyDesignTokens()` was setting `--space-*`, `--radius-*`, `--duration-*` as inline styles, overriding `[data-compact="true"]` CSS rules (same specificity bug that broke dark mode). Fixed by removing all non-font inline setProperty calls.
- Header and nav stretched full-width on desktop — wrapped inner content in `__inner` divs with `max-width: var(--max-content-width)`.
- Legacy settings ("Nieuwe OS inschakelen", "Focusmodus") removed — OS is default, focus mode was unused.

**What was built:**
- Mode switcher in Settings panel — three colored pills that call `modeManager.setMode()` (same behavior as header pill, just in settings too).
- Ambient mode wash — a full-screen overlay animates a 600ms color pulse at 8% opacity when mode changes. Subtle and ambient, inspired by Eno's generative philosophy.
- Personal Dashboard — 5-section card at order 5 on the Today page in Personal mode. Gratitude, reflection, and journal textareas auto-save (600ms debounce). Three habit toggles (water, movement, focus). Creative sparks section pulls thought-type inbox items.
- 15 new tests (167 total).

**Design decisions:**
- Auto-save with debounce rather than explicit save button — more journal-like, seamless
- Habit toggles are pill buttons (not checkboxes) — tappable, fun on mobile
- Creative sparks show max 5 items from inbox (thought type) — encourages capture-everywhere
- No calendar or date picker — dashboard is always "today" focused
- Compact mode now works correctly: `[data-compact="true"]` overrides spacing tokens without inline style conflicts

---

## Weekly Review Email Sprint

### Data Aggregation (`src/stores/weekly-review.js`)
- [x] `aggregateWeeklyReview(weekStr)` — aggregates from os_tasks, hours/bpv, os_personal_wellbeing, os_inbox, os_projects
- [x] Completed tasks (done this week, sorted by doneAt)
- [x] BPV hours (formattedTotal, percentComplete, progress bar data)
- [x] Gratitude, reflections, journal notes from personal wellbeing entries
- [x] Habits summary (water/movement/focus completion rates)
- [x] Active projects + processed inbox count
- [x] Rotating weekly prompts — emotionally-aware reflection questions
- [x] `isReviewSent(week)` / `markReviewSent(week)` — prevent duplicate sends
- [x] `isFriday()` helper for prompt timing

### Netlify Serverless Function (`netlify/functions/send-weekly-review.mjs`)
- [x] POST endpoint: receives aggregated data, sends HTML email via Resend API
- [x] Environment variables only (RESEND_API_KEY, RECIPIENT_EMAIL, SITE_URL) — zero personal info in client code
- [x] Beautiful HTML email: dashboard stats, BPV progress bar, task list, gratitude/reflections, habits, projects, emotional prompt, CTA button
- [x] Dieter Rams inspired: clean typography, lots of white space, minimal color
- [x] "Even stilstaan" section with rotating emotionally-aware prompt

### Weekly Review UI Block (`weekly-review`, order 90, all modes, today-sections)
- [x] `src/blocks/weekly-review/` (index.js, view.js, styles.css)
- [x] Dashboard preview: stats row (tasks/hours/verwerkt), BPV bar, task list, habits, gratitude, reflections, journal, projects
- [x] "Even stilstaan" prompt section
- [x] "Verstuur naar email" button (POST to serverless function)
- [x] Sent badge when already sent this week
- [x] Reacts to `tasks:changed`, `bpv:changed` events

### Friday Prompt
- [x] Shell checks `isFriday()` on load
- [x] If not yet sent this week, shows gentle banner: "Het is vrijdag — tijd voor je weekoverzicht?"
- [x] "Bekijk" scrolls to weekly review block, "×" dismisses

### Configuration
- [x] `netlify.toml` updated: functions directory, redirect rules

### Testing
- [x] Create `tests/stores/weekly-review.test.js` — 15 tests covering:
  - aggregateWeeklyReview: empty shape, completed tasks, open tasks, BPV hours, gratitude, reflections, journal, processed inbox, habits
  - getWeeklyPrompt: returns string, different per week
  - isReviewSent / markReviewSent: false by default, true after mark, independent weeks
  - isFriday: returns boolean
- [x] All 182 tests green

---

### Review Notes — Weekly Review Email Sprint

**Architecture:**
- Client aggregates all week data from IndexedDB → POST to `/.netlify/functions/send-weekly-review`
- Serverless function formats HTML email and sends via Resend API (`https://api.resend.com/emails`)
- Email address stored ONLY in Netlify env var `RECIPIENT_EMAIL` — never in client code
- Resend API key in `RESEND_API_KEY` env var
- Site URL in `SITE_URL` env var (for email CTA button)

**Setup instructions:**
1. Deploy to Netlify (connect repo → auto-builds)
2. In Netlify dashboard → Site settings → Environment variables, add:
   - `RESEND_API_KEY` — get from resend.com (free: 100 emails/day)
   - `RECIPIENT_EMAIL` — borisvoll@hotmail.com
   - `SITE_URL` — your Netlify URL (e.g. https://boris-os.netlify.app)
3. Done. Open app on Friday → see prompt → click "Verstuur"

**Emotional wellness design:**
- 8 rotating weekly prompts that encourage feeling over doing
- "Even stilstaan" section in both email and preview with warm, non-prescriptive language
- Gratitude section elevated to encourage daily practice
- Closing note: "Elke emotie — ook de lastige — is informatie over wat belangrijk voor je is"

---

## Search, Tags & Backup Sprint

### Global Search (`src/stores/search.js`)
- [x] `globalSearch(query)` — searches across os_tasks, os_inbox, os_projects, hours, logbook, dailyPlans, os_personal_wellbeing
- [x] Match scoring: position-based relevance (lower index = better match)
- [x] Results sorted by score then date (newer first)
- [x] Resilient: individual store failures don't crash search (`safeGetAll` pattern)
- [x] Minimum query length: 2 characters
- [x] Create `tests/stores/search.test.js` — 8 tests

### Tagging System (`src/stores/tags.js`)
- [x] `addTag(storeName, recordId, tag)` — add tag to any taggable record
- [x] `removeTag(storeName, recordId, tag)` — remove specific tag
- [x] `getByTag(storeName, tag)` — get all records with tag
- [x] `getAllTags(storeName?)` — get all unique tags, optional store filter
- [x] Tag normalization: lowercase, trim, spaces→hyphens, max 50 chars
- [x] Taggable stores: os_tasks, os_inbox, os_projects, hours, logbook
- [x] Create `tests/stores/tags.test.js` — 12 tests

### Export/Import Bundle (`src/stores/backup.js`)
- [x] `exportBundle()` — full JSON bundle with `_meta` (app, version, timestamp, recordCounts)
- [x] `downloadBundle()` — triggers browser download as JSON file
- [x] `validateBundle(bundle)` — validates structure, app name, stores presence
- [x] `importBundle(bundle, { merge })` — imports with safety backup before clearing
- [x] `restoreFromSafetyBackup()` — rollback from localStorage backup
- [x] `readBundleFile(file)` — reads File object to parsed JSON
- [x] Safety backup in localStorage before destructive import
- [x] Warnings for empty backups, unknown stores
- [x] Create `tests/stores/backup.test.js` — 17 tests (including 6 roundtrip tests)
- [x] Roundtrip tests: tasks, inbox, projects, BPV hours, personal wellbeing, JSON serialization

### Testing
- [x] All 219 tests green

---

### Review Notes — Search, Tags & Backup Sprint

**What was built:**
- Global search across 7 IndexedDB stores with position-based relevance scoring
- Simple tagging system with normalization and cross-store queries
- Full export/import bundle with validation, safety backup, and anti-data-loss checks
- 37 new tests (219 total) — all passing

**Design decisions:**
- Search uses `safeGetAll()` wrapper to catch individual store failures gracefully
- Tags are normalized (lowercase, no spaces, max 50 chars) for consistent querying
- Export bundle includes `_meta.recordCounts` so user can verify before importing
- Import creates a localStorage safety backup (max 5MB) before clearing data
- `validateBundle()` returns `{ valid, errors, warnings, meta }` for progressive feedback

**Trust milestone:**
- Export/import roundtrip tests verify data integrity for all 5 major entity types
- Import rejects invalid bundles (wrong app, missing meta, missing stores)
- Safety backup enables rollback if import fails mid-operation

---

## Quality Pass Sprint

### Refactoring
- [x] Remove duplicate `escapeHtml` from `personal-dashboard/view.js` — import from `src/utils.js`
- [x] Add `safeGetAll()` error protection to `search.js` (graceful store failure handling)

### Accessibility
- [x] Add `aria-label` to accent color dots in settings panel
- [x] Add `aria-label` to inbox promote/archive icon buttons
- [x] Add `aria-label` to inbox toggle count button
- [x] Add `aria-label` to project clear-next-action button
- [x] Implement focus trap in mode picker modal (Tab cycles within cards)
- [x] Return focus to mode button when picker closes

### Documentation
- [x] Update `docs/design-principles.md` — Eno philosophy, store rules, data safety, accessibility rules
- [x] Update `docs/qa-checklist.md` — comprehensive 10-section QA checklist
- [x] Create `docs/future.md` — calendar, sync, PWA, AI features (risks, privacy, modular plan)
- [x] Update `tasks/todo.md` with sprint notes

### Testing
- [x] All 219 tests green after quality fixes

---

### Review Notes — Quality Pass Sprint

**Issues identified and fixed:**
1. **Duplicate utility function**: `personal-dashboard/view.js` had its own `escapeHtml()` instead of importing from `utils.js`. Removed duplicate, imported shared function.
2. **Search resilience**: `search.js` had no error handling for individual store reads. Added `safeGetAll()` wrapper that returns `[]` on failure.
3. **Missing aria-labels**: Icon-only buttons in settings (accent dots), inbox (promote/archive), and projects (clear action) lacked screen reader labels. All fixed.
4. **No focus trap in mode picker**: Modal dialog allowed Tab to escape to background elements. Added keyboard focus trap and return-focus-on-close.

**Audit findings (documented, not all fixed — low severity):**
- Some stores mix UI logic with data logic (backup.js `downloadBundle` creates DOM elements)
- Block pass-through stores (`inbox/store.js`, `tasks/store.js`) add no value — could be removed
- Inline styles for dynamic widths on progress bars — acceptable for dynamic values
- Settings panel could use progressive disclosure (`<details>` for advanced options)

**Documentation updates:**
- `docs/design-principles.md`: Added Eno philosophy, store design rules, data safety principles, expanded accessibility section
- `docs/qa-checklist.md`: Rewrote as comprehensive 10-section checklist covering visual, interaction, mode isolation, data ops, accessibility, weekly review, persistence, build, and service worker
- `docs/future.md`: New file describing 4 future features (calendar, sync, PWA, AI) with risks, privacy approach, and modular implementation plan for each

---

---

## Quality Operator Audit + Polish Pass (2026-02-19)

> Branch: `claude/netlify-cli-setup-KOPE6`
> Workflow: Plan Mode → Approval → Implement → Verify

### Before (Baseline)

| Metric | Value |
|--------|-------|
| Tests | **219 passed**, 0 failed (17 files) |
| Build | **Clean** ✓ (1 pre-existing warning: db.js dynamic/static import mix) |
| JS Errors | 0 |
| TODOs/FIXMEs | 0 |

---

### Audit Findings Summary

**Inconsistencies inventoried (from deep file audit):**

1. **`src/styles/base.css`** — No global `:focus-visible` outline. Keyboard users get no visible focus rings on nav buttons, mode picker cards, action buttons.
2. **`src/blocks/styles.css`** (shared hub) — ~8 hardcoded `px` values that bypass spacing scale: `gap: 7px`, `padding: 5px 12px 5px 9px`, `margin: 0 0 2px`, `width: 22px; height: 22px`, badge dimensions.
3. **`src/blocks/inbox/styles.css`** — `.inbox-block__item` has no `:hover` state. Makes inbox list feel dead.
4. **`docs/current-state.md`** — Stale: says "IndexedDB v5 / 28 stores". Reality: v6 / 29 stores, 219 tests, 3 additional devDeps (vitest, fake-indexeddb, netlify-cli).
5. **Empty state microcopy** — Tasks block: "Nog geen taken voor vandaag" — functional but passive. Could be warmer/actionable (Rams: strong defaults). Projects, inbox empty states similar.
6. **`src/os/shell.js`** mode picker — mode cards have no `:focus-visible` ring. Keyboard navigation works (focus trap present) but ring invisible.
7. **`blocks/styles.css` `.os-badge`** — min-width/height hardcoded as px, not consistent with size scale.
8. **`src/blocks/tasks/styles.css`** — `.tasks-block__input` has no `:focus` state beyond browser default chrome.

**Not found / No action needed:**
- Hardcoded hex colors in JS files → ✅ None (all use CSS variables)
- Event listener leaks → ✅ Cleanup patterns consistent
- Duplicate utility functions → ✅ Centralized in utils.js
- TODO/FIXME/HACK markers → ✅ None

---

### Top 10 QoL Opportunities (→ docs/qol.md)

| # | Opportunity | Impact | Effort | Status |
|---|-------------|--------|--------|--------|
| 1 | Global `:focus-visible` outline in `base.css` | High | Low | Plan |
| 2 | Inbox item hover state | High | Low | Plan |
| 3 | `blocks/styles.css` spacing normalization | Medium | Low | Plan |
| 4 | Mode picker card focus ring | Medium | Low | Plan |
| 5 | Task input `:focus` styling | Medium | Low | Plan |
| 6 | Empty state microcopy improvements | Medium | Low | Plan |
| 7 | Update `docs/current-state.md` (stale v5 refs) | Low | Low | Plan |
| 8 | `docs/qol.md` — QoL opportunity register | Low | Low | Plan |
| 9 | `docs/design-polish.md` — Rams/Ive/Jobs reflection | Low | Low | Plan |
| 10 | `docs/demo.md` — validate existing demo checklist | Low | Low | Plan |

---

### Acceptance Criteria

- [ ] All 219 tests still green (no regressions)
- [ ] Build still clean
- [ ] `:focus-visible` visible on all interactive elements in BORIS OS
- [ ] Inbox items show hover state
- [ ] `blocks/styles.css` spacing more consistent (px → CSS vars where trivial)
- [ ] Empty state messages warmer and more actionable (Dutch)
- [ ] `docs/current-state.md` accurate (v6, 219 tests, correct devDeps)
- [ ] `docs/qol.md` written with top 10 table
- [ ] `docs/design-polish.md` written (Rams/Ive/Jobs reflection)
- [ ] Changes minimal + elegant (no over-engineering)

---

### Phase 0 — Docs Audit

- [ ] Update `docs/current-state.md` — fix v5→v6, 28→29 stores, test count, devDeps
- [ ] Create `docs/qol.md` — top 10 QoL opportunities register with impact/effort
- [ ] Verify `docs/demo.md` still accurate (12 steps)

### Phase 1 — CSS Polish (High Impact, Zero Risk)

- [ ] `src/styles/base.css` — Add global `:focus-visible` outline rule (2px solid accent, 2px offset)
- [ ] `src/blocks/styles.css` — Normalize hardcoded px values → CSS variable equivalents where trivial
- [ ] `src/blocks/inbox/styles.css` — Add `.inbox-block__item:hover` background state
- [ ] `src/blocks/tasks/styles.css` — Add `.tasks-block__input:focus` style (outline ring)
- [ ] `src/os/shell.js` modal — Verify mode picker cards get `:focus-visible` from global rule

### Phase 2 — UX Microcopy (Low Risk)

- [ ] `src/blocks/tasks/view.js` — Improve empty state message (warmer, actionable hint)
- [ ] `src/blocks/projects/view.js` — Improve empty state message
- [ ] `src/blocks/inbox/view.js` — Verify empty state ("Inbox is leeg") is already good

### Phase 3 — Design Docs (Required by task spec)

- [ ] Create `docs/design-polish.md` — What was removed (Rams), progressive disclosure (Ive), stronger defaults (Jobs), what was NOT done (scope)

### Phase 4 — Verify

- [ ] Run `npm test` — all 219 tests green
- [ ] Run `npm run build` — clean
- [ ] Update tasks/todo.md "After" section
- [ ] Update tasks/lessons.md if any corrections needed

---

### After (To be filled after implementation)

| Metric | Value |
|--------|-------|
| Tests | TBD |
| Build | TBD |
| Changes | TBD |

---

### Review Notes — Quality Operator Pass

> To be filled after implementation.

---

## Mode Switch Fix + BPV De-emphasis + Animation Polish Sprint (2026-02-19)

> Branch: `claude/netlify-cli-setup-KOPE6`
> Workflow: Diagnose → Plan → Fix → Test → Verify

### Diagnosis

**Reported bug:** Mode switch picker is clickable but OS content doesn't change visibly.

**Root cause analysis (read-only audit of full event flow):**
1. ✅ `modeManager.setMode()` correctly validates, persists to localStorage, emits `mode:changed`
2. ✅ `eventBus.on('mode:changed')` in shell.js fires `triggerModeWash` + `updateModeBtn` + `renderHosts`
3. ✅ `renderHosts()` correctly unmounts all, filters by mode, remounts eligible blocks
4. ✅ Block contract is correct — mode-specific blocks have `modes: ['BPV']` etc.

**Why it FEELS broken (UX root cause):**
- `.os-mini-card` blocks have NO entrance animation (unlike `.card` which has `card-in`)
- 7 shared blocks (daily-outcomes, inbox, projects, tasks, schedule, reflection, weekly-review) dominate the Today view — only 2-4 mode-specific blocks change per switch
- No stagger effect on block mount → change feels like a flicker, not a transition
- BPV is default → first-time users see BPV without choosing, feels stuck
- Mode-specific blocks may be below fold on mobile

**Conclusion:** Logic works. Visual feedback is insufficient. Fix = add block entrance animation + stagger + BPV de-emphasis.

---

### STAP 1 — Block Entrance Animation + Mode Switch Polish

- [x] Add `card-in` animation to `.os-mini-card` (matches `.card` pattern)
- [x] Add CSS `--stagger` variable for sequential block mount delay
- [x] Add stagger assignment in `renderHosts()` (20ms per block)
- [x] Ensure mode-specific blocks have clear visual entry on mode switch
- [x] Add mode accent border-top to content area during mode switch

### STAP 2 — BPV De-emphasis

- [x] Reorder `MODE_META` in shell.js: School → Personal → BPV
- [x] Reorder mode picker cards: School first, Personal second, BPV third
- [x] Add `preferred_default_mode` setting (used on first visit only)
- [x] Respect persisted mode from localStorage (existing behavior, verify)
- [x] Update settings panel MODE_OPTIONS order

### STAP 3 — CSS Polish (QoL items from previous audit)

- [x] Global `:focus-visible` outline in `base.css`
- [x] Inbox item hover state
- [x] Task input `:focus` styling
- [x] Normalize spacing in `blocks/styles.css` (px → vars where trivial)
- [x] Mode picker card focus ring

### STAP 4 — Animation Review (Eno-inspired)

- [x] Verify mode-wash 600ms pulse works on all transitions
- [x] Add block fade-in animation after mode switch
- [x] Verify all new blocks use consistent easing hierarchy
- [x] Check tab transition animation
- [x] Verify reduced-motion media query covers new animations

### STAP 5 — Mobile Sidebar Icons

- [x] Verify legacy sidebar nav icons render on mobile
- [x] Check OS nav horizontal scroll on small screens
- [x] Verify safe-area-inset support on mode picker
- [x] Fix any icon visibility issues

### STAP 6 — Tests

- [x] Add `tests/core/mode-switching.test.js` — eventBus + modeManager + blockRegistry integration
- [x] Test: mode change emits event with correct payload
- [x] Test: blockRegistry filter by mode returns correct blocks
- [x] Test: shared blocks (modes=[]) appear in all modes
- [x] Test: preferred_default_mode setting respected
- [x] All existing 219 tests still green

### STAP 7 — Verify + Document

- [x] `npm test` — all tests green
- [x] `npm run build` — clean
- [x] Update `docs/demo.md` with mode switch verification steps
- [x] Update `tasks/lessons.md`

---

### Acceptance Criteria

- [x] Mode switch visually changes Today content (blocks animate in/out)
- [x] Mode button label updates on switch
- [x] Mode-wash animation triggers on switch
- [x] BPV not default for new users (School/Personal first in picker)
- [x] Block entrance animation on every mount (staggered)
- [x] Focus-visible on all interactive elements
- [x] All 234 tests green (was 219)
- [x] Build clean

---

### After (2026-02-19)

| Metric | Value |
|--------|-------|
| Tests | **234 passed**, 0 failed (18 files, +15 new mode-switching tests) |
| Build | **Clean** (80.93 kB CSS, 155.04 kB JS) |
| Changes | 11 files modified, 1 new test file |

### Review Notes — Mode Switch + BPV De-emphasis + Animation Polish

**What changed:**
1. **Block entrance animation** — `.os-mini-card` and all OS host children now have `block-enter` keyframe (300ms fade+slide-up). Stagger delay (30ms per block) assigned in `renderHosts()` for sequential cascade.
2. **BPV de-emphasis** — MODE_META reordered School → Personal → BPV. Default mode changed from BPV to School. Legacy shell + settings panel updated to match.
3. **CSS polish** — Global `:focus-visible` ring added. Inbox item hover state. Task input focus ring. 8+ hardcoded px values normalized to CSS variables.
4. **Mobile icons fixed** — Removed double `<span class="nav-icon">` wrapping in legacy shell. Added opacity transitions for mobile sidebar icons.
5. **Tests** — 15 new mode-switching integration tests covering: event emission, localStorage persistence, first-visit detection, block filtering by mode, sort order, unsubscribe cleanup.

**Eno-inspired design consistency:**
- Mode wash: 600ms ease-out, 8% opacity pulse (unchanged, verified)
- Block entrance: 300ms ease-out, 6px translateY (matches card-in pattern)
- Stagger: 30ms per block (subtle cascade, not jarring)
- All animations respect `prefers-reduced-motion: reduce`
- Consistent easing hierarchy: `--ease`, `--ease-out`, `--ease-spring`

---

## Mode Switch Visibility + Main Dashboard Sprint (2026-02-19)

> Branch: `claude/netlify-cli-setup-KOPE6`
> Workflow: Diagnose → Plan → Implement → Verify

### Diagnosis

**Reported bug:** Mode switching appears broken — picker is clickable but content doesn't visibly change.

**Root cause (3-round investigation):**
1. Event flow is architecturally correct (modeManager → eventBus → renderHosts → block mount/unmount)
2. The REAL problem: shared blocks dominate Today view (7 shared vs 2-4 mode-specific), Dashboard tab nearly empty (School has 0 dashboard-cards blocks), no mode indicator in content area (only tiny header pill)

### Fix A — Mode Context in Section Titles
- [x] Add `updateSectionTitles(mode)` in `src/os/shell.js`
- [x] Section titles show mode badge: "Vandaag — School 📚" / "Dashboard — BPV 🏢" etc.
- [x] Badge uses `--badge-color` CSS variable matching mode accent
- [x] Called on init + `mode:changed` event

### Fix B — Main Dashboard (6 Colorful Widgets)

#### Data Layer (`src/os/dashboardData.js`)
- [x] `getTodaySnapshot(mode)` — outcomes + task counts + inbox count
- [x] `getWeekFocus(weekStr)` — habits + reflection days + completed tasks
- [x] `getProjectsPulse()` — active projects cross-mode + at-risk count
- [x] `getBPVPulse(weekStr)` — hours + target + last logbook date

#### Dashboard Block (`src/blocks/dashboard/`)
- [x] `index.js` — register block (hosts: `dashboard-cards`, modes: `[]`, order: 1)
- [x] `view.js` — render 6 widgets: Vandaag (amber), Deze week (purple), Projecten (cyan), BPV (blue), Verken (rose), Snel vastleggen (emerald)
- [x] `styles.css` — responsive grid (1-col mobile, 2-col at 600px), widget cards, accent colors via CSS vars
- [x] Register in `src/blocks/registerBlocks.js`

#### Widget Features
- [x] Skeleton → async fill pattern (instant render, data fills in)
- [x] Deep link navigation (widget click → tab switch / scroll / hash)
- [x] Quick capture form (one-time setup, not recreated on refresh)
- [x] Explore curiosity prompts (8 rotating prompts)
- [x] Event subscriptions: mode:changed, tasks:changed, inbox:changed, projects:changed, bpv:changed
- [x] Proper unmount cleanup

### Fix C — Mode-Aware CSS
- [x] `data-mode` attribute on shell root for CSS-based mode theming
- [x] Mode accent variables: `--mode-accent` / `--mode-accent-light`
- [x] Nav accent line (2px mode-colored bar at bottom)
- [x] Active tab uses mode accent color
- [x] Content crossfade on mode switch (120ms fade-out → remount → 300ms fade-in)
- [x] Mode wash boosted from 8% → 14% opacity

### Testing
- [x] Create `tests/os/dashboardData.test.js` — 10 tests covering all 4 data functions
- [x] All 244 tests green (was 234)

### Bug Fixes
- [x] Fix `setupCaptureWidget` called inside `loadData()` — was recreating form on every event refresh, potentially losing user input. Moved to one-time setup after DOM mount.

### Documentation
- [x] Update `docs/demo.md` — 10 dashboard verification steps + checklist
- [x] Update `docs/design-principles.md` — 8 dashboard widget rules
- [x] Add lessons 5-7 to `tasks/lessons.md` (visual feedback, section titles, empty hosts)
- [x] Record sprint in `tasks/todo.md`

---

### Acceptance Criteria

- [x] Mode switching produces VISIBLE change (section titles + widget content update)
- [x] Dashboard tab shows 6 widgets in responsive grid
- [x] Widgets show real data from existing stores
- [x] No new DB schema
- [x] Click any widget → navigates to relevant section
- [x] Light + dark mode compatible
- [x] All 244 tests green, build clean
- [x] No regressions on Today/Inbox/Projects

---

### After (2026-02-19)

| Metric | Value |
|--------|-------|
| Tests | **244 passed**, 0 failed (19 files, +10 new dashboard tests) |
| Build | **Clean** |
| Changes | 7 files created, 4 files modified |

### Review Notes — Mode Switch Visibility + Main Dashboard

**What was built:**
- Full diagnostic of mode switching UX revealed the core problem was insufficient visual feedback, not broken logic.
- Three-layer fix: (1) mode badges in section titles, (2) 6-widget colorful dashboard, (3) mode-aware CSS accents on nav/tabs/content.
- Dashboard data layer aggregates from 6 existing stores — no new schema.
- Skeleton-then-fill pattern keeps dashboard responsive during async loads.
- Quick capture widget initialized once to preserve user input during event-driven refreshes.

**Files created:**
- `src/os/dashboardData.js` — pure async data aggregation
- `src/blocks/dashboard/index.js` — block registration
- `src/blocks/dashboard/view.js` — 6 widgets + deep links + event wiring
- `src/blocks/dashboard/styles.css` — responsive grid + widget styles
- `tests/os/dashboardData.test.js` — 10 tests

**Files modified:**
- `src/os/shell.js` — `setShellMode`, `updateSectionTitles`, content crossfade
- `src/blocks/styles.css` — mode-aware accents, nav accent line, crossfade, section badges
- `src/blocks/registerBlocks.js` — dashboard block registration
- `tasks/lessons.md` — lessons 5-7

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

## Daily Page Sprint — Mode-Aware Daily Entries (2026-02-19)

> Branch: `claude/netlify-cli-setup-KOPE6`
> Workflow: Plan → Approve → Implement → Test → Verify

### Baseline

| Metric | Value |
|--------|-------|
| Tests | **244 passed**, 0 failed (19 files) |
| Build | **Clean** |
| DB version | 6 |

---

### Storage Decision: OPTIE 1 Extended ✅

**Chosen:** Extend existing `dailyPlans` store via DB bump to v7 (no new store).

**Argument:**
- `dailyPlans` (v1) has `date` as a UNIQUE index → prevents multiple modes per date
- IndexedDB cannot change an index constraint without deleting + recreating it → requires schema bump regardless
- Creating a new store (`os_daily_entries`) would orphan `dailyPlans` and force a full rewrite of both existing blocks; extending is lower impact
- Migration path is clean: copy existing entries with `mode: 'School'`, update id to composite `${date}__School`
- OPTIE 2 only wins if the existing store shape is incompatible — it is compatible with minor extension

**v7 migration:**
1. Delete `date` unique index from `dailyPlans`
2. Recreate `date` as non-unique index
3. Add `mode` index (non-unique)
4. For all existing entries: add `mode: 'School'`, update `id → ${entry.date}__School`, map `tasks → todos`, `evaluation → notes`, add `outcomes: ['','','']`

---

### New Data Shape

```js
// dailyPlans store entry (after v7)
{
  id:        '2026-02-19__School',     // composite: date__mode
  date:      '2026-02-19',
  mode:      'School',                 // 'School' | 'Personal' | 'BPV'
  outcomes:  ['Wiskunde afronden', '', ''],  // top 3 goal strings (always length 3)
  todos:     [                         // proper checklist with IDs
    { id: 'uuid', text: 'Opgave 3', done: false, createdAt: '…', doneAt: null }
  ],
  notes:     '',                       // short reflection, max 500 chars
  updatedAt: '2026-02-19T10:00:00Z',
}
```

**Backward compat:** existing entries migrated; old `tasks[]` → `todos`, old `evaluation` → `notes`.

---

### Blocks List + Host Placement

| Block | Action | Host | Modes | Order | Accent |
|-------|--------|------|-------|-------|--------|
| `daily-outcomes` | **UPDATE** — mode-aware, `outcomes[]`, auto-save on blur | `today-sections` | all | 5 | per-mode |
| `daily-todos` | **NEW** — quick todo list per day+mode | `today-sections` | all | 6 | per-mode |
| `daily-reflection` | **UPDATE** — mode-aware, `notes` field, 500 char limit | `today-sections` | all | 50 | neutral |

Mode accent colors (existing CSS vars):
- School → `--color-purple` / `--color-purple-light`
- Personal → `--color-emerald` / `--color-emerald-light`
- BPV → `--color-blue` / `--color-blue-light`

---

### Phase 0 — DB Migration (v6 → v7)

- [ ] `src/db.js` — bump `DB_VERSION` to 7
- [ ] Add `if (oldVersion < 7)` block in `onupgradeneeded`:
  - Delete `date` unique index from `dailyPlans`
  - Recreate `date` as non-unique index
  - Add `mode` index (non-unique)
- [ ] Migration of existing data runs in `onsuccess` (after upgrade) via transaction on `dailyPlans`
  - For each existing entry: assign `mode = 'School'`, rekey `id = ${date}__School`, map fields

### Phase 1 — Store Adapter (`src/stores/daily.js`)

- [ ] `getDailyEntry(mode, date)` → load by composite id `${date}__mode`
- [ ] `saveDailyEntry({ mode, date, outcomes, todos, notes })` → upsert with composite id
- [ ] `saveOutcomes(mode, date, outcomes[3])` → partial update, preserve todos/notes
- [ ] `addTodo(mode, date, text)` → append `{ id: uuid, text, done: false, createdAt, doneAt: null }`
- [ ] `toggleTodo(mode, date, todoId)` → flip done, set doneAt
- [ ] `deleteTodo(mode, date, todoId)` → remove by id
- [ ] `saveNotes(mode, date, notes)` → partial update, enforce max 500 chars
- [ ] Remove old `toggleDailyTask(date, taskIndex)` (replaced by toggleTodo)
- [ ] Update `getAllDailyEntries()` → returns all entries (multi-mode)
- [ ] Update `validate.js` → `validateDailyEntry` accepts new shape
- [ ] Emit `daily:changed` with `{ mode, date }` payload from all write functions

### Phase 2 — Update `daily-outcomes` Block

- [ ] Pass `modeManager` via context, get `currentMode = modeManager.getMode()`
- [ ] Call `getDailyEntry(currentMode, today)` — mode-aware
- [ ] Render `outcomes[0..2]` as 3 auto-saving text inputs (blur → `saveOutcomes`)
- [ ] Remove manual save button (auto-save pattern)
- [ ] Show mode accent color on block header (CSS var via `data-mode` attribute on article)
- [ ] On `mode:changed`: reload entry for new mode (same date)
- [ ] On `daily:changed { mode, date }`: reload only if matches current mode+date
- [ ] Proper unmount cleanup (unsubscribe both handlers)

### Phase 3 — New `daily-todos` Block

- [ ] Create `src/blocks/daily-todos/index.js` — register (host: today-sections, modes: [], order: 6)
- [ ] Create `src/blocks/daily-todos/view.js`:
  - Mode-aware header: "Taken — School 📚" with mode accent
  - Input row: text field + add button
  - Todo list: checkbox + text + delete button per item
  - Done counter: "2/5 gedaan" (auto, based on todos array)
  - `addTodo` on enter/button, `toggleTodo` on checkbox, `deleteTodo` on button
  - On `mode:changed`: reload for new mode
  - On `daily:changed { mode }`: reload if matching mode
- [ ] Create `src/blocks/daily-todos/styles.css` — minimal, uses existing vars
- [ ] Import styles in `src/blocks/registerBlocks.js`
- [ ] Register block in `src/blocks/registerBlocks.js`

### Phase 4 — Update `daily-reflection` Block

- [ ] Pass `modeManager` via context
- [ ] Call `getDailyEntry(currentMode, today)` — mode-aware
- [ ] Load/save `notes` field (not `evaluation`)
- [ ] Enforce max 500 chars: counter display + textarea `maxlength`
- [ ] Auto-save on blur (remove manual save button)
- [ ] On `mode:changed`: reload entry for new mode
- [ ] Proper unmount cleanup

### Phase 5 — Aggregators (`src/os/dailyAggregator.js`)

- [ ] `getDailySummary(mode, date)` → `{ outcomesSet: number, todosTotal, todosDone, notes }`
- [ ] `getWeeklySummary(mode, weekStr)` → `{ totalOutcomesSet, totalTodosDone, totalTodosTotal, daysWithEntries }`
  - weekStr format: `'2026-W08'` (ISO week)
  - Iterate Mon–Sun dates, collect daily entries, sum counts
- [ ] `getMonthlySummary(mode, monthStr)` → `{ totalTodosDone, topOutcome: string|null }`
  - monthStr format: `'2026-02'`
  - topOutcome = most frequently appearing non-empty outcome string
- [ ] All functions return stable shape even when no entries exist (zero-filled)
- [ ] Pure functions, no side effects, no eventBus dependency

### Phase 6 — Tests

- [ ] **Rewrite** `tests/stores/daily.test.js`:
  - DB v7 indexes exist (date non-unique, mode index)
  - `getDailyEntry(mode, date)` returns null when missing
  - `saveDailyEntry` creates composite id correctly
  - `saveOutcomes` persists all 3 slots
  - `addTodo` generates uuid, correct shape
  - `toggleTodo` flips done, sets doneAt
  - `deleteTodo` removes by id, leaves others
  - `saveNotes` truncates at 500 chars
  - School and Personal entries for same date are independent
  - Migration: old entry shape reads back via new functions
- [ ] **Create** `tests/os/dailyAggregator.test.js`:
  - `getDailySummary` returns zeros for empty entry
  - `getDailySummary` counts outcomes and todos correctly
  - `getWeeklySummary` sums across 7 days
  - `getWeeklySummary` for empty week returns zeros
  - `getMonthlySummary` finds top outcome
  - `getMonthlySummary` for empty month returns null topOutcome
- [ ] Run full suite — all tests green (target: 260+)
- [ ] Run `npm run build` — clean

### Phase 7 — Documentation

- [ ] `docs/architecture.md` — add "Daily Entries" entity section:
  - Store: `dailyPlans` (v7), key: `${date}__${mode}`
  - Source-of-truth statement: daily entries feed week/month summaries
- [ ] `docs/demo.md` — add daily page verification steps:
  - Switch mode → daily todos/outcomes change instantly
  - Add todo in School, switch Personal → empty, switch back → still there
- [ ] `tasks/lessons.md` — add lesson if any corrections needed during impl

---

### Acceptance Criteria

- [ ] In each mode there is a separate todo list and outcomes per day
- [ ] Mode switch makes content visibly different (not just header)
- [ ] Data persists independently per mode/date (School todos don't appear in Personal)
- [ ] `getDailySummary`, `getWeeklySummary`, `getMonthlySummary` return stable shapes
- [ ] All tests green (234+ existing + new daily + aggregator tests)
- [ ] Build clean
- [ ] No regressions on existing blocks

---

### After (2026-02-19)

| Metric | Value |
|--------|-------|
| Tests | **274 passed**, 0 failed (20 files, +30 net new tests) |
| Build | **Clean** |
| DB version | **7** (dailyPlans: non-unique date, mode index added) |
| New files | `src/blocks/daily-todos/` (index/view/styles), `src/os/dailyAggregator.js`, `tests/stores/daily.test.js` (rewritten), `tests/os/dailyAggregator.test.js` |
| Modified files | `src/db.js`, `src/stores/daily.js`, `daily-outcomes/view+styles`, `daily-reflection/view+styles`, `registerBlocks.js`, `dashboardData.js`, `schema.test.js`, `daily-outcomes.test.js` |

---

## Visual System Alignment + Balatro Easter Egg Sprint (2026-02-19)

> Branch: `claude/netlify-cli-setup-KOPE6`
> Goal: Make OS blocks match legacy BPV premium card feel + future-proof design foundation + Balatro easter egg

### Baseline

| Metric | Value |
|--------|-------|
| Tests | **274 passed**, 0 failed (20 files) |
| Build | **Clean** |

---

### Audit Summary

**Gap between Legacy BPV and BORIS OS:**

| Aspect | Legacy BPV | OS Blocks | Fix |
|--------|-----------|-----------|-----|
| Card padding | `var(--space-5)` (20px) | `var(--space-4)` (16px) | Increase to --space-5 |
| Hover shadow | `var(--shadow-md)` on all cards | None on `.os-mini-card` | Add subtle hover shadow |
| Stat typography | 2rem/800 numbers, 0.8125rem/600 labels | No shared pattern | Create `.ui-stat-*` classes |
| Left border accent | `.card-color-left` (3-4px) | Top-only border (3px) | Keep top (OS identity) but add shared accent utility |
| Progress bars | 8px consistent height | 5px/6px mixed | Normalize to 6px |
| Hardcoded hex | None in pages | `#fff`, `#ef4444`, `#f59e0b` in blocks | Replace with vars |
| `999px` radius | Via `var(--radius-full)` | Hardcoded `999px` in 15+ places | Replace with var |
| Card fragmentation | Single `.card` class | `.os-mini-card`, `.dash-widget`, `.school-dash`, `.personal-dash` etc. | Unify base via shared properties |

---

### Proposed Semantic Token List (~20 tokens in src/ui/tokens.css)

```
/* Surface */
--ui-surface:       var(--color-surface)
--ui-surface-hover: var(--color-surface-hover)
--ui-bg:            var(--color-bg)

/* Borders */
--ui-border:        var(--color-border)
--ui-border-light:  var(--color-border-light)

/* Text */
--ui-text:          var(--color-text)
--ui-text-muted:    var(--color-text-secondary)
--ui-text-faint:    var(--color-text-tertiary)

/* Card */
--ui-card-padding:  var(--space-5)
--ui-card-radius:   var(--radius-lg)
--ui-card-shadow:   var(--shadow-sm)
--ui-card-shadow-hover: var(--shadow-md)

/* Accent (inherits from mode system) */
--ui-accent:        var(--mode-accent, var(--color-accent))
--ui-accent-light:  var(--mode-accent-light, var(--color-accent-light))

/* Danger */
--ui-danger:        var(--color-error)

/* Sizing */
--ui-icon-sm:       20px
--ui-icon-md:       40px
--ui-progress-h:    6px
```

### Card Class API (src/ui/card.css)

```
.ui-card                — Base card (surface, border, radius, padding, hover shadow)
.ui-card--accent        — Mode-colored top border (3px)
.ui-card--clickable     — Pointer cursor, hover border-color change
.ui-card--flush         — No padding (for blocks managing own internal layout)
.ui-card__title         — 0.9375rem, 600 weight, bottom margin
.ui-card__subtitle      — 0.75rem, secondary color, uppercase, letter-spacing
.ui-card__body          — flex column, gap --space-3
```

### Typography Classes (src/ui/typography.css)

```
.ui-stat                — 2rem, 800 weight, -0.03em tracking, line-height 1
.ui-stat--sm            — 1.25rem, 700 weight
.ui-label               — 0.8125rem, 600 weight, uppercase, 0.04em tracking
.ui-meta                — 0.75rem, secondary color
.ui-caption             — 0.6875rem, tertiary color
```

### Layout Classes (src/ui/layout.css)

```
.ui-section             — margin-bottom: --space-8
.ui-section__title      — inherits os-section__title pattern
.ui-row                 — flex row, gap --space-4, wrap
.ui-hero-row            — grid: repeat(auto-fit, minmax(160px, 1fr)), gap --space-4
.ui-stack               — flex column, gap --space-4
```

### File Touch List

**CREATE:**
- `src/ui/tokens.css` — semantic token aliases
- `src/ui/card.css` — unified card classes
- `src/ui/typography.css` — stat/label/meta classes
- `src/ui/layout.css` — section/row/hero layout
- `src/ui/balatro.js` — easter egg controller (keyboard listener + overlay)
- `src/ui/balatro.css` — swirl background + CRT effect + card animations
- `docs/ui-guidelines.md` — how to build a new block using the system

**MODIFY:**
- `src/blocks/styles.css` — upgrade `.os-mini-card` (padding, hover, shadow)
- `src/blocks/daily-todos/styles.css` — replace `#fff`, `#ef4444`
- `src/blocks/daily-reflection/styles.css` — replace `#f59e0b`
- `src/blocks/bpv-quick-log/styles.css` — replace `999px`
- `src/blocks/bpv-weekly-overview/styles.css` — replace `999px`, normalize bar height
- `src/blocks/personal-dashboard/styles.css` — replace `999px`
- `src/blocks/school-dashboard/styles.css` — replace `999px`
- `src/blocks/weekly-review/styles.css` — replace `999px`
- `src/main.js` — import `src/ui/tokens.css`
- `src/os/shell.js` — wire Balatro key listener (non-invasive)
- `docs/design-principles.md` — add "Unified Card Language" section
- `docs/demo.md` — add visual verification steps
- `tasks/todo.md` — this checklist

---

### Phase A — Token Layer + Card System

- [ ] Create `src/ui/tokens.css` with ~20 semantic aliases
- [ ] Create `src/ui/card.css` with `.ui-card` family
- [ ] Create `src/ui/typography.css` with `.ui-stat`, `.ui-label`, `.ui-meta`
- [ ] Create `src/ui/layout.css` with `.ui-section`, `.ui-hero-row`, `.ui-stack`
- [ ] Import all UI CSS in `src/main.js` (before blocks)

### Phase B — OS Card Alignment

- [ ] Upgrade `.os-mini-card` padding → `var(--space-5)` (match legacy)
- [ ] Add `.os-mini-card:hover` subtle shadow (`var(--shadow-sm)`)
- [ ] Replace hardcoded `#fff` → `var(--ui-surface)` in daily-todos
- [ ] Replace hardcoded `#ef4444` → `var(--ui-danger)` in daily-todos
- [ ] Replace hardcoded `#f59e0b` → `var(--color-warning)` in daily-reflection
- [ ] Replace `999px` → `var(--radius-full)` in 5+ block CSS files
- [ ] Normalize progress bar heights to 6px where inconsistent

### Phase C — Balatro Easter Egg

- [ ] Create `src/ui/balatro.css` — CRT swirl background (CSS animated gradients + scanlines + vignette)
- [ ] Create `src/ui/balatro.js`:
  - Key buffer listener: typing "balatro" triggers activation
  - Creates overlay with swirl background
  - Spawns animated playing cards (CSS 3D flip + float)
  - Plays Balatro-style ambient audio via Web Audio API (optional)
  - Escape / click anywhere to dismiss
  - Non-invasive: no DOM changes until triggered
- [ ] Wire listener in `src/os/shell.js` (single line: `import + init`)
- [ ] Test: easter egg doesn't interfere with normal text input (only activates on exact match)

### Phase D — Documentation

- [ ] Create `docs/ui-guidelines.md`:
  - How to build a block
  - Which card/typography classes to use
  - Spacing rules
  - Mode accent usage
  - Accessibility basics (focus states)
  - Layout hosts documented
  - "No fragmentation" rules
- [ ] Update `docs/design-principles.md`:
  - Add "Unified Card Language" section
  - One card language, one spacing scale, one typography scale
- [ ] Update `docs/demo.md` with visual system verification steps

### Phase E — Verify

- [ ] `npm test` — all 274 tests green
- [ ] `npm run build` — clean
- [ ] No regressions on Today/Inbox/Dashboard
- [ ] Easter egg activates on "balatro", dismisses on Escape
- [ ] Card hover shadow visible on all OS blocks
- [ ] Mode accent works in all 3 modes

---

### Acceptance Criteria

- [ ] OS cards have same padding rhythm as legacy (--space-5)
- [ ] OS cards show subtle hover shadow (calm, premium feel)
- [ ] No hardcoded hex colors in modified blocks
- [ ] `999px` replaced with `var(--radius-full)` everywhere touched
- [ ] `.ui-card`, `.ui-stat`, `.ui-label` classes exist and documented
- [ ] Balatro easter egg works (non-intrusive, visually pleasing)
- [ ] Tests green, build clean
- [ ] `docs/ui-guidelines.md` exists
- [ ] `docs/design-principles.md` has "Unified Card Language" section

---

### Risks + Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Padding increase breaks layout | Cards overflow on mobile | Test at 320px viewport |
| Easter egg key listener conflicts with text inputs | Can't type "balatro" in inputs | Only listen when no input/textarea is focused |
| Shadow on hover too heavy | Breaks calm feel | Use `--shadow-sm` (lightest), not `--shadow-md` |
| Too many new CSS files | Import order issues | Import tokens first, then card/typography/layout |
| Block-specific CSS overrides | Specificity wars | New classes are additive, don't override block classes |

---

### After (To be filled)

| Metric | Value |
|--------|-------|
| Tests | TBD |
| Build | TBD |
| New files | TBD |
| Modified files | TBD |

---

## Stable OS Sidebar + Settings Width + Accent Prominence Sprint (2026-02-19)

> Branch: `claude/netlify-cli-setup-KOPE6`
> Workflow: Plan → Approve → Implement → Test → Verify

### Baseline

| Metric | Value |
|--------|-------|
| Tests | **274 passed**, 0 failed (20 files) |
| Build | **Clean** |

---

### Analysis

**Current state from screenshot + code audit:**

1. **Navigation is horizontal tab bar** — 6 buttons (Dashboard, Vandaag, Inbox, Planning, Reflectie, Archief) + settings gear. Works but feels ephemeral — no stable sidebar presence.
2. **Settings page width** — `.settings-row` uses `display: flex; justify-content: space-between` which is fine, but the parent `.settings-block.card` inherits compact padding. On wide screens the content padding is generous (64px each side at 1440px+) which effectively narrows the settings. The settings section also has no `max-width` constraint of its own — it just stretches to fill, which is the right behavior.
3. **Mode accent bar** — Currently a 2px line under the nav bar (`os-nav::after`) and a 3px top border on cards. The screenshot shows these are subtle. The mode hero banner exists but is small. The accent should be bolder.
4. **Settings mode pills** — Use generic `--color-accent` for the active state instead of the mode's own color. A School pill should be purple when active, Personal should be emerald, BPV should be blue.

**Design approach (Rams/Ive/Jobs/Eno):**
- Sidebar replaces horizontal tabs on desktop (≥768px), stays as bottom-bar on mobile
- Sidebar is minimal: icon + label, thin width (~200px), always visible
- Dashboard gets a home icon (⌂) — obvious home path (Jobs)
- Mode accent bar thickened from 2px → 4px on nav
- Mode card top border thickened from 3px → 4px
- Settings gets wider content area with `max-width: 640px` centered
- Settings mode pills use their OWN mode color (not generic accent)
- Non-dashboard tabs get subtle "Dashboard" breadcrumb link in section title area

---

### Stap A — Sidebar Navigation (Desktop ≥768px)

**Replace horizontal tab bar with vertical sidebar on desktop:**

- [ ] `src/os/shell.js` — Restructure HTML: wrap shell in `os-shell__sidebar` + `os-shell__main` layout
  - Sidebar contains: logo/title, nav items, divider, system items (Sync placeholder, Export placeholder, Settings)
  - Nav items: Dashboard (⌂), Vandaag, Inbox (with badge), Projecten, Planning
  - Divider
  - System: Instellingen
  - Main area: header (date + mode pill) + content
- [ ] `src/blocks/styles.css` — New `.os-sidebar` styles:
  - Fixed left, 200px width, full height, `var(--color-surface)` background
  - Border-right: 1px solid `var(--color-border)`
  - Nav items: vertical flex, icon + label, mode-accent active indicator (4px left bar)
  - Sidebar mode accent bar: 4px left border on active item using `var(--mode-accent)`
  - Mobile (< 768px): sidebar hidden, keep horizontal bottom nav or top tabs
- [ ] `src/blocks/styles.css` — Keep existing `.os-nav` styles for mobile (horizontal scroll tabs)
- [ ] Sidebar items map to same `setActiveTab(tabId)` logic — no breaking changes
- [ ] Add "Projecten" as nav item → maps to `planning` tab for now (or its own section)
- [ ] Settings moves from gear icon to sidebar system section

**Sidebar items (stable, never change on mode switch):**
1. ⌂ Dashboard
2. ☀ Vandaag
3. 📥 Inbox (badge)
4. 📋 Planning
5. ── (divider)
6. ⚙ Instellingen

### Stap B — Dashboard as Home Reference

- [ ] Add subtle "← Dashboard" link in section title area for non-dashboard tabs
  - Appears as small text link before the section title
  - Calls `setActiveTab('dashboard')` on click
  - Styled: `0.75rem`, `var(--color-text-tertiary)`, underline on hover
  - Only visible when activeTab ≠ 'dashboard'
- [ ] On mobile: no change (dashboard is first tab, always reachable)

### Stap C — Settings Page Width + Accent Prominence

- [ ] Settings section: add `max-width: 640px` to `.settings-block` in OS context
  - Remove `width: 100%` rule, use auto centering instead
- [ ] Settings mode pills: use mode-specific color for active state:
  - School pill active → `var(--color-purple)` border/text, `var(--color-purple-light)` bg
  - Personal pill active → `var(--color-emerald)` border/text, `var(--color-emerald-light)` bg
  - BPV pill active → `var(--color-blue)` border/text, `var(--color-blue-light)` bg
  - Implementation: add `data-mode-color` / `data-mode-color-light` attributes to pills, use in CSS
- [ ] Mode card top border: increase from `3px` → `4px` for more prominence
- [ ] Sidebar active indicator: 4px left accent bar (mode color)

### Stap D — BPV De-emphasis (Without Hiding)

- [ ] BPV is NOT in primary sidebar nav
- [ ] BPV remains accessible via:
  - Dashboard widget (existing "BPV" deep link card)
  - BPV-only blocks when mode=BPV (existing behavior)
  - When mode=BPV, BPV blocks appear on Vandaag (existing)
- [ ] No new BPV nav item needed — it's a mode, not a destination
- [ ] Verify: switching to BPV mode still shows BPV blocks on Dashboard/Vandaag

### Stap E — Documentation

- [ ] Create `docs/nav-architecture.md`:
  - Stable OS sidebar principle
  - Dashboard as Home
  - Mode affects content not navigation
  - Sidebar items list + rationale
- [ ] Update `docs/demo.md`:
  - Sidebar visible on desktop
  - Mode switch does not change sidebar items
  - "← Dashboard" link works from each tab
  - Settings reachable from sidebar
- [ ] Update `docs/design-principles.md`:
  - Add "Stable Navigation" principle

### Stap F — Verify

- [ ] `npm test` — all 274 tests green
- [ ] `npm run build` — clean
- [ ] No regressions in tab switching
- [ ] Badge counts still update on sidebar inbox item
- [ ] Settings page is wider and better centered
- [ ] Mode accent colors prominent (4px bars, mode-colored pills)
- [ ] Dashboard reachable from every tab

---

### Acceptance Criteria

- [ ] Desktop: sidebar visible with 6 items (Dashboard, Vandaag, Inbox, Planning, divider, Instellingen)
- [ ] Mobile: horizontal tabs preserved (no sidebar)
- [ ] Sidebar items are STABLE — mode switch does NOT change them
- [ ] Active item has 4px mode-colored left accent bar
- [ ] "← Dashboard" breadcrumb on non-dashboard tabs
- [ ] Settings page wider with centered content
- [ ] Settings mode pills use their own mode color when active
- [ ] Card top border is 4px (was 3px)
- [ ] All tests green, build clean
- [ ] No hardcoded hex colors
- [ ] BPV accessible via dashboard widget + mode blocks (not sidebar item)

---

### Risks + Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sidebar pushes content too narrow on tablet | Cards overflow | Use collapsible sidebar at 768-1023px (icons only) |
| Mobile layout breaks | UX regression | Keep existing horizontal tabs for <768px |
| Settings gear button removal | Can't find settings | Settings is last sidebar item (always visible) |
| Tab logic breaks | Major regression | Same `setActiveTab()` function, just different click source |

---

### After (To be filled)

| Metric | Value |
|--------|-------|
| Tests | TBD |
| Build | TBD |
| New files | TBD |
| Modified files | TBD |

---

## UI Streamlining & Visual Refinement Sprint (2026-02-19)

> Branch: `claude/netlify-cli-setup-KOPE6`
> Goal: Calmer, more coherent, more elegant UI. No feature changes.
> Inspired by: Brian Eno (rhythm, calm), Dieter Rams (less noise), Jony Ive (precision), Steve Jobs (strong defaults)

### Baseline

| Metric | Value |
|--------|-------|
| Tests | **274 passed**, 0 failed (20 files) |
| Build | **Clean** |

---

### Audit Summary

**Spacing:** 10 spacing tokens exist (--space-1 to --space-16) but 30+ hardcoded pixel values (1px–6px gaps, 5px padding) scattered across 15+ block CSS files. No micro-spacing token below 4px.

**Typography:** Zero font-size CSS tokens. 14+ unique hardcoded sizes (0.5625rem–2.5rem). Block titles (0.9375rem/600) and section labels (0.6875rem/600/uppercase) are already consistent — but everything else is ad-hoc.

**Cards:** 25+ distinct card/container patterns. Three main families that don't share a visual base:
- `.card` (legacy, radius-lg, space-5 padding)
- `.os-mini-card` (OS, ui-card-radius, 4px colored top border)
- `.dash-widget` (dashboard, radius-lg, space-4 padding, icon-centric)
- Plus near-duplicates: `.bpv-log__row`, `.inbox-block__item`, `.tasks-block__item`

**Dashboard vs Today:** Visually disconnected. Dashboard uses icon circles + metric badges + clickable cards. Today uses form-heavy cards with mode top-borders. Title sizes differ (0.75rem uppercase vs 0.95rem normal). Empty state patterns differ across blocks.

**Sidebar:** Mostly clean. Section labels at 0.625rem (10px) are too small to read comfortably. Active state uses mode-aware accent — good.

**Accent:** Mode-aware accents well-defined per mode. Dashboard widgets use custom `--widget-accent` per card. Some inconsistency in focus ring patterns (8+ variants across files).

---

### A) Typography Scale Tokens

> Add font-size tokens. Replace most common hardcoded sizes.

- [ ] A1. Add font-size tokens to `src/styles/variables.css`:
  `--font-xs` (0.6875rem), `--font-sm` (0.75rem), `--font-base` (0.8125rem),
  `--font-md` (0.875rem), `--font-lg` (0.9375rem), `--font-xl` (1.125rem),
  `--font-2xl` (1.375rem), `--font-3xl` (1.75rem), `--font-stat` (2rem)
- [ ] A2. Apply `--font-lg` to all block title classes (tasks, inbox, daily-todos, daily-outcomes, projects, bpv-log)
- [ ] A3. Apply `--font-xs` to section label classes (school-dash, personal-dash, sidebar, dash-widget title)
- [ ] A4. Apply `--font-base` to form inputs and button text
- [ ] A5. Apply `--font-sm` to badge/meta text
- [ ] A6. Apply `--font-stat` to `.ui-stat`, `--font-2xl` to `.ui-stat--sm`

**Files:** `variables.css`, `base.css`, `components.css`, `ui/typography.css`, `blocks/*/styles.css`

### B) Card Language Unification

> Reduce 25+ patterns to consistent visual language.

- [ ] B1. Standardize `.os-mini-card` and `.dash-widget`: same border-radius (`radius-lg`), border (1px), bg (surface), hover shadow
- [ ] B2. Change `.os-mini-card` accent from 4px top border to 3px left border — calmer, Rams-inspired
- [ ] B3. Unify list items: `.tasks-block__item`, `.inbox-block__item`, `.bpv-log__row` use identical padding (`--space-2`), radius (`--radius-md`), hover bg
- [ ] B4. Replace `50%` border-radius with `var(--radius-full)` on circular elements (~8 files)

**Files:** `blocks/styles.css`, `dashboard/styles.css`, `tasks/styles.css`, `inbox/styles.css`, `bpv-log-summary/styles.css`

### C) Spacing & Rhythm Cleanup

> Replace hardcoded micro-spacing with tokens.

- [ ] C1. Add `--space-0: 0.125rem` (2px) token for micro-spacing
- [ ] C2. Replace hardcoded 2px/3px gaps with `var(--space-0)` or `var(--space-1)`
- [ ] C3. Replace hardcoded 5px/6px padding with nearest token (`--space-1` or `--space-2`)
- [ ] C4. Card internal spacing uses `var(--space-*)` tokens (dashboard, school-dash, personal-dash)

**Files:** `variables.css`, `dashboard/styles.css`, `weekly-review/styles.css`, `personal-dashboard/styles.css`, `school-dashboard/styles.css`, `inbox-screen/styles.css`

### D) Accent Discipline

> One accent per mode. Accent only for small touches.

- [ ] D1. Audit accent backgrounds — only badges, icon circles, small indicators
- [ ] D2. Dashboard widget icon circles use `var(--mode-accent-light)` bg + `var(--mode-accent)` color
- [ ] D3. Standardize focus ring to `0 0 0 3px var(--color-accent-light)` everywhere

**Files:** `dashboard/styles.css`, `components.css`, `tasks/styles.css`, `inbox-screen/styles.css`

### E) Content Density Reduction

> Reduce visual noise without removing features.

- [ ] E1. Remove redundant 1px section dividers in `.school-dash` and `.personal-dash` — use spacing instead
- [ ] E2. Soften remaining dividers: `--color-border` → `--color-border-light`
- [ ] E3. Standardize uppercase label letter-spacing to `0.06em` (currently 0.03–0.08em)

**Files:** `school-dashboard/styles.css`, `personal-dashboard/styles.css`, `blocks/styles.css`

### F) Dashboard & Today Harmonization

> Make them feel like parts of the same system.

- [ ] F1. Align Today block titles: `--font-xs`, 600 weight, uppercase, 0.06em tracking
- [ ] F2. Give Today blocks subtle 3px mode-accent left border (matching card language from B2)
- [ ] F3. Standardize empty state: one pattern everywhere (`--font-base`, text-tertiary, centered)

**Files:** `blocks/styles.css`, `bpv-today/view.js`, `school-today/view.js`, `personal-today/view.js`

### G) Sidebar Elegance

> Calmer, more consistent sidebar.

- [ ] G1. Increase section label from 0.625rem to `var(--font-xs)` (0.6875rem) — more readable
- [ ] G2. Soften dividers: `--color-border-light` instead of `--color-border`
- [ ] G3. Reduce active state font-weight from 600 to 500 — subtler emphasis
- [ ] G4. Consistent icon-to-text gap: `var(--space-2)` (8px) for all nav items

**Files:** `blocks/styles.css`

---

### Implementation Order

1. **A** (Typography tokens) — foundation everything else uses
2. **C** (Spacing tokens) — second foundation layer
3. **B** (Card unification) — depends on A+C
4. **G** (Sidebar) — isolated scope, quick wins
5. **E** (Density reduction) — depends on B
6. **D** (Accent discipline) — cleanup pass
7. **F** (Dashboard/Today harmony) — final polish, depends on A+B

### Verify

- [ ] `npm test` — all 274 tests green
- [ ] `npm run build` — clean
- [ ] No behavioral changes
- [ ] UI feels calmer with stronger hierarchy

---

### Acceptance Criteria

- [ ] Font-size tokens defined and used in 80%+ of component CSS
- [ ] Card language reduced from 25+ to ~3 clear families (card, list-item, widget)
- [ ] No hardcoded 2–6px spacing values in modified files
- [ ] Sidebar feels calm with no heavy separators
- [ ] Dashboard and Today share visual rhythm (same title pattern, same card accent)
- [ ] All tests green, build clean
- [ ] No feature additions, no feature removals

---

### After (To be filled)

| Metric | Value |
|--------|-------|
| Tests | TBD |
| Build | TBD |
| Changes | TBD |

---

## Milestone 3: Cloudflare Deployment + Sync (Future)

- [ ] Deploy to Cloudflare Pages (static hosting, free tier)
- [ ] Set up Cloudflare D1 database for sync backend
- [ ] Implement `/api/sync` Worker endpoint
- [ ] Add Cloudflare Turnstile for auth protection
- [ ] Implement IndexedDB ↔ D1 sync protocol (last-write-wins)
- [ ] Cloudflare R2 for photo/file sync
- [ ] Offline queue with retry on reconnect

---

## Personality-Driven Apps Sprint (2026-02-20)

> Branch: `claude/netlify-cli-setup-KOPE6`
> Goal: Module presets + 10 personality-driven apps, stap voor stap
> Design: anti-procrastinatie, geen schaamte, minimaal, actiegericht

### Baseline

| Metric | Value |
|--------|-------|
| Tests | **343 passed**, 0 failed (23 files) |
| Build | **Clean** |
| DB version | 8 (31 stores) |
| Blocks | 31 registered |

---

### Architecture Decision: Keep It Simple

**Niet doen:** nieuw module-registry systeem bouwen.
**Wel doen:** bestaande blockRegistry uitbreiden met metadata + presets.

Reden: blockRegistry IS al een module-registry. Blokken zijn al:
- Self-contained (mount/unmount)
- Mode-aware (modes array)
- Orderable (order property)
- Toggleable (featureFlags)

Wat ontbreekt: categorie, omschrijving, icon → toevoegen als metadata.
Presets: gewoon arrays van block-IDs per context.

### Data Mapping: Geen Nieuwe Stores Nodig

| App | Bestaande Store | Verandering |
|-----|----------------|-------------|
| 2-Minute Launcher | Geen (pure timer UI) | Nul — alleen block |
| Done List | `os_tasks` (status='done') | Nul — reverse view |
| Traffic Light Brain | `os_personal_wellbeing` | +`brainState` veld |
| Worry Dump | `os_inbox` (type='worry') | +`worry` type support |
| One-Sentence Capture | `os_inbox` | Al gebouwd! |
| Moodboard Vault | `vault` + `vaultFiles` | Al gebouwd! |
| 3-Card Day | `dailyPlans` (outcomes) | Al gebouwd! = Top 3 |
| Auto-Checklist | `os_lists` + `os_list_items` | Template-vlag toevoegen |
| Conversation Debrief | `os_personal_wellbeing` | +`socialLog` array |
| Boundaries Macroboard | `settings` KV store | Snippets als JSON |

**Conclusie: 0 nieuwe stores. 0 DB migraties. Alleen velden toevoegen aan bestaande entries.**

---

### Sprint A — Module Presets + Settings UI

- [ ] A1. `src/core/modulePresets.js` — preset definities:
  - Minimaal: daily-outcomes, daily-todos, inbox, tasks
  - School: + school-dashboard, projects, schedule-placeholder
  - BPV: + bpv-quick-log, bpv-weekly-overview, bpv-log-summary
  - Persoonlijk: + personal-dashboard, daily-reflection
  - Alles aan: alle 31+ blokken
- [ ] A2. Block metadata uitbreiden in registraties: `{ category, description }`
  - Categories: 'kern', 'school', 'bpv', 'persoonlijk', 'welzijn', 'productiviteit'
- [ ] A3. Settings panel: "Modules" sectie met preset knoppen + individuele toggles
- [ ] A4. Feature flags per block: `block_{id}` in localStorage
- [ ] A5. `renderHosts()` respecteert block feature flags

### Sprint B — Quick-Win Blocks (Geen Store Changes)

- [ ] B1. **2-Minute Launcher** block (`two-min-launcher`)
  - Host: `vandaag-hero`, modes: [], order: 3
  - 6 knoppen: Opruimen, Mail, Logboek, Inventor, Workout, Admin
  - Click → start 2-minuten timer (countdown), klaar → markeer als "gedaan" (toast)
  - Geen persistentie, puur activatie-drempel verlagen
  - Anti-procrastinatie: "Je hoeft maar 2 minuten"

- [ ] B2. **Done List** block (`done-list`)
  - Host: `vandaag-cockpit`, modes: [], order: 4
  - Toont os_tasks met status='done' van vandaag, sorted by doneAt
  - Invoerveld: "Wat heb je gedaan?" → maakt task met status='done' direct
  - Geen to-do stress, alleen registreren wat je WEL hebt gedaan
  - Dopamine-boost door tegels die groeien

- [ ] B3. **Boundaries Macroboard** block (`boundaries`)
  - Host: `vandaag-mode`, modes: ['Personal'], order: 80
  - 4-6 voorgeprogrammeerde zinnen: "Kan ik hier later op terugkomen?", "Ik heb even pauze nodig", etc.
  - Click → kopieert naar clipboard (navigator.clipboard.writeText)
  - Customizable via settings (JSON in settings store)

### Sprint C — Wellbeing Blocks (Minimale Store Extensions)

- [ ] C1. **Traffic Light Brain** block (`brain-state`)
  - Host: `vandaag-hero`, modes: ['Personal'], order: 2
  - 3 knoppen: Groen / Oranje / Rood
  - Click → sla `brainState` op in os_personal_wellbeing vandaag-entry
  - Per state 1 actie-suggestie:
    - Groen: "Top! Pak je belangrijkste taak"
    - Oranje: "Even ademhalen. Kleine taak eerst."
    - Rood: "10 min weg. Oorkappen. Simpele handeling."
  - Sluit aan op Balanskaart-afspraken

- [ ] C2. **Worry Dump** block (`worry-dump`)
  - Host: `vandaag-capture`, modes: ['Personal'], order: 35
  - Textarea: "Waar maak je je zorgen over?"
  - Submit → Dwingt keuze: "Is dit vandaag oplosbaar?"
    - Ja → maak microstap-taak (1 zin, direct in os_tasks)
    - Nee → "parkeren" als inbox item met reminder-datum
  - Inbox items krijgen type='worry' voor filtering

- [ ] C3. **Conversation Debrief** block (`conversation-debrief`)
  - Host: `vandaag-reflection`, modes: ['Personal'], order: 55
  - Na een gesprek: 3 knoppen (Goed / Neutraal / Kostte veel)
  - + 1 reden (korte tekst)
  - Opslaan in os_personal_wellbeing: `socialLog: [{ rating, reason, timestamp }]`
  - Na 2 weken: patronen zichtbaar (welke gesprekken kosten meest)

### Sprint D — Context-Aware Block

- [ ] D1. **Auto-Checklist** block (`context-checklist`)
  - Host: `vandaag-tasks`, modes: [], order: 7
  - Gebruikt mode als context:
    - BPV mode → toont: PBM check, logboek, uren, 1 learning
    - School mode → toont: huiswerk, deadlines, projectwerk
    - Personal mode → toont: water, bewegen, opruimen, eten
  - Template-gebaseerd: checklists opgeslagen als os_list met `isTemplate: true`
  - Elke dag reset (niet persistent, puur activatie)

### Sprint E — Tests + Verificatie

- [ ] E1. Tests voor modulePresets.js (preset shapes, block IDs geldig)
- [ ] E2. Tests voor Traffic Light (brainState persist/load)
- [ ] E3. Tests voor Done List (create done task, filter today)
- [ ] E4. Tests voor Worry Dump (worry type in inbox, triage flow)
- [ ] E5. Tests voor Conversation Debrief (socialLog shape, rating values)
- [ ] E6. Run full suite — alle tests groen
- [ ] E7. Run build — clean

### Sprint F — Documentatie

- [ ] F1. Update CLAUDE.md met nieuwe blocks + host mapping
- [ ] F2. Update tasks/todo.md met sprint notes
- [ ] F3. Update tasks/lessons.md indien corrections

---

### Acceptance Criteria

- [ ] Preset knoppen werken in Settings (Minimaal/School/BPV/Persoonlijk/Alles)
- [ ] Blokken respecteren enabled/disabled state
- [ ] 2-Minute Launcher start timer, toont countdown, geeft toast
- [ ] Done List toont voltooide taken, laat nieuwe "done" items toevoegen
- [ ] Traffic Light slaat brainState op, toont actie-suggestie
- [ ] Worry Dump dwingt triage af (oplosbaar? → microstap/parkeren)
- [ ] Conversation Debrief: 3 knoppen + reden, opslaan in wellbeing
- [ ] Boundaries Macroboard kopieert naar clipboard
- [ ] Auto-Checklist toont mode-specifieke checklist
- [ ] Geen nieuwe stores, geen DB migraties
- [ ] Alle tests groen, build clean
- [ ] UI blijft calm en niet clutter (Rams/Ive/Jobs)

---

### Risks + Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Te veel blokken op Vandaag | Overload | Presets: default minimaal, user kiest meer |
| Feature flags localStorage vol | Breaks | Max 50 flags, cleanup on reset |
| Timer in 2-min-launcher leaks | Memory | clearInterval in unmount |
| Clipboard API niet beschikbaar | Macroboard fails | Fallback: select + "Kopieer handmatig" |
| socialLog array groeit eindeloos | Performance | Cap op 100 entries, FIFO |

---

## Phase 1: Clutter Audit & Structural Consolidation (2026-02-20)

> Branch: `claude/netlify-cli-setup-KOPE6`
> Status: **AUDIT COMPLETE — AWAITING APPROVAL BEFORE IMPLEMENTATION**

---

### Baseline

| Metric | Value |
|--------|-------|
| Tests | **400 passed**, 0 failed (26 files) |
| Build | **Clean** (164 kB CSS, 269 kB JS) |
| Blocks | **39 registered** |
| DB version | 8 (31 object stores) |
| Task-related stores | **7 distinct systems** |

---

### A) STRUCTURAL AUDIT REPORT

#### 1. Task Store Inventory — 7 Competing Systems

| # | System | IndexedDB Store | Scope | Mode-Aware | Done Tracking | Cap | Displayed In |
|---|--------|----------------|-------|------------|---------------|-----|-------------|
| 1 | **Global Tasks** | `os_tasks` | Persistent, cross-day | Yes (mode index) | status='done' + doneAt | 3/3/5 | tasks, done-list, worry-dump |
| 2 | **Daily Todos** | `dailyPlans` (embedded array) | Single day + mode | Yes (mode index) | done boolean | None | daily-todos |
| 3 | **List Items** | `os_list_items` | Persistent, per-list | No | done boolean | None | lijsten, lijsten-screen |
| 4 | **Inbox Items** | `os_inbox` | Capture → promote/archive | Yes (mode index) | status transitions | None | inbox, inbox-screen |
| 5 | **Project Next Actions** | `os_projects` (FK to os_tasks) | Per project | Yes | Via linked task | 1 per project | projects |
| 6 | **Context Checklist** | localStorage (ephemeral) | Daily reset, per mode | Yes | Checkbox state | Fixed 4-6 | context-checklist |
| 7 | **Habits** | `os_personal_wellbeing` | Daily, 3 booleans | No (Personal only) | boolean | Fixed 3 | personal-energy |

**Critical overlap:** Systems 1 and 2 both appear on Vandaag under "Taken" section. User must mentally choose between `os_tasks` (tasks block) and `dailyPlans.todos` (daily-todos block) with no clear guidance on which to use.

#### 2. List/Project Overlap — 4 Separate Collection Systems

| System | Store | Hierarchy | Completion | Priorities | Due Dates | Mode |
|--------|-------|-----------|-----------|-----------|-----------|------|
| **Lists** | `os_lists` + `os_list_items` | Yes (parent/subtask) | Yes | Yes (P1-P4) | Yes | All |
| **Projects** | `os_projects` | No | Via next action | No | No | Per mode |
| **Milestones** | `os_school_milestones` | No | No | No | Yes | School only |
| **Week Plan** | `os_personal_week_plan` | No | No | No | No | Personal only |

**Finding:** Lists is a superset of Milestones and Week Plan in capability. All 3 mode-specific collection systems (milestones, week plan, school-current-project) use separate stores that could theoretically be modeled as typed lists.

#### 3. Vandaag Page — Block Density Per Host Slot

| Host Slot | Section | Block Count (School) | Block Count (Personal) | Block Count (BPV) |
|-----------|---------|---------------------|----------------------|-------------------|
| `vandaag-hero` | Top 3 + Hero | 2 | 3 (+ brain-state) | 2 |
| `vandaag-cockpit` | Stats | 2 | 2 | 2 |
| `vandaag-tasks` | Taken | 3 (daily-todos, tasks, context-checklist) | 3 | 3 |
| `vandaag-projects` | Projecten & Lijsten | 2 (projects, lijsten) | 2 | 2 |
| `vandaag-capture` | Inbox | 1 | 2 (+ worry-dump) | 1 |
| `vandaag-reflection` | Reflectie | 1 | 2 (+ conversation-debrief) | 1 |
| `vandaag-mode` | Context | 4 (school-today, school-dashboard, tasks, schedule) | 5 (+ boundaries) | 6 (bpv-today, bpv-quick-log, bpv-log-summary, bpv-weekly-overview, tasks, schedule) |
| `vandaag-weekly` | Weekoverzicht | 1 | 1 | 1 |
| **TOTAL** | | **16** | **20** | **18** |

**Finding:** Personal mode has **20 blocks** on a single page. The `vandaag-mode` (Context) section alone has 4-6 blocks. Combined with 3 blocks in Taken, user sees 7+ cards before scrolling past the first 3 sections.

#### 4. Mode Duplication Analysis

| Pattern | Blocks | Total Lines | Consolidation Potential |
|---------|--------|-------------|----------------------|
| Mini-cards (mode indicator) | 3 (school/personal/bpv-mini-card) | 48 | **HIGH** — Identical except label text |
| Mode "today" blocks | 3 (school/personal/bpv-today) | 189 | **MEDIUM** — Similar structure, different data |
| Mode dashboards | 2 (school/personal-dashboard) | 265 | **LOW** — Architecturally distinct |

#### 5. Redundant UI Patterns

| Pattern | Where | Issue |
|---------|-------|-------|
| **Dual task entry** | daily-todos + tasks blocks both in `vandaag-tasks` | User has 2 input fields that create tasks in different stores |
| **Triple done tracking** | done-list quick-add, tasks toggle, worry-dump "yes" | 3 paths to mark something done in os_tasks |
| **Inbox → Task → Done flow** | inbox promote, project next-action, worry-dump | 3 separate creation flows all ending in os_tasks |
| **No cross-system search** | Lists not in globalSearch() | User can't find list items via Ctrl+K |
| **Inconsistent events** | lists/projects emit events, milestones/weekplan don't | Some blocks stale after changes in others |

---

### B) 3-LEVEL HIERARCHY MAPPING

Target: strict separation into Focus / Projects / Archive.

```
LEVEL 1 — FOCUS (Today)
├── Daily Outcomes (Top 3 goals)         → dailyPlans.outcomes
├── Active Tasks (mode-capped)           → os_tasks (status='todo')
├── Context Checklist (daily reset)      → localStorage
└── Inbox Quick Capture                  → os_inbox

LEVEL 2 — PROJECTS (Ongoing)
├── Projects + Next Actions              → os_projects + os_tasks FK
├── Persistent Lists (Todoist-style)     → os_lists + os_list_items
└── Mode-Specific Work                   → school-today, personal-today, bpv-today

LEVEL 3 — ARCHIVE (Reference)
├── Done Tasks                           → os_tasks (status='done')
├── Archived Inbox                       → os_inbox (status='archived')
├── Daily Reflections                    → dailyPlans (notes, reflection)
├── Weekly Reviews                       → weekly-review aggregation
└── BPV Logs                             → hours, logbook stores
```

**Key question:** Where do `dailyPlans.todos` fit? They currently sit at Level 1 alongside `os_tasks`, creating the dual-task-entry problem.

---

### C) RECOMMENDED CONSOLIDATION ACTIONS

#### Priority 1: Resolve Dual Task System (HIGH IMPACT)
**Problem:** `daily-todos` and `tasks` blocks both in `vandaag-tasks`. Two input fields, two stores, no sync.
**Options:**
- **A) Merge daily-todos INTO tasks block** — Daily todos become os_tasks with date=today. One input, one list.
- **B) Differentiate clearly** — daily-todos becomes "dagplan notities" (not tasks), tasks block becomes the sole task entry.
- **C) Remove daily-todos from Vandaag** — Move to daily-reflection section as lightweight notes.

#### Priority 2: Reduce Vandaag Card Count (HIGH IMPACT)
**Problem:** 16-20 cards on one page = cognitive overload.
**Actions:**
- Collapse `vandaag-mode` to max 2 blocks (merge mode-today + mode-dashboard into single block)
- Move done-list out of cockpit → integrate into tasks block as collapsible "Afgerond" section
- Merge context-checklist into tasks block header as inline checkboxes

#### Priority 3: Consolidate Mini-Cards (QUICK WIN)
**Problem:** 3 identical blocks (48 lines) that differ only in label.
**Action:** Single parameterized `mode-indicator` block.

#### Priority 4: Unify Event System (MEDIUM IMPACT)
**Problem:** Milestones and week plan don't emit events.
**Action:** Add `milestones:changed` and `weekplan:changed` events.

#### Priority 5: Add Lists to Search (MEDIUM IMPACT)
**Problem:** `os_list_items` not indexed in `globalSearch()`.
**Action:** Extend `search.js` to include list items.

---

### D) WHAT NOT TO CHANGE

| Keep As-Is | Reason |
|------------|--------|
| Projects vs Lists distinction | Different mental models (GTD next-action vs Todoist checklist) |
| Mode-specific dashboards | School/Personal data models are fundamentally different |
| Inbox processing flow | Well-designed, covers capture → triage → action |
| Block registry architecture | Solid, extensible, clean contract |
| EventBus pub/sub | Correct decoupling, no direct imports between blocks |

---

### E) IMPLEMENTATION APPROACH (IF APPROVED)

**Phase 1 — Quick Wins (no store changes)**
- [ ] Consolidate 3 mini-cards → 1 parameterized block
- [ ] Add list items to global search
- [ ] Add missing event emissions to milestones/weekplan

**Phase 2 — Task Hierarchy (store-level)**
- [ ] Decide: merge daily-todos into os_tasks OR differentiate
- [ ] Implement chosen approach
- [ ] Update tests

**Phase 3 — Card Reduction (UI-level)**
- [ ] Merge done-list into tasks block
- [ ] Merge context-checklist into tasks block header
- [ ] Consolidate mode-today + mode-dashboard per mode
- [ ] Enforce max 12 visible cards on Vandaag

**Phase 4 — Verify**
- [ ] All tests green
- [ ] Build clean
- [ ] Visual regression check (all 3 modes)
- [ ] Update CLAUDE.md host slot documentation

---

**STOP. Awaiting approval before implementing any structural changes.**
