# Data Durability — 10-Year Audit

**Risk Level: MEDIUM**
**Confidence: High** — based on direct analysis of src/db.js, all store adapters, and backup system

---

## 1. Schema Design (31 Object Stores)

### keyPath Consistency
All stores use `{ keyPath: 'id' }` except:
- `settings` — uses `{ keyPath: 'key' }` (correct for key-value store)

This is **excellent** — consistent primary key strategy across all stores.

### Index Coverage

| Store | Indexes | Assessment |
|-------|---------|------------|
| `hours` | date (unique!), week, type | **Warning**: unique date means max 1 entry/day |
| `logbook` | date, week, tags (multiEntry) | Good |
| `os_tasks` | mode, status, date, updated_at | Good — covers all query patterns |
| `os_inbox` | mode, status, updated_at | Good |
| `os_projects` | mode, status, updated_at | Good |
| `dailyPlans` | date, mode, updatedAt | Good (post-v7 migration) |
| `os_lists` | updated_at | Missing: mode index if lists become mode-aware |
| `os_list_items` | listId, updated_at | Good |
| `deleted` | store, deletedAt | Good — supports purge-by-age queries |

**Key Observation:** The `hours` store has `unique: true` on the date index (`src/db.js:63`). This means only ONE hours entry per date, which is intentional but creates a hard constraint that could break if the app later needs multiple entries per day (e.g., split shifts).

### Naming Inconsistency
**This is a real finding:**

| Pattern | Stores Using It | Example |
|---------|----------------|---------|
| `updated_at` (snake_case) | `os_*` stores | `os_tasks`, `os_inbox`, `os_projects`, `os_lists`, `os_list_items`, `os_school_*`, `os_personal_*` |
| `updatedAt` (camelCase) | Legacy stores | `competencies`, `quality`, `dailyPlans` |

The task store adapter (`src/stores/tasks.js:29`) writes `updated_at`, while `db.js:294` auto-sets `updatedAt`. This means **records in os_tasks get BOTH fields** — `updated_at` from the store adapter and `updatedAt` from the db.js `put()` normalization.

**Risk: Medium** — The `updated_at` index works correctly because it's explicitly created. But the duplicate timestamp field wastes space and creates confusion for sync logic.

**Root Cause:** The `put()` function in `db.js:293-295` normalizes `updatedAt`, but the OS stores use `updated_at` as their index name. These are two different fields.

**Minimal Fix:** Standardize on one convention. Since `os_*` stores are the future, adopt `updated_at` and update the `put()` normalizer to set `updated_at` instead of `updatedAt` for `os_*` stores, or better: set both.

---

## 2. Store Isolation & Transaction Safety

### Multi-Store Transactions
`softDelete()` (`src/db.js:322-346`) correctly opens a transaction spanning `[storeName, 'deleted']` — this is **atomic**. If either the delete or the tombstone write fails, neither commits.

`clearAllData()` (`src/db.js:428-438`) opens a single transaction across ALL 30 data stores — also atomic.

**Strength:** The write guard system (`acquireWriteGuard`/`releaseWriteGuard`, `src/db.js:6-47`) prevents concurrent writes during import, ensuring data consistency.

### Weakness: importAll() Atomicity

`importAll()` (`src/db.js:441-461`) opens a single transaction for all stores in the bundle. This is atomic within IndexedDB — if ANY put fails, the entire transaction rolls back.

**However**, `importBundle()` in `src/stores/backup.js:137-141` calls `clearAllData()` first, THEN `importAll()`. If the browser crashes between clear and import, **all data is lost**. The safety backup in localStorage (`src/stores/backup.js:126-135`) mitigates this, but only for bundles under 5MB.

**Failure Scenario:** User imports a 20MB backup. `clearAllData()` succeeds. Browser tab crashes before `importAll()` completes. Data is gone. The localStorage safety backup was skipped because it exceeded 5MB.

**Risk: Medium-High**

**Minimal Fix:** Don't clear before import. Instead, use merge-import as default (which already exists as `{ merge: true }`), or perform clear + import in a single transaction.

---

## 3. Unified Task Store Robustness

The `os_tasks` store (`src/stores/tasks.js`) is well-designed:
- Mode-aware via `mode` index
- Date-filtered via `date` index
- Status tracking with `status` field
- Validation via `validateTask()` before write

**Strengths:**
- `addTask()` always sets mode, status, date, timestamps
- `toggleTask()` updates `updated_at` on every toggle
- `getTasksForToday()` filters by mode AND (date = today OR no date + not done)

**Weakness:**
- `getTasksByMode()` uses `getByIndex('mode', mode)` — returns ALL tasks for a mode, regardless of date or status. At 10,000 tasks over 10 years, this returns thousands of records that are then filtered in JS by `getTasksForToday()`.
- No compound index `[mode, date]` — this would allow efficient range queries.

**Risk: Medium** (performance at scale — see performance-forecast.md)

---

## 4. Tombstone / Soft-Delete Strategy

### Current Design
- `softDelete()` moves record to `deleted` store with `{ id, store, data, deletedAt }` envelope
- `undoDelete()` restores from `deleted` back to source store
- `purgeDeleted()` clears the entire `deleted` store

### Growth Problem
**There is NO automatic purge.** The `deleted` store grows unbounded.

Over 10 years with daily use:
- ~5 deletions/day × 365 days × 10 years = **~18,250 tombstones**
- Each tombstone contains the FULL original record as `data`
- If records average 500 bytes, that's ~9MB of tombstones

**Risk: Low-Medium** — 9MB is manageable for IndexedDB, but:
1. Sync (`auto-sync.js:149-165`) processes ALL tombstones on every merge
2. Export includes all tombstones
3. No TTL means ancient deletions are preserved forever

**Failure Scenario:** After 5 years, auto-sync slows because it must merge 10,000+ tombstones every 30 seconds. Each merge iterates the entire `deleted` store.

**Minimal Fix:** Add a `purgeDeletedOlderThan(days)` function and call it on app init:
```javascript
// Purge tombstones older than 30 days on startup
await purgeDeletedOlderThan(30);
```

---

## 5. Conflict Resolution

### Auto-Sync Merge Strategy (`src/auto-sync.js:143-188`)
- **Last-write-wins** based on `updatedAt` / `date` timestamps
- New records (no local match) → always accepted
- Existing records → remote wins if `remoteTime > localTime`
- Tombstones → delete wins if `deletedAt > localUpdatedAt`

**Strengths:**
- Pull-before-push pattern prevents blind overwriting
- Tombstone propagation ensures deletes sync
- `suppressEvents` flag prevents upload loop

**Weaknesses:**

| Finding | Risk | Impact |
|---------|------|--------|
| Clock skew: no NTP sync between devices. Device A clock 5 min ahead always wins | **Medium** | Data overwritten silently |
| No vector clocks or conflict log — user never knows data was overwritten | **Medium** | Silent data loss |
| Concurrent edits: two devices edit same task → one silently lost | **Medium** | Expected in LWW, but no user notification |
| Tombstone vs. edit race: device A deletes task, device B edits task. If B's edit timestamp > A's delete, the delete is ignored | **Low** | Task resurrects — acceptable in most cases |

**10-Year Assessment:** Last-write-wins is the correct choice for a single-user app with 1-2 devices. Vector clocks or CRDTs would be over-engineering. The main risk is **user confusion** when edits disappear silently.

**Minimal Fix:** Log conflict events to a `sync_conflicts` store for debugging. Surface a subtle indicator: "2 items synced from other device."

---

## 6. Atomic Export/Import

### Export
`exportAllData()` (`src/db.js:463-470`) reads each store sequentially. This is **NOT atomic** — if data changes between store reads, the export may be inconsistent.

**Failure Scenario:** User adds a task to `os_tasks` while export is reading `os_projects`. The task references a project that hasn't been exported yet. The export bundle has orphaned references.

**Risk: Low** — exports happen on user action, and the app is single-threaded. The risk is theoretical unless auto-sync triggers a write during export.

**Minimal Fix:** Use the write guard:
```javascript
await acquireWriteGuard();
try { const data = await exportAllData(); }
finally { releaseWriteGuard(); }
```

### Import Validation
`validateBundle()` (`src/stores/backup.js:52-109`) checks:
- Has `_meta` field with `app: 'boris-os'`
- Has `stores` object
- Each store is an array
- Spot-checks records for `id` field

**Strengths:** Basic structural validation catches malformed files.

**Weaknesses:**
- No schema validation per record (e.g., tasks missing `mode` field)
- No version compatibility check (importing v8 data into v6 DB)
- No checksum/hash for integrity verification

**Risk: Low** — the app is tolerant of extra/missing fields in practice.

---

## 7. Corruption Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| **Browser crash mid-write** | IndexedDB transactions are atomic — uncommitted writes roll back | **Built-in protection** |
| **Storage quota exceeded** | `put()` promise rejects — error propagates to caller | **Partial** — no user-facing quota warning |
| **Private browsing** | Most browsers allow IndexedDB in private mode but clear on close | **Accepted risk** — app warns at startup via `isFirstVisit()` check |
| **Browser update changes IDB** | Extremely rare — IndexedDB spec is stable since 2015 | **Low risk** |
| **User clears site data** | All data lost | **Accepted risk** — export reminder mitigates (`src/main.js:129-140`) |
| **IndexedDB corruption** | Rare but documented in Firefox | **No mitigation** — no integrity checks |
| **Multiple tabs** | Second tab's `initDB()` reuses cached `dbInstance` — but what if first tab's DB is closed? | **Low** — singleton pattern prevents double-open |

**Most Dangerous Scenario:** IndexedDB corruption (rare but real, especially in Firefox). The app has NO integrity checks or self-healing. If the database becomes corrupt, the user loses everything unless they have a backup.

**Minimal Fix:** On startup, do a lightweight integrity check: try reading from 3 key stores (`os_tasks`, `settings`, `os_inbox`). If any fail, show a recovery dialog offering to import from the last backup.

---

## Summary

| Domain | Risk | Verdict |
|--------|------|---------|
| Schema design | Low | Well-structured, consistent keyPaths |
| Index coverage | Low-Medium | Good, could add compound indexes for scale |
| Naming inconsistency | Medium | `updated_at` vs `updatedAt` dual-field issue |
| Transaction safety | Good | Write guards, atomic soft-delete |
| Import atomicity | Medium-High | Clear-then-import gap can lose data |
| Tombstone growth | Low-Medium | Unbounded growth, needs TTL |
| Conflict resolution | Medium | LWW is correct choice, needs conflict logging |
| Corruption recovery | Medium | No integrity checks, no self-healing |

### Principal Engineer Assessment
> The data layer is solid for a local-first app. IndexedDB provides built-in transaction safety that the app correctly leverages. The three structural improvements needed are: (1) fix import atomicity with write guard, (2) add tombstone TTL, (3) add startup integrity check. None require schema changes or rewrites. The naming inconsistency is cosmetic but should be standardized in a future migration.
