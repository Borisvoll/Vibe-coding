# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Vite dev server on port 3000
npm run build        # Production build to dist/
npm test             # Run all tests once (vitest run)
npm run test:watch   # Watch mode testing
```

Netlify deployment:
```bash
npm run netlify:dev            # Local Netlify dev
npm run netlify:deploy:prod    # Deploy to production
```

## Tech Stack

Zero-dependency vanilla JavaScript (ES2022) modular monolith. No framework. Only devDeps: Vite 5, Vitest 4, fake-indexeddb 6, netlify-cli.

## Architecture

**BORIS** is a local-first personal OS / second brain for students. Single IndexedDB database (`bpv-tracker`, v6, 29 object stores), single build, single deploy.

### Kernel (`src/core/`)

Every module receives `{ db, eventBus, modeManager, blockRegistry }`:
- **EventBus** (`eventBus.js`) — Pub/sub. Modules communicate only via events, never direct imports.
- **ModeManager** (`modeManager.js`) — 3-mode lens: BPV (blue), School (purple), Personal (green). Stored in `localStorage` as `boris_mode`. Broadcasts `mode:changed`.
- **BlockRegistry** (`blockRegistry.js`) — Discovers and mounts UI blocks into host slots.
- **FeatureFlags** (`featureFlags.js`) — `localStorage`-backed. `enableNewOS` toggles legacy vs BORIS OS path.
- **MigrationManager** (`migrationManager.js`) — Append-only schema versioning (v1→v6).
- **ModeCaps** (`modeCaps.js`) — Task capacity limits per mode (BPV=3, School=3, Personal=5).

### Dual Architecture

Feature flag `enableNewOS` (default: true) controls UI path in `src/main.js`:
- **BORIS OS** (new): `createOSShell()` → tab navigation + block system + 3-mode lens
- **Legacy**: `createShell()` + `createRouter()` → sidebar + 18 hash-routed pages

Both paths share the same IndexedDB. Legacy pages accessible from OS blocks via hash routes.

### Block System (`src/blocks/`)

Self-contained UI components mounted into host slots (`today-sections`, `dashboard-cards`, `vandaag-widgets`, `inbox-screen`).

Block contract:
1. Export `register*Block(registry)` function
2. Implement `mount(container, context)` returning `{ unmount() }`
3. Use `escapeHTML()` from `src/utils.js` for all user content (XSS prevention)
4. Read data through store adapters, not `db.js` directly
5. Declare `order` for deterministic rendering within host slots
6. Registration in `src/blocks/registerBlocks.js`

### Store Adapters (`src/stores/`)

Wrap `db.js` CRUD helpers with domain validation and business logic. Key stores:
- `tasks.js` — Mode-aware task CRUD (`os_tasks` store)
- `inbox.js` — Inbox capture + processing (`os_inbox` store)
- `projects.js` — Projects with one-next-action constraint (`os_projects` store)
- `bpv.js` — Hours/logbook tracking (BPV-specific stores)
- `validate.js` — Shared validation functions, throw `ValidationError` with field + reason

### Database (`src/db.js`)

IndexedDB CRUD layer. Key exports: `initDB()`, `getAll(store)`, `getByKey(store, id)`, `getByIndex(store, index, value)`, `put(store, record)`, `remove(store, id)`, `softDelete(store, id)`, `getSetting(key)`, `setSetting(key, value)`, `exportAllData()`, `importAll(data)`.

Soft-delete pattern: deletions go to `deleted` store for undo. All `os_*` stores have `updated_at` index for future sync.

### OS Shell (`src/os/shell.js`)

Tab-based navigation: Dashboard / Vandaag / Inbox / Planning / Reflectie / Archief. Manages host slot rendering, mode switching, and block mounting.

### Settings & Mode Management

Mode switching works in both legacy and BORIS OS paths:
- **BORIS OS** (`src/os/shell.js`): Uses `modeManager` instance + eventBus for reactive updates
- **Legacy** (`src/components/shell.js`): Uses localStorage fallback (`boris_mode` key) with direct DOM updates
- **Settings Panel** (`src/blocks/settings-panel.js`): Dual-path support via fallback mode manager

Mode pills appear in:
1. Settings page (Instellingen section) — all three paths
2. Legacy hamburger menu (top-right) — before theme switcher
3. BORIS OS mode picker dialog (header button)

All three keep themselves in sync via `mode:changed` event (OS) or localStorage (legacy).

### Key Events

| Event | Purpose |
|-------|---------|
| `mode:changed` | Mode switched (BPV/School/Personal) — BORIS OS only |
| `tasks:changed` | Task CRUD operation |
| `inbox:changed` | Inbox item modified |
| `inbox:open` | Switch to inbox tab |
| `projects:changed` | Project modified |

## Testing

Tests use Vitest + `fake-indexeddb`. Setup in `tests/setup.js` resets the DB before each test (234 tests covering store adapters, migrations, validation, mode switching). Tests are store-level (no browser needed).

```bash
# Run all tests once
npm test

# Run a single test file
npx vitest run tests/stores/tasks.test.js

# Run tests matching a pattern
npx vitest run -t "should add a task"

# Watch mode (re-run on file changes)
npm run test:watch
```

**Important:** Always run `npm test` before committing to ensure no regressions. Tests must pass in any PR.

## Deployment

- **GitHub Pages**: Auto-deploy on push to main via `.github/workflows/deploy.yml` (Node 20, `npm run build`, base path `/Vibe-coding/`)
- **Netlify**: Config in `netlify.toml` (build base `/`, Node 20, SPA redirect)

Note: Vite base path differs per target — `/Vibe-coding/` for GitHub Pages (in `vite.config.js`), `/` for Netlify (overridden in `netlify.toml`).

## Design Philosophy

Inspired by Dieter Rams, Jony Ive, Steve Jobs, Brian Eno. Key rules:
- Max 2 font sizes per block
- No unnecessary toggles or configurability
- Strong defaults, minimal user decisions
- Ambient mode transitions between contexts
- Dutch-language UI throughout

## Common Patterns & Gotchas

**Click handlers on new buttons:** Use direct click listeners, not event delegation on parent containers, for maximum reliability. Example:
```javascript
container.querySelectorAll('.my-button').forEach(btn => {
  btn.addEventListener('click', () => { /* handler */ });
});
```

**XSS prevention:** Always use `escapeHTML()` from `src/utils.js` when rendering user content:
```javascript
host.innerHTML = `<p>${escapeHTML(userText)}</p>`; // ✓ Safe
host.innerHTML = `<p>${userText}</p>`;             // ✗ Unsafe
```

**Pointer events with overlays:** Fixed position overlays can block clicks on elements below. Use `pointer-events: none` as default, only enable when needed:
```css
.overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;  /* Allow clicks through */
}
.overlay.active {
  pointer-events: auto;  /* Intercept clicks when visible */
}
```

**Mode persistence:** Use `localStorage.getItem('boris_mode')` in legacy path, `modeManager.getMode()` in OS path. Both store the same key. Default mode is `School` (not BPV) for new users.

## Documentation

Detailed docs in `docs/`: `architecture.md` (system design), `design-principles.md` (UI rules), `storage.md` (IndexedDB schemas), `current-state.md` (feature inventory), `future.md` (roadmap).

## Debugging Tips

- **Test failures:** Run `npm test` before each commit. Check `tests/setup.js` for DB reset logic.
- **Mode not changing:** Verify `localStorage` isn't throwing errors (private browsing). Check that `setMode()` is called before re-rendering.
- **Styles not applying:** Block styles are imported in `src/blocks/registerBlocks.js` (both OS and legacy paths). Component styles in `src/styles/base.css`.
- **EventBus not firing:** Check that handlers are subscribed *before* events are emitted. Unsubscribe on cleanup to avoid memory leaks.
