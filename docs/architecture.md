# BORIS OS — Architecture

## System Overview

BORIS OS is an offline-first PWA that serves as a Personal Operating System for a Research Instrumentmaker student. It extends the existing BPV Tracker with two additional modes (School, Personal).

## Stack
- Vanilla JavaScript (ES modules)
- IndexedDB (single database, versioned schema)
- Service Worker (cache-first for assets, network-first for navigation)
- Vite (build tool)
- GitHub Pages (static hosting)
- No backend, no paid services

## Architecture: Block System

### Core Modules (`src/core/`)

| Module | Purpose |
|--------|---------|
| `blockRegistry.js` | Central registry where blocks self-register |
| `blockLoader.js` | Imports and registers all blocks at boot |
| `modeManager.js` | Manages active mode (bpv/school/personal) |
| `eventBus.js` | Pub/sub for inter-block communication |
| `featureFlags.js` | Enable/disable blocks via localStorage flags |
| `designSystem.js` | Design tokens (spacing, typography, colors) |

### Block Structure

Each block lives in `src/blocks/<block-name>/` and contains:
- `index.js` — main module with `createPage(container)` export
- Optional: `store.js`, `view.js`, `styles.css`

A block registers itself with:
```js
registerBlock({
  id: 'school-projects',
  mode: 'school',        // bpv | school | personal | system
  label: 'Projecten',
  icon: 'target',
  route: 'projects',
  page: () => import('../blocks/school-projects/index.js'),
  nav: 'main',           // main | secondary | none
  bottomNav: true,
  order: 3,
  stores: ['schoolProjects'],
  extraRoutes: {}
})
```

### Mode System

Three modes, one active at a time:
- **BPV** — Professional structure (hours, logbook, goals, report)
- **School** — Growth and mastery (projects, skills, concepts)
- **Personal** — Stability and balance (energy, mood, gratitude)

Mode stored in IndexedDB settings. Switching mode:
1. Updates `modeManager` state
2. Emits `mode:changed` event
3. Shell re-renders navigation for active mode's blocks
4. Router navigates to default route

### Data Model

**Database:** `bpv-tracker` (IndexedDB)
**Current version:** 4 (will become 5)

#### New stores for v5:
| Store | Mode | Purpose |
|-------|------|---------|
| `schoolTasks` | school | Daily focus tasks |
| `schoolNotes` | school | Quick notes and understanding |
| `schoolProjects` | school | Project tracking |
| `schoolMilestones` | school | Project milestones |
| `schoolConcepts` | school | Concept Vault entries |
| `schoolSkills` | school | Skill tracker |
| `schoolReflections` | school | Weekly reflections |
| `personalTasks` | personal | Daily personal tasks |
| `personalGoals` | personal | Life goals |
| `personalReflections` | personal | Weekly life reviews |

#### Existing stores (unchanged):
hours, logbook, photos, settings, deleted, competencies, assignments, goals, quality, dailyPlans, weekReviews, learningMoments, reference, vault, vaultFiles, energy, checklists, checklistLogs, bpvLeerdoelen, bpvProducten, bpvReflecties, bpvBedrijf

### Communication

Blocks communicate only through the event bus:
```
mode:changed         — mode switch
schoolTasks:updated  — task change
schoolProjects:updated — project change
...
```

No block may import another block's internal functions.

### Adding a Block
1. Create `src/blocks/<name>/index.js` with `createPage(container)` export
2. Add `registerBlock()` call in `src/core/blockLoader.js`
3. Add any new IndexedDB stores in `src/db.js` migration

### Removing a Block
1. Delete `src/blocks/<name>/` folder
2. Remove `registerBlock()` line from `blockLoader.js`
3. No other changes needed (clean removal guarantee)

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| Single IndexedDB database | Simpler sync, atomic snapshots, no cross-DB issues |
| Mode as filter, not silo | Shared infrastructure, no duplicated logic |
| Lazy-loaded pages | Fast initial boot, smaller bundles |
| No framework | Long-term stability (4+ years), no dependency churn |
| Event bus over direct imports | Loose coupling, blocks removable without breakage |
