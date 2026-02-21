# BORIS OS — Focused Roadmap

**Created:** 2026-02-21
**Audit basis:** `docs/audit/current-state.md`, `risk-register.md`, `design-scorecard.md`
**Branch:** `claude/refactor-getweekdates-h5JTc`

---

## Guiding Principle

> "A designer knows he has achieved perfection not when there is nothing left to add, but when there is nothing left to take away." — Antoine de Saint-Exupéry

The app has a solid data layer (13 stores, 508 tests, EventBus communication) and 4,543 lines of working vanilla UI blocks. The React migration removed the delivery mechanism. **Priority #1 is restoring a functional app** — not adding features.

---

## Milestone 1: App Works Again (VanillaBridge Sprint)

**Goal:** Every route shows real UI. A user can open the app, see tasks, capture inbox items, manage projects, and review their week.

**Duration:** Single session
**Risk addressed:** R1 (CRITICAL), R5 (High)

### Tasks

#### 1.1 Wire VanillaBridge into Today.jsx
Mount vanilla blocks into the Today route using VanillaBridge. The Today page needs these host slots:

| Host Slot | Blocks | Priority |
|-----------|--------|----------|
| `vandaag-hero` | daily-outcomes, brain-state, two-min-launcher | Must |
| `vandaag-cockpit` | daily-cockpit, done-list | Must |
| `vandaag-tasks` | daily-todos, context-checklist | Must |
| `vandaag-projects` | projects, lijsten | Must |
| `vandaag-capture` | inbox, worry-dump | Must |
| `vandaag-reflection` | daily-reflection, conversation-debrief | Should |
| `vandaag-mode` | mode-specific blocks (11 blocks) | Should |
| `vandaag-weekly` | weekly-review | Could |

**Approach:** Create a `useBlockMount` hook that:
1. Takes a host slot name and the current mode
2. Queries blockRegistry for matching blocks
3. Returns a mount function for VanillaBridge
4. Handles mode-based filtering (some blocks only show in BPV/School/Personal)

#### 1.2 Wire VanillaBridge into Inbox.jsx
Mount `inbox-screen` block (host: `inbox-screen`). Single block, straightforward.

#### 1.3 Wire VanillaBridge into Projects.jsx
Mount `project-hub` block (host: `projects-hub`). Single block.

#### 1.4 Wire VanillaBridge into ProjectDetail.jsx
Mount `project-detail` block (host: `planning-main`). Pass project ID from `useParams()` as context.

#### 1.5 Wire VanillaBridge into Lijsten.jsx
Mount `lijsten-screen` block (host: `lijsten-screen`). Single block.

#### 1.6 Wire VanillaBridge into Planning.jsx
Mount `project-detail` block (host: `planning-main`). Same block as ProjectDetail but without URL-param project selection.

#### 1.7 Wire VanillaBridge into Settings.jsx
Settings needs special handling — the settings page was a legacy page (`src/pages/settings.js`), not a block. Options:
- A) Create a minimal React Settings page (export/import, mode selection, theme toggle)
- B) Port the settings page as a new block

**Decision:** Option A — Settings is simple enough to implement in React directly.

### Exit Criteria
- [ ] All 8 routes render real UI (no "wordt gemigreerd" placeholders)
- [ ] Mode switching works on all routes (blocks re-render for BPV/School/Personal)
- [ ] Navigation between routes preserves data (no state loss)
- [ ] All 495+ existing tests still pass
- [ ] App is usable as a daily tool

---

## Milestone 2: Clean House (Dead Code Removal)

**Goal:** Remove ~2,000 lines of dead code identified in the orphan audit. Reduce bundle confusion.

**Duration:** Single session
**Risk addressed:** R2 (High), R3 (Medium), R8 (Low)

### Tasks

#### 2.1 Delete dead legacy pages
```
rm -rf src/pages/
```
20 files, ~1,200 LOC. All import deleted `router.js` and `state.js`. Never referenced by React.

#### 2.2 Delete dead infrastructure
```
rm src/os/shell.js          # 716 LOC, replaced by React Shell.jsx
rm src/os/deepLinks.js      # 119 LOC, replaced by React Router
rm src/core/featureFlags.js  # ~15 LOC, enableNewOS always true
```
First verify no blocks import these files.

#### 2.3 Delete unregistered blocks
12 block directories that were built but never registered:
- `bpv-mini-card/`, `personal-mini-card/`, `school-mini-card/`
- `schedule-placeholder/`, `personal-energy/`, `personal-week-planning/`
- `personal-weekly-reflection/`, `school-concept-vault/`, `school-current-project/`
- `school-milestones/`, `school-skill-tracker/`, `tasks/` (superseded by daily-todos)

~36 files safe to delete.

#### 2.4 Clean imports
- Remove `pages.css` import from `main.js`
- Remove dead block CSS imports from `registerBlocks.js`
- Remove `featureFlags.js` references
- Verify no import chain references deleted files

#### 2.5 Verify
- Run full test suite
- Run `npm run build` — confirm clean build
- Manual smoke test of all routes

### Exit Criteria
- [ ] ~2,000 LOC removed
- [ ] Build is clean (no warnings about missing modules)
- [ ] All tests pass
- [ ] No dead imports remain

---

## Milestone 3: Design Polish (Token Alignment + React Quality Bar)

**Goal:** Bring the design scorecard from 54/90 (60%) to 65/90 (72%) by fixing the gaps identified in the audit.

**Duration:** 1-2 sessions
**Risk addressed:** R6 (Low), design scorecard gaps

### Tasks

#### 3.1 Refactor Dashboard.jsx to use mapped Tailwind tokens
Replace verbose `text-[var(--color-text)]` with `text-text`, `bg-[var(--color-surface)]` with `bg-surface`, etc. This establishes the quality bar for all future React components.

#### 3.2 Extract shared React components
From Dashboard.jsx patterns, extract:
- `<ModeBadge mode={mode} />` — reusable mode indicator
- `<StatCard label value sub accent />` — already exists, move to `components/`
- `<Card>` — rounded-xl border surface pattern

#### 3.3 Settings page (React native)
Build a clean Settings page with:
- Export/import data (JSON)
- Mode selection
- Theme toggle (light/dark)
- About/version info

Keep it minimal — 3 sections max.

#### 3.4 Fix stale block navigation (R7)
Update vanilla blocks that use `window.location.hash = '#hours-entry'` to either:
- Emit events that React routes handle
- Use React-compatible hash paths (`#/projects/xyz`)

Key file: `src/blocks/daily-cockpit/view.js:26-27`

#### 3.5 Add smoke tests for React components (R4)
Add `@testing-library/react` and `jsdom` to devDeps. Write smoke tests for:
- Shell renders sidebar and content
- Dashboard loads data
- Mode switching updates UI
- Navigation works between routes

### Exit Criteria
- [ ] Dashboard.jsx uses mapped Tailwind tokens exclusively
- [ ] Settings page works in React
- [ ] Block navigation doesn't break in React context
- [ ] React smoke tests pass
- [ ] Design scorecard improved to 65+/90

---

## What's NOT on this roadmap (intentionally)

These are tempting but must wait until Milestones 1-3 are complete:

| Feature | Why Not Now |
|---------|-------------|
| Mindmap per project | Nice-to-have, core app is broken |
| File attachments | Nice-to-have, core app is broken |
| Timeline/Gantt view | Complexity, no user demand proven |
| Cloud sync | Big infrastructure, local-first is fine |
| Theme studio | Cosmetic, tokens are already solid |
| Full React rewrite of blocks | Premature — VanillaBridge works, blocks are tested |
| Pin to Today feature | Good feature, but app needs to work first |
| Banner tab for projects | Good feature, but app needs to work first |

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| VanillaBridge over React rewrite | 4,543 LOC of working vanilla blocks. Rewriting is weeks of work. VanillaBridge restores functionality in hours. |
| Delete before add | Dead code causes confusion. Clean the house before furnishing it. |
| Settings in React, not VanillaBridge | Settings is simple (export, mode, theme). A clean React implementation is faster than wiring a legacy page. |
| No new features until M3 | The app is non-functional. Every feature added to a broken app is wasted effort. |
