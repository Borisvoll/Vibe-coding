# Boris OS Experiment Plan

## Current repo architecture snapshot

- **Entrypoints**
  - HTML shell: `index.html` loads `./src/main.js` as the module entrypoint.
  - Runtime bootstrap: `src/main.js` initializes IndexedDB, shell UI, router, shortcuts, settings, and autosync.
- **Routing method**
  - Uses **hash routing** (`window.location.hash`) via `src/router.js`.
  - Route changes are handled through `hashchange`; routes are matched from module routes + `extraRoutes` patterns.
- **IndexedDB usage**
  - DB module: `src/db.js`.
  - Name/version: `bpv-tracker`, version `2`.
  - Upgrade strategy:
    - v1 stores: `hours`, `logbook`, `photos`, `settings`, `deleted`, `competencies`, `assignments`, `goals`, `quality`, `dailyPlans`, `weekReviews`.
    - v2 adds: `learningMoments`, `reference`, `vault`, `vaultFiles`, `energy`.
  - Pattern: generic CRUD helpers + settings helpers + import/export utilities + soft-delete/undo.
- **Service worker + manifest + cache strategy**
  - Present files: `public/sw.js`, `public/manifest.json` and manifest linked from `index.html`.
  - `sw.js` strategy:
    - Precache app shell on install.
    - Remove old caches on activate.
    - Navigation requests: **network-first** with cached `index.html` fallback.
    - Other GET assets: **cache-first**, then network, then cache response.
  - Important current runtime behavior: `src/main.js` explicitly unregisters service workers and clears caches at startup (`disableLegacyBootCache`) to prevent stale boot screens.

## Legacy preserved strategy

- Keep the existing BPV Tracker flow as the **default path** with no behavior change for current users.
- Introduce Boris OS as an opt-in layer that is never activated unless explicitly enabled.
- Avoid changes to existing module registry and page contracts until feature-flag guardrails are in place.

## Feature flag strategy (`enableNewOS = false` by default)

- Add a single source-of-truth feature flag in settings/config:
  - Key: `enableNewOS`
  - Default: `false`
- Bootstrap decision in `src/main.js`:
  - `false`: run legacy boot exactly as today.
  - `true`: run experimental Boris OS boot path.
- Keep route compatibility:
  - Legacy hashes remain primary.
  - New OS routes should be namespaced (e.g. `#os/...`) to avoid collision.
- Add kill-switch semantics:
  - If new OS boot fails, hard-fallback to legacy shell.

## Proposed modular block system skeleton

- Introduce a light block registry abstraction for Boris OS:
  - `src/os/registry.js`
  - `src/os/blocks/<block-id>/index.js`
  - `src/os/layouts/default.js`
  - `src/os/runtime.js`
- Block contract (minimum):
  - `id`, `title`, `mount(el, ctx)`, optional `unmount()`.
- Runtime responsibilities:
  - Resolve enabled blocks.
  - Render layout slots.
  - Pass shared context (db adapters, settings, events).
- Data access boundary:
  - Blocks should consume scoped adapters instead of direct raw store calls where possible.

## Migration safety notes

- **No store deletion** in migrations.
- Introduce all Boris OS data stores with `os_` prefix (e.g. `os_blocks`, `os_layouts`, `os_state`).
- Only append schema versions; never repurpose old store names.
- Keep existing export/import behavior backward-compatible.
- Add additive migrations only; no destructive data transforms.

## Implemented BORIS core skeleton files

The BORIS core skeleton now includes these new files under `src/core`:

- `blockRegistry.js`: register/unregister/list enabled modular blocks.
- `modeManager.js`: shared mode state for `BPV`, `School`, `Personal`.
- `eventBus.js`: lightweight pub/sub for core events.
- `featureFlags.js`: default-off `enableNewOS` plus per-block flags.
- `designSystem.js`: token-only design primitives (colors, spacing, type, radius).
- `migrationManager.js`: placeholder migration runner and append-only schema version strategy.

These files are additive and designed to run in parallel with legacy behavior, with legacy remaining the default path unless `enableNewOS` is explicitly enabled.
