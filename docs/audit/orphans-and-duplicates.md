# BORIS OS — Orphans & Duplicates

**Audit date:** 2026-02-21

---

## 1. Orphaned Files (safe to delete)

### Category A: Dead legacy pages (20 files)

All import from deleted `../router.js` and `../state.js`. Never referenced from React app.

| File | LOC | Reason | Risk |
|------|-----|--------|------|
| `src/pages/dashboard.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/today.js` | ~60 | Imports deleted `router.js` | **Safe** |
| `src/pages/hours.js` | ~100 | Imports deleted `router.js` | **Safe** |
| `src/pages/hours-entry.js` | ~80 | Imports deleted `router.js` | **Safe** |
| `src/pages/logbook.js` | ~60 | Imports deleted `router.js` | **Safe** |
| `src/pages/logbook-entry.js` | ~80 | Imports deleted `router.js` | **Safe** |
| `src/pages/planning.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/goals.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/competencies.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/quality.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/learning-moments.js` | ~60 | Imports deleted `router.js` | **Safe** |
| `src/pages/notebook.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/reference.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/vault.js` | ~60 | Imports deleted `router.js` | **Safe** |
| `src/pages/assignments.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/process-map.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/report.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/settings.js` | ~80 | Imports deleted `router.js` | **Safe** |
| `src/pages/export.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/sync.js` | ~50 | Imports deleted `router.js` | **Safe** |
| `src/pages/diagnostics.js` | ~50 | Imports deleted `router.js` | **Safe** |

**Total: ~1,200 LOC safe to delete**

### Category B: Dead infrastructure files

| File | LOC | Reason | Risk |
|------|-----|--------|------|
| `src/os/shell.js` | 716 | Replaced by React Shell.jsx. References DOM elements that no longer exist. | **Safe** (no imports from React app) |
| `src/os/deepLinks.js` | 119 | Replaced by React Router. | **Needs verification** — check if any blocks import it |
| `src/core/featureFlags.js` | ~15 | `enableNewOS` always true. Block flags all false. | **Safe** |
| `src/os/cockpitData.js` | ? | May be imported by dormant blocks | **Needs verification** |

### Category C: Unregistered blocks (12 directories)

Built but never registered in `registerBlocks.js`. Never mount.

| Block | Files | Reason | Risk |
|-------|-------|--------|------|
| `src/blocks/bpv-mini-card/` | index.js, view.js, styles.css | Dashboard card, never registered | **Safe** |
| `src/blocks/personal-mini-card/` | index.js, view.js, styles.css | Dashboard card, never registered | **Safe** |
| `src/blocks/school-mini-card/` | index.js, view.js, styles.css | Dashboard card, never registered | **Safe** |
| `src/blocks/schedule-placeholder/` | index.js, view.js, styles.css | Placeholder, never registered | **Safe** |
| `src/blocks/personal-energy/` | index.js, view.js, styles.css | Never registered | **Safe** |
| `src/blocks/personal-week-planning/` | index.js, view.js, styles.css | Never registered | **Safe** |
| `src/blocks/personal-weekly-reflection/` | index.js, view.js, styles.css | Never registered | **Safe** |
| `src/blocks/school-concept-vault/` | index.js, view.js, styles.css | Never registered | **Safe** |
| `src/blocks/school-current-project/` | index.js, view.js, styles.css | Never registered | **Safe** |
| `src/blocks/school-milestones/` | index.js, view.js, styles.css | Never registered | **Safe** |
| `src/blocks/school-skill-tracker/` | index.js, view.js, styles.css | Never registered | **Safe** |
| `src/blocks/tasks/` | index.js, view.js, styles.css | Superseded by daily-todos | **Safe** |

**Total: ~36 files safe to delete**

---

## 2. Duplicate Implementations

### D1: Shell Chrome

| Vanilla | React | Overlap |
|---------|-------|---------|
| `src/os/shell.js` (lines 41-116) | `src/react/components/Shell.jsx` | Sidebar, topbar, mobile nav, mode picker |
| `shell.js` creates DOM elements | `Shell.jsx` renders JSX | Same visual structure |
| `shell.js` reads `[data-os-tab]` buttons | `Sidebar.jsx` uses `onNavigate()` | Same navigation logic |

**Resolution:** Delete `src/os/shell.js`. React Shell is canonical.

### D2: Mode Picker

| Vanilla | React | Overlap |
|---------|-------|---------|
| `shell.js` lines 391-431 (showModePicker/hideModePicker) | `src/react/components/ModePicker.jsx` | Same UI: 3 mode cards in dialog |
| Uses `#mode-picker` DOM element from index.html | Self-contained JSX | Same visual structure |

**Resolution:** Delete vanilla mode picker code with shell.js.

### D3: Mode Badge Pattern

| Vanilla (shell.js) | React (Dashboard.jsx) |
|--------------------|-----------------------|
| `<span class="os-section__mode-badge" style="--badge-color:...">` | `<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full..."  style={{background, color}}>` |

**Resolution:** Extract a shared `<ModeBadge>` React component.

### D4: Dashboard Data Loading

| Vanilla (blocks/dashboard/view.js) | React (routes/Dashboard.jsx) |
|------------------------------------|------------------------------|
| Calls `getTodaySnapshot()`, `getProjectsPulse()`, `getBPVPulse()`, `getWeekFocus()` | Same 4 function calls |
| Subscribes to 6 events for refresh | Uses `useEvent('tasks:changed', loadData)` |

**Resolution:** Both are valid for their contexts. When vanilla dashboard block is retired, React Dashboard becomes canonical.

---

## 3. Dead Routes

| Route | Status | Evidence |
|-------|--------|----------|
| `#hours-entry` | Dead — referenced by `daily-cockpit/view.js:26` | No React route exists |
| `#logbook-entry` | Dead — referenced by `daily-cockpit/view.js:27` | No React route exists |
| `#tab=projects&project=<id>` | Dead — parsed by `project-hub/view.js:40-42` | React uses `/projects/:id` |
| `#planning/<id>` | Dead — set by `projects/view.js:205` | React uses `/planning` (no param) |

---

## 4. Unused CSS (candidates for removal)

### Styles imported but elements don't exist

| CSS File | Imported By | Why Unused |
|----------|-------------|------------|
| `src/styles/pages.css` | `main.js:12` | Legacy page styles. No pages render. |
| `src/ui/theme-studio.css` | (need to verify) | Theme studio UI may not exist |
| `src/ui/collapsible-section.css` | Used by `src/ui/collapsible-section.js` | Only used in vanilla shell.js Vandaag layout (dead) |
| `src/ui/command-palette.css` | Used by `src/ui/command-palette.js` | Created by shell.js (dead) |

### Block CSS files (26 files)

All block CSS files are imported by `registerBlocks.js`. Blocks are registered but never mount. Their CSS is technically loaded but targets elements that don't exist in the DOM.

**Recommendation:** Don't delete block CSS yet — it will be needed when blocks are mounted via VanillaBridge. But consider lazy-loading CSS alongside block mount.

---

## 5. Event/Listener Leak Risks

### VanillaBridge lifecycle

`src/react/components/VanillaBridge.jsx` correctly calls `unmount()` in its useEffect cleanup:

```javascript
return () => {
  instanceRef.current?.unmount?.();
  el.innerHTML = '';
};
```

**Risk:** If a vanilla block subscribes to EventBus events in `mount()` but doesn't unsubscribe in `unmount()`, events will fire handlers on removed DOM elements.

**Blocks at risk** (subscribe to events but may not clean up):
- `daily-cockpit/view.js` — subscribes to 6 events
- `dashboard/view.js` — subscribes to 6 events
- `inbox-screen/view.js` — subscribes to 3 events

**Verification needed:** Inspect each block's `unmount()` for proper `off()` calls.

---

## 6. Feature Flag Gaps

| Concern | Status |
|---------|--------|
| Feature flag for React vs vanilla | `featureFlags.js` exists but `enableNewOS` is hardcoded `true` |
| Per-route fallback | No mechanism to fall back to vanilla for specific routes |
| React island toggle | No way to disable React and use vanilla shell |

**Recommendation:** Since the vanilla shell is dead and React is committed, feature flags for rollback aren't practical. Instead, ensure VanillaBridge allows gradual migration per-route.

---

## 7. Consolidation Plan

### Phase 1: Delete dead code (safe, no behavior change)

```
rm -rf src/pages/
rm src/os/shell.js
rm src/os/deepLinks.js
rm src/core/featureFlags.js
rm -rf src/blocks/bpv-mini-card/
rm -rf src/blocks/personal-mini-card/
rm -rf src/blocks/school-mini-card/
rm -rf src/blocks/schedule-placeholder/
rm -rf src/blocks/personal-energy/
rm -rf src/blocks/personal-week-planning/
rm -rf src/blocks/personal-weekly-reflection/
rm -rf src/blocks/school-concept-vault/
rm -rf src/blocks/school-current-project/
rm -rf src/blocks/school-milestones/
rm -rf src/blocks/school-skill-tracker/
rm -rf src/blocks/tasks/
```

### Phase 2: Verify and clean imports

1. Remove `shell.js` import from any file that references it
2. Remove `deepLinks.js` import from blocks
3. Remove `featureFlags.js` import from `registerBlocks.js`
4. Remove `pages.css` import from `main.js`
5. Update `registerBlocks.js` to remove dead block imports

### Phase 3: Wire VanillaBridge into critical routes

Connect existing vanilla blocks to React routes:
- Today.jsx → mount blocks from `vandaag-*` host slots
- Inbox.jsx → mount `inbox-screen` block
- Projects.jsx → mount `project-hub` block
- Lijsten.jsx → mount `lijsten-screen` block
