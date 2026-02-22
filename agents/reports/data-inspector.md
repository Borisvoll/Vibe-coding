# Data Inspector Report
_Generated: 2026-02-21T20:10:00.000Z — elapsed: 173.5s_

## Data Layer Audit Report: BORIS Project

Based on thorough analysis of the BORIS codebase (schema version 8, v8 IndexedDB), I've identified critical data integrity, validation, and migration issues.

---

## 1. SOFT-DELETE FLOW — INCOMPLETE IMPLEMENTATION

**Risk Level: 🔴 HIGH**

**Location**: `/src/stores/`
- `tasks.js:60` — `deleteTask()` calls `remove()` directly
- `projects.js:66` — `deleteProject()` calls `remove()` directly
- `lists.js:46, 48, 144, 147` — `deleteList()` and `deleteItem()` call `remove()` directly
- `inbox.js:90` — `deleteItem()` calls `remove()` directly
- `bpv.js:86` — `deleteHoursEntry()` calls `remove()` directly

`db.js` provides a `softDelete()` API with undo capability via the `deleted` store, but ALL deletion operations in store adapters bypass it and call `remove()` directly — preventing undo/recovery and breaking the documented soft-delete pattern.

**Recommendation**: Replace all `remove()` calls with `softDelete()` in store adapters. Add integration tests verifying `undoDelete()` works for each store type.

---

## 2. DAILY PLANS v7 MIGRATION — COMPOSITE ID NOT ENFORCED

**Risk Level: 🔴 HIGH**

**Location**: `/src/db.js:187-224`

Pre-v7 records with UUID-based IDs are not fully migrated to the `date__mode` composite format. `getDailyEntry()` uses `getByKey(makeId(date, mode))` which silently drops legacy records. `getAll()` returns both old and new format records, causing duplicate display.

```javascript
// daily.js:7 — expects composite key
function makeId(date, mode) { return `${date}__${mode}`; }
// Pre-v7 records have UUID ids — never matched by makeId()
```

**Recommendation**: Fix v7 migration to handle all record formats; add test verifying no duplicates after migration.

---

## 3. TIMESTAMP FIELD INCONSISTENCY

**Risk Level: 🟡 MEDIUM**

Mixed use of `updatedAt` vs `updated_at` across stores:

| Store | Field | Index? |
|-------|-------|--------|
| `tasks.js` | `updated_at` | ✓ |
| `projects.js` | Both `updatedAt` AND `updated_at` (line 47) | ✓ |
| `bpv.js` | `updatedAt` | ✗ NOT INDEXED |
| `tracker.js` | `updatedAt` | ✗ NOT INDEXED |
| `personal.js` | `updated_at` | ✗ NOT INDEXED |

`bpv.js` and `tracker.js` write `updatedAt` but no index exists — query operations fail silently.

**Recommendation**: Standardize on `updated_at`; add missing indexes in a v9 migration.

---

## 4. MISSING INPUT VALIDATION IN STORE ADAPTERS

**Risk Level: 🟡 MEDIUM**

| Store | Validates? | Issues |
|-------|-----------|--------|
| `tasks.js` | Partial | Only in `addTask()`, not `updateTask()` |
| `projects.js` | ✗ | No validation; bare `Error()` instead of `ValidationError` |
| `lists.js` | ✗ | No validation; bare `Error()` |
| `bpv.js` | ✗ | No validation |
| `personal.js` | ✗ | No validation |

**Recommendation**: Create `validateProject*()` in validate.js; apply validation in ALL store mutations; replace bare `Error()` with `ValidationError`.

---

## 5. CROSS-STORE REFERENTIAL INTEGRITY — NO ENFORCEMENT

**Risk Level: 🟡 MEDIUM**

- `tasks.js:22` — `project_id` can reference a deleted project (no check)
- `lists.js` — `addItem()` never validates `listId` exists
- `daily.js` — validates mode on read but not on write (`saveDailyEntry()`)

**Recommendation**: Cascade soft-deletes when deleting a project; validate foreign keys on write.

---

## 6. MIGRATION MANAGER — PLACEHOLDER ONLY

**Risk Level: 🟡 MEDIUM**

**Location**: `/src/core/migrationManager.js`

`migrationManager.js` contains only a placeholder v1 migration. All real migration logic lives inline in `db.js`'s `onupgradeneeded`. Migration v7 deletes and recreates the `date` index — violating the append-only principle (running twice would throw).

**Recommendation**: Move all migrations into `migrationManager.js`; enforce append-only (no `deleteIndex`).

---

## 7. DAILY PLANS v7 — ASYNC CURSOR IN `onupgradeneeded`

**Risk Level: 🟡 MEDIUM**

**Location**: `/src/db.js:187-224`

`openCursor()` is asynchronous but `onupgradeneeded` closes the transaction before the cursor callbacks complete — records can be partially migrated.

**Recommendation**: Wrap migration in an explicit transaction promise that resolves only after all cursor callbacks complete.

---

## 8. SOFT-DELETE PURGE — FIRE-AND-FORGET AT STARTUP

**Risk Level: 🟡 MEDIUM**

`purgeDeletedOlderThan(30)` is called as fire-and-forget in `main.js`. If purge runs concurrently with early writes, a race condition is possible.

**Recommendation**: Defer purge with `setTimeout(..., 2000)` to run after first render.

---

## 9. SETTINGS PERSISTENCE — SPLIT BETWEEN localStorage AND IDB

**Risk Level: 🟡 MEDIUM**

| Setting | Storage | Issue |
|---------|---------|-------|
| `boris_mode` | localStorage + IDB | IDB write is fire-and-forget — can diverge |
| Feature flags | localStorage only | Lost on cache clear |
| Tutorial state | localStorage only | Not exported in backup |
| Collapsible state | localStorage only | Not exported in backup |

**Recommendation**: Move all settings to IDB as single source of truth; keep localStorage as read-only startup cache.

---

## 10. MISSING INDEXES FOR TIME-BASED QUERIES

**Risk Level: 🟡 MEDIUM**

`hours` and `logbook` stores have no `updated_at` index. BPV exports can't sort by time; weekly review range queries fall back to full table scans.

**Recommendation**: Add indexes in a v9 migration.

---

## 11. ValidationError — NOT CAUGHT IN UI BLOCKS

**Risk Level: 🟡 MEDIUM**

`ValidationError` (with `.field` property) is thrown from store adapters but blocks don't catch it — errors bubble as unhandled rejections with no field-level feedback to users.

**Recommendation**: Add `try/catch` in blocks with `instanceof ValidationError` to show field-specific error UI.

---

## 12. BACKUP VALIDATION — INCOMPLETE REFERENTIAL CHECKS

**Risk Level: 🟡 MEDIUM**

**Location**: `/src/stores/backup.js`

`validateBundle()` only checks for `id` presence. A backup with orphaned tasks (referencing deleted projects) imports without warning.

**Recommendation**: Add cross-store referential checks in `validateBundle()`.

---

## Summary

| # | Finding | Risk |
|---|---------|------|
| 1 | Hard deletes in all stores (no undo) | 🔴 HIGH |
| 2 | Daily plans v7 composite ID not enforced | 🔴 HIGH |
| 3 | Timestamp field inconsistency | 🟡 MEDIUM |
| 4 | Missing validation in store adapters | 🟡 MEDIUM |
| 5 | No referential integrity enforcement | 🟡 MEDIUM |
| 6 | Migration manager is a placeholder | 🟡 MEDIUM |
| 7 | Async cursor in `onupgradeneeded` | 🟡 MEDIUM |
| 8 | Purge fire-and-forget at startup | 🟡 MEDIUM |
| 9 | Settings split between localStorage/IDB | 🟡 MEDIUM |
| 10 | Missing indexes for time-based queries | 🟡 MEDIUM |
| 11 | ValidationError not caught in UI | 🟡 MEDIUM |
| 12 | Backup validation incomplete | 🟡 MEDIUM |
