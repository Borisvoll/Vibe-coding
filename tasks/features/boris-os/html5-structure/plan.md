# HTML5 Semantic Structure — Implementation Plan

## Architectural Principle
> index.html bevat shell + route templates; router mount templates per route; blocks hydraten alleen binnen hun root.

## Phases

### Phase 0 — Preparation ✅
- [x] Audit shell.js (912 lines), main.js, index.html, blockRegistry, router
- [x] Verify baseline: 484 tests pass across 29 files
- [x] No tests reference shell.js or createOSShell

### Phase 1 — Semantic Shell
- [ ] Move shell HTML template (shell.js lines 48-286) into index.html
- [ ] Hardcode static parts: mode cards, accent colors, theme switcher, nav buttons
- [ ] Leave dynamic placeholders: date labels, mode state, vandaag header
- [ ] Convert shell.js from `app.innerHTML = template` to find-and-hydrate
- [ ] Keep legacy fallback (clears #app on legacy path)
- [ ] Tests pass

### Phase 2 — Unified Router
- [ ] Single router for 14 routes (7 primary + 4 BPV + drill-down + sub-routes)
- [ ] Kill legacy dual-path (remove enableNewOS feature flag)
- [ ] Delete: src/components/shell.js, old src/router.js, src/shortcuts.js

### Phase 3 — Block Hydration
- [ ] Convert 31 blocks one-by-one from "create DOM" to "find existing DOM and fill data"
- [ ] One commit per block

### Phase 4 — Legacy Pages
- [ ] Integrate Hours, Logbook, Settings (with export/sync/diagnostics)
- [ ] Drop 13 informational pages

### Phase 5-6 — CSS + Polish
- [ ] Token consolidation
- [ ] Hardcoded value cleanup
- [ ] Accessibility audit
- [ ] Lighthouse >= 95
