# Feature Scout Report
_Generated: 2026-02-21T20:13:00.000Z — elapsed: 167.8s_

## Feature Gaps & Incomplete Work — BORIS OS Backlog

Based on a thorough scan of the codebase, planning documents, and source files.

---

### 🔴 HIGH IMPACT

#### 1. Dashboard Redesign — Never Empty, Always Useful
**Status:** Planned but unimplemented (5 phases pending)
**Files:** `src/blocks/dashboard/view.js`, `src/blocks/dashboard/store.js` (missing)

Current dashboard exists but doesn't match the planned spec in `tasks/todo.md` (4 widgets: StatusStrip, NextActionCard, QuickCapture, OpenVandaagShortcut).

**Work remaining:**
- [ ] Create `store.js` with `loadDashboardData()` and `deriveNextAction()` helpers
- [ ] Rewrite `view.js` with 4-widget layout, skeleton loading, responsive grid
- [ ] Wire up event listeners (`mode:changed`, `tasks:changed`, `daily:changed`, `inbox:changed`)
- [ ] Write unit tests for data layer and UI interactions

---

#### 2. Theme System Architecture Issues
**Status:** Partially implemented, structural problems remain
**Files:** `src/core/themeEngine.js`, `src/blocks/settings-panel.js`, `index.html`

- `preferDark` stored as `null/true/false` but should be `'system'/'light'/'dark'` string enum
- No FOUC-prevention inline script in `index.html` `<head>`
- `matchMedia` listener fires even when not in `'system'` mode

**Work remaining:**
- [ ] Migrate `preferDark: null/true/false` → `'system'/'light'/'dark'` with migration shim
- [ ] Ensure `data-theme` is ALWAYS set on `<html>` (never absent)
- [ ] Add inline FOUC-prevention script in `index.html` before CSS links
- [ ] Fix `matchMedia` listener to only update when `preferDark === 'system'`

---

#### 3. Project Hub 2.0 — Phases 1–8 Incomplete
**Status:** Shell exists; integration incomplete
**Files:** `src/blocks/project-hub/`, `src/os/shell.js`, `src/stores/projects.js`

- No accent color or cover image field in project records
- No `nav:lijsten` or `nav:curiosity` commands registered in command palette
- Timeline and mindmap tabs planned but not implemented
- File upload / cover handling not implemented

**Work remaining:**
- [ ] Add accent color & cover fields to project model + migration
- [ ] Register `nav:lijsten` and `nav:curiosity` commands
- [ ] Implement detail view tabs (tasks, timeline, mindmap, files)
- [ ] Project cover upload with image processing

---

#### 4. HTML5 Structure Refactor — Phase 3 Not Started
**Status:** Phases 0–2 complete; Phase 3 next
**Files:** `src/os/shell.js`, `src/blocks/project-hub/`, `tasks/next-steps.md`

Phase 3 (project list, accent colors, project detail route) not yet started. Cover upload and timeline decisions still pending.

**Work remaining:**
- [ ] Phase 3: Projects list with 3-card grid, accent color per project, project detail route
- [ ] Phase 4: Timeline with week/month toggle
- [ ] Phase 5: Mindmap MVP with SVG and CRUD
- [ ] Phase 6: Polish (token migration, A11y pass, mobile checks)
- [ ] Cleanup: Remove dead code (`pages/`, legacy `featureFlags`, `auto-sync.js`, old CSS)

---

#### 5. Design System + Tailwind Integration — Not Started
**Status:** Planned, no implementation
**Files:** `package.json`, `tailwind.config.js` (missing), `src/utils/cn.js` (missing)

No `tailwind.config.js`, no `cn()` utility, PostCSS not configured.

**Work remaining:**
- [ ] Decide on Tailwind adoption (conflicts with zero-dependency philosophy for runtime)
- [ ] If adopted: add `tailwind.config.js`, `postcss.config.js`, `src/utils/cn.js`
- [ ] Migrate blocks incrementally (no big-bang refactor)

---

### 🟡 MEDIUM IMPACT

#### 6. Schedule/Calendar Block — Placeholder Only
**Status:** Placeholder renders "Agenda-integratie volgt in een volgende iteratie"
**Files:** `src/blocks/schedule-placeholder/`

No calendar data model, store, or views implemented.

**Work remaining:**
- [ ] Design calendar data model (events, recurrence, task deadline sync)
- [ ] Implement `src/stores/calendar.js`
- [ ] Render week/month/day views
- [ ] Wire task deadlines to calendar

---

#### 7. Command Palette — Missing Route Commands
**Status:** Routes exist in `VALID_ROUTES`; commands not registered
**Files:** `src/os/deepLinks.js:8`, `src/os/shell.js`

- `curiosity` tab in `VALID_ROUTES` → no `nav:curiosity` command
- `lijsten` tab in `VALID_ROUTES` → no `nav:lijsten` command

Users must navigate via sidebar; Ctrl+K palette doesn't surface these routes.

**Work remaining:**
- [ ] Register `nav:curiosity` command in `shell.js`
- [ ] Register `nav:lijsten` command in `shell.js`

---

#### 8. Block Memory Leak Risks — Inconsistent Cleanup
**Status:** Most blocks correct; some gaps
**Files:** Various `src/blocks/`

`inbox.js` unmount only calls `el?.remove()` without unsubscribing event listeners. Some blocks don't track unsub function references.

**Work remaining:**
- [ ] Audit all blocks: verify event listeners unsubscribed in `unmount()`
- [ ] Add tests for mount → unmount → remount cycle (no memory leaks)

---

#### 9. Settings UI Controls — No CSS/Store Integration
**Status:** Toggles exist; CSS doesn't respond
**Files:** `src/blocks/settings-panel.js`

- **Density toggle**: saves `compact` setting but no CSS breakpoints use `[data-compact]`
- **Reduce motion toggle**: saves `reduceMotion` but no CSS respects `[data-reduce-motion]`

**Work remaining:**
- [ ] Implement CSS rules for `[data-compact]` attribute
- [ ] Implement CSS rules for `[data-reduce-motion]` attribute
- [ ] Add tests for settings persistence and DOM updates

---

#### 10. Two-Minute Launcher — Minimal Functionality
**Status:** Block registered, no timer logic visible
**Files:** `src/blocks/two-min-launcher/view.js`

Block renders title "2-Minuten Launcher" and description but no timer, task selection, or sprint tracking.

**Work remaining:**
- [ ] Implement 2-minute countdown timer (start/pause/reset)
- [ ] Wire to task selection
- [ ] Track completed sprints in daily cockpit

---

### 🟢 LOW IMPACT

#### 11. Dead Code — Known, Not Removed
**Files:**
- `src/pages/*.js` — 19 legacy page files, not imported
- `src/core/featureFlags.js` — `enableNewOS` flag deprecated
- `src/auto-sync.js` — not imported anywhere
- `src/blocks/styles.css:126` — interface toggle CSS (unused)
- `src/blocks/styles.css:1163` — legacy school blocks CSS

**Work remaining:**
- [ ] Delete `src/pages/` directory
- [ ] Delete `src/auto-sync.js`
- [ ] Remove `enableNewOS` flag
- [ ] Clean up unused CSS sections

---

#### 12. Hardcoded Colors Not Using Tokens
**Files:** Various `src/blocks/*/styles.css`

Some blocks use hardcoded colors instead of CSS custom properties, breaking dark mode.

**Work remaining:**
- [ ] Audit all `.css` files for hardcoded color values
- [ ] Replace with design tokens from `src/styles/variables.css` or `src/ui/tokens.css`

---

#### 13. Mobile & A11y Polish
**Files:** All blocks and shell chrome

Tap targets may be < 44px on some elements; focus management unverified on route transitions; screen reader testing incomplete.

**Work remaining:**
- [ ] Audit tap target sizes (iPhone 11 Pro Max target device)
- [ ] Verify focus ring visibility and management on route changes
- [ ] Run Lighthouse A11y audit (target ≥ 95)

---

#### 14. Curiosity Studio — Incomplete Block Structure
**Status:** Mounted, functionality unclear
**Files:** `src/os/curiosity.js`

`mountCuriosityPage()` exists but no clear block structure for word clouds, pattern analysis, or recall suggestions.

**Work remaining:**
- [ ] Clarify responsibilities (word frequency, bigrams, etc.)
- [ ] Ensure data sources correctly aggregated from inbox
- [ ] Add caching strategy for expensive aggregations

---

### Summary

| Priority | Count |
|----------|-------|
| 🔴 High | 5 features |
| 🟡 Medium | 5 features |
| 🟢 Low | 4 cleanup items |
| **Total** | **14 work items** |

### Recommended Next Steps

1. **Dashboard redesign (D1–D5)** — High-visibility, spec fully written
2. **Fix theme system (`preferDark` migration, FOUC)** — Blocks all dark-mode UX work
3. **Register missing Ctrl+K commands** — 15-minute win, high UX impact
4. **Block memory leak audit** — Prevents creeping slowdown
5. **Dead code removal** — Reduces cognitive overhead for future contributors
