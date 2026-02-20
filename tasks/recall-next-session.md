# Recall Prompt — Next Session

Paste this at the start of a new Claude Code session to continue the HTML5-first refactor of BORIS OS.

---

## Context

You are continuing an HTML5-first refactor of BORIS OS on branch `claude/html5-structure-implementation-pANgV`.

**Phases 0–2 are complete and committed.** Phase 3 is next.

Read these files first to get full context:
- `tasks/session-progress.md` — everything done so far
- `tasks/next-steps.md` — everything still to do
- `tasks/refactor-html5-first.md` — phase checklist
- `tasks/review.md` — decisions and architectural notes

## What was done

**Phase 0:** Audit — 495 tests across 29 files, baseline established.

**Phase 1 (commit `886c436`):** index.html now contains shell chrome (sidebar, topbar, mobile nav, mode picker) as permanent DOM + 8 `<template data-route="...">` elements. shell.js hydrates existing DOM instead of creating it. `mountRoute()`/`unmountRoute()` clone templates into `<main data-route-container>`.

**Phase 2 (commits `b56d035`, `fbb1539`):**
- Clean URL routing: `#today`, `#projects/abc123` (backward compat for `#tab=today&focus=tasks`)
- Killed legacy dual-path: removed `enableNewOS` flag, `initLegacy()`, `modules` export from main.js
- Removed OS/Legacy interface toggle from settings-panel.js
- Removed legacy switch button from sidebar
- Deleted: `src/components/shell.js`, `src/router.js`, `src/shortcuts.js`

## Current architecture

- `index.html` — shell chrome + `<template data-route="...">` elements (8 routes: dashboard, today, inbox, lijsten, planning, projects, settings, project-detail)
- `src/os/shell.js` — hydrates shell, `mountRoute(tab, params)` clones template into `<main data-route-container>`, `unmountRoute()` destroys + clears
- `src/os/deepLinks.js` — `parseHash()` / `updateHash()` for clean URLs
- `src/main.js` — always calls `initNewOSShell()`, no legacy path
- `src/blocks/settings-panel.js` — no more OS/Legacy toggle

## Phase 3 — Project module MVP (START HERE)

### What to build:
1. **Projects list (`#projects`)** — template + host slot `projects-hub` already exist in index.html
   - Use/extend `src/blocks/projects/view.js` or `src/blocks/project-hub/list.js`
   - Max 3 active projects visible (pinned first, then most recent)
   - Each project card shows: title, accent color, last activity
   - "Nieuw project" button

2. **Accent color per project**
   - Add `accentColor` field to `src/stores/projects.js` project model
   - 8 colors: blue (#4f6ef7), purple (#8b5cf6), green (#10b981), rose (#f43f5e), orange (#f97316), cyan (#06b6d4), indigo (#6366f1), teal (#14b8a6)

3. **Project Detail (`#projects/:id`)**
   - Template `<template data-route="project-detail">` already in index.html
   - Host slot: `project-detail-view`
   - shell.js already selects this template when `params.id` is set
   - Back button already wired: `← Projecten` → `setActiveTab('projects')`
   - Build: Notion-like header (title, accent color strip, cover area), tasks tab reusing existing primitives

4. **Tests** for the new rendering logic

### Existing infrastructure to reuse:
- `src/stores/projects.js` — CRUD (18 tests pass)
- `src/stores/tasks.js` — tasks with `projectId` filter
- `src/blocks/projects/view.js` — existing projects block
- `src/blocks/project-hub/` — list.js, detail.js, tabs/
- `src/blocks/project-detail/` — view.js, timeline.js
- `tests/stores/project-hub.test.js` — 22 tests
- `tests/stores/project-tasks.test.js` — 15 tests

### Design rules (non-negotiable):
- Template-based routing: clone on navigate, NOT permanent DOM sections
- Blocks hydrate only within their `rootEl` — NO `document.querySelector` outside `rootEl`
- Hybrid events: delegation for dynamic lists, direct listeners for static UI
- Max 3 projects visible at a time
- Dutch-language UI throughout
- Product vision: rust + focus + controle bij openen (calm/focused/in-control)
- iPhone 11 Pro Max primary mobile target

### Open questions to ask user before implementing cover + timeline:
1. Cover: image only, or PDF preview too?
2. Timeline items: tasks or separate milestones?
3. Mindmap: minimal drag or outline-based only?

## Branch + workflow
- Branch: `claude/html5-structure-implementation-pANgV`
- Run `npm test` before committing — all 495 tests must pass
- Run `npm run build` to verify build succeeds
- Commit per phase with descriptive message
- Push with: `git push -u origin claude/html5-structure-implementation-pANgV`
