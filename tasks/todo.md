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

## Milestone 3: Cloudflare Deployment + Sync (Future)

- [ ] Deploy to Cloudflare Pages (static hosting, free tier)
- [ ] Set up Cloudflare D1 database for sync backend
- [ ] Implement `/api/sync` Worker endpoint
- [ ] Add Cloudflare Turnstile for auth protection
- [ ] Implement IndexedDB ↔ D1 sync protocol (last-write-wins)
- [ ] Cloudflare R2 for photo/file sync
- [ ] Offline queue with retry on reconnect
