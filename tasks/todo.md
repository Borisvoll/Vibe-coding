# BORIS OS — Implementation Plan

## Vision
Evolve the existing BPV Tracker into BORIS OS: a modular, offline-first Personal Operating System with three modes (BPV, School, Personal).

---

## Milestone 1: Core Architecture (DONE)
- [x] Create `src/core/eventBus.js` — pub/sub communication
- [x] Create `src/core/modeManager.js` — BPV/School/Personal mode engine
- [x] Create `src/core/blockRegistry.js` — block registration system
- [x] Create `src/core/featureFlags.js` — enable/disable blocks
- [x] Create `src/core/designSystem.js` — design tokens
- [x] Create `src/core/blockLoader.js` — registers all blocks

### Review
Core architecture is clean and modular. Each module has a single responsibility. Blocks self-register with capabilities (mode, nav, stores, routes).

---

## Milestone 2: School Mode Blocks (IN PROGRESS)
- [x] `blocks/school-today/index.js` — daily focus (max 3 tasks, notes)
- [x] `blocks/school-dashboard/index.js` — project overview, skills stats
- [x] `blocks/school-projects/index.js` — CRUD for school projects
- [ ] `blocks/school-planning/index.js` — milestones, timeline, deadlines
- [ ] `blocks/school-concepts/index.js` — Concept Vault (own-words explanations)
- [ ] `blocks/school-skills/index.js` — Skill Tracker (CNC, CAD, etc.)
- [ ] `blocks/school-reflectie/index.js` — weekly learning synthesis

---

## Milestone 3: Personal Mode Blocks
- [ ] `blocks/personal-today/index.js` — daily focus, energy, mood, gratitude
- [ ] `blocks/personal-dashboard/index.js` — focus, energy, mood overview
- [ ] `blocks/personal-planning/index.js` — week overview, life goals
- [ ] `blocks/personal-reflectie/index.js` — weekly life review, balance

---

## Milestone 4: System Blocks
- [ ] `blocks/archief/index.js` — yearly archive, semester grouping
- [ ] `blocks/search/index.js` — global search across modes

---

## Milestone 5: Integration & Wiring
- [ ] Update `main.js` — use block registry, init mode manager
- [ ] Update `router.js` — route through block registry
- [ ] Update `components/shell.js` — mode switcher, dynamic nav
- [ ] Update `db.js` — add new stores (v5 schema migration)
- [ ] Update CSS — mode colors, BORIS OS branding, new component styles

---

## Milestone 6: PWA & Polish
- [ ] Update `manifest.json` — BORIS OS naming
- [ ] Update `sw.js` — versioned cache
- [ ] Test offline behavior
- [ ] Test mode switching
- [ ] Test data migration from v4 to v5

---

## Milestone 7: Commit & Push
- [ ] Final commit with all changes
- [ ] Push to feature branch
