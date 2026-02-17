# Boris OS Experiment Plan

## 1) Current architecture snapshot

### Entrypoints
- `index.html` is the app shell and loads `./src/main.js` as the module entrypoint.
- `src/main.js` is the runtime bootstrap for legacy vs experimental shell selection.

### Current routing method
- Routing is **hash-based**.
- `src/router.js` reads `window.location.hash`, listens to `hashchange`, and resolves module routes + parameterized `extraRoutes`.

### IndexedDB usage
- Primary DB module: `src/db.js`.
- DB name/version: `bpv-tracker` / `2`.
- Versioned stores:
  - **v1**: `hours`, `logbook`, `photos`, `settings`, `deleted`, `competencies`, `assignments`, `goals`, `quality`, `dailyPlans`, `weekReviews`
  - **v2**: `learningMoments`, `reference`, `vault`, `vaultFiles`, `energy`
- Access pattern is centralized helper-based CRUD (`getAll`, `getByKey`, `getByIndex`, `put`, `remove`) plus soft-delete and import/export helpers.

### Service worker + manifest + cache strategy
- Present: `public/sw.js` and `public/manifest.json`; manifest linked from `index.html`.
- `public/sw.js` strategy:
  - Install: precache minimal app shell.
  - Activate: remove old caches.
  - Navigation: **network-first** with cached `index.html` fallback.
  - Other GET assets: **cache-first**, then network and cache update.
- Runtime note: legacy bootstrap currently unregisters service workers and clears caches (`disableLegacyBootCache`) to avoid stale boot-cache behavior.

## 2) Legacy preserved strategy
- Keep current BPV Tracker behavior as the default execution path.
- Keep existing route/module/page contracts unchanged unless guarded.
- Any Boris OS experiment must be additive and easy to bypass.

## 3) Feature flag strategy (`enableNewOS=false` default)
- Use `enableNewOS` as the top-level gate with default `false`.
- Bootstrap split in `src/main.js`:
  - `false` -> run legacy init exactly as-is.
  - `true` -> run experimental Boris OS shell/runtime.
- Add fail-safe: if New OS init throws, log + immediately fallback to legacy init.

## 4) Proposed modular block system skeleton
- Suggested additive structure:
  - `src/os/runtime.js` (boot + lifecycle)
  - `src/os/registry.js` (register/resolve enabled blocks)
  - `src/os/layouts/default.js` (slot layout)
  - `src/os/blocks/<block-id>/index.js` (block modules)
- Minimal block contract:
  - `id`, `title`, `mount(container, context)`, optional `unmount()`.
- Context passed to blocks should expose adapters (settings/db/events) instead of raw global dependencies.

## 5) Migration safety notes
- No destructive schema migration (no store deletion/renaming of legacy stores).
- New Boris OS stores must be additive and prefixed with `os_` (e.g., `os_blocks`, `os_layouts`, `os_state`).
- Only bump schema version forward; keep import/export backward compatible for legacy data.

## 6) Implemented BORIS core skeleton files (current state)
- `src/core/blockRegistry.js`: minimal block registration/lookup and enabled-block resolution via feature flags.
- `src/core/modeManager.js`: mode state manager for `BPV`, `School`, `Personal` with event emission support.
- `src/core/eventBus.js`: lightweight pub/sub utility (`on`, `off`, `emit`, `clear`).
- `src/core/featureFlags.js`: default-off `enableNewOS` plus per-block flags and localStorage overrides.
- `src/core/designSystem.js`: token-only design constants (color/spacing/radius/typography), no UI components.
- `src/core/migrationManager.js`: placeholder migration runner and append-only versioning strategy for future `os_` stores.

`src/main.js` keeps legacy as the default path and only renders the minimal New OS shell when `enableNewOS` is enabled.

