# Review Notes — HTML5-first Refactor

## Phase 0 — Baseline (2026-02-20)
**What was done:**
- Audited full codebase: shell.js (912 lines), main.js (224 lines), router.js (130 lines)
- 41 blocks registered, 21 legacy pages, 13 host slots identified
- 484 tests pass across 29 files (baseline)
- No tests reference shell.js or createOSShell — safe to refactor

**Decisions made:**
- Template-based routing (NOT permanent DOM sections) per user directive
- Shell chrome in index.html, route content in `<template>` elements
- Router clones templates into `<main data-route-container>`
- Legacy path preserved temporarily (cleared in Phase 2)

**What's next:** Phase 1 — template-based shell
