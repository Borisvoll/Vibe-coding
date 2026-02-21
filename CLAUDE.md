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

**Important:** Always run `npm test` before committing. Tests must pass (298 tests across 21 files).

## Tech Stack

Zero-dependency vanilla JavaScript (ES2022) modular monolith. No framework. Only devDeps: Vite 5, Vitest 4, fake-indexeddb 6.

## Architecture

**BORIS** is a local-first personal OS / second brain for students. Single IndexedDB database (`bpv-tracker`, v8, 31 object stores), single build, single deploy to GitHub Pages.

### Kernel (`src/core/`)

Every module receives `{ db, eventBus, modeManager, blockRegistry }`:
- **EventBus** (`eventBus.js`) — Pub/sub. Modules communicate only via events, never direct imports.
- **ModeManager** (`modeManager.js`) — 3-mode lens: BPV (blue), School (purple), Personal (green). Stored in `localStorage` as `boris_mode`. Broadcasts `mode:changed`.
- **BlockRegistry** (`blockRegistry.js`) — Discovers and mounts UI blocks into host slots.
- **FeatureFlags** (`featureFlags.js`) — `localStorage`-backed. `enableNewOS` toggles legacy vs BORIS OS path.
- **MigrationManager** (`migrationManager.js`) — Append-only schema versioning (v1→v8).
- **ModeCaps** (`modeCaps.js`) — Task capacity limits per mode (BPV=3, School=3, Personal=5).

### Dual Architecture

Feature flag `enableNewOS` (default: true) controls UI path in `src/main.js`:
- **BORIS OS** (new): `createOSShell()` → tab navigation + block system + 3-mode lens
- **Legacy**: `createShell()` + `createRouter()` → sidebar + 18 hash-routed pages

Both paths share the same IndexedDB. Legacy pages accessible from OS via sidebar "Legacy" button.

### OS Shell (`src/os/shell.js`)

5 tabs: Dashboard / Vandaag / Inbox / Planning / Instellingen.

The **Vandaag** tab uses a Notion-style layout with 6 collapsible sections, each backed by a host slot:

| Section | Host Slot | Blocks | Default State |
|---------|-----------|--------|---------------|
| Taken | `vandaag-tasks` | daily-todos | Open |
| Projecten & Lijsten | `vandaag-projects` | projects, lijsten | Open |
| Inbox | `vandaag-capture` | inbox | Open |
| Reflectie | `vandaag-reflection` | daily-reflection | Varies by mode |
| Context | `vandaag-mode` | mode-specific dashboards, tasks, schedule, BPV tools | Varies by mode |
| Weekoverzicht | `vandaag-weekly` | weekly-review | Closed |

Plus two non-collapsible areas: `vandaag-hero` (daily outcomes/Top 3) and `vandaag-cockpit` (stats).

Other host slots: `dashboard-cards` (dashboard grid), `inbox-screen` (full-page inbox processing).

Collapsible section state persists per mode in localStorage via `src/ui/collapsible-section.js`.

### Block System (`src/blocks/`)

31 registered blocks. Self-contained UI components mounted into host slots.

Block contract:
1. Export `register*Block(registry)` function
2. Implement `mount(container, context)` returning `{ unmount() }`
3. Use `escapeHTML()` from `src/utils.js` for all user content (XSS prevention)
4. Read data through store adapters, not `db.js` directly
5. Declare `order` for deterministic rendering within host slots
6. Registration in `src/blocks/registerBlocks.js`

### Store Adapters (`src/stores/`)

13 store adapters wrap `db.js` CRUD helpers with domain validation:
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

### Database (`src/db.js`)

IndexedDB CRUD layer. Key exports: `initDB()`, `getAll(store)`, `getByKey(store, id)`, `getByIndex(store, index, value)`, `put(store, record)`, `remove(store, id)`, `softDelete(store, id)`, `getSetting(key)`, `setSetting(key, value)`, `exportAllData()`, `importAll(data)`.

Soft-delete pattern: deletions go to `deleted` store for undo. All `os_*` stores have `updated_at` index for future sync.

### Key Events

| Event | Purpose |
|-------|---------|
| `mode:changed` | Mode switched (BPV/School/Personal) — BORIS OS only |
| `tasks:changed` | Task CRUD operation |
| `inbox:changed` | Inbox item modified |
| `inbox:open` | Switch to inbox tab |
| `projects:changed` | Project modified |

### Settings & Mode Management

Mode switching works in both paths:
- **BORIS OS**: `modeManager` instance + eventBus for reactive updates
- **Legacy**: localStorage fallback (`boris_mode` key) with direct DOM updates

Default mode is `School` (not BPV) for new users. All mode UIs stay in sync via `mode:changed` event (OS) or localStorage (legacy).

## Deployment

- **GitHub Pages** only: Auto-deploy on push to main via `.github/workflows/deploy.yml` (Node 20, `npm run build`, base path `/Vibe-coding/`)

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

**Mode persistence:** Use `localStorage.getItem('boris_mode')` in legacy path, `modeManager.getMode()` in OS path. Both store the same key.

**Block host assignment:** When adding blocks to the Vandaag page, use one of the 6 collapsible host slots (`vandaag-tasks`, `vandaag-projects`, `vandaag-capture`, `vandaag-reflection`, `vandaag-mode`, `vandaag-weekly`) or the non-collapsible slots (`vandaag-hero`, `vandaag-cockpit`).

## Debugging Tips

- **Test failures:** Check `tests/setup.js` for DB reset logic.
- **Mode not changing:** Verify `localStorage` isn't throwing errors (private browsing). Check that `setMode()` is called before re-rendering.
- **Styles not applying:** Block styles are imported in `src/blocks/registerBlocks.js`. Component styles in `src/styles/base.css`.
- **EventBus not firing:** Check that handlers are subscribed *before* events are emitted. Unsubscribe on cleanup to avoid memory leaks.
- **Blocks not mounting:** Verify the block's `hosts` array matches an existing host slot and `modes` includes the current mode (or is empty for all modes).
