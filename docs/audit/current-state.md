# BORIS OS — Architecture Current State

**Audit date:** 2026-02-21
**Branch:** `claude/refactor-getweekdates-h5JTc`
**Tests:** 495 passing / 29 files
**Build:** green (Vite 5, 247 KB gzip)

---

## 1. High-Level Architecture

```
                  ┌──────────────────────────┐
                  │        index.html         │
                  │  <div id="app" />         │
                  └────────────┬─────────────┘
                               │
                  ┌────────────▼─────────────┐
                  │       src/main.js         │
                  │  - CSS imports (13 files) │
                  │  - initDB()               │
                  │  - applyDesignTokens()    │
                  │  - createRoot(app)        │
                  │  - render(<App />)        │
                  └────────────┬─────────────┘
                               │
                  ┌────────────▼─────────────┐
                  │     React App (Shell)     │
                  │  HashRouter → Routes      │
                  │  EventBusProvider          │
                  │  ModeProvider             │
                  └────────────┬─────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
   ┌──────▼──────┐    ┌───────▼───────┐    ┌───────▼───────┐
   │  Dashboard   │    │  7 Placeholder │    │  Shell Chrome  │
   │  (React,     │    │  Routes (10    │    │  Sidebar       │
   │   149 LOC)   │    │  LOC each)     │    │  MobileNav     │
   └──────────────┘    └───────────────┘    │  ModePicker    │
                                            └───────────────┘
```

**Current state:** React Router owns routing. Only Dashboard.jsx is functional. 7 route pages show "wordt gemigreerd naar React" placeholders. The 31 vanilla blocks that powered the full UI are registered but have NO host slots to mount into (the `<template>` elements from Phase 1-2 were removed when React was introduced).

---

## 2. Routing

| Aspect | Implementation | File |
|--------|---------------|------|
| **Router** | React Router v7, HashRouter | `src/react/App.jsx:18` |
| **Routes** | 8 routes + catch-all | `src/react/App.jsx:19-31` |
| **Navigation** | `useNavigate()` in Shell | `src/react/components/Shell.jsx:17-19` |
| **URL format** | `#/today`, `#/projects/abc123` | HashRouter convention |
| **Legacy deepLinks** | Still present, unused | `src/os/deepLinks.js` (119 lines) |
| **Legacy shell.js** | Still present, unused | `src/os/shell.js` (716 lines) |

### Active Routes

| Path | Component | Status | LOC |
|------|-----------|--------|-----|
| `/` | Navigate → `/today` | redirect | - |
| `/dashboard` | Dashboard.jsx | **Fully implemented** | 149 |
| `/today` | Today.jsx | Placeholder | 24 |
| `/inbox` | Inbox.jsx | Placeholder | 10 |
| `/lijsten` | Lijsten.jsx | Placeholder | 10 |
| `/planning` | Planning.jsx | Placeholder | 10 |
| `/projects` | Projects.jsx | Placeholder | 10 |
| `/projects/:id` | ProjectDetail.jsx | Placeholder | 22 |
| `/settings` | Settings.jsx | Placeholder | 10 |
| `/*` | Navigate → `/today` | catch-all | - |

---

## 3. UI Systems

### 3a. Vanilla Block System (dormant)

- **31 registered blocks** in `src/blocks/registerBlocks.js`
- **12 unregistered blocks** (built but never wired)
- **~4,543 LOC** across view.js files
- **All use** innerHTML + addEventListener DOM pattern
- **XSS-safe** via `escapeHTML()` from `src/utils.js`
- **Host slots**: 13 slots (`vandaag-hero`, `vandaag-tasks`, `dashboard-cards`, etc.)
- **Status**: Blocks are registered in the registry but have no host elements to mount into because `index.html` no longer contains `<template>` elements or `[data-os-host]` slots

### 3b. React Components (active)

| File | Purpose | LOC |
|------|---------|-----|
| `src/react/App.jsx` | Router + providers | 37 |
| `src/react/components/Shell.jsx` | Layout shell | 86 |
| `src/react/components/Sidebar.jsx` | Navigation | 110 |
| `src/react/components/MobileNav.jsx` | Mobile nav | 28 |
| `src/react/components/ModePicker.jsx` | Mode switch | 62 |
| `src/react/components/VanillaBridge.jsx` | Vanilla mount adapter | 31 |
| `src/react/hooks/useMode.jsx` | Mode context | 66 |
| `src/react/hooks/useEventBus.jsx` | EventBus context | 40 |
| `src/react/routes/Dashboard.jsx` | Dashboard page | 149 |
| `src/react/routes/Today.jsx` | Placeholder | 24 |
| 7 more route placeholders | Stubs | ~10 each |
| **Total** | | **~685** |

### 3c. VanillaBridge (unused)

`src/react/components/VanillaBridge.jsx` exists but is never imported by any route component. It's the intended mechanism for mounting vanilla blocks inside React routes during incremental migration.

---

## 4. Styling Systems

### Token Architecture (well-structured)

```
variables.css (raw tokens: --color-*, --space-*, --font-*, --radius-*, --shadow-*)
     ↓
tokens.css (semantic aliases: --ui-surface, --ui-text, --ui-card-*)
     ↓
tailwind.css (@theme bridge: maps CSS vars → Tailwind utilities)
     ↓
Tailwind v4 utilities in React JSX
```

### CSS File Inventory

| Category | Files | Purpose |
|----------|-------|---------|
| Core styles | `reset.css`, `variables.css`, `tokens.css` | Foundation + tokens |
| UI components | `card.css`, `typography.css`, `layout.css`, `balatro.css` | Shared UI primitives |
| Page styles | `base.css`, `components.css`, `pages.css`, `print.css` | Legacy page styles |
| Block styles | 26 files in `src/blocks/*/styles.css` | Per-block CSS |
| UI components | `collapsible-section.css`, `command-palette.css`, `modal.css`, `tooltip.css`, `theme-studio.css` | Widget CSS |
| Tailwind | `src/react/tailwind.css` | Tailwind v4 @theme bridge |
| **Total** | **~50 CSS files** | |

### Tailwind Usage

Dashboard.jsx uses `text-[var(--color-text)]` arbitrary values instead of the shorter mapped utilities (`text-text`). This is verbose but functionally correct — all values reference CSS custom properties, so dark mode and themes work.

---

## 5. State & Communication

### Event Bus (9 events)

| Event | Publishers | Subscribers |
|-------|-----------|-------------|
| `mode:changed` | ModeManager | Shell, all blocks, React useMode |
| `tasks:changed` | Task blocks | Dashboard, Cockpit, blocks |
| `projects:changed` | Project blocks | Dashboard, Cockpit, blocks |
| `inbox:changed` | Inbox blocks | Dashboard, Cockpit, blocks |
| `inbox:open` | Cockpit | Shell (tab switch) |
| `lists:changed` | Lijsten blocks | Lijsten, Command Palette |
| `daily:changed` | Daily blocks | Daily Outcomes, Cockpit |
| `bpv:changed` | (not emitted) | Dashboard, Cockpit |
| `projects:open` | Project Hub | Project Hub (internal) |

### Store Adapters (13, framework-agnostic)

All in `src/stores/`. Import only `db.js` and `utils.js`. Zero React dependencies.

### Mode State (triple-stored)

1. `localStorage` (boris_mode) — fast boot
2. IndexedDB (setSetting) — canonical persistence
3. React useState in ModeProvider — UI reactivity
4. Vanilla modeManager.currentMode — legacy blocks

Synchronized via EventBus `mode:changed` event.

---

## 6. Test Infrastructure

| Metric | Value |
|--------|-------|
| Test files | 29 |
| Test cases | ~508 (495 passing) |
| Framework | Vitest 4.0.18 + fake-indexeddb 6.2.5 |
| Environment | Node.js (no DOM, no jsdom) |
| React tests | **0** (no @testing-library/react) |
| Store coverage | 13/13 (100%) |
| Block render tests | 0 (tested indirectly via stores) |
| Skipped tests | 0 |

---

## 7. Key Files Map

| File | LOC | Role | Status |
|------|-----|------|--------|
| `src/main.js` | 178 | App bootstrap | Active (React mount) |
| `src/react/App.jsx` | 37 | React router | Active |
| `src/react/components/Shell.jsx` | 86 | React shell | Active |
| `src/os/shell.js` | 716 | Legacy vanilla shell | **DEAD** |
| `src/os/deepLinks.js` | 119 | Legacy hash routing | **DEAD** |
| `src/core/eventBus.js` | 29 | Pub/sub | Active (shared) |
| `src/core/modeManager.js` | 46 | Mode state | Active (shared) |
| `src/core/blockRegistry.js` | 42 | Block registry | Active (no hosts) |
| `src/core/featureFlags.js` | ~15 | Feature flags | **DEAD** |
| `src/db.js` | ~300 | IndexedDB CRUD | Active |
| `src/blocks/registerBlocks.js` | 102 | Block registration | Active (no hosts) |
| `src/pages/*.js` | 20 files | Legacy pages | **DEAD** |
