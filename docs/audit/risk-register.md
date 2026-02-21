# BORIS OS — Risk Register

**Audit date:** 2026-02-21

Severity: Critical (C), High (H), Medium (M), Low (L)
Probability: Likely (L), Possible (P), Unlikely (U)

---

## R1: App is non-functional for 7/8 routes

| | |
|---|---|
| **Severity** | **CRITICAL** |
| **Probability** | **Certain** |
| **Description** | 7 route pages (Today, Inbox, Lijsten, Planning, Projects, ProjectDetail, Settings) show "wordt gemigreerd naar React" placeholder text. The vanilla blocks that previously provided all UI are registered but have no host slots to mount into — the `<template>` elements and `[data-os-host]` divs were removed when `index.html` was simplified to `<div id="app">`. |
| **Evidence** | `src/react/routes/Today.jsx:20` — "Vandaag pagina — wordt gemigreerd naar React". Same pattern in all 7 files. `index.html` has only `<div id="app"></div>`. |
| **Impact** | Users see empty pages for every feature except Dashboard. The app is unusable as a daily tool. |
| **Mitigation** | Either: (A) Wire VanillaBridge into route components to mount existing vanilla blocks, or (B) Implement React routes. Option A is hours of work; option B is weeks. |

---

## R2: Legacy vanilla shell is 716 lines of dead code but still imported indirectly

| | |
|---|---|
| **Severity** | **High** |
| **Probability** | **Likely** |
| **Description** | `src/os/shell.js` (716 LOC) — the previous vanilla OS shell — is no longer called from `main.js` but is still in the bundle. It references DOM elements (`#new-os-shell`, `[data-route-container]`, etc.) that no longer exist. Similarly, `src/os/deepLinks.js` (119 LOC) provides hash-parsing functions that React Router has replaced. |
| **Evidence** | `main.js:111-123` — only calls `createRoot()` + `render(<App>)`. No reference to `createOSShell`. `shell.js` line 53: `app.querySelector('[data-route-container]')` — element removed from `index.html`. |
| **Impact** | Dead code inflates bundle, confuses contributors, and could cause runtime errors if accidentally invoked. Some blocks still import navigation helpers from `deepLinks.js`. |
| **Mitigation** | Delete `src/os/shell.js`, `src/os/deepLinks.js`. Audit blocks that reference them. |

---

## R3: 20 legacy page files reference deleted modules

| | |
|---|---|
| **Severity** | **Medium** |
| **Probability** | **Certain** |
| **Description** | `src/pages/*.js` (20 files) import from `../router.js` and `../state.js` which were deleted in Phase 2. These files are tree-shaken out of the build but remain in the repo. |
| **Evidence** | `src/pages/today.js:3` — `import { navigate } from '../router.js'`. File `src/router.js` does not exist. Same in `hours.js`, `dashboard.js`, etc. |
| **Impact** | Confusion for contributors. If any code path triggers an import, it would crash. |
| **Mitigation** | Delete entire `src/pages/` directory. |

---

## R4: No React component tests

| | |
|---|---|
| **Severity** | **High** |
| **Probability** | **Certain** |
| **Description** | All 508 tests are data-layer focused (stores, core modules, aggregators). Zero tests verify React component rendering. No `@testing-library/react` or `jsdom` in devDependencies. |
| **Evidence** | `package.json` — no `@testing-library/react`. `tests/` — no `.jsx` test files. `vite.config.js` test section — no `environment: 'jsdom'`. |
| **Impact** | React components can break without detection. Shell layout, navigation, mode switching, and the one working Dashboard route are untested. |
| **Mitigation** | Add `@testing-library/react`, `jsdom` to devDeps. Write smoke tests for Shell, Dashboard, ModePicker. |

---

## R5: Vanilla blocks registered but unmountable

| | |
|---|---|
| **Severity** | **High** |
| **Probability** | **Certain** |
| **Description** | 31 blocks are registered in `blockRegistry` (via `registerBlocks.js`) but `renderHosts()` in `shell.js` — which scans `[data-os-host]` elements — is never called because `shell.js` is dead code. The React routes don't create host elements. |
| **Evidence** | `src/blocks/registerBlocks.js:59-101` — all 31 blocks registered. `src/os/shell.js:162-196` — `renderHosts()` scans for `[data-os-host]`, but shell.js is never called. React routes have no `data-os-host` divs. |
| **Impact** | 4,543 lines of functional vanilla UI code sit idle. All features that blocks provide (tasks, inbox, projects, BPV tracking, weekly review, etc.) are inaccessible. |
| **Mitigation** | Use `VanillaBridge` in React routes to mount blocks, OR rewrite blocks as React components. |

---

## R6: Dashboard.jsx uses verbose Tailwind arbitrary values

| | |
|---|---|
| **Severity** | **Low** |
| **Probability** | **Certain** |
| **Description** | Dashboard.jsx uses `text-[var(--color-text)]` instead of the token-mapped `text-text` utility. The `tailwind.css` @theme mapping exists but isn't utilized. |
| **Evidence** | `src/react/routes/Dashboard.jsx:34` — `text-[var(--color-text)]`. `src/react/tailwind.css:21` — `--color-text: var(--color-text)` maps the token. |
| **Impact** | Verbose JSX, inconsistent with token system intent. Not broken, just noisy. |
| **Mitigation** | Refactor to use mapped utilities: `text-text`, `bg-surface`, `border-border`. |

---

## R7: Stale block navigation to non-existent routes

| | |
|---|---|
| **Severity** | **Medium** |
| **Probability** | **Possible** |
| **Description** | Some vanilla blocks set `window.location.hash` to routes that don't exist in React Router (e.g., `#hours-entry`, `#logbook-entry`). These would redirect to `/today` via the catch-all. |
| **Evidence** | `src/blocks/daily-cockpit/view.js:26-27` — `window.location.hash = '#hours-entry'`. No `/hours-entry` route in `App.jsx`. |
| **Impact** | If blocks are mounted via VanillaBridge, clicking "quick log" would navigate away from the page to the catch-all redirect. |
| **Mitigation** | Update block navigation to use React Router paths or emit events. |

---

## R8: CSS bundle includes ~50 files for dormant vanilla UI

| | |
|---|---|
| **Severity** | **Low** |
| **Probability** | **Certain** |
| **Description** | 26 block CSS files + 5 UI CSS files + 6 core CSS files are imported via `main.js` and `registerBlocks.js`. Most styles target DOM elements that no longer exist. |
| **Evidence** | `src/main.js:1-14` — imports 13 CSS files. `src/blocks/registerBlocks.js` — imports 26+ block CSS files. Total CSS bundle: 205 KB (28 KB gzip). |
| **Impact** | Inflated CSS bundle. Potential style conflicts with React components. Selectors like `.os-sidebar__item` exist in both vanilla CSS and React JSX className strings. |
| **Mitigation** | Audit which CSS is used by active React components. Remove or lazy-load unused block CSS. |

---

## R9: Mode state is stored in 3-4 places

| | |
|---|---|
| **Severity** | **Low** |
| **Probability** | **Unlikely** |
| **Description** | Mode is persisted to localStorage, IndexedDB, kept in modeManager.currentMode, AND duplicated in React ModeProvider useState. All synchronized via EventBus. |
| **Evidence** | `src/core/modeManager.js:30-38` — writes to localStorage + IndexedDB. `src/react/hooks/useMode.jsx:39` — subscribes to `mode:changed` to sync useState. |
| **Impact** | Low risk of desync in practice (EventBus keeps them aligned). But if a race condition occurs on startup, the UI could flash the wrong mode. |
| **Mitigation** | Accept for now. Long-term, React should own mode state directly with IDB as persistence. |

---

## Summary Matrix

| Risk | Severity | Probability | Priority |
|------|----------|-------------|----------|
| R1: 7 routes non-functional | CRITICAL | Certain | **P0** |
| R5: Blocks unmountable | High | Certain | **P0** |
| R2: Dead vanilla shell (716 LOC) | High | Likely | P1 |
| R4: No React tests | High | Certain | P1 |
| R3: 20 orphaned page files | Medium | Certain | P2 |
| R7: Stale block navigation | Medium | Possible | P2 |
| R8: Bloated CSS bundle | Low | Certain | P3 |
| R6: Verbose Tailwind | Low | Certain | P3 |
| R9: Mode state duplication | Low | Unlikely | P3 |
