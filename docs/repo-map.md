# Repo Map — BORIS OS

> **Important:** This is NOT a React + Tailwind app. It is a zero-dependency
> vanilla JavaScript (ES2022) modular monolith. This document uses React/Tailwind
> terminology as a comparison layer where it helps orientation, but calls out the
> actual implementation in each section.

---

## 1. Build Tooling & Entrypoints

| Concern | Tool | Notes |
|---------|------|-------|
| Bundler | **Vite 5** | `vite.config.js`, base `/Vibe-coding/`, target `es2022` |
| Test runner | **Vitest 4** | Config inside `vite.config.js` (`test.setupFiles`) |
| Fake IDB | **fake-indexeddb 6** | Test-only, polyfills IndexedDB in Node |
| No framework | — | Zero runtime dependencies in `package.json` |
| No Tailwind | — | No `tailwind.config.js`, no `postcss.config.js` |

**Dev server:** `npm run dev` → Vite on port 3000
**Production build:** `npm run build` → `dist/` (GitHub Pages deploy via `.github/workflows/deploy.yml`)
**Tests:** `npm test` → `vitest run` (658 tests across 42 files)

### Entrypoints

| File | Role |
|------|------|
| `index.html` | Single HTML shell; all route templates are `<template>` elements hydrated at runtime |
| `src/main.js` | App bootstrap: `initDB` → `applyUserSettings` → `seedModeConfig` → `createOSShell` |
| `sw.js` | PWA Service Worker — offline cache, update banner |

**Boot sequence (`src/main.js:48`):**
```
init()
  applyDesignTokens()       ← CSS font tokens
  initDB()                  ← Open IndexedDB (v8, 31 stores)
  applyUserSettings()       ← Theme engine + compact/motion prefs
  ensureDeviceId()          ← crypto.randomUUID() → IDB setting
  seedModeConfigIfNeeded()  ← Default modes if first run
  checkBPVRetirement()      ← Auto-archive BPV after end date
  migratePersonalTasks()    ← One-time data migration
  checkExportReminder()     ← Toast if >7 days since last export
  purgeDeletedOlderThan(30) ← Soft-delete tombstone cleanup
  initServiceWorker()       ← PWA registration
  initBalatro()             ← Visual card effects
  initNewOSShell()          ← Mount the entire UI
```

---

## 2. Routing

**Not react-router.** Custom hash-based routing in `src/os/deepLinks.js`.

### URL Format

```
New:    #today              → tab only
        #today?focus=tasks  → tab + scroll target
        #projects/abc123    → tab + route param (project id)

Legacy: #tab=today&focus=tasks  (backward-compatible, still parsed)
```

### Valid Routes

```javascript
// src/os/deepLinks.js:8
const VALID_ROUTES = ['dashboard', 'today', 'inbox', 'lijsten',
                      'planning', 'projects', 'settings', 'curiosity'];
```

### Route Lifecycle (`src/os/shell.js`)

```
setActiveTab(tab, opts)
  unmountRoute(prevTab)     ← calls unmount() on all mounted blocks, clears DOM
  mountRoute(tab, params)   ← clones <template data-route="tab">, hydrates, mounts blocks
  updateHash(tab, ...)      ← history.replaceState (no page reload)
```

- No browser history push — `replaceState` only
- `hashchange` event not used; routing is programmatic only
- `scrollToFocus()` uses 4 selector strategies to locate a focus zone within the mounted route

### Tab ↔ Template Mapping

| Tab | Template selector | Special hydration |
|-----|-------------------|-------------------|
| `dashboard` | `template[data-route="dashboard"]` | Mode hero card, section titles |
| `today` | `template[data-route="today"]` | 7 collapsible zones + search bar |
| `inbox` | `template[data-route="inbox"]` | — |
| `lijsten` | `template[data-route="lijsten"]` | — |
| `planning` | `template[data-route="planning"]` | Section titles |
| `projects` + `params.id` | `template[data-route="project-detail"]` | — |
| `projects` (no id) | `template[data-route="projects"]` | — |
| `settings` | `template[data-route="settings"]` | `renderSettingsBlock()` |
| `curiosity` | `template[data-route="curiosity"]` | `mountCuriosityPage()` |

---

## 3. "Component" Tree (Block System)

**Not React components.** Self-contained JS modules called **blocks** mounted into named **host slots** in the DOM.

### Block Contract

Every block must:
1. Export `register*Block(registry)` — registers metadata + `mount` fn
2. `mount(container, context)` returns `{ unmount() }` (or null)
3. Use `escapeHTML()` from `src/utils.js` for all user content
4. Declare `hosts: ['slot-name']` and `order: number`

### Block Registry (`src/core/blockRegistry.js`)

- `createBlockRegistry()` → registry instance
- `registry.register(blockDef)` — called by each block's `register*Block()`
- `registry.getEnabled()` — returns all registered blocks (no per-block disable yet)
- `registerDefaultBlocks(registry)` in `src/blocks/registerBlocks.js` calls all 30 register functions

### All 30 Registered Blocks

**Level 1 — Today/Focus:**

| Block id | Host slot | Modes | Purpose |
|----------|-----------|-------|---------|
| `daily-cockpit` | `vandaag-cockpit` | all | Stats widget (streak, tasks done, hours) |
| `daily-outcomes` | `vandaag-hero` | all | Top 3 daily outcomes |
| `morning-focus` | `vandaag-hero` | all | Morning flow launcher |
| `daily-todos` | `vandaag-tasks` | all | Mode-aware task list (cap enforced) |
| `done-list` | `vandaag-tasks` | all | Completed tasks for today |
| `two-min-launcher` | `vandaag-tasks` | all | 2-minute quick-win launcher |
| `brain-state` | `vandaag-tasks` | all | Current energy/mood indicator |
| `context-checklist` | `vandaag-tasks` | all | Context-aware checklist |

**Level 2 — Projects & Lists:**

| Block id | Host slot | Modes | Purpose |
|----------|-----------|-------|---------|
| `inbox` | `vandaag-capture` | all | Inbox capture widget |
| `projects` | `vandaag-projects` | all | Active projects list |
| `lijsten` | `vandaag-projects` | all | Todoist-style persistent lists |
| `lijsten-screen` | `lijsten-screen` | all | Full-page list editor |
| `inbox-screen` | `inbox-screen` | all | Full-page inbox processing |
| `worry-dump` | `vandaag-capture` | all | Quick worry/idea capture |

**Level 3 — Context & Review:**

| Block id | Host slot | Modes | Purpose |
|----------|-----------|-------|---------|
| `daily-reflection` | `vandaag-reflection` | all | End-of-day reflection |
| `conversation-debrief` | `vandaag-reflection` | all | Conversation notes |
| `weekly-review` | `vandaag-weekly` | all | Weekly review aggregator |
| `history-browser` | `vandaag-history` | all | Browse past days/entries |

**School Mode:**

| Block id | Host slot | Modes | Purpose |
|----------|-----------|-------|---------|
| `school-dashboard` | `dashboard-cards` | School | School synopsis dashboard |
| `school-today` | `vandaag-mode` | School | School context for today |
| `school-current-project` | `vandaag-mode` | School | Highlighted current project |
| `school-concept-vault` | `vandaag-mode` | School | Study notes/concepts |
| `school-milestones` | `vandaag-mode` | School | Learning milestones |
| `school-skill-tracker` | `vandaag-mode` | School | Competency tracking |

**Personal Mode:**

| Block id | Host slot | Modes | Purpose |
|----------|-----------|-------|---------|
| `personal-dashboard` | `dashboard-cards` | Personal | Personal synopsis dashboard |
| `personal-today` | `vandaag-mode` | Personal | Personal context for today |
| `personal-energy` | `vandaag-mode` | Personal | Energy/wellbeing tracking |
| `personal-week-planning` | `vandaag-mode` | Personal | Weekly personal planning |
| `personal-weekly-reflection` | `vandaag-mode` | Personal | Weekly reflection |

**BPV Mode:**

| Block id | Host slot | Modes | Purpose |
|----------|-----------|-------|---------|
| `bpv-today` | `vandaag-mode` | BPV | BPV daily status |
| `bpv-quick-log` | `vandaag-mode` | BPV | Log hours/activities |
| `bpv-log-summary` | `vandaag-mode` | BPV | Hours summary by week |
| `bpv-weekly-overview` | `vandaag-mode` | BPV | Week at a glance |
| `boundaries` | `vandaag-mode` | BPV | BPV work boundary reminders |

**Hub/Settings:**

| Block id | Host slot | Purpose |
|----------|-----------|---------|
| `dashboard` | `dashboard-cards` | Main dashboard grid (synopsis cards) |
| `project-hub` | `projects-hub` | Project hub 2.0 (cards/files/mindmap/tasks/timeline) |
| `project-detail` | `planning-detail` | Project detail (agenda + tasks + timeline) |
| `settings-panel` | *(direct render)* | Settings UI (not registered as a block) |

### Host Slots

| Slot name | Tab | Description |
|-----------|-----|-------------|
| `vandaag-hero` | today | Non-collapsible top area (outcomes + morning flow) |
| `vandaag-cockpit` | today | Non-collapsible stats widget |
| `vandaag-tasks` | today | Collapsible "Taken" section |
| `vandaag-projects` | today | Collapsible "Projecten & Lijsten" section |
| `vandaag-capture` | today | Collapsible "Inbox" section |
| `vandaag-reflection` | today | Collapsible "Reflectie" section |
| `vandaag-mode` | today | Collapsible "Context" section (mode-specific) |
| `vandaag-weekly` | today | Collapsible "Weekoverzicht" section |
| `vandaag-history` | today | Collapsible "Geschiedenis" section |
| `dashboard-cards` | dashboard | Dashboard grid |
| `inbox-screen` | inbox | Full-page inbox |
| `lijsten-screen` | lijsten | Full-page lists |
| `planning-detail` | planning | Project detail view |
| `projects-hub` | projects | Project hub 2.0 |

---

## 4. State Management

**Not Redux, Zustand, or React Context.** Three custom systems:

### 4a. EventBus (`src/core/eventBus.js`)

Pub/sub for cross-module communication. No direct imports between blocks.

```javascript
const eventBus = createEventBus();
eventBus.on('tasks:changed', handler);
eventBus.emit('tasks:changed', { mode: 'School' });
eventBus.off('tasks:changed', handler);  // cleanup in unmount()
```

**Key events:**

| Event | Payload | Emitted by |
|-------|---------|-----------|
| `mode:changed` | `{ mode }` | modeManager |
| `tasks:changed` | — | tasks store |
| `inbox:changed` | — | inbox store |
| `inbox:open` | — | any block |
| `projects:changed` | — | projects store |
| `projects:open` | `{ projectId }` | any block |
| `daily:changed` | `{ mode, date }` | daily store |
| `lists:changed` | — | lists store |
| `bpv:changed` | — | bpv store |
| `morning:completed` | `{ mode, date }` | morning flow |

### 4b. ModeManager (`src/core/modeManager.js`)

Single source of truth for active mode. Passed into every block via `context`.

```javascript
modeManager.getMode()        // → 'School' | 'Personal' | 'BPV'
modeManager.setMode(id)      // persists to IDB + localStorage, emits mode:changed
modeManager.loadModes()      // async: hydrates from IDB on boot
modeManager.getActiveModes() // → array of active mode configs
```

**Persistence:** dual-write — `setSetting('boris_mode', id)` in IDB + `localStorage.setItem('boris_mode', id)`. Falls back to localStorage if IDB unavailable.

### 4c. FeatureFlags (`src/core/featureFlags.js`)

localStorage-backed toggles. Prefix: `ff_*`.

```javascript
getFeatureFlag('enableNewOS')    // → true (default)
getBlockFlag('vandaag')          // → false (default)
```

---

## 5. Persistence

**Two-tier: IndexedDB (primary) + localStorage (secondary)**

### IndexedDB (`src/db.js`)

- Database: `bpv-tracker`, version **8**, 31 object stores
- All async, wrapped in promise-based helpers
- Write guard: `acquireWriteGuard()` / `releaseWriteGuard()` pauses writes during bulk import

**31 Object Stores (by domain):**

| Store(s) | Purpose |
|----------|---------|
| `os_tasks` | Mode-aware tasks (replaces `os_personal_tasks`) |
| `os_inbox` | Inbox items |
| `os_projects` | Projects |
| `os_lists`, `os_list_items` | Todoist-style lists |
| `dailyPlans` | Daily plans, outcomes, todos, notes |
| `os_bpv_*` (multiple) | BPV hours, logbook, competencies |
| `os_personal_*` (legacy) | Personal wellbeing, habits (being migrated) |
| `settings` | Key-value settings store |
| `deleted` | Soft-delete tombstones (30-day TTL) |
| `mode_config` | Mode definitions + display names |
| `boris_theme` | Full theme object (accent, dark, derived tokens) |
| `tags` | Extracted #hashtag index |
| `weekly_review` | Weekly review records |

**Key patterns:**

```javascript
// CRUD
getAll('os_tasks')
getByKey('os_tasks', id)
getByIndex('os_tasks', 'mode', 'School')
put('os_tasks', record)
remove('os_tasks', id)        // hard delete
softDelete('os_tasks', id)    // → deleted store (undo-able)

// Settings
getSetting('boris_theme')
setSetting('boris_theme', obj)
```

### localStorage

| Key | Purpose |
|-----|---------|
| `boris_mode` | Current mode cache (fast read on boot) |
| `ff_*` | Feature flags |
| `ff_block_*` | Per-block feature flags |
| `boris_tutorial_*` | Seen tutorial tips (versioned) |
| `section_*` | Collapsible section open/closed per mode |

---

## 6. Styling (No Tailwind)

**Not Tailwind.** Handcrafted vanilla CSS with a structured design token system.

### CSS Architecture

```
src/styles/
  reset.css        ← CSS reset/normalisation
  variables.css    ← Design tokens (font scale, spacing, colors, shadows, transitions)
  base.css         ← App shell layout, typography, header/nav, animations (430 lines)
  components.css   ← Shared component styles
  pages.css        ← Page-specific overrides
  print.css        ← Print media styles

src/ui/
  tokens.css       ← Semantic tokens (accent, gradients, shadows)
  card.css         ← Card component
  typography.css   ← Text hierarchy
  layout.css       ← Flex layout utilities
  modal.css        ← Modal dialog
  tooltip.css      ← Tooltips
  collapsible-section.css
  command-palette.css
  morning-flow.css
  theme-studio.css
  balatro.css      ← Visual card animations
```

Import order in `src/main.js`:
```javascript
reset → variables → tokens → card → typography → layout →
balatro → tooltip → modal → base → components → pages → print
```

### Design Tokens (`src/styles/variables.css`)

CSS custom properties on `:root`. Categories:
- **Font scale:** `--font-size-xs` through `--font-size-xl`
- **Spacing:** `--space-1` through `--space-8`
- **Colors:** `--color-purple`, `--color-emerald`, `--color-blue`, etc. + light variants
- **Shadows:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- **Transitions:** `--transition-fast`, `--transition-base`

### No Tailwind — Equivalent Utilities

The codebase implements layout utilities manually in `src/ui/layout.css` (flex helpers). There is no utility-class system. All block-specific styles live in each block's own `.css` file.

---

## 7. Dark Mode Strategy

**Not a Tailwind `dark:` class strategy.** Custom attribute-based approach.

### Implementation

```
ThemeEngine (src/core/themeEngine.js)
  ↓
  Sets data-theme="dark" or data-theme="light" on <html>
  ↓
  CSS custom properties auto-update via [data-theme="dark"] selectors
```

### Three States

| `preferDark` value | Behaviour |
|--------------------|-----------|
| `null` | Follow system (`matchMedia('(prefers-color-scheme: dark)')`) |
| `true` | Force dark |
| `false` | Force light |

System preference is watched via `matchMedia.addEventListener('change', ...)` — theme updates automatically when OS switches.

### Theme Toggle Flow

```
User toggles in Theme Studio
  → setTheme({ preferDark: true/false/null })
    → persist to IDB ('boris_theme')
    → applyTheme()
      → set data-theme attribute on <html>
      → set CSS custom properties for all derived tokens
```

### Derived Accent Tokens (auto-computed from hex accent)

```css
--color-accent          /* base */
--color-accent-hover    /* darkened */
--color-accent-text     /* auto white/black (WCAG AA) */
--color-accent-light    /* tinted background */
--accent-soft           /* low-opacity background */
--accent-border         /* border with opacity */
--accent-shadow         /* shadow with accent hue */
--gradient-primary      /* gradient with darkened accent */
```

Dark mode adjusts HSL lightness/saturation of these tokens automatically.

### 5 Bundled Presets

| id | Name (NL) | Character |
|----|-----------|-----------|
| `default` | Standaard | Notion-inspired blue |
| `calm` | Rustig | Soft indigo, minimal shadows |
| `contrast` | Hoog Contrast | WCAG AAA compliance |
| `midnight` | Middernacht | Dark purple |
| `warm` | Warm | Orange earth tones |

---

## 8. Mode System

### Three Modes

| Mode id | Display name | Color | Task cap | Emoji |
|---------|-------------|-------|---------|-------|
| `School` | School | `--color-purple` | 3 | 📚 |
| `Personal` | Persoonlijk | `--color-emerald` | 5 | 🌱 |
| `BPV` | BPV | `--color-blue` | 3 | 🏢 |

### Where Mode Is Stored

```
IDB 'settings' → key: 'boris_mode'       (primary, async)
localStorage   → key: 'boris_mode'        (cache, sync, fast boot read)
IDB 'settings' → key: 'mode_config'      (full mode metadata + caps)
```

### How Mode Is Applied

```
modeManager.setMode('School')
  → setSetting('boris_mode', 'School')    ← IDB persist
  → localStorage.setItem('boris_mode',…)  ← cache
  → eventBus.emit('mode:changed', {mode}) ← all listeners re-render
    → shell.js: triggerModeWash()         ← ambient color wash animation
    → shell.js: updateModeBtn()           ← update mode badge
    → shell.js: setShellMode()            ← data-mode attr on #new-os-shell
    → shell.js: setActiveTab('today')     ← re-mount today tab
    → all blocks: listen to mode:changed  ← re-render mode-specific content
```

### Mode-Specific Behaviour

- **Block filtering:** blocks declare `modes: ['School']`; filtered in `renderHosts()`
- **Task caps:** `getTaskCap(mode)` → 3 (BPV/School), 5 (Personal)
- **Collapsible defaults:** per-mode open/closed defaults for 7 today sections
- **Auto-archival:** BPV mode archives itself after `BPV_END` (`constants.js:BPV_END`)
- **CSS attribute:** `data-mode="School"` on `#new-os-shell` for CSS mode-specific overrides

### Mode Renaming / Archiving

Users can rename display names and archive modes via Settings. Internal IDs are stable.
Archived modes hide from the picker but preserve all data.

---

## 9. Key Source Files Quick-Reference

| File | Lines | Role |
|------|-------|------|
| `src/main.js` | 208 | Boot sequence |
| `src/os/shell.js` | ~600 | OS shell, tab routing, block mounting |
| `src/os/deepLinks.js` | 119 | Hash routing + URL utilities |
| `src/core/eventBus.js` | ~50 | Pub/sub event system |
| `src/core/modeManager.js` | ~100 | Mode state + persistence |
| `src/core/blockRegistry.js` | ~60 | Block discovery + enabling |
| `src/core/themeEngine.js` | ~400 | Theme storage, dark mode, WCAG contrast |
| `src/core/modeConfig.js` | ~200 | Mode metadata, rename/archive |
| `src/core/modeCaps.js` | ~30 | Task capacity limits |
| `src/core/featureFlags.js` | ~50 | localStorage feature toggles |
| `src/db.js` | ~350 | IndexedDB CRUD layer |
| `src/blocks/registerBlocks.js` | ~100 | Imports + registers all 30 blocks |
| `src/utils.js` | ~150 | escapeHTML, dates, UUID, debounce |
| `src/constants.js` | ~120 | BPV dates, accent colors, competencies |
| `src/styles/variables.css` | 214 | Design token definitions |
| `src/styles/base.css` | 430 | App shell layout + animations |
