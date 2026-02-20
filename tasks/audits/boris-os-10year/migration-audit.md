# Migration & Schema Versioning — 10-Year Audit

**Risk Level: MEDIUM**
**Confidence: High** — based on direct analysis of src/db.js, src/core/migrationManager.js, src/main.js, tests/stores/migration.test.js

---

## 1. Migration Architecture

### Dual Migration System
BORIS OS has **two** migration mechanisms:

| System | Location | Purpose | Tracked By |
|--------|----------|---------|------------|
| **IndexedDB onupgradeneeded** | `src/db.js:56-233` | Schema changes (stores, indexes) + data transforms | `DB_VERSION` constant (currently 8) |
| **MigrationManager** | `src/core/migrationManager.js` | Future OS-level migrations | `CORE_SCHEMA_VERSION` (currently 1, placeholder only) |
| **Ad-hoc data migrations** | `src/main.js:105-127` | One-off data transforms at startup | Settings flags (`migration_personal_tasks_done`) |

**Risk: Medium** — Three migration paths creates confusion about where to put new migrations.

**Root Cause:** The MigrationManager was built speculatively for "future Boris OS schema bootstrap" but is currently a no-op (placeholder migration 1 does nothing). Meanwhile, actual data migrations happen in `main.js` tracked by ad-hoc settings flags.

**Assessment:** The IndexedDB `onupgradeneeded` is the correct and sufficient mechanism. The MigrationManager adds no value and the ad-hoc migrations in `main.js` should be formalized.

---

## 2. Idempotency Analysis

### Version Guard Pattern
Each migration uses `if (oldVersion < N)` guards:

```javascript
if (oldVersion < 1) { /* v1 stores */ }
if (oldVersion < 2) { /* v2 stores */ }
...
if (oldVersion < 8) { /* v8 stores */ }
```

**Idempotency by design:** If DB is at version 5, only blocks 6-8 execute. IndexedDB guarantees `onupgradeneeded` runs exactly once per version bump. **This is correct.**

### Partial Completion Risk
IndexedDB `onupgradeneeded` runs inside a `versionchange` transaction. If the browser crashes mid-migration:
- The transaction rolls back
- The DB stays at the old version
- Next app load retries the migration

**This is safe.** IndexedDB's transactional nature provides automatic idempotency for schema changes.

### Exception: v7 Data Migration
The v7 migration (`src/db.js:187-224`) performs a **data transform** inside `onupgradeneeded`:
1. Deletes the unique `date` index on `dailyPlans`
2. Creates non-unique `date` + `mode` + `updatedAt` indexes
3. Opens a cursor to migrate each record:
   - Deletes old record (`cursor.delete()`)
   - Creates new record with `mode: 'School'` and composite ID

**Risk: The cursor is asynchronous inside a synchronous transaction.**

The `openCursor().onsuccess` callback fires for each record. IndexedDB keeps the `versionchange` transaction alive as long as there are pending requests. This is **correct behavior** per spec — the transaction won't commit until all cursor operations complete.

**However**, if the migration encounters a record that already has a `mode` field (e.g., from a previous partial migration attempt), the `if (!old.mode)` check (`src/db.js:202`) correctly skips it. **This is idempotent.**

**Verdict: v7 migration is safe**, but complex. Future data migrations of this type should be avoided — use ad-hoc startup migrations instead.

---

## 3. Roll-Forward Safety (v1 → v8)

### Skip-Version Scenario
A fresh install on version 8 runs `onupgradeneeded` with `oldVersion = 0`. All blocks execute sequentially:

```
v0→v1: Create 10 stores (hours, logbook, photos, settings, deleted, competencies, assignments, goals, quality, dailyPlans, weekReviews)
v1→v2: Create 5 stores (learningMoments, reference, vault, vaultFiles, energy)
v2→v3: Create 4 stores (os_school_*)
v3→v4: Create 6 stores (os_personal_*)
v4→v5: Create 2 stores (os_inbox, os_tasks)
v5→v6: Create 1 store (os_projects)
v6→v7: Alter dailyPlans indexes + migrate data
v7→v8: Create 2 stores (os_lists, os_list_items)
```

**Verified:** No migration depends on data from a previous migration (except v7 which alters v1's `dailyPlans`). Fresh install creates empty stores — v7's cursor finds no records to migrate. **Safe.**

### Upgrade Scenario (v5 → v8)
User opens app after update. `oldVersion = 5`, `DB_VERSION = 8`. Blocks 6, 7, 8 execute:
- v6: Creates `os_projects` ✓
- v7: Alters `dailyPlans` indexes + migrates existing data ✓
- v8: Creates `os_lists`, `os_list_items` ✓

**All intermediate states are handled correctly.** The sequential `if (oldVersion < N)` pattern is inherently roll-forward safe.

---

## 4. Rollback Viability

### Can a User Downgrade?
**No.** IndexedDB rejects `open()` calls with a version lower than the current stored version. If a user deploys an older version of BORIS OS (e.g., v6 code against v8 database), `indexedDB.open(DB_NAME, 6)` will fire `onblocked` event and fail.

**Risk: Low** — GitHub Pages deploys are forward-only. The only scenario is if a user manually reverts to an old cached version via service worker.

**Failure Scenario:** A service worker bug serves cached v6 code. The code tries to open DB at version 6, but the DB is at version 8. The app crashes with an unhandled error.

**Assessment:** The `initDB()` function (`src/db.js:50-242`) has no `onblocked` handler. Adding one would improve resilience:

```javascript
request.onblocked = () => {
  console.warn('DB upgrade blocked — close other tabs');
  reject(new Error('Database upgrade blocked'));
};
```

**Minimal Fix:** Add `onblocked` handler + user-facing message: "Sluit andere tabs om BORIS bij te werken."

---

## 5. Per-Store Version Tracking

### Current Design
All 31 stores are tied to a single `DB_VERSION = 8`. There is no per-store versioning.

**Implication:** Adding a new index to `os_tasks` requires bumping the global DB_VERSION to 9, which triggers `onupgradeneeded` for ALL users, even though only one store changed.

**10-Year Assessment:** This is **fine** for a single-developer project. Per-store versioning adds complexity that only pays off with multiple teams or micro-service-like store ownership. For BORIS OS, the global version approach is sustainable.

**Projected Versions:**

| Year | Estimated DB_VERSION | Complexity |
|------|---------------------|------------|
| 2026 (now) | 8 | Low — 8 clean blocks |
| 2028 | 10-12 | Low — manageable |
| 2031 | 15-18 | Medium — onupgradeneeded grows |
| 2036 | 20-25 | Medium-High — handler becomes verbose |

**Minimal Fix (Year 3+):** Extract each version block into named functions for readability:
```javascript
const MIGRATIONS = {
  1: createV1Stores,
  2: createV2Stores,
  // ...
  8: createV8Lists,
};
```

---

## 6. Ad-Hoc Data Migrations

### migratePersonalTasks() — src/main.js:105-127
This startup migration moves records from `os_personal_tasks` to `os_tasks`:
- Reads all from `os_personal_tasks`
- Writes each to `os_tasks` with `mode: 'Personal'`
- Sets `migration_personal_tasks_done` flag in settings

**Issues:**

| Finding | Risk | Impact |
|---------|------|--------|
| Not wrapped in a transaction — individual `put()` calls | **Medium** | Crash mid-migration leaves partial data |
| Old records in `os_personal_tasks` are NOT deleted | **Low** | Wasted space, but harmless |
| No error handling — if one `put()` fails, migration stops | **Medium** | Flag not set, retries on next load (safe) |
| Runs on EVERY app load until flag is set | **Low** | Async but fast |

**Root Cause:** This migration should have been in `onupgradeneeded` as part of v5 or v6. It was added ad-hoc in `main.js` instead.

**Assessment:** The ad-hoc approach works but doesn't scale. Each new data migration adds another startup check to `main.js`.

**Minimal Fix:** Consolidate ad-hoc migrations into a startup migration runner:
```javascript
const DATA_MIGRATIONS = [
  { key: 'migration_personal_tasks_done', run: migratePersonalTasks },
  // future migrations here
];
```

---

## 7. Migration Testing

### Current Coverage — `tests/stores/migration.test.js`
This file tests the v7 `dailyPlans` migration (cursor-based data transform). It verifies:
- Old records are migrated to new format
- Mode is set to 'School'
- Composite ID is created
- Todos are properly transformed

### Missing Coverage

| Migration | Tested? | Risk |
|-----------|---------|------|
| v1: Store creation | Implicitly (all tests use DB) | Low |
| v2: Additional stores | Implicitly | Low |
| v3-v4: OS stores | Implicitly | Low |
| v5: os_inbox, os_tasks | Implicitly | Low |
| v6: os_projects | Implicitly | Low |
| v7: dailyPlans transform | **Yes — dedicated tests** | Covered |
| v8: os_lists | Implicitly | Low |
| migratePersonalTasks | **No tests** | **Medium** |
| Skip-version (v0→v8) | **No tests** | **Medium** |

**Minimal Fix:** Add test for `migratePersonalTasks()` and a skip-version integration test that opens DB at v8 from scratch and verifies all stores exist.

---

## 8. Future Migration Complexity Forecast

### At DB_VERSION 20 (circa 2031)
The `onupgradeneeded` handler will have ~20 `if` blocks, approximately 400-500 lines. This is **verbose but manageable** because:
- Each block is independent and well-guarded
- Schema changes (createObjectStore/createIndex) are fast
- Data migrations (like v7) are rare

### Structural Risk at v30+ (circa 2036)
- The single `initDB()` function becomes very long
- Testing all migration paths requires combinatorial testing
- New developers must understand the full migration history

**Recommendation:** At DB_VERSION 15, refactor into a migration registry pattern. This is a non-breaking improvement that doesn't affect the database itself.

---

## Summary

| Domain | Risk | Verdict |
|--------|------|---------|
| onupgradeneeded pattern | Low | Correct, leverages IndexedDB guarantees |
| Idempotency | Low | All migrations are idempotent by design |
| Roll-forward safety | Low | Sequential guards handle all upgrade paths |
| Rollback viability | Low | Not supported, not needed |
| v7 data migration | Low | Complex but correct, idempotent |
| Dual migration system | Medium | MigrationManager is dead code |
| Ad-hoc migrations | Medium | Should be consolidated |
| Migration testing | Medium | v7 tested, others implicit only |
| Long-term scalability | Medium | Needs extraction at v15+ |

### Principal Engineer Assessment
> The migration system is fundamentally correct. IndexedDB's built-in transaction safety makes `onupgradeneeded` one of the most reliable migration mechanisms available. The two improvements needed are: (1) consolidate ad-hoc startup migrations into a registry, and (2) add an `onblocked` handler for version conflict scenarios. The MigrationManager module should be either utilized or removed — dead code is a maintenance hazard.
