# Next Steps — HTML5-first Refactor

## Current State
- **Branch:** `claude/html5-structure-implementation-pANgV`
- **Phase 0–2:** Complete (committed + pushed)
- **Tests:** 495 pass across 29 files
- **Build:** Succeeds

---

## Phase 3 — Project module MVP (next up)

### What needs to happen:
1. **Projects route (`#projects`)** — already has template + sidebar nav item
   - Render max 3 active projects (pinned first, else most recent)
   - Use existing `src/stores/projects.js` for data
   - List view with project cards showing accent color, title, last activity
   - "Nieuw project" action

2. **Accent color per project**
   - Add `accentColor` field to project model in `src/stores/projects.js`
   - 8 color options (same as app accent: blue, purple, green, rose, orange, cyan, indigo, teal)
   - Store in IndexedDB `os_projects` records

3. **Project Detail route (`#projects/:id`)**
   - Template already exists: `<template data-route="project-detail">`
   - Shell.js already handles: `mountRoute('projects', { id })` → selects project-detail template
   - Back button already wired: `← Projecten` → navigates to `#projects`
   - Needs: Notion-like header with project title, accent color, cover area
   - Host slot: `project-detail-view` (already in template)

4. **Cover upload**
   - Image or PDF preview in project header
   - Store as blob in IndexedDB or as base64 in project record
   - Decision needed: image only, or also PDF?

5. **Tasks tab in project detail**
   - Reuse existing `src/stores/tasks.js` primitives
   - Filter tasks by `projectId` field
   - NO duplication of task CRUD logic

6. **Tests**
   - Add tests for project list rendering logic
   - Add tests for project detail data loading
   - Existing store tests cover CRUD

### Files to modify:
- `src/blocks/` — new project-hub block or modify existing `src/blocks/projects/`
- `src/stores/projects.js` — possibly add `accentColor` field
- `src/os/shell.js` — may need project-specific hydration in `mountRoute`

### Existing project infrastructure:
- `src/stores/projects.js` — CRUD with one-next-action constraint
- `src/blocks/projects/view.js` — existing projects block
- `src/blocks/project-hub/` — existing project hub with list.js, detail.js
- `src/blocks/project-detail/` — existing project detail views
- `tests/stores/projects.test.js` — 18 tests
- `tests/stores/project-tasks.test.js` — 15 tests
- `tests/stores/project-hub.test.js` — 22 tests

---

## Phase 4 — Timeline + mini agenda

### What needs to happen:
1. **Timeline view** in project detail
   - Default WEEK view with MONTH toggle
   - Items stored per project in IndexedDB
   - Render minimal and clear (Dieter Rams aesthetic)

2. **Mini agenda**
   - Add items/tasks scoped to project
   - Integrates with project's task list

3. **Tests** for timeline data model + rendering

### Existing infrastructure:
- `src/blocks/project-hub/tabs/timeline.js` — existing timeline tab
- `src/blocks/project-detail/timeline.js` — existing project detail timeline

---

## Phase 5 — Mindmap MVP

### What needs to happen:
1. **Data model** — outline-based (tree structure), renders as node graph
2. **Persistence** — per project in IndexedDB
3. **Keyboard-friendly** interactions (add node, navigate, expand/collapse)
4. **Rendering** — simple node-graph visualization (no drag needed initially)
5. **Tests** for mindmap data model

### Decision needed:
- Minimal drag or outline-based only?

### Existing infrastructure:
- `src/blocks/project-hub/tabs/mindmap.js` — existing mindmap tab

---

## Phase 6 — Polish + consistency

### What needs to happen:
1. **Tokenize CSS** — no hardcoded colors, use CSS custom properties everywhere
   - Audit all files for hardcoded color values
   - Replace with design tokens from `src/ui/tokens.css`

2. **Consistent spacing/typography/cards**
   - Audit all blocks for spacing inconsistencies
   - Ensure all cards use same border-radius, padding, shadow

3. **A11y pass**
   - ARIA labels on all interactive elements
   - Focus management for route transitions
   - Screen reader testing
   - Lighthouse >= 95

4. **Mobile checks (iPhone 11 Pro Max)**
   - Tap targets >= 44px
   - No horizontal scroll
   - Safe areas respected
   - Bottom nav doesn't overlap content

5. **Tests** pass after all changes

### Files to audit:
- All `src/blocks/*/` CSS
- `src/styles/*.css`
- `src/ui/*.css`
- `index.html` for missing ARIA

---

## Cleanup (can happen anytime)

### Dead code to remove:
- `src/pages/*.js` — 19 legacy page files (currently dead, not imported)
- `src/core/featureFlags.js` — `enableNewOS` flag no longer used
- `src/auto-sync.js` — no longer imported
- Interface toggle CSS in `src/blocks/styles.css` (line 126)
- Legacy school blocks CSS in `src/blocks/styles.css` (line 1163)
- Legacy switch button CSS in `src/styles/base.css` (line 103)

### User's open questions (ask before implementing):
1. **Cover in project detail:** Image only, or PDF preview too?
2. **Timeline items:** Tasks or separate milestones?
3. **Mindmap:** Minimal drag or outline-based only?
