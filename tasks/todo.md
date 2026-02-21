# Personal OS / Second Brain — Todo

---

## Milestone: Dashboard Redesign — Never Empty, Always Useful

**Date:** 2026-02-21
**Docs:** `docs/dashboard-spec.md`, `docs/empty-states.md`
**Branch:** `claude/audit-react-app-docs-UdBBt`

### Overview

Replace the `#dashboard` tab block (`src/blocks/dashboard/`) with a 4-widget
layout: StatusStrip + NextActionCard + QuickCapture + OpenVandaagShortcut.
All widgets are mode-aware. The block is never blank — every widget has a
defined zero state (see `docs/empty-states.md`).

---

### Phase D1 — Data Layer

- [ ] **D1a** Create `src/blocks/dashboard/store.js`:
  - Export `loadDashboardData(mode)` → `Promise<{ daily, tasks, inboxCount }>`
  - Uses `Promise.all([getDailyEntry(mode, today), getTasksForToday(mode), getInboxCount()])`
  - Import from `src/stores/daily.js`, `src/stores/tasks.js`, `src/stores/inbox.js`

- [ ] **D1b** Add `deriveNextAction(daily, tasks)` helper (pure, no async) to `store.js`:
  - Priority 1: first incomplete todo from `daily.todos` → `{ id, text, source: 'daily' }`
  - Priority 2: first incomplete task from `tasks` → `{ id, text, source: 'task' }`
  - Returns `null` if both are empty (zero state)

- [ ] **D1c** Write unit tests in `tests/blocks/dashboard/store.test.js`:
  - `deriveNextAction` with daily todos → returns first incomplete
  - `deriveNextAction` with no daily todos → falls through to tasks
  - `deriveNextAction` with all done → returns null
  - `deriveNextAction` with no data → returns null

---

### Phase D2 — Markup & Styles

- [ ] **D2a** Rewrite `src/blocks/dashboard/view.js`:
  - `mount(container, context)` returns `{ unmount() }`
  - Renders the 4 widgets in order: StatusStrip, NextActionCard, QuickCapture, OpenVandaag
  - Calls `loadDashboardData()` once; QuickCapture + OpenVandaag render immediately
  - Skeleton shown for StatusStrip + NextActionCard during the await

- [ ] **D2b** StatusStrip widget (in `view.js`):
  - Mode pill with mode color from `--color-purple-light / --color-emerald-light / --color-blue-light`
  - Date via `formatDate(new Date(), 'long')` (Dutch long format)
  - Task count `"${done}/${total} taken"` — omit if total is 0
  - Inbox count `"${n} inbox"` — omit if 0
  - `aria-live="polite"` on the count segment

- [ ] **D2c** NextActionCard widget (in `view.js`):
  - **has_action state**: task text (via `escapeHTML()`) + "Voltooid" button
  - **zero_state**: mode-specific copy from `docs/empty-states.md` + CTA button → `updateHash('today', 'tasks')`
  - **completing state**: spinner on button, task text faded
  - **just_done micro-state**: "✓ Goed gedaan!" flash, 600 ms, then re-derive
  - On "Voltooid": source `daily` → `saveDailyEntry(...)`, source `task` → `toggleTask(id)`
  - On error: `showToast('Kon niet opslaan — probeer opnieuw', 'error')`
  - `aria-label` on button: `"Markeer als voltooid: ${escapeHTML(task.text)}"`
  - `min-height: 96px` on card to prevent layout shift

- [ ] **D2d** QuickCapture widget (in `view.js`):
  - `<input type="text" aria-label="Gedachte vastleggen" placeholder="Vang een gedachte op...">`
  - Listen for `keydown` → `Enter`: if non-empty → `addInboxItem(text, mode)` → emit `inbox:changed` → clear → toast
  - **idle state**: faint border (`--color-border`)
  - **typing state**: accent border (`--color-accent`) via `:focus` CSS
  - **submitting state**: `input.disabled = true`, spinner in card corner
  - Empty Enter → no-op, no visual feedback

- [ ] **D2e** OpenVandaagShortcut (in `view.js`):
  - `<button>` or `<a>` element: "Open Vandaag →"
  - Click: `updateHash('today')`
  - No card chrome — plain text-link style, accent color
  - Focus ring: `2px solid var(--color-accent)`, offset 2px

- [ ] **D2f** Rewrite `src/blocks/dashboard/styles.css`:
  - `.dashboard-root` — wrapper, `display: flex; flex-direction: column; gap: var(--space-4)`
  - `.dashboard-card` — `background: var(--ui-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); padding: var(--space-5)`
  - `.status-strip` — horizontal flex, gap `var(--space-2)`, dividers via `::before` content `"·"`
  - `.mode-pill` — small badge, mode color, `border-radius: var(--radius-sm)`
  - `.next-action-card` — extends `.dashboard-card`, `min-height: 96px`
  - `.skeleton` — shimmer animation (`background: linear-gradient(90deg, var(--color-border)...)`)
  - `.quick-capture input:focus` — border color `var(--color-accent)`
  - `.open-vandaag-btn` — no background, `color: var(--color-accent)`, hover underline
  - Responsive: `@media (min-width: 720px)` → `.dashboard-grid` puts NextActionCard + QuickCapture side-by-side

---

### Phase D3 — Event Wiring & Reactivity

- [ ] **D3a** In `mount()`, subscribe to 4 events (see spec):
  - `mode:changed` → full re-render (call `loadData(newMode)`, rebuild all widgets)
  - `tasks:changed` → reload tasks, re-derive NextActionCard, update StatusStrip count
  - `daily:changed` → reload daily, re-derive NextActionCard
  - `inbox:changed` → reload inbox count, update StatusStrip

- [ ] **D3b** In `unmount()`, call all unsubscribe functions returned by `eventBus.on()`

- [ ] **D3c** Verify no memory leaks: mount → trigger events → unmount → trigger again → no handler fires

---

### Phase D4 — Tests

- [ ] **D4a** `tests/blocks/dashboard/store.test.js` — data layer (from D1c)

- [ ] **D4b** `tests/blocks/dashboard/view.test.js` (jsdom/vitest):
  - Renders 4 widgets
  - QuickCapture Enter with text → `addInboxItem` called, input cleared
  - QuickCapture Enter with empty input → `addInboxItem` NOT called
  - NextActionCard with task → shows task text
  - NextActionCard without tasks → shows zero state copy (mode-specific)
  - StatusStrip shows mode name
  - Mode change → block re-renders with new mode data

- [ ] **D4e** `npm test` — all tests pass (658 baseline + new dashboard tests)

---

### Phase D5 — QA

- [ ] **D5a** Hard refresh on `#dashboard`:
  - All 4 widgets render (no blank screen)
  - StatusStrip shows correct mode + date
  - NextActionCard shows first incomplete task (or zero state if none)
  - QuickCapture input is immediately focusable

- [ ] **D5b** Zero state walkthrough:
  - Clear all tasks → NextActionCard shows zero state copy (correct per mode)
  - CTA button navigates to `#today?focus=tasks`

- [ ] **D5c** Quick Capture flow:
  - Type a thought → Enter → toast appears → input clears
  - StatusStrip inbox count increments
  - Navigate to `#inbox` → item appears

- [ ] **D5d** NextActionCard "Voltooid" flow (source: daily):
  - Mark done → item disappears → next task surfaces (or zero state)
  - Navigate to `#today` → item is checked in the today todo list

- [ ] **D5e** NextActionCard "Voltooid" flow (source: task):
  - Mark done → navigate to `#today` → task is checked in Taken block

- [ ] **D5f** Mode switch while on dashboard:
  - StatusStrip updates to new mode pill + color
  - NextActionCard re-derives for new mode

- [ ] **D5g** Dark mode: all 4 widgets render correctly in `[data-theme="dark"]`

- [ ] **D5h** Screen reader: verify `aria-live` on StatusStrip counts, `aria-label` on
  "Voltooid" button, input `aria-label`

---

### Definition of Done

- [ ] `npm test` passes (all tests including new dashboard suite)
- [ ] `npm run build` succeeds with no errors
- [ ] Dashboard is never blank — zero state visible with actionable CTA
- [ ] QuickCapture creates inbox items visible on `#inbox` tab
- [ ] NextActionCard mark-done reflects in `#today` Taken/Todos block
- [ ] StatusStrip updates reactively on task/inbox/mode changes
- [ ] No layout shift between loading → loaded → zero state
- [ ] All user text rendered via `escapeHTML()`
- [ ] All event listeners cleaned up in `unmount()`

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
