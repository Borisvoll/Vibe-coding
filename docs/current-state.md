# Current State — Inventory

> Snapshot taken 2026-02-19 from branch `claude/netlify-cli-setup-KOPE6`

---

## App Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | Vanilla JS (ES2022) | Zero framework, zero runtime deps |
| Build | Vite 5.4 | Dev server on :3000, target ES2022 |
| Storage | IndexedDB v5 | 28 object stores, offline-first |
| Hosting | Netlify (configured) | `netlify-cli` in devDeps, deploy scripts in package.json |
| PWA | Service worker + manifest | Cache-first strategy, versioned cache names |
| Dependencies | **2 devDeps only** | `vite` + `netlify-cli` — nothing else |

**Base path:** `/Vibe-coding/` (GitHub Pages compatible via `vite.config.js`)

---

## Folder Structure

```
Vibe-coding/
├── index.html              # Single HTML shell, loads main.js
├── package.json            # bpv-tracker@1.0.0, 2 devDeps
├── vite.config.js          # ES2022 target, base: /Vibe-coding/
├── public/
│   ├── sw.js               # Service worker (cache-first)
│   ├── manifest.json       # PWA manifest
│   └── favicon.svg
├── src/
│   ├── main.js             # Bootstrap (167 lines) — dual path: OS shell vs legacy
│   ├── db.js               # IndexedDB v5 (415 lines) — all CRUD helpers
│   ├── router.js           # Hash-based SPA router (115 lines)
│   ├── state.js            # Minimal state bus (19 lines)
│   ├── constants.js        # BPV dates, tags, competencies, accent colors
│   ├── utils.js            # Date formatting, escapeHTML, helpers
│   ├── icons.js            # Inline SVG icon library
│   ├── shortcuts.js        # Keyboard shortcut handler
│   ├── toast.js            # Toast notification component
│   ├── version.js          # APP_VERSION export
│   ├── crypto.js           # UUID / crypto helpers
│   ├── seed.js             # Demo data seeder
│   ├── sync.js             # Sync protocol (import/export JSON)
│   ├── auto-sync.js        # Auto-sync scheduler
│   ├── core/               # Kernel framework (7 files)
│   │   ├── eventBus.js     # Pub/sub: on(), off(), emit(), clear()
│   │   ├── modeManager.js  # 3-mode lens: BPV / School / Personal
│   │   ├── blockRegistry.js# Block registration + discovery
│   │   ├── featureFlags.js # localStorage-backed runtime flags
│   │   ├── modeCaps.js     # Task capacity per mode (3/3/5)
│   │   ├── designSystem.js # CSS custom properties via JS
│   │   └── migrationManager.js # Append-only schema versioning
│   ├── os/
│   │   └── shell.js        # BORIS OS shell (178 lines) — tabs, hosts, blocks
│   ├── stores/             # CRUD adapters (2 files)
│   │   ├── inbox.js        # os_inbox CRUD
│   │   └── tasks.js        # os_tasks CRUD
│   ├── blocks/             # 17 UI blocks + template + registry
│   │   ├── registerBlocks.js   # Registers all blocks on startup
│   │   ├── settings-panel.js   # Settings block (inline, not folder)
│   │   ├── styles.css          # Shared block styles
│   │   ├── _template/          # Block scaffold template
│   │   ├── inbox/              # Inbox capture block
│   │   ├── tasks/              # Mode-filtered task list
│   │   ├── bpv-today/          # BPV daily summary
│   │   ├── bpv-mini-card/      # BPV dashboard card
│   │   ├── bpv-log-summary/    # BPV hours + logbook summary
│   │   ├── school-today/       # School daily summary
│   │   ├── school-mini-card/   # School dashboard card
│   │   ├── school-current-project/
│   │   ├── school-milestones/
│   │   ├── school-skill-tracker/
│   │   ├── school-concept-vault/
│   │   ├── personal-today/     # Personal daily summary
│   │   ├── personal-mini-card/ # Personal dashboard card
│   │   ├── personal-energy/    # Energy + mood tracker
│   │   ├── personal-week-planning/
│   │   └── personal-weekly-reflection/
│   ├── pages/              # 18 legacy pages (hash-routed)
│   │   ├── dashboard.js    ├── hours.js        ├── logbook.js
│   │   ├── hours-entry.js  ├── logbook-entry.js├── planning.js
│   │   ├── today.js        ├── goals.js        ├── competencies.js
│   │   ├── quality.js      ├── learning-moments.js
│   │   ├── notebook.js     ├── reference.js    ├── vault.js
│   │   ├── assignments.js  ├── process-map.js  ├── report.js
│   │   ├── settings.js     ├── export.js       ├── sync.js
│   │   └── diagnostics.js
│   ├── components/
│   │   └── shell.js        # Legacy shell (sidebar + content area)
│   └── styles/             # 6 CSS files
│       ├── reset.css       ├── variables.css   ├── base.css
│       ├── components.css  ├── pages.css       └── print.css
├── docs/
│   ├── architecture.md     # System overview + block contract (modified, staged)
│   ├── design-principles.md# UI rules, accessibility, theming
│   └── boris-os-plan.md    # Original BORIS OS migration plan
└── tasks/
    ├── todo.md             # Sprint checklist (modified, staged)
    └── lessons.md          # Correction rules / lessons learned
```

---

## Storage: IndexedDB v5 — 28 Stores

### Schema Evolution
| Version | What was added |
|---------|---------------|
| v1 | `hours`, `logbook`, `photos`, `settings`, `deleted`, `competencies`, `assignments`, `goals`, `quality`, `dailyPlans`, `weekReviews` |
| v2 | `learningMoments`, `reference`, `vault`, `vaultFiles`, `energy` |
| v3 | `os_school_projects`, `os_school_milestones`, `os_school_skills`, `os_school_concepts` |
| v4 | `os_personal_tasks`, `os_personal_agenda`, `os_personal_actions`, `os_personal_wellbeing`, `os_personal_reflections`, `os_personal_week_plan` |
| v5 | `os_inbox`, `os_tasks` (unified mode-aware stores) |

### Store Groups
- **BPV Tracking (7):** hours, logbook, photos, competencies, assignments, goals, quality
- **Planning (3):** dailyPlans, weekReviews, energy
- **Knowledge (4):** learningMoments, reference, vault, vaultFiles
- **School OS (4):** os_school_projects, os_school_milestones, os_school_skills, os_school_concepts
- **Personal OS (6):** os_personal_tasks, os_personal_agenda, os_personal_actions, os_personal_wellbeing, os_personal_reflections, os_personal_week_plan
- **Unified (2):** os_inbox, os_tasks
- **System (2):** settings, deleted

### CRUD Pattern
`db.js` exports generic helpers: `getAll(store)`, `getById(store, id)`, `put(store, data)`, `del(store, id)`, `getByIndex(store, index, value)`, `softDelete(store, id)`, `getSetting(key)`, `setSetting(key, value)`, `exportAllData()`, `clearAllData()`.

Store adapters in `src/stores/` wrap these for specific domains (currently only `inbox.js` and `tasks.js`).

---

## Dual Architecture: Legacy vs BORIS OS

### Legacy Path (feature flag off)
- `main.js` → `initLegacy()` → `createShell()` + `createRouter()`
- Sidebar navigation → hash routes → lazy-loaded pages
- Full BPV tracker: hours logging, logbook, goals, competencies, quality, assignments, export, sync

### BORIS OS Path (feature flag on — **current default**)
- `main.js` → `initNewOSShell()` → `createOSShell()` with EventBus + ModeManager + BlockRegistry
- Tab navigation: Dashboard / Vandaag / Planning / Reflectie / Archief
- 3-mode lens: BPV / School / Personal (filters blocks, not separate apps)
- Block system: 17 registered blocks mount into host slots
- Host slots: `today-sections` (vertical stack), `dashboard-cards` (grid), `vandaag-widgets` (grid)

### How They Coexist
- Feature flag `enableNewOS` (default: `true`) gates the path
- Legacy preserved intact — toggle `ff_enableNewOS=false` in localStorage
- Try/catch around OS shell init falls back to legacy on error
- OS blocks can deep-link to legacy pages via hash routes

---

## BPV Tracker Features (What Works Today)

| Feature | Status | Where |
|---------|--------|-------|
| Hours logging (per day) | Working | Legacy page `#hours`, `#hours/:date` |
| Logbook entries (daily reflection) | Working | Legacy page `#logbook`, `#logbook/new`, `#logbook/:id` |
| Photo attachments on logbook | Working | Legacy logbook-entry page |
| Competency meter (12 skills, 4 levels) | Working | Legacy page `#competencies` |
| SMART learning goals | Working | Legacy page `#goals` |
| Quality assurance (kwaliteitsborging) | Working | Legacy page `#quality` |
| Assignments (3 types: leerdoelen, product, reflectie) | Working | Legacy page `#assignments` |
| Daily plan (top 3 + evaluation) | Working | Legacy page `#planning` |
| Weekly review | Working | Legacy page `#planning` (via weekReviews store) |
| Process map (visual workflow) | Working | Legacy page `#process-map` |
| Reference library | Working | Legacy page `#reference` |
| Learning moments analysis | Working | Legacy page `#learning-moments` |
| Knowledge vault | Working | Legacy page `#vault` |
| Notebook | Working | Legacy page `#notebook` |
| Full data export (JSON) | Working | Legacy page `#export` |
| Sync (device-to-device JSON) | Working | Legacy page `#sync` |
| Settings (theme, accent, compact) | Working | Both paths |
| BPV summary on Today page | Working | BORIS OS block `bpv-log-summary` |
| Unified inbox (capture thoughts/links) | Working | BORIS OS block `inbox` |
| Mode-aware tasks (BPV/School/Personal) | Working | BORIS OS block `tasks` |
| Dark mode | **Broken** | Staged fix in main.js (applyUserSettings) |

---

## What's Missing / Not Yet Built

- Planning, Reflectie, and Archief tabs in BORIS OS shell (placeholder text only)
- No backend / no server / no auth
- No multi-device sync (scaffolding exists but no server)
- No tests (zero test files in the repo)
- No CI/CD pipeline
- No TypeScript / no type safety
- Module boundaries are informal (no `src/modules/` structure yet)
- `os_personal_*` stores partially overlap with `os_tasks` (migration pending)
