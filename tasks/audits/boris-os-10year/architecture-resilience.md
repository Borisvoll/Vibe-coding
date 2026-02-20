# Architecture Resilience — 10-Year Audit

**Risk Level: MEDIUM**
**Confidence: High** — based on direct analysis of all core modules

---

## 1. Coupling Analysis

### Kernel Contract
The kernel passes `{ db, eventBus, modeManager, blockRegistry }` to the shell (`src/os/shell.js:41`). This is clean dependency injection — **a strong foundation**.

**Strengths:**
- EventBus is a factory (`createEventBus()`) — no singleton leakage between tests/instances
- ModeManager uses DI for eventBus — testable, replaceable
- BlockRegistry is a pure data structure with no side effects

**Weaknesses:**

| Finding | Location | Risk |
|---------|----------|------|
| Shell.js is a 856-line monolith | `src/os/shell.js` | **Medium** |
| Dual event systems: `src/core/eventBus.js` (OS) vs `src/state.js` (legacy + auto-sync) | `src/auto-sync.js:16` imports from `state.js` | **Medium** |
| Blocks import stores directly (`../stores/tasks.js`) — fine by design, but no interface contract | Various blocks | **Low** |
| `src/main.js` has ad-hoc data migrations (`migratePersonalTasks`) outside migration system | `src/main.js:105-127` | **Medium** |

### Failure Scenario — Dual Event Systems
The OS path uses `eventBus` (instance-based), while `auto-sync.js` uses `state.js` (module-level singleton). If auto-sync emits `hours:updated`, blocks listening on the OS eventBus never hear it. This means **auto-sync changes don't trigger OS block refreshes** — they only refresh legacy pages.

**Root Cause:** The auto-sync module was built for the legacy path and never migrated to the OS kernel.

**Minimal Fix:** Have `initAutoSync()` accept an eventBus parameter. Bridge `state.js` events to the OS eventBus, or replace `state.js` usage in auto-sync with the injected eventBus.

---

## 2. Block Isolation

### Contract Enforcement
Blocks are registered via `registerDefaultBlocks(registry)` in `src/blocks/registerBlocks.js`. The contract requires:
1. `register*Block(registry)` export
2. `mount(container, context)` returning `{ unmount() }`
3. Use `escapeHTML()` for user content

**Strengths:**
- Block registration is centralized — single file to audit
- `renderHosts()` (`src/os/shell.js:305-341`) catches mount errors per-block with try/catch
- Blocks receive context via parameter, not global state
- Order numbers provide deterministic rendering

**Weaknesses:**

| Finding | Risk | Impact |
|---------|------|--------|
| No runtime validation of block contract (missing mount, missing hosts) | **Low** | Silent failure — block doesn't appear |
| If a block throws in `unmount()`, it could prevent other blocks from unmounting | **Medium** | Memory leak, stale DOM on mode switch |
| No type checking on block registration object | **Low** | Only matters if third-party blocks are added |
| Block ordering uses sparse integers (5, 6, 7, 8, 9...) — collision possible | **Low** | Two blocks render in non-deterministic order |

### Failure Scenario — unmount() Error
If `brain-state` block throws during unmount, the `unmountAll()` loop (`src/os/shell.js:299-303`) uses `.forEach()` without try/catch. One error would prevent remaining blocks from unmounting, causing DOM ghosts and event listener leaks.

**Minimal Fix:** Wrap each `entry.instance?.unmount?.()` in try/catch inside `unmountAll()`.

---

## 3. Event Bus Fragility

### Architecture
The EventBus (`src/core/eventBus.js`) is 28 lines — minimal and correct:
- `on()` returns unsubscribe function
- `emit()` spreads handlers to prevent mutation during iteration (`[...set].forEach`)
- `clear()` for teardown

**Strengths:**
- No ordering guarantees (documented behavior — prevents ordering bugs)
- Unsubscribe pattern via returned function (prevents manual `off()` errors)
- Shell properly unsubscribes on `beforeunload` (`src/os/shell.js:845-855`)

**Weaknesses:**

| Finding | Risk | Impact |
|---------|------|--------|
| No error isolation per handler — one throwing handler blocks subsequent handlers | **Medium** | Mode switch partially fails |
| No event typing — typo in event name silently fails | **Low** | Bug only found by testing |
| No max listener warning — potential memory leak detection | **Low** | Only matters at scale |

### Failure Scenario — Handler Exception
If the `tasks:changed` handler in block A throws, and block B also listens to `tasks:changed`, block B never gets notified. The `[...set].forEach` does not wrap individual handlers in try/catch.

**Minimal Fix:** Wrap each handler call in try/catch inside `emit()`:
```javascript
[...set].forEach((handler) => {
  try { handler(payload); } catch (err) { console.error(`EventBus handler error [${event}]:`, err); }
});
```

---

## 4. Mode Switching Logic

### Flow
1. User selects mode → `modeManager.setMode(mode)` (`src/core/modeManager.js:25-29`)
2. ModeManager stores to localStorage, emits `mode:changed`
3. Shell listener triggers: wash animation, button update, section titles, hero, header, collapse state, block remount
4. Block remount: `unmountAll()` → filter eligible blocks → `mount()` each

**Strengths:**
- Synchronous mode change (no async race condition in setMode)
- 120ms content crossfade delay before remount (`src/os/shell.js:721`) — prevents visual flash
- Mode validation: only 3 valid modes, rejects unknown values

**Weaknesses:**

| Finding | Risk | Impact |
|---------|------|--------|
| No debounce on rapid mode switching — user can trigger multiple transitions | **Low** | Visual glitch, double remount |
| `modeTransitionTimer` cleared but concurrent unmount/mount not guarded | **Low** | Harmless — setTimeout serializes |
| Blocks with async `mount()` may not complete before next mode switch | **Medium** | Data partially loaded, then discarded |

### Failure Scenario — Rapid Mode Switch
User switches School → Personal → BPV in rapid succession (<120ms intervals). Each switch clears `modeTransitionTimer` and sets a new one. Only the last 120ms timeout fires, mounting BPV blocks. This is actually **correct behavior** — the timer acts as a natural debounce. Risk is low.

---

## 5. Feature Flag Scalability

### Current State
- 1 core flag (`enableNewOS`) + 5 block flags in `BLOCK_FLAGS` (`src/core/featureFlags.js`)
- Stored in localStorage with `ff_` prefix

**10-Year Projection:**

| Flags | localStorage Keys | Risk |
|-------|-------------------|------|
| 6 (current) | 6 | None |
| 20 | 20 | None — localStorage handles thousands of keys |
| 100+ | 100+ | Low — no performance issue, but cognitive overhead |

**Structural Risk:** Feature flags are read **synchronously** from localStorage on every `getBlockFlag()` call. This is called once per block per `getEnabled()` invocation. At 100 blocks, that's 100 synchronous localStorage reads per render cycle. Still fast (<1ms total), but suboptimal.

**Minimal Fix:** Cache flag reads per render cycle. Not urgent.

---

## 6. Hidden Dependencies

### Direct DB Access in Blocks
Several blocks import from `src/db.js` directly instead of going through store adapters. This is documented as an anti-pattern in CLAUDE.md.

The blocks that use store adapters correctly follow the pattern of importing from `src/stores/*.js`. However, some block store files (e.g., `src/blocks/*/store.js`) may access `db.js` for convenience. This creates a hidden coupling to the database schema.

### Global State Mutations
- `document.documentElement.setAttribute('data-theme', ...)` — shell.js, settings
- `document.body.appendChild(banner)` — update banner in main.js
- `localStorage` — mode, flags, collapse state, tutorial state
- `window.location.hash` — deep links

These are **acceptable** for a single-page app. The risk is low because there's only one shell instance.

---

## 7. Dual-Path Maintenance Burden

### Current State
- **OS path**: `src/os/shell.js` + 39 blocks + block registry
- **Legacy path**: `src/pages/*.js` (19 pages) + `src/router.js` + `src/components/shell.js`
- Both share: `src/db.js`, `src/stores/*`, `src/core/*`

**Maintenance Cost:**
- Every schema change must work for both paths
- Auto-sync uses `state.js` (legacy events) — doesn't integrate with OS eventBus
- Legacy pages are largely untested (no test files in `tests/pages/`)
- Feature flag `enableNewOS` controls the fork in `src/main.js:84-94`

**10-Year Assessment:** The legacy path is **dead weight**. It exists for backward compatibility but receives no new features. Over 10 years, the maintenance cost of keeping both paths synchronized exceeds the cost of removing legacy.

**Minimal Fix (Year 1-2):** Add a one-time migration prompt: "Switch to BORIS OS? Your data will be preserved." After 90% adoption, deprecate and remove legacy path. This eliminates ~2000 lines of unmaintained code.

---

## Summary

| Domain | Risk | Verdict |
|--------|------|---------|
| Kernel DI pattern | Low | Excellent — clean, testable |
| Block isolation | Low-Medium | Good — needs unmount error handling |
| Event bus | Medium | Solid — needs per-handler error isolation |
| Mode switching | Low | Well-designed — natural debounce |
| Feature flags | Low | Sustainable for 10 years |
| Hidden dependencies | Low | Minimal — mostly follows patterns |
| Dual-path burden | **Medium-High** | Legacy path should be sunset |
| Dual event systems | **Medium** | Auto-sync ↔ OS eventBus gap needs bridging |

### Principal Engineer Assessment
> The architecture is fundamentally sound. The kernel pattern (EventBus + ModeManager + BlockRegistry) is the right abstraction for a modular monolith. The two structural risks — dual event systems and legacy path burden — are both solvable with targeted, minimal-impact changes. No rewrite needed.
