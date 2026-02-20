# Refactor Resilience & Technical Debt — 10-Year Audit

**Risk Level: MEDIUM**
**Confidence: High** — based on direct analysis of codebase structure, test coverage, naming patterns

---

## 1. Dual Event Systems

### Finding
BORIS OS has two independent event/pub-sub systems:

| System | File | Usage | Pattern |
|--------|------|-------|---------|
| **EventBus** | `src/core/eventBus.js` | OS shell, blocks, mode switching | Factory function, instance-based |
| **State** | `src/state.js` | Legacy pages, auto-sync | Module-level singleton |

### Impact
- `auto-sync.js` imports `{ on, emit }` from `src/state.js` (`line 16`)
- OS shell uses `eventBus` from kernel injection
- **These systems don't communicate.** An event emitted on `state.js` is invisible to `eventBus` listeners and vice versa.

### Concrete Bug
Auto-sync's `emitRefreshEvents()` (`src/auto-sync.js:194-207`) emits events like `hours:updated` on `state.js`. OS blocks listen on `eventBus`. Result: **sync changes don't refresh OS blocks.**

**Risk: Medium** — Works today because auto-sync is only initialized in legacy path. Becomes a real bug if auto-sync is enabled for OS path.

**Minimal Fix:** Bridge the two systems:
```javascript
// In initAutoSync, if OS path is active:
const legacyEvents = ['hours:updated', 'logbook:updated', ...];
legacyEvents.forEach(evt => state.on(evt, () => eventBus.emit(evt)));
```
Or better: migrate auto-sync to accept an eventBus parameter.

---

## 2. Legacy Path Dead Weight

### File Count
- `src/pages/`: 19 page modules (~4,000+ lines total)
- `src/router.js`: Hash-based routing
- `src/components/shell.js`: Legacy shell layout
- `src/state.js`: Legacy event system

### Assessment

| Metric | Legacy Path | OS Path |
|--------|------------|---------|
| Page count | 19 | 6 tabs via blocks |
| Test coverage | **None** (0 test files in tests/pages/) | Moderate |
| Active development | None | All new features |
| Users (estimated) | <5% (opt-in) | 95%+ (default) |
| Shared code | db.js, stores, utils | Same |

**Risk: Low-Medium** — The legacy path doesn't actively cause bugs, but it:
1. Inflates code review scope
2. Makes store changes risky (must work for both paths)
3. Prevents cleaning up `state.js`
4. Confuses new contributors

**Minimal Fix:** Year 1-2 deprecation plan:
1. Add deprecation notice to legacy pages
2. Stop routing new features to legacy
3. At year 2, remove the legacy switch button
4. At year 3, delete `src/pages/`, `src/router.js`, `src/components/shell.js`, `src/state.js`

---

## 3. Naming Inconsistencies

### Timestamp Fields

| Pattern | Stores Using It |
|---------|----------------|
| `updatedAt` (camelCase) | competencies, quality, dailyPlans, weekReviews |
| `updated_at` (snake_case) | ALL `os_*` stores (tasks, inbox, projects, lists, school_*, personal_*) |
| `createdAt` (camelCase) | Used in record creation but no index |
| `created_at` (snake_case) | Some records in os_* stores |

### Double Timestamp Bug
The `put()` function in `src/db.js:293-295` auto-sets `updatedAt` (camelCase) on all records with an `id` field. But OS store adapters set `updated_at` (snake_case). Result: OS records have **both fields**.

```javascript
// db.js put() normalizer:
const normalized = record && typeof record === 'object' && 'id' in record && storeName !== 'deleted'
  ? { ...record, updatedAt: record.updatedAt || new Date().toISOString() }
  : record;
```

This adds `updatedAt` to records that already have `updated_at`. Two timestamp fields per record.

**Risk: Low** — Both fields are set, indexes work on the correct one. But it's confusing for debugging and wastes ~30 bytes per record.

**Minimal Fix:** In `put()`, check if `updated_at` exists before setting `updatedAt`:
```javascript
const ts = new Date().toISOString();
const normalized = {
  ...record,
  updated_at: record.updated_at || ts,
  updatedAt: record.updatedAt || ts,
};
```

---

## 4. Code Readability

### Shell.js — 856 Lines
`src/os/shell.js` is the largest file. It contains:
- HTML template (~260 lines of inline HTML)
- Tab navigation logic
- Mode switching UI (picker, wash, hero, titles)
- Vandaag page layout builder
- Search bar initialization
- Settings block rendering
- Keyboard shortcuts
- Deep link handling
- Friday prompt
- Cleanup

**Assessment:** This file does too much. It's a **god module** for the OS shell.

**Risk: Medium** — Not buggy, but makes changes risky and review difficult.

**Minimal Fix:** Extract into focused modules:
```
src/os/shell.js         → Shell initialization + tab switching (~100 lines)
src/os/mode-picker.js   → Mode picker UI + wash animation (~100 lines)
src/os/vandaag-layout.js → Collapsible zones + header (~100 lines)
src/os/topbar.js        → Theme/accent/gear menu (~100 lines)
src/os/mobile-nav.js    → Mobile header + bottom nav (~50 lines)
```

This is a **safe refactor** — it's splitting a large function into smaller files with the same behavior.

---

## 5. Responsibility Boundaries

### Current Boundaries

```
Blocks ──→ Stores ──→ db.js ──→ IndexedDB
  ↑                              ↑
  └── EventBus ←──── Shell ──────┘
```

| Layer | Responsibility | Clean? |
|-------|---------------|--------|
| `db.js` | CRUD + transactions | **Yes** — no business logic |
| `stores/*.js` | Domain validation + queries | **Yes** — pure data access |
| `blocks/*/view.js` | UI rendering + user interaction | **Mostly** — some blocks have business logic |
| `blocks/*/store.js` | Block-specific data access | **Good** — wraps store adapters |
| `os/shell.js` | Layout + navigation + mode UI | **Too broad** — needs splitting |
| `core/*` | Kernel services | **Excellent** — clean interfaces |

**Assessment: Mostly clean boundaries.** The main issue is shell.js being too broad.

---

## 6. Upgrade Safety

### Vite 5 → Future Versions
- Vite 6 was released in late 2024 with breaking changes to SSR config
- BORIS OS uses Vite as a simple bundler — no SSR, no plugins
- Upgrade path: change version in package.json, run tests

**Risk: Low** — The simple Vite config (`vite.config.js` is 16 lines) minimizes exposure to breaking changes.

### Vitest 4 → Future Versions
- Vitest follows Vite's version cadence
- BORIS OS uses basic `vitest run` — no custom reporters or plugins

**Risk: Low**

### ES2022 Target
- ES2022 features used: `crypto.randomUUID()`, top-level await (not used), optional chaining, nullish coalescing
- Browser support: Chrome 94+, Firefox 93+, Safari 15+ (all 2021+)

**10-Year Assessment:** ES2022 will be universally supported through 2036. All current browsers support it. The risk is negligible.

### Zero Runtime Dependencies
**This is the single strongest long-term advantage.** With zero npm runtime dependencies:
- No dependency update pressure
- No security advisories to triage
- No breaking changes from transitive deps
- The code works as-is for decades

**Risk: None** — This is optimal.

---

## 7. Test Coverage Gaps

### Files with Tests

| Module | Test File | Coverage Level |
|--------|-----------|---------------|
| tasks.js | tasks.test.js | Good |
| inbox.js | inbox.test.js, inbox-processing.test.js | Good |
| projects.js | projects.test.js | Good |
| daily.js | daily.test.js, daily-outcomes.test.js | Good |
| lists.js | lists.test.js | Good |
| bpv.js | bpv.test.js | Good |
| personal.js | personal.test.js | Good |
| search.js | search.test.js | Good |
| backup.js | backup.test.js | Good |
| weekly-review.js | weekly-review.test.js | Good |
| validate.js | validate.test.js | Good |
| tags.js | tags.test.js | Good |
| tracker.js | tracker.test.js | Good |
| mode switching | mode-switching.test.js | Good |
| theme engine | themeEngine.test.js | Good |
| module presets | modulePresets.test.js | Good |
| schema/migration | schema.test.js, migration.test.js | Moderate |
| daily aggregator | dailyAggregator.test.js | Good |
| dashboard data | dashboardData.test.js | Good |
| deep links | deepLinks.test.js | Good |
| command palette | command-palette.test.js | Good |
| school dashboard | school-dashboard.test.js | Good |
| personality blocks | personality-blocks.test.js | Good |

### Critical Files WITHOUT Tests

| File | Lines | Risk of Untested |
|------|:-----:|:----------------:|
| `src/os/shell.js` | 856 | **High** — most complex module |
| `src/crypto.js` | 169 | **High** — security-critical |
| `src/auto-sync.js` | 425 | **High** — network + crypto + merge logic |
| `src/main.js` | 215 | **Medium** — initialization logic |
| `src/pages/*.js` (19 files) | ~4000 | **Low** — legacy, being deprecated |
| All block view files | ~3000 | **Medium** — UI rendering logic |

**Risk: Medium-High** — The three most critical untested files are shell.js, crypto.js, and auto-sync.js. These contain the most complex logic in the app.

**Minimal Fix (Year 1):**
1. Add crypto.test.js — test encrypt/decrypt roundtrip, wrong password, corrupt data
2. Add auto-sync.test.js — test merge logic, conflict resolution, tombstone handling
3. Add shell integration tests — test tab switching, mode change, block mounting

---

## 8. Technical Debt Inventory

| # | Item | Severity | Effort | Location |
|:-:|------|:--------:|:------:|----------|
| 1 | Dual event systems (eventBus vs state.js) | **High** | 2h | src/auto-sync.js, src/state.js |
| 2 | Legacy path (19 unused pages) | **Medium** | 4h (deletion) | src/pages/*.js |
| 3 | Shell.js god module (856 lines) | **Medium** | 3h (split) | src/os/shell.js |
| 4 | Timestamp naming inconsistency | **Low** | 1h | src/db.js, src/stores/*.js |
| 5 | MigrationManager dead code | **Low** | 15min (delete) | src/core/migrationManager.js |
| 6 | No crypto tests | **High** | 2h | tests/ |
| 7 | No auto-sync tests | **High** | 3h | tests/ |
| 8 | globalSearch full-table scan | **Medium** | 4h | src/stores/search.js |
| 9 | Import atomicity gap | **Medium** | 1h | src/stores/backup.js |
| 10 | unmountAll() no error handling | **Low** | 15min | src/os/shell.js:299 |

**Total estimated effort: ~20 hours** to address all 10 items.

---

## Summary

| Domain | Risk | Verdict |
|--------|------|---------|
| Dual event systems | **Medium** | Bridge or migrate auto-sync |
| Legacy path burden | Low-Medium | Deprecate on schedule |
| Naming inconsistency | Low | Cosmetic but confusing |
| Code readability | Medium | Shell.js needs splitting |
| Responsibility boundaries | Low | Clean except shell.js |
| Upgrade safety | Low | Minimal dependencies |
| Test coverage | **Medium-High** | 3 critical files untested |
| Technical debt total | Medium | ~20 hours to address all items |

### Principal Engineer Assessment
> The codebase is remarkably clean for a zero-dependency vanilla JS monolith. The technical debt is modest — 20 hours of focused work addresses every item. The two highest-priority items are: (1) adding tests for crypto.js and auto-sync.js, and (2) bridging the dual event systems. The zero-dependency approach is the strongest long-term asset — it eliminates the most common source of maintenance burden in JavaScript projects. A new developer could onboard in 1-2 days by reading CLAUDE.md and the store adapters.
