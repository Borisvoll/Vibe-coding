# Design Notes — Project Module 1.0

**Feature:** School-Mode Project Module
**Date:** 2026-02-20
**Status:** Plan approved via Phase 0 Q&A

---

## Design Decisions (from Q&A)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Active projects | Multiple | Keep existing `os_projects` flow. All active shown. |
| Agenda format | Month grid | Visual calendar with task dots, tap to expand day. |
| Time granularity | Date only | No time blocks. `YYYY-MM-DD` on tasks. |
| Timeline | Both milestones + phases | Points + colored ranges on horizontal scroll. |
| Today integration | Automatic | Tasks with `date === today` auto-appear in Vandaag. |

---

## Architecture

### Data Model (zero schema changes)

IndexedDB is schemaless for record fields. No DB version bump needed.

**`os_tasks` — add optional `project_id`:**
```javascript
{
  id, text, mode, status, priority,
  date,          // YYYY-MM-DD (existing)
  project_id,    // NEW: UUID or null — links task to project
  doneAt, createdAt, updated_at
}
```

**`os_projects` — add `milestones` and `phases` arrays:**
```javascript
{
  id, title, goal, mode, status, nextActionId,
  milestones: [           // NEW
    { id, title, date }   // date = YYYY-MM-DD
  ],
  phases: [               // NEW
    { id, title, startDate, endDate, color }
  ],
  createdAt, updatedAt, updated_at
}
```

No new object stores. No migration needed. Fields are optional — existing records work unmodified.

### Store Changes

**`src/stores/tasks.js`** — new exports:
- `addTask(text, mode, date, projectId)` — extend existing, add optional 4th param
- `getTasksByProject(projectId)` — filter `getAll()` by `project_id`
- `updateTask(id, changes)` — new function for editing task fields

**`src/stores/projects.js`** — new exports:
- `addMilestone(projectId, title, date)` — push to project.milestones[]
- `removeMilestone(projectId, milestoneId)` — filter out
- `addPhase(projectId, title, startDate, endDate, color)` — push to project.phases[]
- `removePhase(projectId, phaseId)` — filter out

### Planning Tab Activation

Replace empty placeholder in `src/os/shell.js` with:
```html
<section class="os-section" data-os-section="planning" hidden>
  <button type="button" class="os-section__home-link" hidden>← Dashboard</button>
  <h2 class="os-section__title">Planning</h2>
  <div class="os-host-stack" data-os-host="planning-main"></div>
</section>
```

### New Block: `project-detail`

Registered for host `planning-main`, modes `['School']` (extensible later).

**File structure:**
```
src/blocks/project-detail/
  index.js       — block registration
  view.js        — main project detail view (project picker + detail)
  agenda.js      — month grid component
  timeline.js    — horizontal timeline (SVG, milestones + phases)
  task-list.js   — project-scoped task list with inline add
  styles.css     — all styles
```

### Project Navigation

The Planning tab shows:
1. **Project picker** (top) — horizontal pill tabs for each active project
2. **Project detail** (below) — sections stacked vertically:
   - Header: title + goal + status
   - Mini Agenda (month grid)
   - Task list (project-scoped)
   - Timeline (horizontal scroll)

Clicking a project name in Vandaag > Projecten navigates to Planning tab with that project selected (via `updateHash('planning', projectId)`).

---

## Implementation Phases

### Phase 1: Data Layer + Planning Tab
**Files modified:** `src/stores/tasks.js`, `src/stores/projects.js`, `src/os/shell.js`, `src/blocks/registerBlocks.js`

1. Extend `addTask()` with optional `project_id` param
2. Add `getTasksByProject()` and `updateTask()` to tasks store
3. Add milestone/phase CRUD to projects store
4. Replace planning placeholder with host slot
5. Create minimal `project-detail` block skeleton
6. Write tests for new store functions

### Phase 2: Mini Agenda (Month Grid)
**New file:** `src/blocks/project-detail/agenda.js`

1. Pure CSS calendar grid (7 columns, 5-6 rows)
2. Render current month with day numbers
3. Show dots on days that have project tasks
4. Click day → show task list for that day below grid
5. Month navigation arrows (prev/next)
6. Highlight today

### Phase 3: Project Task List
**New file:** `src/blocks/project-detail/task-list.js`

1. Inline task creation (input + submit) with project_id auto-set
2. List tasks filtered by project_id
3. Toggle done / delete
4. Automatic Today integration: `getTasksForToday()` already filters by date, so project tasks with today's date appear in Vandaag without changes
5. Date picker for scheduling tasks

### Phase 4: Visual Timeline
**New file:** `src/blocks/project-detail/timeline.js`

1. Pure CSS horizontal scroll container
2. Phases as colored background bars (position: absolute within scroll area)
3. Milestones as diamond markers on the timeline
4. Today marker (red vertical line)
5. CRUD: add/remove milestones and phases inline
6. Auto-scale: timeline spans from earliest to latest date + buffer

### Phase 5: Navigation + Polish
**Files modified:** `src/blocks/projects/view.js`, `src/os/shell.js`

1. Add "Open" button to project items in Vandaag list
2. Click navigates to Planning tab with project selected
3. Mode-aware accent colors on timeline phases
4. Smooth section transitions
5. Apple-minimal typography and spacing

---

## Test Strategy

- Unit tests for all new store functions (tasks, projects)
- Verify `getTasksForToday()` returns project tasks automatically
- Verify existing 298 tests still pass
- Manual: create project → add tasks → verify month grid → add milestones → verify timeline

---

## Design Principles

- **Zero new dependencies** — all visuals are pure CSS + inline SVG
- **Zero schema changes** — optional fields on existing records
- **Lesson #13 compliant** — all tasks flow through `os_tasks`
- **Block contract** — mount/unmount with proper event cleanup
- **Dutch UI** — all labels in Dutch
- **Rams minimal** — max 2 font sizes per section, no unnecessary toggles
