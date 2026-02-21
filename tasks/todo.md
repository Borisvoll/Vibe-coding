# Personal OS / Second Brain — Todo

---

## Milestone: Design System + Theme Fix

**Date:** 2026-02-21
**Docs:** `docs/design-system.md`, `docs/tailwind-guidelines.md`, `docs/theme-system.md`

### Phase A — Tailwind Installation (zero UI change, additive only)

- [ ] **A1** `package.json` — add devDependencies:
  - `tailwindcss` `^3.x`
  - `@tailwindcss/vite` (or `postcss` + `autoprefixer` if using PostCSS path)
  - `clsx` `^2.x`
  - `tailwind-merge` `^2.x`

- [ ] **A2** `tailwind.config.js` — create with:
  - `content: ['./index.html', './src/**/*.js']`
  - `darkMode: ['selector', '[data-theme="dark"]']`
  - `theme.extend.colors` — map all semantic names to `var(--...)` tokens
    (full list in `docs/tailwind-guidelines.md`)
  - `theme.extend.fontSize` — map all `--font-*` vars
  - `theme.extend.spacing` — map all `--space-*` vars
  - `theme.extend.borderRadius` — map `--radius-*` vars
  - `theme.extend.boxShadow` — map `--shadow-*` vars

- [ ] **A3** `postcss.config.js` — create (or use `@tailwindcss/vite` plugin):
  ```javascript
  export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
  ```

- [ ] **A4** `src/main.js` — add Tailwind CSS import at the top:
  ```javascript
  import 'tailwindcss/tailwind.css'; // or '@tailwindcss/base' etc.
  ```
  Verify existing CSS still loads in correct order after.

- [ ] **A5** `src/utils/cn.js` — create `cn()` utility:
  ```javascript
  import { clsx } from 'clsx';
  import { twMerge } from 'tailwind-merge';
  export function cn(...inputs) { return twMerge(clsx(inputs)); }
  ```

- [ ] **A6** Smoke test: `npm run dev` → app renders, no visual change,
  DevTools shows Tailwind classes are available.

- [ ] **A7** `npm test` — all 658 tests still pass.

---

### Phase B — Theme System Fix

- [ ] **B1** `src/core/themeEngine.js` — migrate `preferDark` representation:
  - Change type: `null/true/false` → `'system'/'light'/'dark'`
  - Add migration shim in `initTheme()` to convert old stored values
  - Update `DEFAULT_THEME` to use `preferDark: 'system'`

- [ ] **B2** `src/core/themeEngine.js` — fix `applyTheme()`:
  - Always set `data-theme` attribute (never absent)
  - Resolve `'system'` by reading `matchMedia` at call time
  - Export `getThemePreference()` → `'light' | 'dark' | 'system'`

- [ ] **B3** `src/core/themeEngine.js` — fix `matchMedia` listener:
  - Only re-apply theme when `preferDark === 'system'`
  - Listener already registered — just add the guard condition

- [ ] **B4** `src/core/themeEngine.js` — add `localStorage` cache write:
  - On every `setTheme()` call, also write to
    `localStorage.setItem('boris_theme_cache', JSON.stringify({preferDark}))`
  - Used by the FOUC-prevention script

- [ ] **B5** `src/styles/variables.css` — clean up duplicate dark tokens:
  - Keep `[data-theme="dark"]` block (unchanged)
  - Add `[data-theme="light"]` block with explicit light values (prevents flash)
  - Remove OR comment-out the `@media (prefers-color-scheme: dark)` block
    (JS now sets `data-theme` reliably; the media query is a pre-JS fallback only)
  - If removing the media query: add inline script to `index.html` first (B6)
    so there's no window where neither the media query nor the attribute applies

- [ ] **B6** `index.html` — add FOUC-prevention inline script in `<head>`:
  ```html
  <script>
    (function() {
      try {
        const t = JSON.parse(localStorage.getItem('boris_theme_cache') || '{}');
        const pref = t.preferDark || 'system';
        const dark = pref === 'dark' ||
          (pref === 'system' &&
           window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.setAttribute(
          'data-theme', dark ? 'dark' : 'light');
      } catch(e) {}
    })();
  </script>
  ```
  Place immediately after `<meta charset>`, before any CSS `<link>`.

- [ ] **B7** `src/blocks/settings-panel.js` — update theme toggle:
  - Import `getThemePreference` from `themeEngine.js`
  - Replace boolean toggle with 3-button group: `System | Light | Dark`
  - On render: highlight the button matching `getThemePreference()`
  - On click: `setTheme({ preferDark: 'light' | 'dark' | 'system' })`

- [ ] **B8** `src/ui/theme-studio.js` — sync secondary theme toggle:
  - Same 3-button pattern as B7
  - Read from `getThemePreference()` — no direct IDB read

- [ ] **B9** Write/update tests:
  - `tests/core/themeEngine.test.js`: add cases for new string values,
    migration shim, `applyTheme()` always sets `data-theme`
  - `npm test` — all tests pass

- [ ] **B10** Manual QA: toggle through all 3 states on every route.
  Verify `data-theme` attribute on `<html>` matches selection.
  OS switch while in `system` mode → theme follows.

---

### Phase C — Design System Tokens (optional, incremental)

Apply Tailwind tokens to new code only. When touching a block for another
reason, migrate that block's inline classes. No dedicated migration pass.

- [ ] **C1** Document `cn()` usage with one example in a touched block
- [ ] **C2** Any new button/card written after this milestone uses Tailwind tokens
- [ ] **C3** Verify `dark:` Tailwind utilities work (write a test class on a dev
  scratch element, confirm it activates on `[data-theme="dark"]`)

---

### Definition of Done

- [ ] `npm test` passes (658 + new themeEngine tests)
- [ ] `npm run build` produces valid `dist/` with no Tailwind purge errors
- [ ] `data-theme` is always `"light"` or `"dark"` on `<html>` — never absent
- [ ] OS dark mode switch triggers re-render in `system` mode
- [ ] Settings theme toggle shows current state correctly on page load
- [ ] No FOUC in dark mode on hard reload
- [ ] Tailwind `dark:` utilities work (smoke-tested in DevTools)
- [ ] All existing visual styles unchanged (no regression)

---

## Milestone 4 — Smart Theme Studio (previous, completed)

**Branch:** `claude/fix-api-400-error-Bq2kH`
**Date:** 2026-02-21

### Plan

#### Increment 1: Harmony Algorithm — `src/core/themeEngine.js`
- [x] Add `generateAnalogous(hex)` → returns 2 neighboring hues (±30°)
- [x] Add `generateSplitComplementary(hex)` → returns 2 hues (180° ± 30°)
- [x] Add `generateHarmonySuggestions(hex)` → { analogous: [hex, hex], splitComplementary: [hex, hex] }
- [x] All use existing `hexToHSL` / `hslToHex` helpers, same saturation/lightness
- [x] Export for use by theme-studio and tests
