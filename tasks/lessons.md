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
