# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Vite dev server on port 3000
npm run build        # Production build to dist/
npm test             # Run all tests once (vitest run)
npm run test:watch   # Watch mode testing

# Run a single test file
npx vitest run tests/stores/tasks.test.js

# Run tests matching a pattern
npx vitest run -t "should add a task"
```

**Important:** Always run `npm test` before committing. Tests must pass (658 tests across 42 files).

## Tech Stack

Zero-dependency vanilla JavaScript (ES2022) modular monolith. No framework. Only devDeps: Vite 5, Vitest 4, fake-indexeddb 6.

## Architecture

**BORIS** is a local-first personal OS / second brain for students. Single IndexedDB database (`bpv-tracker`, v8, 31 object stores), single build, single deploy to GitHub Pages. PWA with service worker for offline support.

### Kernel (`src/core/`)

Every module receives `{ db, eventBus, modeManager, blockRegistry }`:
- **EventBus** (`eventBus.js`) — Pub/sub. Modules communicate only via events, never direct imports.
- **ModeManager** (`modeManager.js`) — 3-mode lens: BPV (blue), School (purple), Personal (green). Stored in `localStorage` as `boris_mode`. Broadcasts `mode:changed`.
- **BlockRegistry** (`blockRegistry.js`) — Discovers and mounts UI blocks into host slots.
- **FeatureFlags** (`featureFlags.js`) — `localStorage`-backed feature toggles.
- **MigrationManager** (`migrationManager.js`) — Append-only schema versioning (v1→v8).
- **ModeCaps** (`modeCaps.js`) — Task capacity limits per mode (BPV=3, School=3, Personal=5).
- **CommandRegistry** (`commands.js`) — Registers palette commands (navigate, create) shown in the Ctrl+K command palette. Uses fuzzy search scoring.
- **DesignSystem** (`designSystem.js`) — Applies font design tokens as CSS custom properties. Color/spacing tokens live in `variables.css` only.
- **ModeConfig** (`modeConfig.js`) — Mode definitions stored in IDB (`mode_config` setting). Supports rename and archive (archived modes hide from picker but preserve data).
- **ModulePresets** (`modulePresets.js`) — Bundled block configurations (minimaal, school, bpv, compleet). Users can override individual blocks in Settings.
- **ThemeEngine** (`themeEngine.js`) — Single source of truth for visual theming. Stores theme in IDB (`boris_theme`). Handles accent colors, dark/light mode, and all derived CSS tokens via HSL conversion.
- **Tutorial** (`tutorial.js`) — Guided onboarding with contextual tooltips. Tracks seen tips in `localStorage`. Versioned so returning users only see new tips.

### Entry Point (`src/main.js`)

Single-path initialization: `init()` → `initDB()` → `applyUserSettings()` → `seedModeConfig()` → `createOSShell()`. No legacy/dual architecture — BORIS OS is the only UI path.

Startup tasks include: BPV auto-retirement (archives BPV mode after end date), device ID generation, personal task migration, export reminders, and soft-delete purge (30-day tombstone cleanup).

### OS Shell (`src/os/shell.js`)

8 tabs: Dashboard / Today (Vandaag) / Inbox / Lijsten / Planning / Projects / Settings / Curiosity.

The **Today** tab uses a Notion-style layout with 6 collapsible sections, each backed by a host slot:

| Section | Host Slot | Blocks | Default State |
|---------|-----------|--------|---------------|
| Taken | `vandaag-tasks` | daily-todos | Open |
| Projecten & Lijsten | `vandaag-projects` | projects, lijsten | Open |
| Inbox | `vandaag-capture` | inbox | Open |
| Reflectie | `vandaag-reflection` | daily-reflection | Varies by mode |
| Context | `vandaag-mode` | mode-specific dashboards, tasks, schedule, BPV tools | Varies by mode |
| Weekoverzicht | `vandaag-weekly` | weekly-review | Closed |

Plus two non-collapsible areas: `vandaag-hero` (daily outcomes/Top 3) and `vandaag-cockpit` (stats).

Other host slots: `dashboard-cards` (dashboard grid), `inbox-screen` (full-page inbox processing), `planning-detail` (project detail view), `projects-hub` (project hub 2.0).

Collapsible section state persists per mode in localStorage via `src/ui/collapsible-section.js`.

### OS Modules (`src/os/`)

- `shell.js` — Main OS shell with tab navigation and block mounting
- `cockpitData.js` — Aggregates data for the daily cockpit stats widget
- `curiosity.js` — Curiosity Studio page (resurfaces old captures, word clouds, patterns)
- `dailyAggregator.js` — Aggregates daily plan data across modes
- `dashboardData.js` — Provides data for the main dashboard
- `deepLinks.js` — URL hash routing (`#today`, `#projects/abc123`, `#today?focus=tasks`). Backward-compatible with legacy `#tab=today&focus=tasks` format.

### Block System (`src/blocks/`)

30 registered blocks (+ settings panel). Self-contained UI components mounted into host slots.

Block contract:
1. Export `register*Block(registry)` function
2. Implement `mount(container, context)` returning `{ unmount() }`
3. Use `escapeHTML()` from `src/utils.js` for all user content (XSS prevention)
4. Read data through store adapters, not `db.js` directly
5. Declare `order` for deterministic rendering within host slots
6. Registration in `src/blocks/registerBlocks.js`

### Store Adapters (`src/stores/`)

15 store adapters wrap `db.js` CRUD helpers with domain validation:
- `tasks.js` — Mode-aware task CRUD (`os_tasks`)
- `inbox.js` — Inbox capture + processing (`os_inbox`)
- `projects.js` — Projects with one-next-action constraint (`os_projects`)
- `lists.js` — Todoist-style persistent lists (`os_lists`, `os_list_items`)
- `daily.js` — Daily plans, outcomes, todos, notes (`dailyPlans`)
- `bpv.js` — Hours/logbook tracking (BPV-specific stores)
- `personal.js` — Wellbeing, habits, creative sparks
- `tracker.js` — Hours and logbook entry helpers
- `search.js` — Cross-store global search (lazy-loaded in Vandaag search bar)
- `tags.js` — Tagging system; `#hashtag` patterns in inbox text are auto-extracted and displayed as accent pills
- `backup.js` — Export/import bundles
- `weekly-review.js` — Weekly review aggregation + mailto sending
- `validate.js` — Shared validation, throws `ValidationError` with field + reason
- `curiosity-data.js` — Inbox word frequency analysis for Curiosity Studio (Dutch/English stop words, bigram extraction)
- `momentum.js` — Project momentum metric over a 4-week sliding window (read-only, no new stores)

### UI Components (`src/ui/`)

Reusable UI primitives shared across blocks and OS shell:
- `command-palette.js` — Ctrl+K fuzzy command palette with search across commands and IndexedDB data
- `morning-flow.js` — Morning routine flow (outcomes + project check-in)
- `collapsible-section.js` — Collapsible sections with per-mode localStorage persistence
- `theme-studio.js` — Theme customization UI (accent color picker, dark mode toggle)
- `modal.js` — Modal dialog component
- `focus-overlay.js` — Focus mode overlay for deep work
- `sparkline.js` — Sparkline chart visualization
- `balatro.js` — Visual card effect animations

### Database (`src/db.js`)

IndexedDB CRUD layer. Key exports:

**Core CRUD:** `initDB()`, `getAll(store)`, `getByKey(store, id)`, `getByIndex(store, index, value)`, `put(store, record)`, `remove(store, id)`, `getStoreNames()`

**Soft-delete:** `softDelete(store, id)`, `undoDelete(id)`, `purgeDeleted()`, `purgeDeletedOlderThan(days)`

**Settings:** `getSetting(key)`, `setSetting(key, value)`

**Bounded queries:** `getByIndexRange(store, index, lower, upper)`, `getRecentByIndex(store, index, limit)`, `countRecords(store)`, `getDbHealthMetrics()`

**Bulk:** `exportAllData()`, `importAll(data)`, `clearAllData()`

**Write guard:** `acquireWriteGuard()`, `releaseWriteGuard()` — Pauses/resumes writes for safe backup/import operations.

Soft-delete pattern: deletions go to `deleted` store for undo. All `os_*` stores have `updated_at` index for future sync.

### Key Events

| Event | Purpose |
|-------|---------|
| `mode:changed` | Mode switched (BPV/School/Personal) |
| `tasks:changed` | Task CRUD operation |
| `inbox:changed` | Inbox item modified |
| `inbox:open` | Switch to inbox tab |
| `projects:changed` | Project modified |
| `projects:open` | Navigate to a specific project (with `{ projectId }`) |
| `daily:changed` | Daily plan modified (with `{ mode, date }`) |
| `lists:changed` | List or list item modified |
| `bpv:changed` | BPV data (hours/logbook) modified |
| `morning:completed` | Morning flow finished (with `{ mode, date }`) |

### Other Source Files (`src/`)

- `constants.js` — App-wide constants (accent colors, BPV end date, weekday names)
- `utils.js` — Shared utilities (`escapeHTML()`, date formatting, UUID generation)
- `toast.js` — Toast notification system
- `icons.js` — SVG icon library
- `version.js` — App version constant
- `crypto.js` — Crypto utilities
- `state.js` — App state helpers
- `seed.js` — Data seeding
- `sync.js` — Sync utilities
- `workers/` — Web workers (used by command palette for off-thread search indexing)

### Settings & Mode Management

Mode management uses `modeManager` instance + eventBus for reactive updates. Mode config is stored in IDB settings (`mode_config`). Modes can be renamed (display name only) and archived (hidden from picker, data preserved).

Default mode is `School` (not BPV) for new users. BPV mode auto-archives after the configured end date (`BPV_END` in `constants.js`).

## Deployment

- **GitHub Pages** only: Auto-deploy on push to `main` or `master` via `.github/workflows/deploy.yml` (Node 20, `npm ci`, `npm run build`, base path `/Vibe-coding/`)
- SPA routing fix: `index.html` is copied to `404.html` so direct URLs (bookmarks) work
- **Service Worker**: PWA with offline support. Update banner shown when new version is available.

## Design Philosophy

Inspired by Dieter Rams, Jony Ive, Steve Jobs, Brian Eno. Key rules:
- Max 2 font sizes per block
- No unnecessary toggles or configurability
- Strong defaults, minimal user decisions
- Ambient mode transitions between contexts
- Dutch-language UI throughout

## Common Patterns & Gotchas

**Click handlers on new buttons:** Use direct click listeners, not event delegation on parent containers:
```javascript
container.querySelectorAll('.my-button').forEach(btn => {
  btn.addEventListener('click', () => { /* handler */ });
});
```

**XSS prevention:** Always use `escapeHTML()` from `src/utils.js` when rendering user content:
```javascript
host.innerHTML = `<p>${escapeHTML(userText)}</p>`; // Safe
host.innerHTML = `<p>${userText}</p>`;             // Unsafe
```

**Pointer events with overlays:** Fixed position overlays can block clicks. Use `pointer-events: none` as default, `pointer-events: auto` only when active.

**Mode persistence:** Use `modeManager.getMode()` in all code paths. Mode is cached in `localStorage` (`boris_mode`) and persisted in IDB.

**Block host assignment:** When adding blocks to the Today page, use one of the 6 collapsible host slots (`vandaag-tasks`, `vandaag-projects`, `vandaag-capture`, `vandaag-reflection`, `vandaag-mode`, `vandaag-weekly`) or the non-collapsible slots (`vandaag-hero`, `vandaag-cockpit`).

**Deep links:** Use `updateHash(tab, params)` from `src/os/deepLinks.js` instead of setting `window.location.hash` directly. Supports route params like `#projects/abc123`.

**Write guard for imports:** Always use `acquireWriteGuard()` / `releaseWriteGuard()` from `db.js` when performing bulk data operations (backup restore, import) to prevent concurrent write conflicts.

## Debugging Tips

- **Test failures:** Check `tests/setup.js` for DB reset logic.
- **Mode not changing:** Verify `localStorage` isn't throwing errors (private browsing). Check that `setMode()` is called before re-rendering.
- **Styles not applying:** Block styles are imported in `src/blocks/registerBlocks.js`. Component styles in `src/styles/base.css`. Design tokens in `src/ui/tokens.css` and `src/styles/variables.css`.
- **EventBus not firing:** Check that handlers are subscribed *before* events are emitted. Unsubscribe on cleanup to avoid memory leaks.
- **Blocks not mounting:** Verify the block's `hosts` array matches an existing host slot and `modes` includes the current mode (or is empty for all modes).
- **Theme not applying:** Theme tokens are set via `themeEngine.js`. Check that `initTheme()` runs before blocks mount. Dark mode uses `[data-theme="dark"]` CSS attribute selectors — don't set color tokens as inline styles.
- **Deep links not working:** Check `VALID_ROUTES` in `src/os/deepLinks.js`. New tabs must be added there.
