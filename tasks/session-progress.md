# Session Progress — HTML5-first Refactor

## Branch: `claude/html5-structure-implementation-pANgV`

## Completed

### Phase 0 — Baseline & Audit ✅
- Audited shell.js (912 lines), main.js (224 lines), router.js (130 lines)
- 41 blocks, 21 legacy pages, 13 host slots
- 484 tests pass, no tests reference shell.js/createOSShell
- Commit: baseline (pre-existing)

### Phase 1 — Template-based shell ✅
**Commit:** `886c436 refactor: Phase 1 — template-based shell in index.html`

**Changes:**
- `index.html`: Was 19 lines → now ~300 lines with shell chrome + 8 `<template>` elements
  - Shell chrome (permanent DOM): mode picker dialog, desktop sidebar with nav, desktop topbar with gear menu (theme/accent/mode), mobile topbar, mobile horizontal nav
  - Route templates: dashboard, today, inbox, lijsten, planning, projects, settings, project-detail
  - `<main data-route-container>` as empty mount point
- `src/os/shell.js`: Removed 240-line innerHTML template literal → hydration of existing DOM
  - `mountRoute(tab, params)`: clones template into route container, runs route-specific hydration
  - `unmountRoute(tab)`: unmounts blocks, destroys collapsible sections, clears container
  - `setActiveTab(tab, opts)`: orchestrates unmount→mount→nav update→deep link
  - `renderHosts()` and `unmountAll()` now scoped to `routeContainer` instead of `app`

### Phase 2 — Unified router + kill legacy ✅
**Commit:** `b56d035 refactor: Phase 2 — kill legacy dual-path, unified template router`

**Changes:**
- `src/os/deepLinks.js`: Rewritten for clean URLs
  - New format: `#today`, `#projects/abc123`, `#today?focus=tasks`
  - Old format still supported: `#tab=today&focus=tasks`
  - `parseHash()` returns `{ tab, params, focus, mode }`
  - `updateHash(tab, focus, params)` builds clean URLs
- `tests/os/deepLinks.test.js`: Rewritten, 32 tests covering both formats + parameterized routes
- `src/os/shell.js`:
  - Added `routeParams` tracking
  - `mountRoute(tab, params)` selects `project-detail` template when `params.id` exists
  - Hash change handler detects param changes via JSON.stringify comparison
  - Removed legacy switch button handler
- `src/main.js`:
  - Removed: `enableNewOS` flag check, `initLegacy()`, `modules` export
  - Removed imports: `createRouter`, `createShell`, `initShortcuts`, `getFeatureFlag`, `ACCENT_COLORS`, `applyAccentColor`, `initAutoSync`
  - `init()` always calls `initNewOSShell()` directly
- `src/blocks/settings-panel.js`:
  - Removed interface toggle (OS/Legacy pill buttons) from HTML and JS
  - Removed `getFeatureFlag`/`setFeatureFlag` imports
- `index.html`: Removed legacy switch button from sidebar
- **Deleted files:** `src/components/shell.js`, `src/router.js`, `src/shortcuts.js`

**Test results:** 495 tests pass across 29 files, build succeeds

---

## Remaining Phases (not started)

### Phase 3 — Project module MVP
- Add top-level sidebar item: Projecten (already in nav)
- Projects route: max 3 active projects (pinned first, else most recent)
- Accent color per project (stored in project model)
- Project Detail route (`#projects/:id`) with Notion-like header
- Cover upload (image or PDF preview)
- Tasks tab using existing list/task primitives (NO duplication)
- Tests pass

### Phase 4 — Timeline + mini agenda
- Timeline default WEEK view; toggle MONTH
- Items stored per project; render minimal and clear
- Mini agenda adds items/tasks scoped to project
- Tests pass

### Phase 5 — Mindmap MVP
- Outline-based data model -> renders as node graph
- Persist per project in IndexedDB
- Keyboard-friendly interactions
- Tests pass

### Phase 6 — Polish + consistency
- Tokenize CSS (no hardcoded colors)
- Consistent spacing, typography, cards
- A11y pass + Lighthouse >= 95
- Mobile (iPhone 11 Pro Max) checks: tap targets, scroll, safe areas
- Tests pass

---

## Architecture Summary (current state)

### How routing works now:
1. `index.html` contains shell chrome (sidebar/topbar/nav/mode-picker) as permanent DOM
2. `index.html` contains `<template data-route="...">` elements (8 routes)
3. `<main data-route-container>` is the empty mount point
4. `shell.js.mountRoute(tab, params)` clones the right template into the container
5. `shell.js.unmountRoute(tab)` destroys blocks + clears the container
6. Tab navigation triggers unmount→mount cycle
7. Hash changes (`#today`, `#projects/abc123`) are detected and routed

### Key files:
- `index.html` — Shell chrome + route templates (source of truth for DOM structure)
- `src/os/shell.js` — Hydrates shell, manages routing, mounts/unmounts blocks
- `src/os/deepLinks.js` — URL hash parsing/building (clean format + backward compat)
- `src/main.js` — App bootstrap (always OS path, no more legacy)
- `src/blocks/settings-panel.js` — Settings UI (no more OS/Legacy toggle)

### Dead code (kept for Phase 4):
- `src/pages/*.js` — 19 legacy page files, no longer imported anywhere
- `src/core/featureFlags.js` — Still exists but `enableNewOS` flag unused
- `src/auto-sync.js` — No longer imported from main.js

### Design rules to follow (from user):
- Template-based routing: clone on navigate, NOT permanent DOM sections
- Blocks hydrate only within their rootEl (`mount(rootEl, ctx)`)
- No `document.querySelector` outside rootEl in blocks
- Hybrid events: delegation for dynamic lists, direct for static UI
- Router decides which template + which blocks are visible
- Max 3 primary tasks visible, max 3 projects visible
- Dutch-language UI throughout
- Product vision: rust + focus + controle bij openen
