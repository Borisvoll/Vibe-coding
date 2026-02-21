# Recall Prompt — Next Session

Paste this at the start of a new Claude Code session to continue BORIS OS development.

---

## Context

You are continuing the React + VanillaBridge migration of BORIS OS.

**A comprehensive 5-phase audit was completed (2026-02-21).** All audit docs live in `docs/audit/`. The roadmap (`docs/audit/roadmap.md`) defines 3 milestones.

Read these files first to get full context:
- `docs/audit/roadmap.md` — the 3-milestone roadmap (START HERE)
- `docs/audit/current-state.md` — architecture map
- `docs/audit/risk-register.md` — 9 risks, prioritized
- `tasks/todo.md` — checklist for each milestone
- `tasks/lessons.md` — 17 lessons learned (read before coding)

## Current State

**React Router v7 (HashRouter) is the sole routing authority.** 8 routes + catch-all in `src/react/App.jsx`.

| Route | Status |
|-------|--------|
| `/dashboard` | Fully implemented in React (149 LOC) |
| `/today` | Placeholder — needs VanillaBridge |
| `/inbox` | Placeholder — needs VanillaBridge |
| `/lijsten` | Placeholder — needs VanillaBridge |
| `/planning` | Placeholder — needs VanillaBridge |
| `/projects` | Placeholder — needs VanillaBridge |
| `/projects/:id` | Placeholder — needs VanillaBridge |
| `/settings` | Placeholder — needs React implementation |

**31 vanilla blocks are registered** in `blockRegistry` but have NO host slots to mount into. The `VanillaBridge.jsx` component exists but is unused.

**13 store adapters** are framework-agnostic (IndexedDB). 495+ tests pass. Data layer is solid.

## Milestone 1: App Works Again (NEXT)

Wire `VanillaBridge` into all 7 placeholder routes to mount existing vanilla blocks:

1. Create `useBlockMount` hook — queries blockRegistry, filters by mode, returns mount fn
2. Today.jsx — mount 8 host slots (vandaag-hero, cockpit, tasks, projects, capture, reflection, mode, weekly)
3. Inbox.jsx — mount `inbox-screen` block
4. Projects.jsx — mount `project-hub` block
5. ProjectDetail.jsx — mount `project-detail` block (pass ID from useParams)
6. Lijsten.jsx — mount `lijsten-screen` block
7. Planning.jsx — mount `project-detail` block
8. Settings.jsx — build minimal React settings page

Key files:
- `src/react/components/VanillaBridge.jsx` — bridge component (31 LOC)
- `src/blocks/registerBlocks.js` — all 31 block registrations
- `src/core/blockRegistry.js` — registry API
- `src/react/hooks/useMode.jsx` — mode context
- `src/react/hooks/useEventBus.jsx` — event bus context

### Block → Host Slot Map (critical reference)

| Route | Host Slot | Blocks |
|-------|-----------|--------|
| Today | `vandaag-hero` | daily-outcomes, brain-state, two-min-launcher |
| Today | `vandaag-cockpit` | daily-cockpit, done-list |
| Today | `vandaag-tasks` | daily-todos, context-checklist |
| Today | `vandaag-projects` | projects, lijsten |
| Today | `vandaag-capture` | inbox, worry-dump |
| Today | `vandaag-reflection` | daily-reflection, conversation-debrief |
| Today | `vandaag-mode` | 11 mode-specific blocks |
| Today | `vandaag-weekly` | weekly-review |
| Inbox | `inbox-screen` | inbox-screen |
| Projects | `projects-hub` | project-hub |
| ProjectDetail | `planning-main` | project-detail |
| Lijsten | `lijsten-screen` | lijsten-screen |
| Planning | `planning-main` | project-detail |

## Design rules (non-negotiable)

- Dutch-language UI throughout
- Max 2 font sizes per block
- No unnecessary toggles or configurability
- Strong defaults, minimal user decisions
- Use `escapeHTML()` from `src/utils.js` for all user content
- Run `npm test` before committing — all tests must pass
- Run `npm run build` to verify build succeeds

## Branch + workflow

- Branch: `claude/refactor-getweekdates-h5JTc`
- Commit per milestone with descriptive message
- Push with: `git push -u origin claude/refactor-getweekdates-h5JTc`
