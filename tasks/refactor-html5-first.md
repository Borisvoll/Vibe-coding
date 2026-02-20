# HTML5-first Refactor — BORIS OS

Tracking: incremental refactor, app works on every commit, tests green.

## Phase 0 — Baseline & Audit
- [x] Confirm current routes, blocks, and stores
- [x] Run tests — 484 pass across 29 files
- [x] Review lessons.md (15 rules)
- [x] Audit shell.js (912 lines), main.js (224 lines), router.js (130 lines)
- [x] Audit 41 blocks, 21 legacy pages, 13 host slots

## Phase 1 — Template-based shell (HTML5-first)
- [ ] Move shell chrome (sidebar/topbar/nav/mode-picker) into index.html
- [ ] Add `<main id="app" data-route-container>` as empty mount point
- [ ] Create `<template data-route="...">` for each route (today, dashboard, inbox, lijsten, planning, projects, settings)
- [ ] Convert shell.js from DOM creation to hydration of shell chrome
- [ ] Shell.js no longer sets `app.innerHTML`; it finds existing shell elements
- [ ] Legacy fallback: clears shell + inserts legacy UI (temporary)
- [ ] Tests pass

## Phase 2 — Unified router
- [ ] Create new router that owns route->template mapping
- [ ] Router clones `<template>` and mounts into `<main data-route-container>`
- [ ] Implement `#projects` and `#projects/:id` routes
- [ ] Mode-aware navigation visibility (BPV sidebar items only in BPV mode)
- [ ] Kill legacy dual-path (remove enableNewOS feature flag)
- [ ] Delete: src/components/shell.js, old src/router.js, src/shortcuts.js
- [ ] Tests pass

## Phase 3 — Project module MVP
- [ ] Add top-level sidebar item: Projecten (always accessible)
- [ ] Projects route: max 3 active projects (pinned first, else most recent)
- [ ] Accent color per project (stored in project model)
- [ ] Project Detail route (`#projects/:id`) with Notion-like header
- [ ] Cover upload (image or PDF preview)
- [ ] Tasks tab using existing list/task primitives (NO duplication)
- [ ] Tests pass

## Phase 4 — Timeline + mini agenda
- [ ] Timeline default WEEK view; toggle MONTH
- [ ] Items stored per project; render minimal and clear
- [ ] Mini agenda adds items/tasks scoped to project
- [ ] Tests pass

## Phase 5 — Mindmap MVP
- [ ] Outline-based data model -> renders as node graph
- [ ] Persist per project in IndexedDB
- [ ] Keyboard-friendly interactions
- [ ] Tests pass

## Phase 6 — Polish + consistency
- [ ] Tokenize CSS (no hardcoded colors)
- [ ] Consistent spacing, typography, cards
- [ ] A11y pass + Lighthouse >= 95
- [ ] Mobile (iPhone 11 Pro Max) checks: tap targets, scroll, safe areas
- [ ] Tests pass
