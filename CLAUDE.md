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

### Key Events

| Event | Purpose |
|-------|---------|
| `mode:changed` | Mode switched (BPV/School/Personal) |
| `tasks:changed` | Task CRUD operation |
| `inbox:changed` | Inbox item modified |
| `inbox:open` | Switch to inbox tab |
| `projects:changed` | Project modified |

## Testing

Tests use Vitest + `fake-indexeddb`. Setup in `tests/setup.js` resets the DB before each test. Tests are store-level (no browser needed).

```bash
# Run a single test file
npx vitest run tests/stores/tasks.test.js

# Run tests matching a pattern
npx vitest run -t "should add a task"
```

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

## Documentation

Detailed docs in `docs/`: `architecture.md` (system design), `design-principles.md` (UI rules), `storage.md` (IndexedDB schemas), `current-state.md` (feature inventory), `future.md` (roadmap).
