# Test Validator Report
_Generated: 2026-02-21T20:18:00.000Z — elapsed: 247.4s_

## BORIS QA Test Suite Audit

Analysis of `tests/` (42 files, 658 tests), vitest config in `vite.config.js`, and corresponding `src/` modules.

---

## 1. Coverage Gaps

### 🔴 HIGH — Core Modules with Zero Tests

8 of 12 core modules have no test file:

| Module | Purpose |
|--------|---------|
| `src/core/eventBus.js` | Pub/sub event system |
| `src/core/blockRegistry.js` | Block registration & filtering |
| `src/core/featureFlags.js` | localStorage-backed feature toggles |
| `src/core/migrationManager.js` | Schema versioning logic |
| `src/core/modeCaps.js` | Task capacity limits per mode |
| `src/core/designSystem.js` | Design token application |
| `src/core/tutorial.js` | Onboarding flow & tip tracking |
| `src/core/modeManager.js` | Partial only (integration tested via mode-switching.test.js) |

Tested (4 of 12): `commands.js`, `modeConfig.js`, `modulePresets.js`, `themeEngine.js`

### 🔴 HIGH — Store Adapter with Zero Tests

`src/stores/curiosity-data.js` has no test file. Untested functions include `getVonk()`, `getDraad()`, `getVergeten()`, `getEcho()`, and `relativeDate()`.

---

## 2. Test Setup Verification

### ✅ DB Reset — Correct

`tests/setup.js` runs `_resetDB()` + `indexedDB.deleteDatabase(DB_NAME)` + `localStorage.clear()` in `beforeEach()`. All 31 object stores are re-created fresh on `initDB()`.

### ⚠️ `clearAllData()` Omits `settings` Store

**File:** `src/db.js:544`

`clearAllData()` lists 30 stores but excludes `settings`. Meanwhile `exportAllData()` includes `settings`. This creates a semantic inconsistency: a backup roundtrip (export → clear → import) may preserve unintended settings.

```javascript
// clearAllData() — missing 'settings'
const storeNames = ['hours', 'logbook', ..., 'os_list_items'];  // 30 stores

// exportAllData() — includes 'settings'
const storeNames = [..., 'settings', ...];  // 31 stores
```

**Fix:** Either add `'settings'` to `clearAllData()` or document the intentional exclusion.

---

## 3. Edge-Case Gaps

### 🔴 HIGH — Soft-Delete + Undo Not Tested

`softDelete()` and `undoDelete()` have no dedicated tests. `db-helpers.test.js` only touches `softDelete()` indirectly via `purgeDeletedOlderThan()`.

Missing scenarios:
- `undoDelete()` successfully recovers record to original store
- `undoDelete()` returns `false` for a non-existent tombstone
- Concurrent `undoDelete()` calls on the same id
- Record is purged after 30 days (cannot be undone)

### 🔴 HIGH — Write Guard Has Zero Tests

`acquireWriteGuard()` and `releaseWriteGuard()` are used in backup/import but never tested directly. `backup.test.js` and `backup-hardening.test.js` do not verify guard behaviour.

Missing scenarios:
- Guard blocks new writes while active
- `releaseWriteGuard()` unblocks queued operations
- Multiple queued operations complete in order after release
- Guard does not deadlock on error

### 🟡 MEDIUM — ValidationError Field Property Not Verified

Store tests verify an error is thrown but not its structure:

```javascript
// Current (incomplete)
await expect(addTask('', 'BPV')).rejects.toThrow('text');

// Better
await expect(addTask('', 'BPV')).rejects.toMatchObject({
  field: 'text',
  name: 'ValidationError',
});
```

Affects ~10 test assertions across store test files.

### 🟡 MEDIUM — Mode-Switching Side Effects Not Tested

`mode-switching.test.js` covers the happy path but misses:
- Mode change while an IDB write is in progress
- `IDB setSetting()` fails silently — localStorage diverges
- `loadModes()` switching current mode when it becomes archived

---

## 4. Anti-Patterns

### 🟡 MEDIUM — Timestamp Flakiness (Real Timers)

Two tests use `setTimeout` delays to create distinct `createdAt` timestamps:

- `tests/stores/inbox.test.js:45` — `await new Promise(r => setTimeout(r, 5))`
- `tests/stores/project-tasks.test.js:67` — `await new Promise(r => setTimeout(r, 10))`

On slow CI, 5–10 ms is not guaranteed to produce distinct ISO timestamps. No test file uses `vi.useFakeTimers()`.

**Fix:** Manually set `createdAt` on inserted records rather than relying on real clock deltas.

### 🟡 MEDIUM — Inconsistent localStorage Mock Scope

`tests/setup.js` installs a global localStorage polyfill. Some test files (`mode-switching.test.js`) additionally use `vi.stubGlobal('localStorage', mockLocalStorage)`, creating two different localStorage implementations in the same suite — inconsistent error-handling behaviour.

### 🟢 LOW — Silent Catch Blocks Untestable

Many `catch { /* non-critical */ }` blocks in src/ cannot be exercised by tests, leaving error paths completely unverified.

---

## 5. Suggested New Test Files

### `tests/core/eventBus.test.js`
- `on()` adds listener, returns unsubscribe function
- `off()` removes specific listener, others remain
- `emit()` does not throw with no listeners
- `clear()` removes all listeners
- Multiple listeners fire in registration order

### `tests/core/blockRegistry.test.js`
- `register()` stores block by id
- `register()` throws if block has no id
- `unregister()` removes block
- `getEnabled()` filters by `enabled` flag and feature flags
- Mount returns `{ unmount }` — registry warns if missing

### `tests/db/soft-delete-undo.test.js`
- `softDelete()` moves record to `deleted` store with `deletedAt`
- `undoDelete()` restores record and removes tombstone
- `undoDelete()` returns `false` for unknown id
- Concurrent `undoDelete()` on same id — only one succeeds
- Record is unpurgeable within 30-day window

### `tests/db/write-guard.test.js`
- Guard blocks writes while active
- Release unblocks queued writes
- Multiple queued writes complete in order
- Guard releases cleanly after error

### `tests/stores/curiosity-data.test.js`
- `getVonk()` returns `null` with empty inbox
- `getVonk()` returns `null` with only recent captures
- `getVonk()` returns captures older than 14 days
- `getVonk()` is deterministic within the same day
- `getDraad()` finds most frequent meaningful word, filters stop words
- `getVergeten()` returns oldest unprocessed item
- `getVergeten()` ignores archived/promoted items
- `getEcho()` finds capture from same weekday 4–8 weeks ago

---

## 6. Summary

| Category | Count | Priority |
|----------|-------|----------|
| Untested core modules | 8 | 🔴 HIGH |
| Untested store adapters | 1 | 🔴 HIGH |
| Soft-delete/undo gaps | 4+ scenarios | 🔴 HIGH |
| Write guard coverage | 0 tests | 🔴 HIGH |
| Mode-switching side effects | 3+ scenarios | 🟡 MEDIUM |
| ValidationError structure checks | ~10 assertions | 🟡 MEDIUM |
| Timestamp flakiness | 2 tests | 🟡 MEDIUM |
| `clearAllData` settings omission | 1 config issue | 🟡 MEDIUM |

### Recommended Order

1. `eventBus.test.js` + `blockRegistry.test.js` — foundational, unblock other tests
2. `soft-delete-undo.test.js` + `write-guard.test.js` — safety-critical paths
3. `curiosity-data.test.js` — only untested store adapter
4. Fix timestamp flakiness in `inbox.test.js` + `project-tasks.test.js`
5. Update ValidationError assertions across store tests
6. `featureFlags.test.js`, `designSystem.test.js`, `tutorial.test.js`

**Estimated impact:** +~100 test cases, from 658 → 750+ tests, covering all 31 stores and all 12 core modules.
