# Architecture — Modular Monolith

BORIS is a Personal OS / Second Brain. This document defines its **kernel + modules** architecture: a modular monolith where every domain owns its data, UI, and logic — but ships as a single app.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                              │
│                          main.js                                │
│                                                                 │
│  ┌───────────────────── KERNEL ──────────────────────────────┐  │
│  │  EventBus · ModeManager · BlockRegistry · FeatureFlags    │  │
│  │  DesignSystem · MigrationManager · ModeCaps · Router      │  │
│  │  DB (IndexedDB v7) · applyUserSettings()                  │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──── MODULES (domain boundaries) ─────────────────────────┐  │
│  │                          │                                │  │
│  │  ┌─────────┐ ┌──────────┴──┐ ┌───────────┐ ┌──────────┐ │  │
│  │  │   BPV   │ │  Planning   │ │ Knowledge │ │ Personal │ │  │
│  │  │Tracking │ │  & Daily    │ │   Mgmt    │ │    OS    │ │  │
│  │  └────┬────┘ └──────┬──────┘ └─────┬─────┘ └────┬─────┘ │  │
│  │       │              │              │             │       │  │
│  │  ┌────┴────┐ ┌──────┴──────┐ ┌─────┴─────┐ ┌────┴─────┐ │  │
│  │  │ School  │ │Inbox+Tasks  │ │ Settings  │ │  (Sync)  │ │  │
│  │  │   OS    │ │  (shared)   │ │  & Admin  │ │  future  │ │  │
│  │  └─────────┘ └─────────────┘ └───────────┘ └──────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                    ┌────────┴────────┐                          │
│                    │    IndexedDB    │                          │
│                    │  (29 stores)   │                          │
│                    └────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Boundaries

Each module **owns** its stores, blocks, pages, and store-adapters. Cross-module communication happens only through the kernel's EventBus.

### Kernel (always loaded)

The kernel is the runtime skeleton. It owns no domain data.

| Component | File | Responsibility |
|-----------|------|----------------|
| DB | `src/db.js` | IndexedDB open/upgrade, generic CRUD helpers, soft-delete |
| Router | `src/router.js` | Hash-based navigation (legacy pages) |
| EventBus | `src/core/eventBus.js` | Pub/sub: `on()`, `off()`, `emit()` |
| ModeManager | `src/core/modeManager.js` | 3-mode lens (BPV/School/Personal) |
| BlockRegistry | `src/core/blockRegistry.js` | Block registration, discovery, enable/disable |
| FeatureFlags | `src/core/featureFlags.js` | localStorage-backed runtime flags |
| ModeCaps | `src/core/modeCaps.js` | Task capacity limits per mode |
| DesignSystem | `src/core/designSystem.js` | CSS custom property tokens |
| MigrationManager | `src/core/migrationManager.js` | Append-only schema evolution |
| Settings loader | `main.js → applyUserSettings()` | Theme, accent color, compact mode |

**Kernel contract:** modules receive `{ db, eventBus, modeManager, blockRegistry }` — nothing else.

### Module 1: BPV Tracking

Internship (BPV) time tracking, daily logging, competency assessment, and goal management.

| Aspect | Details |
|--------|---------|
| **Stores** | `hours`, `logbook`, `photos`, `competencies`, `assignments`, `goals`, `quality` |
| **Store module** | `src/stores/bpv.js` — unified TrackerEntry CRUD; all blocks write through this |
| **Pages** | hours, logbook, goals, competencies, quality, assignments |
| **Blocks** | `bpv-quick-log` (order 8), `bpv-weekly-overview` (order 14), `bpv-today`, `bpv-mini-card`, `bpv-log-summary` |
| **Mode** | BPV |
| **Events emitted** | `bpv:changed` (new), `hours:changed`, `logbook:changed` |

**`src/stores/bpv.js` exports:**
- `addHoursEntry(date, opts)` — upsert; recalculates `netMinutes` automatically
- `getHoursEntry(date)` — fetch single entry
- `updateHoursEntry(id, changes)` — patch with netMinutes recalc
- `deleteHoursEntry(id)` — hard delete
- `getWeeklyOverview(weekStr)` → `{ weekStr, totalMinutes, targetMinutes, percentComplete, days[5], highlights }`
- `exportEntries(format)` → CSV or JSON string of all entries sorted by date

### Module 2: Planning & Daily

Daily entries (top-3 outcomes + todos + notes), weekly reviews, energy tracking.

| Aspect | Details |
|--------|---------|
| **Stores** | `dailyPlans` (v7, mode-aware), `weekReviews`, `energy` |
| **Store adapters** | `src/stores/daily.js`, `src/stores/weekly-review.js` |
| **Aggregators** | `src/os/dailyAggregator.js` — `getDailySummary`, `getWeeklySummary`, `getMonthlySummary` |
| **Pages** | planning, today, dashboard |
| **Blocks** | `daily-outcomes`, `daily-todos`, `daily-reflection`, `personal-energy`, `personal-week-planning`, `personal-weekly-reflection` |
| **Mode** | All — **each mode has its own daily entry per date** |
| **Events emitted** | `daily:changed { mode, date }` |

#### Daily Entries — Source of Truth

`dailyPlans` is the **single source of truth** for daily/weekly/monthly goal tracking.

**Entity schema (v7):**
```js
{
  id:        '2026-02-19__School',  // composite key: date__mode
  date:      '2026-02-19',
  mode:      'School' | 'Personal' | 'BPV',
  outcomes:  string[3],             // top-3 goal statements (always 3 slots)
  todos:     [{ id, text, done, createdAt, doneAt }],
  notes:     string,                // max 500 chars
  updatedAt: ISO string,
}
```

**Design decisions:**
- `date` index is **non-unique** (v7) to allow all 3 modes to have an entry per date
- Composite id `${date}__${mode}` makes lookups O(1) via `getByKey`
- `daily:changed { mode, date }` lets blocks filter updates by mode (no spurious re-renders)
- Aggregators in `dailyAggregator.js` are pure functions — no side effects, stable zero shapes

**Data flow (source → dashboard):**
```
dailyPlans (mode, date)
  → getDailySummary(mode, date)   → today widget on Dashboard
  → getWeeklySummary(mode, week)  → week focus widget
  → getMonthlySummary(mode, month)→ future month theme view
```

### Module 3: Knowledge Management

Learning moments, reference library, vault (personal wiki), notebook.

| Aspect | Details |
|--------|---------|
| **Stores** | `learningMoments`, `reference`, `vault`, `vaultFiles` |
| **Pages** | learning-moments, reference, vault, notebook |
| **Blocks** | `school-concept-vault` |
| **Events emitted** | `vault:changed` |

### Module 4: Personal OS

Personal life management — tasks, agenda, wellbeing, reflections, week planning.

| Aspect | Details |
|--------|---------|
| **Stores** | `os_personal_tasks`, `os_personal_agenda`, `os_personal_actions`, `os_personal_wellbeing`, `os_personal_reflections`, `os_personal_week_plan` |
| **Blocks** | `personal-today`, `personal-mini-card`, `personal-energy`, `personal-week-planning`, `personal-weekly-reflection` |
| **Mode** | Personal |

### Module 5: School OS

School project management — projects, milestones, skills, concept tracking.

| Aspect | Details |
|--------|---------|
| **Stores** | `os_school_projects`, `os_school_milestones`, `os_school_skills`, `os_school_concepts` |
| **Blocks** | `school-today`, `school-mini-card`, `school-current-project`, `school-milestones`, `school-skill-tracker`, `school-concept-vault` |
| **Mode** | School |

### Module 6: Inbox + Tasks + Projects (shared service)

Cross-cutting unified inbox, mode-aware task management, and project management. Used by all modes.

| Aspect | Details |
|--------|---------|
| **Stores** | `os_inbox`, `os_tasks`, `os_projects` |
| **Store adapters** | `src/stores/inbox.js`, `src/stores/tasks.js`, `src/stores/projects.js` |
| **Blocks** | `inbox`, `inbox-screen`, `tasks`, `projects` |
| **Mode** | All (mode-filtered queries) |
| **Events emitted** | `tasks:changed`, `inbox:changed`, `projects:changed` |
| **Constraint** | One declared Next Action per active project (enforced in `projects.js:setNextAction`) |

### Module 7: Settings & Admin

App configuration, data export/import, sync, diagnostics.

| Aspect | Details |
|--------|---------|
| **Stores** | `settings`, `deleted` |
| **Pages** | settings, export, sync, diagnostics, report |
| **Blocks** | `settings-panel` |

---

## Data Model

### Core Entities

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  InboxItem  │────▶│    Task     │────▶│   Project   │
│  (capture)  │     │   (action)  │     │  (container)│
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                    ┌─────┴──────┐
                    │ DailyEntry │
                    │  (plan)    │
                    └────────────┘

┌─────────────────┐     ┌──────────────┐
│  TrackerEntry   │     │  Knowledge   │
│  (BPV hours/    │     │  (vault,     │
│   logbook)      │     │   reference) │
└─────────────────┘     └──────────────┘
```

### Entity Schemas

**InboxItem** — Quick capture, zero-friction input.
```javascript
{
  id:         string,       // crypto.randomUUID()
  text:       string,       // Raw capture text
  type:       'thought' | 'link',
  mode:       'BPV' | 'School' | 'Personal',
  url:        string | null,
  status:     'inbox' | 'promoted' | 'archived',
  promotedTo: string | null,  // Task ID if promoted
  createdAt:  string,       // ISO timestamp
  updated_at: string
}
// Store: os_inbox — Indexes: mode, status, updated_at
```

**Task** — Actionable work item, mode-scoped, date-bound.
```javascript
{
  id:         string,
  text:       string,
  mode:       'BPV' | 'School' | 'Personal',
  status:     'todo' | 'done',
  priority:   number | null,
  date:       string | null,  // YYYY-MM-DD, for daily assignment
  doneAt:     string | null,  // ISO timestamp when completed
  createdAt:  string,
  updated_at: string
}
// Store: os_tasks — Indexes: mode, status, date, updated_at
// Capacity: BPV=3, School=3, Personal=5 (via modeCaps.js)
```

**DailyEntry** — Daily plan with top-3 tasks and evaluation.
```javascript
{
  id:         string,
  date:       string,       // YYYY-MM-DD (unique)
  tasks:      Array<{ text: string, done: boolean }>,
  evaluation: string | null,
  updatedAt:  string
}
// Store: dailyPlans — Index: date (unique)
```

**Project** — School project container with milestones.
```javascript
{
  id:         string,
  name:       string,
  status:     'active' | 'completed' | 'archived',
  updated_at: string
}
// Store: os_school_projects — Index: updated_at
// Related: os_school_milestones (via projectLink)
```

**TrackerEntry (BPV)** — Two related entities for internship tracking.
```javascript
// Hours entry
{
  id:         string,
  date:       string,       // YYYY-MM-DD (unique)
  week:       string,       // e.g. "2026-W08"
  type:       'work' | 'sick' | 'absent' | 'holiday',
  value:      number,       // hours worked
  updatedAt:  string
}
// Store: hours — Indexes: date (unique), week, type

// Logbook entry
{
  id:         string,
  date:       string,
  week:       string,
  tags:       string[],     // e.g. ['CNC', 'frezen']
  text:       string,       // Markdown reflection
  updatedAt:  string
}
// Store: logbook — Indexes: date, week, tags (multiEntry)
```

---

## Storage Strategy

### Phase 1: Local-First (current)

```
Browser ──▶ IndexedDB (v5, 28 stores)
            ├── All data stays on-device
            ├── Offline-capable (PWA + service worker)
            ├── Export/import via JSON blobs
            └── No account required
```

**Why local-first:** Privacy (BPV data is personal), zero infrastructure cost, instant load, works offline at the internship workplace.

### Phase 2: Sync-Ready (future)

```
Browser ──▶ IndexedDB ──sync──▶ Cloudflare D1 / KV
            ├── updated_at on every record (already in place)
            ├── Conflict resolution: last-write-wins per field
            ├── Soft-delete store preserves undo across devices
            └── Device ID for conflict tracking (already generated)
```

**Preparation already in place:**
- Every `os_*` store has an `updated_at` index
- `settings` store has `device_id`
- `deleted` store tracks soft-deletes with timestamps
- `src/auto-sync.js` + `src/pages/sync.js` exist as sync scaffolding

### Phase 3: Cloudflare Stack (future possibility)

| Service | Use Case |
|---------|----------|
| **Cloudflare Pages** | Static hosting for the Vite build (free tier) |
| **Cloudflare D1** | SQLite-at-edge database for sync backend |
| **Cloudflare KV** | Session tokens, feature flags, user preferences |
| **Cloudflare Workers** | Sync API endpoints, auth middleware |
| **Cloudflare Turnstile** | Bot protection on auth (free CAPTCHA) |
| **Cloudflare R2** | Photo/file storage for logbook attachments + vault files |
| **Cloudflare Zero Trust** | Optional: lock down to specific users/emails |

This is documented but **not required for M1** — the app runs fully client-side.

---

## API Boundaries

Even without a backend, each module exposes a clean interface. This makes future sync/testing/refactoring trivial.

### Module API Contract

```javascript
// Every module exports an init function:
export function initModule({ db, eventBus, modeManager, blockRegistry }) {
  // 1. Register blocks
  // 2. Subscribe to events
  // 3. Return module metadata
  return {
    name: 'module-name',
    stores: ['store1', 'store2'],  // owned stores
    blocks: ['block-id-1'],        // registered block IDs
    dispose() { /* cleanup */ }
  };
}
```

### Store Adapter Contract

```javascript
// Every store adapter exports CRUD + query functions:
export async function getItems(filter?)    // Read (with optional filter)
export async function addItem(data)        // Create (returns ID)
export async function updateItem(id, data) // Update (partial merge)
export async function deleteItem(id)       // Delete (hard or soft)
```

### Block Contract

```javascript
registry.register({
  id:      'unique-id',
  title:   'Display Name',
  hosts:   ['today-sections', 'dashboard-cards'],
  modes:   ['BPV', 'School', 'Personal'],
  enabled: true,
  order:   10,
  mount(container, context) {
    // context: { mode, eventBus, modeManager }
    // Render UI into container
    return { unmount() { /* cleanup listeners, DOM */ } };
  },
});
```

### Event Contracts

| Event | Payload | Emitter | Consumers |
|-------|---------|---------|-----------|
| `mode:changed` | `{ mode, previous }` | ModeManager | All blocks |
| `tasks:changed` | `{ mode }` | Tasks store | Tasks block, Dashboard |
| `inbox:changed` | `{ mode }` | Inbox store | Inbox block |
| `hours:changed` | `{ date }` | Hours store | BPV blocks |
| `logbook:changed` | `{ id }` | Logbook store | BPV Log Summary |
| `settings:changed` | `{ key, value }` | Settings | Shell, Blocks |

---

## Why This Structure

**Minimal:** 7 modules + 1 kernel. No abstraction layers that don't earn their keep. No dependency injection framework — just function arguments. No build-time module federation — just ES imports.

**Elegant:** The kernel provides exactly 4 things every module needs: data (db), communication (eventBus), context (modeManager), and UI slots (blockRegistry). Everything else is a module's private business.

**Incremental:** This architecture is a **conceptual reorganization**, not a rewrite. The current file structure already maps cleanly to these modules. Refactoring is moving files + adding `index.js` entry points — not changing any logic.

**Why modular monolith over microservices/micro-frontends:**
- Single IndexedDB database — no cross-origin isolation needed
- Single Vite build — no runtime module loading complexity
- Single deployment — one `npm run build`, one upload
- Module boundaries are **conventions enforced by code review**, not infrastructure. This is the right level of rigor for a solo/small-team project.

**The test:** Can you delete an entire module folder and the app still boots (with that feature missing)? With this architecture, yes — because modules only connect to the kernel via registration, never to each other directly.
