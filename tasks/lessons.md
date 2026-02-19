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
