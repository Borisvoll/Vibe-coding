# Backup — Guarantees & User Expectations

**Date:** 2026-02-21
**Milestone:** B (Backup Safety)

---

## Export

- **Format:** Compact JSON (no indentation)
- **File name:** `boris-backup-YYYY-MM-DD.json`
- **Contents:** All IndexedDB stores with metadata header
- **Estimated size:** Shown before download via `getEstimatedExportSize()`

### Metadata Header (`_meta`)

```json
{
  "app": "boris-os",
  "version": "2.0.1",
  "exportedAt": "2026-02-21T14:00:00.000Z",
  "storeCount": 30,
  "recordCounts": { "os_tasks": 150, "os_inbox": 45, ... }
}
```

## Import

### Validation (before import)

| Check | Result |
|-------|--------|
| Input is JSON object | Error if not |
| `_meta.app === 'boris-os'` | Error if wrong |
| `_meta` exists | Error if missing |
| `stores` exists and is object | Error if missing |
| Each store value is array | Error if not |
| Records have `id` or `key` | Warning if missing |
| Version newer than current | Warning (not error) |
| Empty backup (0 records) | Warning |

### Import behavior

1. Validate bundle — reject if invalid
2. If `merge: false` (default): clear all stores, then write new data
3. If `merge: true`: write new data on top of existing (upsert by id)
4. Both clear and import use IDB transactions (each individually atomic)

### What changed (Milestone B)

- **Removed:** localStorage safety blob (`boris_safety_backup`)
  - Was unreliable: silently skipped for datasets >5MB
  - Was a false sense of security
- **Added:** Version validation warning for newer backups
- **Changed:** Export uses compact JSON (30-50% smaller files)
- **Changed:** `downloadBundle()` returns `exportSizeBytes` in metadata

## Size Guidelines

| Records | Estimated Export | Status |
|---------|----------------|--------|
| < 5,000 | < 5 MB | Normal |
| 5,000 - 20,000 | 5 - 20 MB | Normal |
| 20,000 - 50,000 | 20 - 50 MB | Warning shown |
| > 50,000 | > 50 MB | Consider archiving old data |

## User Advice

1. **Export regularly** — at least weekly (app shows reminder after 7 days)
2. **Before importing:** Always export a fresh backup first
3. **Keep multiple backups** — rotate last 3 exports
4. **Import clears existing data** — this is by design (use merge mode to keep both)
