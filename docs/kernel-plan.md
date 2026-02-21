# Kernel Extraction Plan

**Date:** 2026-02-21
**Goal:** Create a framework-agnostic `src/kernel/` layer that owns all domain logic, persistence, and event emission. React becomes a pure UI consumer.

---

## Current State Analysis

### What exists today

```
src/
├── db.js                    ← IndexedDB CRUD (31 stores, 300+ LOC)
├── core/
│   ├── eventBus.js          ← Pub/sub (on/off/emit/clear)
│   ├── modeManager.js       ← Mode state (get/set/persist)
│   ├── blockRegistry.js     ← UI block discovery (NOT kernel)
│   ├── featureFlags.js      ← localStorage toggles
│   ├── modulePresets.js     ← Block preset configs
│   ├── modeCaps.js          ← Task capacity per mode
│   ├── migrationManager.js  ← Schema versioning
│   ├── themeEngine.js       ← Color math + theme persist
│   ├── designSystem.js      ← Font token application
│   └── tutorial.js          ← Onboarding tooltip state
├── stores/
│   ├── tasks.js             ← 7 exports, touches os_tasks
│   ├── inbox.js             ← 8 exports, touches os_inbox + reference
│   ├── projects.js          ← 20 exports, touches os_projects
│   ├── lists.js             ← 14 exports, touches os_lists + os_list_items
│   ├── daily.js             ← 8 exports, touches dailyPlans
│   ├── bpv.js               ← 6 exports, touches hours + logbook
│   ├── personal.js          ← 6 exports, touches os_personal_wellbeing
│   ├── tracker.js           ← 8 exports, touches hours + logbook
│   ├── search.js            ← 2 exports, reads 7 stores
│   ├── tags.js              ← 4 exports, dynamic store access
│   ├── validate.js          ← 5 validators + ValidationError class
│   ├── backup.js            ← 6 exports, all stores (has DOM: download)
│   └── weekly-review.js     ← 6 exports, reads 4 stores (has DOM: mailto)
├── os/
│   ├── dashboardData.js     ← 4 aggregation functions (read-only)
│   └── cockpitData.js       ← 1 aggregation function (read-only)
├── constants.js             ← BPV config, tags, accent colors
└── version.js               ← APP_VERSION string
```

### Key findings

**1. Stores are already framework-agnostic.** Zero React imports. Only 2 have minimal DOM usage (backup.js download trigger, weekly-review.js mailto).

**2. Events are emitted by BLOCKS, not stores.** All 60+ `eventBus.emit()` calls are in `src/blocks/*/view.js` files. Stores do CRUD silently — the caller decides when to emit.

**3. React directly imports domain logic in 2 places:**
- `Dashboard.jsx` → `src/os/dashboardData.js` (4 aggregation functions)
- `Settings.jsx` → `src/stores/backup.js` (export/import)

**4. 18 blocks bypass stores and import db.js directly.** These are mostly unregistered/dormant blocks, but some active ones do too (worry-dump, brain-state, done-list, conversation-debrief, settings-panel).

**5. No command pattern exists.** Blocks call store functions and emit events manually (60+ scattered emit calls). There's no single place that ensures "after createTask → emit tasks:changed."

---

## Design: `/src/kernel/`

### Principle: Extract, don't rewrite

Every file below either:
- **Re-exports** an existing module unchanged, or
- **Wraps** an existing module with a thin command layer that auto-emits events

No store logic is rewritten. No tests break.

### Directory structure

```
src/kernel/
├── index.js              ← Public API: kernel.init(), kernel.commands.*, kernel.subscribe()
├── db.js                 ← Re-export of src/db.js (no changes)
├── eventBus.js           ← Re-export of src/core/eventBus.js (no changes)
├── mode.js               ← Re-export of src/core/modeManager.js (no changes)
├── commands/
│   ├── tasks.js          ← Wraps stores/tasks.js + auto-emits tasks:changed
│   ├── inbox.js          ← Wraps stores/inbox.js + auto-emits inbox:changed
│   ├── projects.js       ← Wraps stores/projects.js + auto-emits projects:changed
│   ├── lists.js          ← Wraps stores/lists.js + auto-emits lists:changed
│   ├── daily.js          ← Wraps stores/daily.js + auto-emits daily:changed
│   ├── bpv.js            ← Wraps stores/bpv.js + auto-emits bpv:changed
│   ├── personal.js       ← Wraps stores/personal.js (no event yet)
│   └── backup.js         ← Wraps stores/backup.js (strips DOM: moves download to caller)
├── queries/
│   ├── dashboard.js      ← Re-export of src/os/dashboardData.js (read-only)
│   ├── cockpit.js        ← Re-export of src/os/cockpitData.js (read-only)
│   ├── search.js         ← Re-export of src/stores/search.js (read-only)
│   └── weekly-review.js  ← Re-export of src/stores/weekly-review.js (read-only)
└── constants.js          ← Re-export of src/constants.js
```

### Public API (`src/kernel/index.js`)

```javascript
import { initDB } from './db.js';
import { createEventBus } from './eventBus.js';
import { createModeManager } from './mode.js';
import * as taskCommands from './commands/tasks.js';
import * as inboxCommands from './commands/inbox.js';
import * as projectCommands from './commands/projects.js';
import * as listCommands from './commands/lists.js';
import * as dailyCommands from './commands/daily.js';
import * as bpvCommands from './commands/bpv.js';
import * as personalCommands from './commands/personal.js';
import * as backupCommands from './commands/backup.js';
import * as dashboardQueries from './queries/dashboard.js';
import * as cockpitQueries from './queries/cockpit.js';
import * as searchQueries from './queries/search.js';
import * as weeklyReviewQueries from './queries/weekly-review.js';

export function createKernel() {
  const eventBus = createEventBus();

  return {
    // Lifecycle
    async init(savedMode) {
      await initDB();
      const mode = createModeManager(eventBus, savedMode || 'School');
      return { eventBus, mode };
    },

    // Event subscription (framework-agnostic)
    subscribe: eventBus.on,
    emit: eventBus.emit,

    // Commands (write operations — auto-emit events)
    commands: {
      tasks:    bindCommands(taskCommands, eventBus),
      inbox:    bindCommands(inboxCommands, eventBus),
      projects: bindCommands(projectCommands, eventBus),
      lists:    bindCommands(listCommands, eventBus),
      daily:    bindCommands(dailyCommands, eventBus),
      bpv:      bindCommands(bpvCommands, eventBus),
      personal: bindCommands(personalCommands, eventBus),
      backup:   bindCommands(backupCommands, eventBus),
    },

    // Queries (read-only — no events emitted)
    queries: {
      dashboard:    dashboardQueries,
      cockpit:      cockpitQueries,
      search:       searchQueries,
      weeklyReview: weeklyReviewQueries,
    },
  };
}
```

### Command wrapper pattern

Each command file wraps the existing store adapter with auto-emit:

```javascript
// src/kernel/commands/tasks.js
import { addTask, updateTask, toggleTask, deleteTask } from '../../stores/tasks.js';

// Re-export read functions unchanged (they're queries)
export { getTasksByMode, getTasksForToday, getTasksByProject } from '../../stores/tasks.js';

// Wrap write functions with event emission
export function createTask(eventBus) {
  return async (data) => {
    const result = await addTask(data);
    eventBus.emit('tasks:changed', { action: 'create' });
    return result;
  };
}

export function modifyTask(eventBus) {
  return async (id, updates) => {
    const result = await updateTask(id, updates);
    eventBus.emit('tasks:changed', { action: 'update', id });
    return result;
  };
}

// ... same pattern for toggleTask, deleteTask
```

This means:
- **Stores remain unchanged** (no edits to src/stores/*.js)
- **Blocks can still call stores directly** (backward compatible)
- **New code should call kernel.commands** (auto-emits, single source of truth)
- **Migration is gradual** — blocks move to kernel commands one at a time

---

## Implementation Steps

### Step 1: Create kernel directory and re-exports

Create `src/kernel/` with re-export files for db, eventBus, mode, constants. Pure wiring — zero logic changes.

**Files created:** 5
**Files modified:** 0
**Tests broken:** 0

### Step 2: Create command wrappers

For each of the 8 store domains, create a command file that:
1. Re-exports read functions unchanged
2. Wraps write functions with auto-emit

**Files created:** 8
**Files modified:** 0
**Tests broken:** 0

### Step 3: Create query re-exports

Create `src/kernel/queries/` with re-exports of dashboardData, cockpitData, search, weekly-review.

**Files created:** 4
**Files modified:** 0
**Tests broken:** 0

### Step 4: Create kernel/index.js public API

Wire everything together into `createKernel()`.

**Files created:** 1
**Files modified:** 0
**Tests broken:** 0

### Step 5: Update main.js to use kernel

Replace direct `createEventBus()` + `createModeManager()` calls with `kernel.init()`. Pass kernel to React.

**Files created:** 0
**Files modified:** 1 (main.js)
**Tests broken:** 0

### Step 6: Create React useKernel hook

Create `src/react/hooks/useKernel.jsx` — context provider + hooks for commands and queries. React components import from this hook instead of stores directly.

**Files created:** 1
**Files modified:** 1 (App.jsx — add KernelProvider)
**Tests broken:** 0

### Step 7: Migrate React consumers

Update Dashboard.jsx and Settings.jsx to use kernel queries/commands instead of direct store imports.

**Files created:** 0
**Files modified:** 2
**Tests broken:** 0

### Step 8: Write kernel.md documentation

Document boundaries, guarantees, and migration path.

**Files created:** 1
**Files modified:** 0
**Tests broken:** 0

### Step 9: Add kernel integration tests

Test that commands auto-emit the correct events.

**Files created:** 1
**Files modified:** 0
**Tests broken:** 0

---

## What does NOT move to kernel

| Module | Reason |
|--------|--------|
| `blockRegistry.js` | UI-layer concern (mounts vanilla blocks into DOM) |
| `featureFlags.js` | UI-layer concern (controls which blocks render) |
| `modulePresets.js` | UI-layer concern (block bundle configs) |
| `themeEngine.js` | UI-layer concern (CSS custom properties) |
| `designSystem.js` | UI-layer concern (font token injection) |
| `tutorial.js` | UI-layer concern (tooltip state) |
| `src/blocks/` | UI layer |
| `src/react/` | UI layer |
| `src/styles/` | UI layer |
| `src/ui/` | UI layer |

---

## What moves to kernel

| Current location | Kernel location | Method |
|-----------------|-----------------|--------|
| `src/db.js` | `src/kernel/db.js` | Re-export |
| `src/core/eventBus.js` | `src/kernel/eventBus.js` | Re-export |
| `src/core/modeManager.js` | `src/kernel/mode.js` | Re-export |
| `src/core/modeCaps.js` | `src/kernel/constants.js` | Re-export |
| `src/core/migrationManager.js` | `src/kernel/migrations.js` | Re-export |
| `src/stores/tasks.js` | `src/kernel/commands/tasks.js` | Wrap with auto-emit |
| `src/stores/inbox.js` | `src/kernel/commands/inbox.js` | Wrap with auto-emit |
| `src/stores/projects.js` | `src/kernel/commands/projects.js` | Wrap with auto-emit |
| `src/stores/lists.js` | `src/kernel/commands/lists.js` | Wrap with auto-emit |
| `src/stores/daily.js` | `src/kernel/commands/daily.js` | Wrap with auto-emit |
| `src/stores/bpv.js` | `src/kernel/commands/bpv.js` | Wrap with auto-emit |
| `src/stores/personal.js` | `src/kernel/commands/personal.js` | Wrap with auto-emit |
| `src/stores/backup.js` | `src/kernel/commands/backup.js` | Wrap (strip DOM) |
| `src/stores/validate.js` | (stays) | Already imported by stores |
| `src/os/dashboardData.js` | `src/kernel/queries/dashboard.js` | Re-export |
| `src/os/cockpitData.js` | `src/kernel/queries/cockpit.js` | Re-export |
| `src/stores/search.js` | `src/kernel/queries/search.js` | Re-export |
| `src/stores/weekly-review.js` | `src/kernel/queries/weekly-review.js` | Re-export |
| `src/constants.js` | `src/kernel/constants.js` | Re-export |
| `src/version.js` | `src/kernel/constants.js` | Re-export |

---

## Boundary guarantees

After extraction:

1. **Kernel imports NOTHING from React.** Zero JSX, zero hooks, zero components.
2. **Kernel imports NOTHING from blocks.** Zero block views, zero block styles.
3. **Kernel owns all IndexedDB access** via db.js re-export.
4. **Kernel owns all domain events** via command auto-emit.
5. **React imports only from `src/kernel/` or `src/react/`** — never from `src/stores/`, `src/db.js`, or `src/os/` directly.
6. **Existing stores and blocks continue to work unchanged.** The kernel wraps them; it doesn't replace them.
7. **All 495+ tests pass without modification.** Kernel adds new code paths; doesn't modify existing ones.

---

## Migration path for blocks

Blocks currently do: `store.addTask(data)` then `eventBus.emit('tasks:changed')`.

After kernel exists, blocks can optionally migrate to: `kernel.commands.tasks.create(data)` (auto-emits).

This is a **gradual migration** — blocks are NOT changed in this PR. They continue to work via direct store + manual emit. Over time, blocks can adopt kernel commands to eliminate the 60+ scattered emit calls.

---

## Risk assessment

| Risk | Mitigation |
|------|-----------|
| Circular imports | Kernel re-exports only; stores don't import from kernel |
| Bundle size increase | Re-exports are tree-shaken; ~0 bytes added |
| Test breakage | No existing code is modified; only new files added |
| Over-abstraction | Thin wrappers only; no new abstractions beyond command+emit |
| Blocks stop working | Blocks unchanged; still import stores directly |

---

## Total scope

- **New files:** ~20
- **Modified files:** 3 (main.js, App.jsx, + 1 kernel test)
- **Deleted files:** 0
- **Existing tests modified:** 0
- **New tests:** 1 file (kernel integration tests)
