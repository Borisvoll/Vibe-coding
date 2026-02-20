# Risk Heatmap — BORIS OS 10-Year Sustainability

```
                    LOW          MEDIUM        HIGH
                ┌────────────┬─────────────┬─────────────┐
 Architecture   │ Kernel DI  │ Dual events │             │
                │ Mode logic │ Shell size  │             │
                │ Block iso  │ Legacy path │             │
                ├────────────┼─────────────┼─────────────┤
 Data           │ Schema     │ Import atom │             │
                │ Indexes    │ Naming inc. │             │
                │ Soft-del   │ Tombstone   │             │
                ├────────────┼─────────────┼─────────────┤
 Migration      │ Idempotent │ Ad-hoc mig  │             │
                │ Roll-fwd   │ Dead migr.  │             │
                │ v7 safety  │ mgr code    │             │
                ├────────────┼─────────────┼─────────────┤
 Deployment     │ GH Pages   │ APP_VERSION │             │
                │ Cache ver  │             │ JS not      │
                │ Update flow│             │ pre-cached  │
                ├────────────┼─────────────┼─────────────┤
 Security       │ AES-GCM    │ PBKDF2 iter │             │
                │ Zero deps  │ PW in IDB   │ jsonbin.io  │
                │ XSS prev   │             │ longevity   │
                ├────────────┼─────────────┼─────────────┤
 Performance    │ Rendering  │ getAll()    │ globalSearch │
                │ Aggregation│ Export 50MB+│ at 15K+     │
                │ Memory     │ Compound idx│ records     │
                ├────────────┼─────────────┼─────────────┤
 UX             │ Hierarchy  │ Default pre │             │
                │ Mode cues  │ Discovery   │             │
                │ Collapse   │ Block >50   │             │
                ├────────────┼─────────────┼─────────────┤
 Refactor       │ Boundaries │ No crypto   │             │
                │ ES2022     │ tests       │             │
                │ Vite/Vi    │ No sync     │             │
                │ upgrade    │ tests       │             │
                └────────────┴─────────────┴─────────────┘
```

---

## Consolidated Risk Register

### HIGH Risk (3 items)

| # | Risk | Domain | Impact | Timeline |
|:-:|------|--------|--------|----------|
| 1 | **globalSearch() full-table scan** | Performance | Search becomes unusable at 15K+ records | Year 3-5 |
| 2 | **JS/CSS bundles not pre-cached by SW** | Deployment | App breaks offline if bundle evicted | Now |
| 3 | **jsonbin.io service dependency** | Security | Sync permanently breaks if service shuts down | Year 3-10 |

### MEDIUM Risk (12 items)

| # | Risk | Domain | Impact | Timeline |
|:-:|------|--------|--------|----------|
| 4 | Dual event systems (eventBus vs state.js) | Architecture | Sync changes don't refresh OS blocks | Now |
| 5 | Import clear-then-write atomicity gap | Data | Data loss on crash during import | Rare |
| 6 | No tests for crypto.js | Refactor | Regression risk in security code | Now |
| 7 | No tests for auto-sync.js | Refactor | Regression risk in sync logic | Now |
| 8 | Shell.js god module (856 lines) | Refactor | Risky to modify | Now |
| 9 | Legacy path maintenance burden | Architecture | Dead code increases review scope | Ongoing |
| 10 | Timestamp naming inconsistency | Data | Confusing double-field records | Ongoing |
| 11 | Default "alles" preset for new users | UX | New users see max complexity | Now |
| 12 | Ad-hoc data migrations in main.js | Migration | Untracked, untested transforms | Now |
| 13 | PBKDF2 iterations below OWASP | Security | Below recommended minimum | Now |
| 14 | Tombstone store grows unbounded | Data | Sync slows at 10K+ deletions | Year 3-5 |
| 15 | APP_VERSION management unclear | Deployment | Stale SW if not bumped | On deploy |

### LOW Risk (10+ items)

| # | Risk | Domain |
|:-:|------|--------|
| 16 | EventBus no per-handler error isolation | Architecture |
| 17 | Block unmountAll() no try/catch | Architecture |
| 18 | Feature flag localStorage scalability | Architecture |
| 19 | Compound index missing on os_tasks | Performance |
| 20 | No DB corruption self-healing | Data |
| 21 | No onblocked handler for version conflicts | Migration |
| 22 | MigrationManager dead code | Migration |
| 23 | New collapsible sections undiscoverable | UX |
| 24 | No CSP meta tag | Security |
| 25 | Export streaming for 50MB+ data | Performance |

---

## Risk Distribution

| Domain | Low | Medium | High | Overall |
|--------|:---:|:------:|:----:|:-------:|
| Architecture | 3 | 3 | 0 | **Medium** |
| Data | 2 | 3 | 0 | **Medium** |
| Migration | 3 | 2 | 0 | **Medium** |
| Deployment | 2 | 1 | 1 | **Medium-High** |
| Security | 3 | 2 | 1 | **Low-Medium** |
| Performance | 2 | 2 | 1 | **Medium** |
| UX | 3 | 2 | 0 | **Medium** |
| Refactor | 3 | 2 | 0 | **Medium** |

**Overall System Risk: MEDIUM**

No domain is catastrophically weak. The three HIGH risks are all addressable with targeted, non-breaking changes.
