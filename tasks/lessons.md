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
