# Personal OS / Second Brain — Todo

---

## Milestone: Vandaag MVP — True Home Screen

**Date:** 2026-02-21
**Docs:** `docs/vandaag-spec.md`, `docs/demo.md` (Section A–G)
**Branch:** `claude/audit-react-app-docs-UdBBt`

### Overview

Make `#today` the default landing tab and wire up 5 must-have widgets:
VandaagHeader (date + mode selector), DailyOutcomes (Top 3), DailyTodos
(Next actions, existing), QuickCapture (existing), BPVQuickLog (School/BPV only).
All state persists through hard reload via IndexedDB.

---

### Phase V0 — Default Tab

- [ ] **V0** `src/os/shell.js` — confirm or change the initial tab default to `'today'`:
  - Find the line that sets `activeTab` (around line 45)
  - If it is `'dashboard'`, change to `'today'`
  - If it already is `'today'`, no change needed — add a comment confirming it

---

### Phase V1 — VandaagHeader Component

- [ ] **V1a** Create `src/ui/vandaag-header.js`:
  - Export `mountVandaagHeader(container, { modeManager, eventBus })`
    returning `{ unmount() }`
  - Render: Dutch long date (left) + mode pills (right)
  - Date: `formatDateLong(getToday())` from `src/utils.js`
  - Pills: one `<button>` per `modeManager.getModes()`, `aria-pressed="true"` on active
  - Click: `modeManager.setMode(m)` — no confirmation dialog
  - Active pill: `--color-accent` bg + white text; inactive: surface bg + muted text

- [ ] **V1b** Subscribe to `mode:changed` on `eventBus` — re-render pills only (not date)

- [ ] **V1c** `src/os/shell.js` — after cloning the `[data-route="today"]` template,
  call `mountVandaagHeader(section.querySelector('[data-vandaag-header]'), { modeManager, eventBus })`
  and store the returned handle for `unmount()` on tab change

- [ ] **V1d** `src/ui/vandaag-header.css` — styles ≤ 40 lines:
  - `.vandaag-header` — flex, space-between, align-center, `padding: var(--space-4) 0`
  - `.vandaag-header__date` — `font-size: var(--font-base)`, `color: var(--color-text-secondary)`
  - `.vandaag-header__pills` — flex, `gap: var(--space-2)`
  - `.mode-pill` — `border-radius: var(--radius-sm)`, `padding: var(--space-1) var(--space-3)`
  - `.mode-pill[aria-pressed="true"]` — `background: var(--color-accent); color: #fff`
  - Focus ring: `focus-visible:outline: 2px solid var(--color-accent); outline-offset: 2px`

---

### Phase V2 — DailyOutcomes Block

- [ ] **V2a** Create `src/blocks/daily-outcomes/index.js`:
  - Export `registerDailyOutcomesBlock(registry)`
  - Register: `id: 'daily-outcomes'`, `hosts: ['vandaag-hero']`, `modes: []`, `order: 1`

- [ ] **V2b** Create `src/blocks/daily-outcomes/view.js`:
  - Export `mountDailyOutcomes(container, context)` → `{ unmount() }`
  - Load: `getDailyEntry(mode, getToday())` from `src/stores/daily.js`
  - During load: render 3 shimmer bars
  - Render: 3 `<input type="text">` elements with `<label>` ("Doel 1/2/3")
  - Prefill from `entry?.outcomes ?? ['', '', '']`
  - On blur OR Enter: `saveOutcomes(mode, getToday(), [v1, v2, v3])` → emit `daily:changed`
  - Enter: save and `focus()` next input; on Doel 3 Enter, no-op focus change
  - On `mode:changed`: reload for new mode, repopulate inputs
  - `aria-label` on section wrapper: `"Top 3 doelen voor vandaag"`
  - Error: `showToast('Kon niet opslaan — probeer opnieuw', 'error')` from `src/toast.js`
  - All text via `escapeHTML()` — inputs use `.value`, not `.innerHTML`

- [ ] **V2c** Create `src/blocks/daily-outcomes/styles.css` (≤ 50 lines):
  - `.outcomes-card` — `var(--ui-surface)`, `var(--shadow-sm)`, `var(--radius-lg)`, `p: var(--space-5)`
  - `.outcome-row` — flex, align-center, `gap: var(--space-3)`, `+ .outcome-row { margin-top: var(--space-2) }`
  - `.outcome-label` — `font-size: var(--font-xs)`, uppercase, muted, fixed `width: 48px`
  - `.outcome-input` — `flex: 1`, no border (only bottom border on focus), bg transparent
  - `.skeleton` — shimmer animation

- [ ] **V2d** `src/blocks/registerBlocks.js` — import + call `registerDailyOutcomesBlock(registry)`

---

### Phase V3 — BPV Quick Log Block

- [ ] **V3a** Create `src/blocks/bpv-quick-log/index.js`:
  - Export `registerBPVQuickLogBlock(registry)`
  - Register: `id: 'bpv-quick-log'`, `hosts: ['vandaag-mode']`,
    `modes: ['School', 'BPV']`, `order: 10`

- [ ] **V3b** Create `src/blocks/bpv-quick-log/view.js`:
  - Export `mountBPVQuickLog(container, context)` → `{ unmount() }`
  - Load: `getHoursEntry(getToday())` from `src/stores/bpv.js`
  - During load: shimmer on input fields
  - Render: `<input type="time">` for Start + Einde, `<input type="number">` for
    Pauze (min 0, max 480, step 5), `<input type="text">` for Notitie (max 120 chars)
  - Net hours label: computed on every `input` event via `calcNetMinutes()` from
    `src/utils.js`; formatted with `formatMinutes()`; shows `"—"` if net ≤ 0
  - `aria-live="polite"` on net label
  - Prefill all fields if `getHoursEntry` returns an existing entry
  - "Opslaan" button: disabled if `netMinutes ≤ 0`
  - On save: `updateHoursEntry(entry.id, ...)` if entry exists, else
    `addHoursEntry(getToday(), ...)` — emit `bpv:changed`
  - Button states: saving → spinner + `disabled`; saved → "✓ Opgeslagen" for 1 s then reset
  - Error: toast "Kon niet opslaan — probeer opnieuw"
  - Validation: start required if end present; clamp break to 0–480

- [ ] **V3c** Create `src/blocks/bpv-quick-log/styles.css` (≤ 60 lines):
  - `.bpv-log-card` — card chrome (`var(--ui-surface)`, shadow, radius, padding)
  - `.bpv-log-grid` — 2-column grid for Start/Einde row; single col for Pauze + Notitie
  - `.bpv-log__label` — `font-size: var(--font-xs)`, uppercase, muted
  - `.bpv-log__net` — right-aligned, `font-size: var(--font-lg)`, `font-weight: 600`
  - `.bpv-log__save` — primary button, `background: var(--color-accent)`
  - `input[type="time"]`, `input[type="number"]` — consistent border, radius, padding

- [ ] **V3d** `src/blocks/registerBlocks.js` — import + call `registerBPVQuickLogBlock(registry)`

---

### Phase V4 — Verify Existing Blocks

- [ ] **V4a** Verify `daily-todos` block is registered with `hosts: ['vandaag-tasks']`,
  `modes: []`, emits `daily:changed` on all mutations, respects `getTaskCap(mode)` cap

- [ ] **V4b** Verify capture block is registered with `hosts: ['vandaag-capture']`,
  calls `addInboxItem(text, mode)` on Enter, emits `inbox:changed`, clears input

- [ ] **V4c** If either block has a bug found during verify — fix in a single targeted
  change to the existing file; no rewrites

---

### Phase V5 — Tests

- [ ] **V5a** `tests/ui/vandaag-header.test.js`:
  - Renders date text (contains current year)
  - Renders one button per mode from `modeManager.getModes()`
  - Active mode button has `aria-pressed="true"`
  - Click inactive pill → `modeManager.setMode()` called with correct mode
  - `mode:changed` event → active pill updates

- [ ] **V5b** `tests/blocks/daily-outcomes/view.test.js`:
  - Renders 3 inputs with labels "Doel 1/2/3"
  - Prefills from `getDailyEntry` result
  - Blur on input → `saveOutcomes` called with correct args
  - Enter on Doel 1 → focus moves to Doel 2
  - `mode:changed` → reloads and repopulates with new mode data
  - Empty entry (first visit) → all inputs empty, no error

- [ ] **V5c** `tests/blocks/bpv-quick-log/view.test.js`:
  - Renders time inputs + Pauze + Notitie + Netto label + Opslaan button
  - Prefills from existing `getHoursEntry` result
  - No existing entry → all fields blank, Netto = "—"
  - Start + End set, Break 30 → Netto computed correctly
  - Net ≤ 0 → Opslaan button disabled
  - Net > 0 → Opslaan enabled; click → `addHoursEntry` or `updateHoursEntry` called
  - Valid save → `bpv:changed` emitted

- [ ] **V5d** `npm test` — all tests pass (658 baseline + new tests)

---

### Phase V6 — Manual QA

Run `docs/demo.md` Sections A–G. All 30 steps must pass.

- [ ] Section A — Default home screen (2 checks)
- [ ] Section B — Date header + mode selector (4 checks)
- [ ] Section C — Top 3 outcomes (4 checks)
- [ ] Section D — Next actions (6 checks)
- [ ] Section E — Quick capture (4 checks)
- [ ] Section F — BPV quick log (7 checks)
- [ ] Section G — Cross-cutting (3 checks)

---

### Definition of Done

- [ ] `npm test` passes (all tests)
- [ ] `npm run build` produces valid `dist/`
- [ ] App opens on Vandaag by default (no hash)
- [ ] Hard reload restores: outcomes, todos (with done state), hours entry
- [ ] Mode switch re-renders all 5 widgets with the new mode's data
- [ ] BPV quick log absent in Personal mode; present in School + BPV
- [ ] All new files within line-count limits (spec: `docs/vandaag-spec.md` §Component Size)
- [ ] All user text through `escapeHTML()`
- [ ] All event subscriptions cleaned up in `unmount()`
- [ ] 0 console errors during QA run

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
