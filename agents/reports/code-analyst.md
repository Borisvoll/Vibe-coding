# Code Analyst Report
_Generated: 2026-02-21T20:14:00.000Z — elapsed: 200.0s_

## BORIS Codebase Security & Code Quality Review

Comprehensive analysis of 167 JavaScript files across `src/`. The overall security posture is **solid** — consistent `escapeHTML()` usage and proper architectural separation. Several medium-severity issues exist around event cleanup, unescaped content in one module, and duplicate utility code.

---

## 🔴 HIGH

### 1. XSS Risk — Unescaped Tutorial Content
**File:** `src/core/tutorial.js:162-168`

Tutorial `tip.title` and `tip.text` are directly interpolated into innerHTML without escaping:

```javascript
overlayEl.innerHTML = `
  <div class="tutorial-card" role="dialog" aria-label="${tip.title}">
    <h4 class="tutorial-card__title">${tip.title}</h4>
    <p class="tutorial-card__text">${tip.text}</p>
```

Current TIPS are static strings, but if tip content ever becomes data-driven or user-configurable this is a direct XSS vector. The `aria-label` attribute interpolation is also vulnerable to attribute injection.

**Fix:** Use `escapeHTML()` for title/text; set `aria-label` via `el.setAttribute()` or `textContent`.

---

## 🟡 MEDIUM

### 2. Duplicate HTML Escape Logic
**Files:** `src/os/shell.js:339`, `src/utils.js:244-248`

`shell.js` defines its own inline escape function instead of importing from `utils.js`:

```javascript
// shell.js:339 — custom, redundant
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// utils.js:244 — official utility already exists
export function escapeHTML(str) { ... }
```

**Fix:** Import and use `escapeHTML()` from `src/utils.js`.

---

### 3. Missing Error Handler on Dynamic Import
**File:** `src/blocks/project-detail/view.js:199-202`

```javascript
import('./tabs/mindmap.js').then(({ renderMindmapTab }) => {
  contentEl.innerHTML = '';
  tabCleanup = renderMindmapTab(contentEl, project, context);
});
// No .catch() — failure is silent
```

**Fix:** Add `.catch(err => { contentEl.innerHTML = '<p>Laden mislukt.</p>'; console.error(err); })`.

---

### 4. Implicit Event Listener Cleanup in morning-flow.js
**File:** `src/ui/morning-flow.js:106-107`

```javascript
footerEl.querySelector('.morning-flow__back')?.addEventListener('click', goBack);
footerEl.querySelector('.morning-flow__next').addEventListener('click', goNext);
```

Listeners are re-added on every render step without explicit removal. Correctness relies implicitly on `innerHTML` replacement clearing old listeners — a fragile pattern.

**Fix:** Use event delegation on the container, or track and remove listeners explicitly.

---

### 5. Global Event Listener in Mindmap Context Menu
**File:** `src/blocks/project-hub/tabs/mindmap.js:557`

```javascript
document.addEventListener('click', closeContextMenu, { once: true });
```

The `{ once: true }` flag mitigates accumulation, but if `closeContextMenu` is never triggered (e.g., the context menu is closed programmatically), the listener lingers until the next click anywhere.

**Fix:** Also call `document.removeEventListener('click', closeContextMenu)` in the programmatic close path.

---

### 6. Overly Complex Block Functions
**Files:**
- `src/blocks/lijsten-screen/view.js` — 493 lines, mixes state, DOM, events, and data fetching
- `src/blocks/dashboard/view.js` — 334 lines
- `src/blocks/inbox-screen/view.js` — 308 lines

Single-function blocks at this size have high cognitive complexity and are difficult to test.

**Fix:** Extract sub-renders (sidebar, item rows, drag logic) into named helper functions; separate data loading from rendering.

---

### 7. Block Lifecycle Cleanup Not Architecturally Enforced
**Files:** Multiple `src/blocks/*/view.js`

Most blocks correctly unsubscribe eventBus and clear timers in `unmount()`. But the pattern isn't enforced — no BlockRegistry check verifies that `unmount()` is returned. Some blocks handle it; some don't.

**Fix:** `blockRegistry.js` should assert `typeof result.unmount === 'function'` after `mount()` and log a warning if missing.

---

## 🟢 LOW

### 8. Silent Catch Blocks
**Files:** Multiple locations

```javascript
} catch { /* non-critical */ }
```

Silent suppression makes debugging difficult, especially for IndexedDB errors that may indicate data corruption.

**Fix:** Replace with `catch (err) { console.debug('[boris]', err); }`.

---

### 9. Inefficient Repeated DOM Queries in Loops
**Files:** Multiple block files

Elements queried multiple times inside `forEach` loops instead of caching the reference.

**Fix:** Cache `querySelectorAll` results; use event delegation where practical.

---

### 10. Hardcoded Template via `outerHTML`
**File:** `src/os/curiosity.js:94`

```javascript
const label = el.querySelector('.curiosity-widget__label').outerHTML;
```

Reusing an element's `outerHTML` as a template string means structural changes to that element silently break dependent renderers.

**Fix:** Store label content as a constant or use `textContent` / a dedicated template function.

---

## Positive Findings

✅ **Consistent XSS prevention** — all user content (task text, project titles, inbox items, list names) is escaped via `escapeHTML()` across blocks
✅ **No `eval` or `Function()` usage** anywhere in the codebase
✅ **Store adapter separation** — blocks access data through adapters, not `db.js` directly
✅ **EventBus decoupling** — modules communicate via events, not direct imports
✅ **Service worker** has proper version checking and update banner

---

## Summary

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Unescaped tutorial content | `tutorial.js:162` | 🔴 HIGH |
| 2 | Duplicate escape utility | `shell.js:339` | 🟡 MEDIUM |
| 3 | Missing `.catch()` on dynamic import | `project-detail/view.js:199` | 🟡 MEDIUM |
| 4 | Implicit event cleanup in morning-flow | `morning-flow.js:106` | 🟡 MEDIUM |
| 5 | Global listener in mindmap context menu | `mindmap.js:557` | 🟡 MEDIUM |
| 6 | Overly complex block functions | `lijsten-screen`, `dashboard`, `inbox-screen` | 🟡 MEDIUM |
| 7 | Block cleanup not enforced by registry | `blockRegistry.js` | 🟡 MEDIUM |
| 8 | Silent catch blocks | Various | 🟢 LOW |
| 9 | Repeated DOM queries in loops | Various | 🟢 LOW |
| 10 | Hardcoded template via `outerHTML` | `curiosity.js:94` | 🟢 LOW |

## Recommended Actions (Priority Order)

1. **IMMEDIATE** — Fix `tutorial.js` XSS with `escapeHTML()` + `textContent`
2. **HIGH** — Add `.catch()` to all dynamic imports
3. **HIGH** — Replace inline `esc()` in `shell.js` with `escapeHTML()` from utils
4. **MEDIUM** — Enforce `unmount()` return in `blockRegistry.js`
5. **MEDIUM** — Refactor 300+ line blocks into smaller units
6. **MEDIUM** — Replace silent catches with `console.debug()` logging
