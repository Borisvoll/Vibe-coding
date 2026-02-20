# Review Notes — HTML5-first Refactor

## Phase 0 — Baseline (2026-02-20)
**What was done:**
- Audited full codebase: shell.js (912 lines), main.js (224 lines), router.js (130 lines)
- 41 blocks registered, 21 legacy pages, 13 host slots identified
- 484 tests pass across 29 files (baseline)
- No tests reference shell.js or createOSShell — safe to refactor

**Decisions made:**
- Template-based routing (NOT permanent DOM sections) per user directive
- Shell chrome in index.html, route content in `<template>` elements
- Router clones templates into `<main data-route-container>`
- Legacy path preserved temporarily (cleared in Phase 2)

**What's next:** Phase 1 — template-based shell

## Phase 1 — Template-based shell (2026-02-20)
**What was done:**
- Moved 240-line template literal from shell.js into index.html as semantic HTML
- Shell chrome (sidebar, topbar, mobile nav, mode picker) permanent in DOM
- 8 `<template data-route="...">` elements for route content
- shell.js rewritten from DOM creation to hydration of existing elements
- `mountRoute()`/`unmountRoute()` clone templates into `<main data-route-container>`
- 484 tests pass, build succeeds

**What's next:** Phase 2 — unified router + kill legacy

## Phase 2 — Unified router (2026-02-20)
**What was done:**
- deepLinks.js: clean URL format (`#today`, `#projects/abc123`) + backward compat for `#tab=today&focus=tasks`
- shell.js: `routeParams` support, parameterized `mountRoute(tab, params)`, project-detail template selection
- `<template data-route="project-detail">` added to index.html
- Killed legacy dual-path in main.js: removed `enableNewOS` feature flag, `initLegacy()`, `modules` export
- Removed interface toggle (OS/Legacy) from settings-panel.js
- Removed legacy switch button from sidebar in index.html + shell.js
- Deleted: `src/components/shell.js`, `src/router.js`, `src/shortcuts.js`
- main.js reduced from 224 lines to ~170 lines (OS-only path)
- 495 tests pass across 29 files, build succeeds

**Decisions made:**
- Legacy page files (src/pages/*.js) kept for now — they're dead code but harmless until Phase 4
- `getLocalModeManager()` fallback kept in settings-panel.js (defensive, no cost)

**What's next:** Phase 3 — Project module MVP
