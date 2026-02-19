# Architecture

## System Overview

BORIS is a Personal OS / Second Brain — a progressive web app for daily productivity, learning tracking, and personal development. It runs entirely in the browser with no backend.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  index.html                  │
│                   main.js                    │
│          ┌──────────┬──────────┐             │
│          │ Legacy   │ BORIS OS │ (feature    │
│          │ Shell    │ Shell    │  flag gate) │
│          └──────────┴──────────┘             │
│                      │                       │
│     ┌───────┬────────┼────────┬─────────┐    │
│     │ Event │  Mode  │ Block  │ Feature │    │
│     │ Bus   │Manager │Registry│  Flags  │    │
│     └───────┴────────┴────────┴─────────┘    │
│                      │                       │
│         ┌────────────┼────────────┐          │
│         │   Blocks   │   Stores   │          │
│         │ (UI units) │  (CRUD)    │          │
│         └────────────┴────────────┘          │
│                      │                       │
│              ┌───────┴───────┐               │
│              │   IndexedDB   │               │
│              │   (v5, 26+    │               │
│              │    stores)    │               │
│              └───────────────┘               │
└─────────────────────────────────────────────┘
```

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Vanilla JS (no framework) | Minimal dependencies, fast load, full control |
| IndexedDB for all data | Offline-first, no backend dependency, privacy |
| Feature flag gate | Safe rollout of BORIS OS, instant legacy fallback |
| Block system | Modular "lego blocks" — easy to add/remove/reorder |
| Mode as lens | BPV/School/Personal filter the same UI, not separate apps |
| Order-aware hosts | Deterministic block rendering via `order` property |

## Data Model

### Core Stores (Legacy)
`hours`, `logbook`, `photos`, `settings`, `deleted`, `competencies`, `assignments`, `goals`, `quality`, `dailyPlans`, `weekReviews`, `learningMoments`, `reference`, `vault`, `vaultFiles`, `energy`

### OS Stores
`os_inbox`, `os_tasks`, `os_school_projects`, `os_school_milestones`, `os_school_skills`, `os_school_concepts`, `os_personal_tasks`, `os_personal_agenda`, `os_personal_actions`, `os_personal_wellbeing`, `os_personal_reflections`, `os_personal_week_plan`

### Key Schemas

**os_inbox:** `{ id, text, type, mode, url, status, promotedTo, createdAt, updated_at }`

**os_tasks:** `{ id, text, mode, status, priority, date, doneAt, createdAt, updated_at }`

## Block Contract

```javascript
registry.register({
  id: 'unique-id',
  title: 'Display Name',
  hosts: ['today-sections', 'dashboard-cards'],
  modes: ['BPV', 'School', 'Personal'],
  enabled: true,
  order: 10,  // lower = renders first
  mount(container, context) {
    // context: { mode, eventBus, modeManager }
    return { unmount() { /* cleanup */ } };
  },
});
```

## Host Slots

| Host | Layout | Location |
|------|--------|----------|
| `today-sections` | Vertical stack | Today (Vandaag) tab |
| `dashboard-cards` | Auto-fill grid | Dashboard tab |
| `vandaag-widgets` | Auto-fill grid | Today tab (legacy compat) |

## File Structure

```
src/
├── os/shell.js           # BORIS OS shell
├── stores/               # CRUD modules
│   ├── tasks.js
│   └── inbox.js
├── blocks/               # UI blocks
│   ├── inbox/
│   ├── tasks/
│   ├── bpv-log-summary/
│   ├── bpv-today/
│   ├── school-today/
│   ├── personal-today/
│   └── ...
├── core/                 # Core framework
│   ├── blockRegistry.js
│   ├── modeManager.js
│   ├── eventBus.js
│   ├── featureFlags.js
│   ├── modeCaps.js
│   └── designSystem.js
├── pages/                # Legacy pages
├── styles/               # Global CSS
├── db.js                 # IndexedDB (v5)
└── main.js               # Bootstrap
```
