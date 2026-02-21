# Lessons Learned

Rules added after corrections to prevent recurring mistakes.

---

## 1. Block entrance animations are required (2026-02-19)

**Issue:** Mode switching logic was correct but users perceived it as broken because blocks appeared/disappeared without visual feedback.

**Prevention:** Every block mounted into an OS host must have an entrance animation. Use the `block-enter` keyframes on `.os-mini-card` and host children (`.os-host-stack > *`, `.os-host-grid > *`). Assign `--stagger` CSS variable in `renderHosts()` for sequential entrance.

## 2. Avoid double-wrapping icon elements (2026-02-19)

**Issue:** The `icon()` function in `src/icons.js` already wraps SVGs in `<span class="nav-icon">`. Legacy shell.js also wrapped the result in `<span class="nav-icon">`, creating double-nested elements that broke mobile icon rendering.

**Prevention:** Use `icon()` directly without additional wrapping. Check for existing wrapper elements before adding new ones.

## 3. Mobile CSS needs transitions matching desktop (2026-02-19)

**Issue:** Desktop sidebar icons had smooth opacity transitions but mobile breakpoint lacked them, causing icons to snap between states.

**Prevention:** When adding transitions for desktop, always check the mobile breakpoint (`@media (max-width: 767px)`) for the same properties. Use CSS variables for consistent durations.

## 4. Default mode should match user's primary context (2026-02-19)

**Issue:** BPV was hardcoded as default mode, but most users are students who primarily use School/Personal modes.

**Prevention:** Default to the most common use case (School). Respect persisted mode from localStorage. BPV should be available but not dominant.

## 5. Mode switches need multi-layered visual feedback (2026-02-19)

**Issue:** Mode switching logic worked correctly (blocks remounted, events fired) but users perceived it as "nothing changed" because: (a) shared blocks dominate the today view, (b) no persistent mode-colored accent in the content area, (c) content swap was instantaneous with no crossfade, (d) ambient wash was too subtle at 8% opacity.

**Prevention:** Mode changes must have at least 3 layers of visual feedback: (1) header pill label + dot color update, (2) mode-colored accent on nav bar and active tab via `--mode-accent` CSS variable + `data-mode` attribute, (3) content crossfade (120ms fade-out → remount → 300ms fade-in). Set `data-mode` on the shell root element so CSS can react globally to mode changes.

## 6. Section titles must show current mode context (2026-02-19)

**Issue:** Section titles ("Vandaag", "Dashboard") were static. Users switching modes saw no change in the content area because the 7 shared blocks dominated the view and the tiny header pill was the only mode indicator.

**Prevention:** Every section title that shows mode-filtered content must include a mode badge: `"Vandaag — School 📚"`. Use `updateSectionTitles(mode)` in the shell, called on init + mode:changed. The badge uses `--badge-color` CSS variable for mode-colored styling.

## 7. Empty host slots kill perceived functionality (2026-02-19)

**Issue:** The Dashboard tab had zero School-specific blocks registered for `dashboard-cards`. Users on School mode saw only the Inbox widget, making the Dashboard feel broken/empty.

**Prevention:** Every host slot must have meaningful content for ALL modes. If mode-specific blocks don't exist, register a cross-mode synopsis block (like the main-dashboard widget grid) that shows mode-aware data. Check the block host analysis table before shipping.

## 8. IndexedDB unique indexes prevent multi-key storage (2026-02-19)

**Issue:** `dailyPlans` store had `date` as a UNIQUE index (v1). This prevented storing multiple entries per date (one per mode), because IndexedDB unique indexes reject duplicate values.

**Prevention:** When a store needs composite natural keys (e.g. date+mode), use a composite string id (`${date}__${mode}`) as the keyPath, and make all secondary indexes non-unique. Plan for multi-tenant keys from day 1. Changing a unique index to non-unique requires a DB version bump + cursor migration.

## 9. Always audit existing test files when changing public API (2026-02-19)

**Issue:** Two test files (`tests/stores/daily.test.js` and `tests/stores/daily-outcomes.test.js`) used the old `getDailyEntry(date)` and `saveDailyEntry({ date, tasks })` signatures. Changing the store's public API to require `mode` broke 15 existing tests.

**Prevention:** Before changing any exported function's signature, `grep` all test files for the function name. Update all call sites in tests before running the suite. Consider backwards-compatible overloads only when migration cost is high.

## 10. Never hardcode colors or magic numbers in block CSS (2026-02-19)

**Issue:** 16 instances of `999px` border-radius, 4 instances of `#fff`, and several hardcoded hex colors (`#ef4444`, `#f59e0b`, `#d1d5db`) were found across block CSS files. These break dark mode and prevent theme customization.

**Prevention:** Always use CSS variables from `variables.css` or `tokens.css`. Use `var(--radius-full)` not `999px`, `var(--color-accent-text)` not `#fff`, `var(--color-error)` not `#ef4444`. Run `grep -r "999px\|#fff\|#ef4444" src/blocks/` before shipping.

## 11. Navigation must be mode-independent (2026-02-19)

**Issue:** The horizontal tab bar felt unstable because it mixed content-level concepts (Reflectie, Archief) with navigation concepts. Users couldn't tell what changed on mode switch because the nav itself was identical but content was insufficient.

**Prevention:** Navigation structure (sidebar/tabs) must be fixed and mode-independent. Mode only affects *content* inside sections, never the nav items themselves. Use mode accent color on the active indicator to subtly communicate current mode without changing structure. Dashboard is always "home" — reachable from everywhere.

## 12. Audit all block hosts after renaming host slots (2026-02-20)

**Issue:** When restructuring the Vandaag page from a single `today-sections` host to hierarchical zones (`vandaag-hero`, `vandaag-core`, etc.), 6 blocks were missed and still referenced the deleted `today-sections` or non-existent `vandaag-widgets` hosts. These blocks became completely invisible — no errors, no warnings, just silently unrendered.

**Prevention:** After renaming or deleting any host slot, run `grep -r "hosts:" src/blocks/` and verify every block's `hosts` array references a host that exists in the shell HTML. The block registry silently skips unmatched hosts, so orphaned blocks produce zero runtime errors. Create a checklist of all registered blocks before and after a host migration.

## 13. Competing task stores create data islands (2026-02-20)

**Issue:** Mode-specific "today" blocks (school-today, personal-today) each used their own IndexedDB stores (`os_school_milestones`, `os_personal_tasks`) for task-like data, while the generic `tasks` block used `os_tasks`. Tasks added in one store didn't appear in the other, even though both rendered in the same host slot. Users saw two task input forms and couldn't understand why their tasks "disappeared."

**Prevention:** All task-like data must flow through a single canonical store (`os_tasks`). Mode-specific blocks should use the shared store adapter (`stores/tasks.js`) with mode filtering, not create private task stores. Before adding a new store, ask: "Does `os_tasks` already handle this data type with mode+date filtering?" If yes, use it. One store, one truth.

## 14. Dashboard card sprawl follows incremental addition (2026-02-20)

**Issue:** Each mode accumulated dashboard-only cards incrementally (mini-cards, milestones, skill-tracker, concept-vault, energy, week-planning, weekly-reflection). School mode ended up with 8 dashboard cards. No budget was enforced, creating visual clutter.

**Prevention:** Set a dashboard card budget per mode (max 4). New dashboard blocks must justify their existence by replacing an existing card or merging into the main-dashboard widget grid. Run `grep -c "dashboard-cards" src/blocks/*/index.js` to count current card count before adding new ones.

## 15. Dashboard must be read-only and navigational (2026-02-20)

**Issue:** The original dashboard (6-widget grid) included a "Snel vastleggen" capture form — an input field that duplicated the inbox capture on the Vandaag page. Users didn't know which capture to use. The capture form also had to be carefully managed (one-time setup outside loadData) to avoid losing user input during event-driven refreshes.

**Prevention:** Dashboard is a read-only synopsis layer. It shows summaries and navigates to the relevant section for interaction. No `<input>`, `<form>`, or `<textarea>` on the dashboard. All editing happens in Vandaag/Inbox/Lijsten tabs. Apply the "3 layers" principle: Layer 1 = Intent (greeting + Top 3), Layer 2 = Snapshot (navigational pulse rows), Layer 3 = Collapsible depth (closed by default).

## 16. Never remove DOM host slots without wiring replacements first (2026-02-21)

**Issue:** The React migration simplified `index.html` to `<div id="app">`, removing all `<template data-route="...">` elements and `[data-os-host]` divs. This made 7/8 routes non-functional because 31 vanilla blocks had no host slots to mount into. The app appeared to work (React shell rendered) but was useless (all pages showed placeholder text).

**Prevention:** Before deleting any host infrastructure (templates, host slots, mount points), verify that a replacement delivery mechanism exists. Use VanillaBridge to mount vanilla blocks inside React routes during incremental migration. Test each route after infrastructure changes. "It renders" is not "it works."

## 17. Audit before building: know what you have (2026-02-21)

**Issue:** Feature additions accumulated over multiple sessions without periodic review: 12 unregistered blocks, 20 dead page files, ~716 LOC dead shell, competing task stores. Technical debt compounded silently because nothing threw errors — blocks with bad host mappings simply didn't render.

**Prevention:** Before starting a new feature sprint, run the audit checklist (`docs/audit/rerun-checklist.md`). Count: registered vs unregistered blocks, active vs dead routes, used vs unused CSS files. Set a "dead code budget" (e.g., max 5% of codebase). Silent failures are worse than loud ones.
