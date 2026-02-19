# Storage

BORIS stores all data in the browser's **IndexedDB** (database name: `bpv-tracker`, version 5). There is no server — everything is local-first.

---

## How Data Is Stored

### Database Layer

`src/db.js` provides generic CRUD helpers that all store adapters use:

| Function | Description |
|----------|-------------|
| `initDB()` | Opens/creates the database. Runs migrations via `onupgradeneeded`. |
| `getAll(store)` | Read all records from a store. |
| `getByKey(store, id)` | Read a single record by its `id`. |
| `getByIndex(store, index, value)` | Query records by an index. |
| `put(store, record)` | Create or update a record (upsert by `id`). |
| `remove(store, id)` | Hard delete a record. |
| `softDelete(store, id)` | Move a record to the `deleted` store (undoable). |
| `getSetting(key)` / `setSetting(key, value)` | Read/write app settings. |

### Store Adapters

Each entity type has a dedicated store adapter in `src/stores/` that wraps the generic CRUD with validation and business logic:

| Adapter | Store(s) | Entities |
|---------|----------|----------|
| `src/stores/inbox.js` | `os_inbox` | InboxItem |
| `src/stores/tasks.js` | `os_tasks` | Task |
| `src/stores/daily.js` | `dailyPlans` | DailyEntry |
| `src/stores/tracker.js` | `hours`, `logbook` | TrackerEntry (Hours + Logbook) |

### Validation

All store adapters validate input before writing to IndexedDB. Validation rules are in `src/stores/validate.js`:

- **Required fields** — empty strings, missing modes, and wrong types are rejected
- **Type checks** — dates must match `YYYY-MM-DD`, weeks must match `YYYY-Wnn`, hours must be 0-24
- **Enum constraints** — modes must be `BPV|School|Personal`, day types must be `work|sick|absent|holiday`
- **Throws `ValidationError`** with the field name and reason

---

## Entity Schemas

### InboxItem (`os_inbox`)

```javascript
{
  id:         string,          // crypto.randomUUID()
  text:       string,          // Captured text (trimmed)
  type:       'thought'|'link',// Auto-detected from URL pattern
  mode:       string|null,     // 'BPV'|'School'|'Personal' or null
  url:        string|null,     // Extracted URL if type='link'
  status:     'inbox'|'promoted'|'archived',
  promotedTo: string|null,     // Task ID if promoted
  createdAt:  string,          // ISO timestamp
  updated_at: string           // ISO timestamp
}
```

**CRUD:** `addInboxItem(text, mode?)` → `getInboxItems()` → `promoteToTask(id)` / `archiveItem(id)`

### Task (`os_tasks`)

```javascript
{
  id:         string,
  text:       string,          // Task description (trimmed)
  mode:       string,          // 'BPV'|'School'|'Personal' (required)
  status:     'todo'|'done',
  priority:   number,          // Default: 3
  date:       string|null,     // YYYY-MM-DD (defaults to today)
  doneAt:     string|null,     // ISO timestamp when completed
  createdAt:  string,
  updated_at: string
}
```

**CRUD:** `addTask(text, mode, date?)` → `getTasksByMode(mode)` / `getTasksForToday(mode)` → `toggleTask(id)` → `deleteTask(id)`

### DailyEntry (`dailyPlans`)

```javascript
{
  id:         string,
  date:       string,          // YYYY-MM-DD (unique per date)
  tasks:      Array<{ text: string, done: boolean }>,
  evaluation: string|null,     // End-of-day reflection
  updatedAt:  string
}
```

**CRUD:** `saveDailyEntry({ date, tasks, evaluation? })` → `getDailyEntry(date)` / `getAllDailyEntries()` → `toggleDailyTask(date, index)`

Saving to the same date updates the existing entry (upsert by date).

### TrackerEntry — Hours (`hours`)

```javascript
{
  id:         string,
  date:       string,          // YYYY-MM-DD (unique per date)
  week:       string,          // YYYY-Wnn (auto-computed if omitted)
  type:       'work'|'sick'|'absent'|'holiday',
  value:      number,          // Hours worked (0-24)
  startTime:  string|null,     // Optional start time
  endTime:    string|null,     // Optional end time
  breakMinutes: number|null,   // Optional break duration
  updatedAt:  string
}
```

**CRUD:** `saveHoursEntry({ date, type, value, ... })` → `getHoursForDate(date)` / `getHoursForWeek(week)` / `getAllHours()`

### TrackerEntry — Logbook (`logbook`)

```javascript
{
  id:         string,
  date:       string,          // YYYY-MM-DD
  week:       string,          // YYYY-Wnn (auto-computed if omitted)
  tags:       string[],        // e.g. ['CNC', 'frezen']
  text:       string,          // Markdown reflection (trimmed)
  updatedAt:  string
}
```

**CRUD:** `saveLogbookEntry({ date, text, tags })` → `getLogbookForDate(date)` / `getLogbookForWeek(week)` / `getAllLogbook()`

Multiple logbook entries per date are allowed (unlike hours).

---

## How to Export Data

### Via the App

1. Open the app → navigate to **Export** (legacy page `#export`)
2. Click "Exporteer alles" — downloads a JSON file with all 28 stores

### Programmatically

```javascript
import { exportAllData } from './src/db.js';

const data = await exportAllData();
// data = { hours: [...], logbook: [...], os_tasks: [...], ... }

const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// Use url to trigger download
```

### Import

```javascript
import { importAll } from './src/db.js';

const data = JSON.parse(fileContents);
await importAll(data);
// All records are upserted into their respective stores
```

---

## Schema Migrations

Migrations run automatically in `initDB()` via IndexedDB's `onupgradeneeded` event:

```
v0 → v1: Core stores (hours, logbook, photos, settings, etc.)
v1 → v2: Knowledge stores (learningMoments, reference, vault, energy)
v2 → v3: School OS stores (os_school_*)
v3 → v4: Personal OS stores (os_personal_*)
v4 → v5: Unified stores (os_inbox, os_tasks)
```

**Rules:**
- Migrations are **append-only** — never delete or rename a store
- Each version block only runs for upgrades from older versions (`if (oldVersion < N)`)
- All stores use `{ keyPath: 'id' }` except `settings` which uses `{ keyPath: 'key' }`

---

## Testing

Run `npm test` to execute all store tests. Tests use `fake-indexeddb` to simulate IndexedDB in Node.js — each test gets a fresh database via setup in `tests/setup.js`.

```
tests/
├── setup.js                    # fake-indexeddb + DB reset between tests
├── schema.test.js              # Migration: all 28 stores created, data persists
└── stores/
    ├── validate.test.js        # Validation rules for all entity types
    ├── inbox.test.js           # InboxItem lifecycle (add/promote/archive)
    ├── tasks.test.js           # Task lifecycle (add/toggle/delete + mode filter)
    ├── daily.test.js           # DailyEntry lifecycle (save/load/toggle/upsert)
    └── tracker.test.js         # Hours + Logbook lifecycle (save/load/week query)
```
