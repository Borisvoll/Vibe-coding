# BORIS Kernel

Framework-agnostic domain layer for BORIS OS.

## Boundaries

```
┌──────────────────────────────────────────────────┐
│  UI Layer (React, Blocks, DOM)                   │
│  - Calls kernel.commands.*                       │
│  - Calls kernel.queries.*                        │
│  - Subscribes via kernel.subscribe()             │
│  - Handles all DOM side effects                  │
├──────────────────────────────────────────────────┤
│  Kernel (/src/kernel/)                           │
│  - Owns domain logic (via store wrappers)        │
│  - Owns IndexedDB persistence (via db.js)        │
│  - Owns event emission (auto-emit on commands)   │
│  - Owns mode management                          │
│  - NO React, NO DOM, NO JSX                      │
├──────────────────────────────────────────────────┤
│  Stores (/src/stores/)                           │
│  - Raw CRUD + domain validation                  │
│  - Called by kernel commands                      │
│  - Legacy blocks may still import directly       │
├──────────────────────────────────────────────────┤
│  Database (/src/db.js)                           │
│  - IndexedDB CRUD primitives                     │
│  - Called by stores only                          │
└──────────────────────────────────────────────────┘
```

## Single EventBus Rule

There is exactly **ONE** `eventBus` instance in the entire app.

- Created in `main.js` via `createEventBus()`
- Passed into `createKernel(eventBus)` — kernel does NOT create its own
- Passed to React via `<EventBusProvider>` and `<KernelProvider>`
- Passed to vanilla blocks via `context.eventBus`
- All subscribers (React, blocks, kernel) observe the same event stream

## Commands vs Queries

### Commands (write operations)

```javascript
kernel.commands.tasks.add(text, mode, date, projectId)
kernel.commands.inbox.promoteToTask(id, mode)
kernel.commands.projects.update(id, changes)
```

Commands:
1. Call the underlying store function
2. Auto-emit a domain event: `eventBus.emit('domain:changed', { action, id, source: 'kernel', at })`
3. Return the result

### Queries (read operations)

```javascript
kernel.queries.dashboard.getTodaySnapshot(mode)
kernel.queries.tasks.getTasksByMode(mode)
kernel.queries.search.globalSearch(query)
```

Queries:
1. Call the underlying store/aggregation function
2. Return data
3. Never emit events

## Event Contract

All command auto-emits follow this shape:

```javascript
{
  action: 'create' | 'update' | 'delete' | 'toggle',
  id: string | undefined,
  source: 'kernel',
  at: number  // Date.now()
}
```

Event names: `tasks:changed`, `inbox:changed`, `projects:changed`, `lists:changed`,
`daily:changed`, `bpv:changed`, `personal:changed`, `backup:imported`, `backup:restored`.

## Usage in React

```javascript
import { useKernel } from './hooks/useKernel.jsx';

function MyComponent() {
  const kernel = useKernel();

  // Read
  const tasks = await kernel.queries.tasks.getTasksByMode('School');

  // Write (auto-emits tasks:changed)
  await kernel.commands.tasks.add('Do thing', 'School');

  // Subscribe
  useEffect(() => {
    return kernel.subscribe('tasks:changed', () => reload());
  }, []);
}
```

## What Remains Legacy

- Vanilla blocks (`src/blocks/`) still import from `src/stores/` directly
- Vanilla blocks emit events manually via `eventBus.emit()`
- Both paths are valid and coexist — kernel wraps stores, it doesn't replace them
- Over time, blocks can migrate to kernel commands to eliminate scattered emit calls

## What New Code Must Follow

1. Import from `src/kernel/` — never from `src/stores/` or `src/db.js` directly
2. Use `kernel.commands.*` for writes (gets auto-emit for free)
3. Use `kernel.queries.*` for reads
4. DOM side effects (download, mailto, toast) belong in the UI layer, not kernel
5. No React imports in any file under `src/kernel/`

## File Structure

```
src/kernel/
├── index.js                 # createKernel() — public API
├── db.js                    # Re-export of src/db.js
├── eventBus.js              # Re-export of src/core/eventBus.js
├── mode.js                  # Re-export of src/core/modeManager.js
├── constants.js             # Re-export of src/constants.js + version.js + modeCaps.js
├── commands/
│   ├── tasks.js             # Wraps stores/tasks.js + auto-emits
│   ├── inbox.js             # Wraps stores/inbox.js + auto-emits
│   ├── projects.js          # Wraps stores/projects.js + auto-emits
│   ├── lists.js             # Wraps stores/lists.js + auto-emits
│   ├── daily.js             # Wraps stores/daily.js + auto-emits
│   ├── bpv.js               # Wraps stores/bpv.js + auto-emits
│   ├── personal.js          # Wraps stores/personal.js + auto-emits
│   └── backup.js            # Wraps stores/backup.js + auto-emits
└── queries/
    ├── dashboard.js          # Re-export of os/dashboardData.js
    ├── cockpit.js            # Re-export of os/cockpitData.js
    ├── search.js             # Re-export of stores/search.js
    └── weekly-review.js      # Re-export of stores/weekly-review.js
```
