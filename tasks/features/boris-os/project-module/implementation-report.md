# Implementation Report — Project Module 1.0

**Date:** 2026-02-20
**Status:** Complete
**Tests:** 415 pass (400 existing + 15 new)

---

## What Was Built

A full project planning module for the Planning tab, giving School/BPV/Personal users a visual overview of their projects with agenda, task management, and timeline.

### Components Delivered

| Component | File | Description |
|-----------|------|-------------|
| Project Detail block | `src/blocks/project-detail/index.js` | Block registration for `planning-main` host |
| Main view | `src/blocks/project-detail/view.js` | Project picker tabs + section layout |
| Month grid agenda | `src/blocks/project-detail/agenda.js` | Calendar with task dots, day expansion, milestone badges |
| Project task list | `src/blocks/project-detail/task-list.js` | Inline add, toggle, delete, date picker, done section |
| Visual timeline | `src/blocks/project-detail/timeline.js` | Horizontal scroll with phases, milestones, today marker |
| Styles | `src/blocks/project-detail/styles.css` | Full CSS for all components |
| Tests | `tests/stores/project-tasks.test.js` | 15 tests: project_id linking, updateTask, milestones, phases |

### Store Changes

| Store | Change | Backward Compatible |
|-------|--------|---------------------|
| `src/stores/tasks.js` | Added `getTasksByProject()`, `updateTask()`, optional `project_id` param to `addTask()` | Yes — 4th param defaults to null |
| `src/stores/projects.js` | Added `addMilestone()`, `removeMilestone()`, `addPhase()`, `removePhase()` | Yes — optional arrays on project records |

### Shell Changes

| File | Change |
|------|--------|
| `src/os/shell.js` | Replaced Planning tab placeholder with `data-os-host="planning-main"` |
| `src/blocks/registerBlocks.js` | Added `registerProjectDetailBlock`, imported styles |
| `src/blocks/projects/view.js` | Added "↗" open-in-planning button with deep link navigation |
| `src/blocks/projects/styles.css` | Added `.projects-block__open-btn` style |

---

## Data Model

**Zero schema changes.** All new fields are optional on existing records:

```
os_tasks: + project_id (UUID|null)
os_projects: + milestones [{id, title, date}]
             + phases [{id, title, startDate, endDate, color}]
```

No DB version bump. No migration needed. Existing records work unmodified.

---

## Design Decisions Applied

| Decision | Implementation |
|----------|---------------|
| Multiple active projects | Project picker shows all active projects as pill tabs |
| Month grid agenda | 7-column CSS grid with Monday start, task dots, clickable days |
| Date only | Tasks use `date` (YYYY-MM-DD), no time fields |
| Milestones + phases | Timeline shows diamond markers + colored bars, both CRUD-able inline |
| Auto-push to Today | `getTasksForToday()` already filters by date — project tasks with today's date appear automatically |

---

## Architecture Compliance

- **Block contract**: mount/unmount with event cleanup (unsubMode, unsubProjects, unsubTasks)
- **Lesson #13**: All tasks flow through `os_tasks` — no private task stores
- **Zero dependencies**: Pure CSS + vanilla JS, no SVG library
- **XSS safe**: All user content via `escapeHTML()`
- **Dutch UI**: All labels in Dutch
- **Mode-aware**: Works in all 3 modes (School, BPV, Personal)
- **Deep links**: `#planning/{projectId}` navigates to project
- **Event-driven**: Emits `tasks:changed` and `projects:changed` for cross-block sync

---

## Test Coverage

```
tests/stores/project-tasks.test.js (15 tests)
  Tasks — project_id linking
    ✓ addTask with project_id stores the link
    ✓ addTask without project_id defaults to null
    ✓ getTasksByProject returns only tasks for that project
    ✓ getTasksByProject returns empty array for project with no tasks
  Tasks — updateTask
    ✓ updateTask changes fields and preserves id
    ✓ updateTask returns null for non-existent id
    ✓ updateTask sets updated_at
  Projects — milestones
    ✓ addMilestone adds to project.milestones array
    ✓ addMilestone appends to existing milestones
    ✓ removeMilestone filters out by id
    ✓ addMilestone returns null for non-existent project
  Projects — phases
    ✓ addPhase adds to project.phases array
    ✓ addPhase accepts custom color
    ✓ removePhase filters out by id
    ✓ project without phases has no phases field initially
```

---

## File Manifest

New files:
- `src/blocks/project-detail/index.js`
- `src/blocks/project-detail/view.js`
- `src/blocks/project-detail/agenda.js`
- `src/blocks/project-detail/task-list.js`
- `src/blocks/project-detail/timeline.js`
- `src/blocks/project-detail/styles.css`
- `tests/stores/project-tasks.test.js`
- `tasks/features/boris-os/project-module/q&a.md`
- `tasks/features/boris-os/project-module/design-notes.md`
- `tasks/features/boris-os/project-module/implementation-report.md`

Modified files:
- `src/stores/tasks.js` — +19 lines (getTasksByProject, updateTask, project_id param)
- `src/stores/projects.js` — +32 lines (milestone/phase CRUD)
- `src/os/shell.js` — 1 line changed (planning host slot)
- `src/blocks/registerBlocks.js` — +4 lines (registration + style import)
- `src/blocks/projects/view.js` — +11 lines (open button + handler)
- `src/blocks/projects/styles.css` — +17 lines (open button style)
