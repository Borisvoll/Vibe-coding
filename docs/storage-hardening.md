# Storage Hardening — Indexing Strategy & Pruning Rules

**Date:** 2026-02-21
**Milestone:** A (Performance)

---

## Problem

After years of daily use, unbounded `getAll()` scans on large stores cause progressive performance degradation. The main offenders:

| Store | Growth Rate | Year 5 Est. | Impact |
|-------|-------------|-------------|--------|
| `os_tasks` | ~3/day | ~5,500 | Weekly review, search |
| `dailyPlans` | ~3/day (1 per mode) | ~5,475 | History, search |
| `os_inbox` | ~2/day | ~3,650 | Search, creative sparks |
| `os_personal_wellbeing` | ~1/day | ~1,825 | Search, recent entries |
| `deleted` | ~1/day | ~1,825 | Export size, sync |

## Solution: Bounded Queries

### New db.js Helpers

| Function | Purpose | Mechanism |
|----------|---------|-----------|
| `getByIndexRange(store, index, lower, upper)` | Date-range queries | IDB `KeyRange.bound()` on index |
| `getRecentByIndex(store, index, limit)` | Get N newest records | Reverse cursor with early exit |
| `countRecords(store)` | Record count per store | IDB `count()` |
| `purgeDeletedOlderThan(days)` | Tombstone TTL | Cursor on `deletedAt` index |
| `getDbHealthMetrics()` | Store-by-store counts + export estimate | Iterates `countRecords()` |

### Existing Indexes Used

| Store | Index | Used For |
|-------|-------|----------|
| `os_tasks` | `date` | Weekly review bounded query, search |
| `os_tasks` | `status` | Open task count |
| `os_inbox` | `updated_at` | Weekly review inbox processing |
| `os_personal_wellbeing` | `updated_at` | Weekly review wellbeing, recent entries |
| `dailyPlans` | `date` | Search, pagination, history browser |
| `hours` | `date` | Search date-bounded |
| `logbook` | `date` | Search date-bounded |
| `deleted` | `deletedAt` | Tombstone purge range |

No new indexes were added. No schema version bump required.

### Changes by File

| File | Before | After |
|------|--------|-------|
| `src/stores/search.js` | `getAll()` on 7 stores per keystroke | Date-bounded on 4 stores + limit 30 |
| `src/stores/weekly-review.js` | `getAll()` on 4 stores | Date-range on 3 stores, index query on 1 |
| `src/stores/personal.js` | `getAll()` on inbox + wellbeing | Reverse cursor with limit |
| `src/stores/daily.js` | `getAllDailyEntries()` unbounded | Added `getDailyEntriesPage()` with cursor |
| `src/main.js` | `purgeDeleted()` never called | `purgeDeletedOlderThan(30)` on startup |

## Pruning Rules

### Tombstone Purge
- **Schedule:** On app startup (fire-and-forget)
- **TTL:** 30 days
- **Mechanism:** `purgeDeletedOlderThan(30)` uses cursor on `deletedAt` index
- **Safety:** Only deletes from the `deleted` store (undo records). No user data is removed.
- **Rationale:** Undo window is realistically <1 hour. 30 days is generous.

### No Auto-Archival
Completed tasks are NOT auto-archived or deleted. They remain in `os_tasks` for search and weekly review. The bounded query approach handles the performance concern without data loss.

## Search Behavior

- **Default limit:** 30 results
- **Date window:** Last 365 days for time-series stores (`os_tasks`, `hours`, `logbook`, `dailyPlans`)
- **Full scan:** Still used for small stores (`os_inbox`, `os_projects`, `os_personal_wellbeing`)
- **Scoring:** Unchanged — fuzzy score with exact/substring/subsequence tiers
