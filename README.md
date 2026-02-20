# BORIS — Personal OS / Second Brain

A local-first personal productivity system built for students doing BPV (vocational training). Three context-aware modes — BPV, School, Personal — each surface only what's relevant, keeping the interface calm and focused.

---

## Modes

| Mode | Color | Description |
|------|-------|-------------|
| 🏢 BPV | Blue | Beroepspraktijkvorming — hours tracking, logbook, quick log |
| 📚 School | Purple | Opleiding & studie — deadlines, projects, next action |
| 🌱 Persoonlijk | Green | Persoonlijke groei & leven — tasks, inbox, projects |

Switch modes via the pill button in the top-right header. On first launch, a full-screen mode picker opens automatically.

---

## Features

### Universal (all modes)
- **Inbox** — Quick capture via `Ctrl+I`; process items as Task (T), Reference (R), Archive (A), Delete (D); keyboard navigation with J/K
- **Tasks** — Per-mode task list; mark done in one click
- **Projects** — Active project tracking per mode
- **Dark mode** — Toggle in Settings; persists across reloads
- **Compact mode** — Denser layout option

### BPV Mode
- **Quick Log** — Log today's hours (start, end, break) or mark as sick/absent/holiday; net hours calculated live; upsert by date (no duplicates)
- **Weekly Overview** — Color-coded progress bar (green ≥80%, amber ≥50%, red <50%), 5-day grid with icons, week navigation
- **Export** — Download all entries as CSV (`bpv-uren.csv`) or JSON (`bpv-uren.json`)

### School Mode
- **School Dashboard** — Four-section compact overview:
  - *Volgende actie* — first non-done School task; mark done with one click
  - *Aankomende deadlines* — upcoming milestones and tasks within 14 days, urgency badges, max 5
  - *BPV week* — live BPV hours progress bar without switching modes
  - *Schoolprojecten* — active School projects as purple chips

### Personal Mode
- Full task and project management scoped to Personal context

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Vanilla JS (ES2022 modules), no build-time framework |
| Build | Vite 5 |
| Storage | IndexedDB v6 (idb 8), 29 object stores |
| Testing | Vitest 2 + fake-indexeddb |
| CSS | Custom properties, CSS modules per block |
| Deployment | GitHub Pages (auto-deploy on merge to main) |

---

## Running Locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # run all 152 tests
npm run build    # production build → dist/
```

---

## Deployment

### GitHub Pages (already configured)
A GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys automatically on every merge to `main`. No setup needed — just merge your PR.

---

## Project Structure

```
src/
├── core/           # Kernel: DB, EventBus, design system, mode manager
├── os/             # OS shell: tab nav, layout, settings panel
├── stores/         # Domain stores (tasks, projects, inbox, bpv, …)
├── blocks/         # UI blocks registered to host slots per mode
│   ├── inbox/
│   ├── tasks/
│   ├── projects/
│   ├── bpv-quick-log/
│   ├── bpv-weekly-overview/
│   ├── school-dashboard/
│   └── …
└── utils.js        # Shared date/format utilities

tests/
├── stores/         # Store unit tests
├── blocks/         # Block integration tests
└── …

docs/
├── architecture.md # Module boundaries, data model, API contracts
└── demo.md         # Manual walkthrough scripts for all features

tasks/
└── todo.md         # Sprint checklists and roadmap
```

---

## Tests

152 tests across 12 test files, run with Vitest and fake-indexeddb (no browser needed):

```
tests/stores/bpv.test.js            — 20 tests  (TrackerEntry CRUD, weekly overview, export)
tests/blocks/school-dashboard.test.js — 13 tests (dashboard aggregation, deadlines, projects)
tests/stores/tasks.test.js          — …
tests/stores/projects.test.js       — …
… and more
```

---

## Data & Privacy

All data lives in your browser's IndexedDB. Nothing is sent to any server. To move your data:
- Use the **CSV** or **JSON** export buttons in the BPV Weekly Overview card
- Or open DevTools → Application → IndexedDB → `boris-os-db` to inspect raw stores

No accounts, no sync, no telemetry.
