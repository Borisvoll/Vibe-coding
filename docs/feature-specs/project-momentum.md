# Feature Spec: Project Momentum Visualization

**Milestone:** 3
**Date:** 2026-02-21
**Status:** Implemented

## Overview

Activity-based momentum visualization for projects. Shows a tiny 4-week sparkline bar chart so the user can see at a glance which projects have momentum and which are stalling (>7 days inactive).

## Metric Definition (v1)

For each **active** project:

1. Get all linked tasks via `getTasksByProject(projectId)`
2. Bucket task completions (`task.doneAt`) into 4 calendar weeks: `[w-3, w-2, w-1, w0]`
3. Count project-level update (`project.updatedAt`) as +1 activity in the corresponding week
4. **weeklyActivity**: array of 4 numbers representing activity per week
5. **isStalled**: active project with no activity in last 7 days
6. **lastActiveDate**: most recent of any `task.doneAt` or `project.updatedAt`
7. **score**: weighted sum `w[0]*1 + w[1]*2 + w[2]*3 + w[3]*4` (recent weeks weigh more)

## Architecture

### Computation — `src/stores/momentum.js`

Pure async store adapter (read-only, no mutations, no schema changes).

| Export | Returns | Purpose |
|--------|---------|---------|
| `getProjectMomentum(id, project?)` | `{ weeklyActivity, isStalled, lastActiveDate, score }` | Per-project calculation |
| `getAllProjectsMomentum(mode)` | `Map<id, MomentumData>` | Batch for all active projects |
| `getMomentumPulse(mode)` | `{ topActive[], stalled[] }` | Dashboard summary |

Helpers exported for testing: `getWeekStart()`, `weekBucket()`, `STALLED_DAYS`.

### Sparkline — `src/ui/sparkline.js`

`renderSparkline(weeklyActivity, { isStalled })` → inline SVG string.

- 48x20px, 4 bars (10px wide, 2px gap)
- Proportional height (max 18px), 1px minimum
- `var(--color-accent)` for active bars, `var(--color-warning)` when stalled
- `var(--color-border)` for zero-activity bars

## UI Placements

### 1. Dashboard (Layer 3 details)

Enhanced "Projecten" section in `src/blocks/dashboard/view.js`:
- Top 3 most active projects with sparkline + title
- "Stilgevallen" section listing stalled projects with warning badge + "Xd stil"

### 2. Project Hub cards

In `src/blocks/project-hub/list.js`:
- Sparkline SVG added to card body below goal text
- "Laatst actief: Xd geleden" text (warning color if stalled)

### 3. Project Detail header

In `src/blocks/project-detail/view.js`:
- Sparkline + "Laatst actief" text in header below title/goal

## Styles

| File | Classes |
|------|---------|
| `src/blocks/dashboard/styles.css` | `.life-dash__momentum-*`, `.life-dash__stalled-label` |
| `src/blocks/project-hub/styles.css` | `.hub-card__momentum`, `.hub-card__last-active` |
| `src/blocks/project-detail/styles.css` | `.project-detail__momentum`, `.project-detail__last-active` |

All colors use CSS custom properties (design tokens). No hardcoded values.

## Tests

`tests/stores/momentum.test.js` — 25 tests:
- `getWeekStart`: Monday calculation for various days
- `weekBucket`: correct bucketing for 4-week window, boundaries, edge cases
- `getProjectMomentum`: empty project, task completions, stalled detection, score weighting
- `getAllProjectsMomentum`: batch mode filtering, empty state
- `getMomentumPulse`: top 3 sorting, stalled identification, empty state
- `renderSparkline`: SVG output, bar count, color selection, edge cases
- `STALLED_DAYS`: constant value verification

## Data Safety

- All momentum computation is **read-only** — no writes to any store
- No new IndexedDB stores or schema changes
- No mutations to existing project or task records
- Safe to deploy without migration
