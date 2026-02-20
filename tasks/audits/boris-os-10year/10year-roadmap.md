# 10-Year Roadmap — BORIS OS Stabilization Plan

**Approach:** Phased hardening. Each phase addresses the highest-risk items from the preceding period. No rewrites. Minimal-impact changes only.

---

## Phase 1: Hardening (Year 1-2) — 2026-2028

**Goal:** Eliminate all HIGH risks, address critical MEDIUM risks, establish maintenance discipline.

### Priority 1 — Critical Fixes (~12 hours)

| # | Action | Risk Addressed | Effort |
|:-:|--------|---------------|:------:|
| 1 | **Pre-cache JS/CSS bundles in SW** — Generate asset manifest at build time, add to SW install handler | Offline reliability (HIGH) | 3h |
| 2 | **Add early-exit to globalSearch()** — Stop scanning after 12 results found | Search performance (HIGH) | 30min |
| 3 | **Add crypto.test.js** — Encrypt/decrypt roundtrip, wrong password, corrupt data, binary format | No crypto tests (MEDIUM) | 2h |
| 4 | **Add auto-sync merge tests** — Conflict resolution, tombstone handling, clock skew scenarios | No sync tests (MEDIUM) | 3h |
| 5 | **Bridge dual event systems** — Have auto-sync accept eventBus parameter or bridge state.js events | Dual events (MEDIUM) | 2h |
| 6 | **Wrap unmountAll() in try/catch** — Per-block error isolation in shell.js unmount loop | Block cleanup (LOW) | 15min |
| 7 | **Add error isolation to EventBus emit()** — Try/catch per handler | Event handler errors (LOW) | 15min |

### Priority 2 — Structural Improvements (~8 hours)

| # | Action | Risk Addressed | Effort |
|:-:|--------|---------------|:------:|
| 8 | **Fix import atomicity** — Use write guard around export-before-clear, or merge-import by default | Data loss on import (MEDIUM) | 1h |
| 9 | **Add tombstone TTL** — `purgeDeletedOlderThan(30)` on app startup | Tombstone growth (MEDIUM) | 1h |
| 10 | **Change default preset** — Mode-appropriate preset instead of "alles" | New user overwhelm (MEDIUM) | 1h |
| 11 | **Bump PBKDF2 to 600K iterations** — With backward-compatible fallback for old files | OWASP compliance (MEDIUM) | 2h |
| 12 | **Add DB startup integrity check** — Read from 3 key stores, show recovery dialog on failure | Corruption recovery (LOW) | 2h |
| 13 | **Auto-generate APP_VERSION** — From git hash or build timestamp in vite.config.js | Stale SW risk (MEDIUM) | 1h |

### Priority 3 — Code Quality (~6 hours)

| # | Action | Risk Addressed | Effort |
|:-:|--------|---------------|:------:|
| 14 | **Consolidate ad-hoc migrations** — Create startup migration runner in main.js | Untracked migrations (MEDIUM) | 1h |
| 15 | **Delete MigrationManager dead code** — Remove src/core/migrationManager.js | Dead code (LOW) | 15min |
| 16 | **Standardize timestamp naming** — Pick `updated_at` convention for all new code | Naming inconsistency (LOW) | 1h |
| 17 | **Add onblocked handler to initDB()** — User-facing message for tab conflicts | Version conflicts (LOW) | 30min |
| 18 | **Add CSP meta tag** — defense-in-depth, restrict to self + jsonbin.io | Security hygiene (LOW) | 30min |
| 19 | **Expand tutorial** — Add tips for command palette, module presets | Feature discovery (MEDIUM) | 2h |

**Phase 1 Total: ~26 hours**

---

## Phase 2: Scalability (Year 3-5) — 2028-2031

**Goal:** Ensure performance at 15K+ records, modernize sync, reduce legacy burden.

### Performance Scaling

| # | Action | Trigger | Effort |
|:-:|--------|---------|:------:|
| 20 | **Add compound index [mode, date] to os_tasks** — DB migration v9 | Task count > 5K | 2h |
| 21 | **Implement indexed search** — Simple inverted index in IndexedDB for text search | Search latency > 100ms | 8h |
| 22 | **Cache daily aggregation** — WeakMap per mode+date, invalidate on tasks:changed | Daily load time > 200ms | 2h |
| 23 | **Streaming export** — ReadableStream-based JSON serialization for 50MB+ exports | Export time > 10s | 4h |
| 24 | **Move safety backup to IndexedDB** — Dedicated store instead of 5MB localStorage | Data > 5MB | 2h |

### Architecture Cleanup

| # | Action | Trigger | Effort |
|:-:|--------|---------|:------:|
| 25 | **Split shell.js** — Extract mode-picker, topbar, vandaag-layout, mobile-nav | Before adding features | 3h |
| 26 | **Deprecate legacy path** — Add deprecation notice, stop new features | After 2 years of OS path | 1h |
| 27 | **Remove legacy path** — Delete src/pages/, src/router.js, src/state.js | After deprecation period | 4h |
| 28 | **Abstract sync backend** — Interface for jsonbin.io, future backends (WebDAV, S3) | jsonbin.io concern (HIGH) | 4h |

### Data Model

| # | Action | Trigger | Effort |
|:-:|--------|---------|:------:|
| 29 | **Add conflict logging** — Sync conflict store for debugging | User reports data loss | 2h |
| 30 | **Extract migration blocks** — Named functions per version in db.js | DB_VERSION > 12 | 2h |

**Phase 2 Total: ~34 hours**

---

## Phase 3: Maintenance Discipline (Year 5-10) — 2031-2036

**Goal:** Sustain stability, adapt to platform changes, manage long-term growth.

### Ongoing Maintenance

| # | Action | Frequency | Effort/Year |
|:-:|--------|-----------|:-----------:|
| 31 | **Vite/Vitest version bumps** | Annual | 2h |
| 32 | **Browser API compatibility check** — Verify IndexedDB, WebCrypto, SW behavior | Annual | 1h |
| 33 | **PBKDF2 iteration review** — Compare with current OWASP recommendations | Every 3 years | 1h |
| 34 | **Run full test suite** — Ensure 100% pass on every deploy | Continuous | Automated |
| 35 | **Tombstone purge verification** — Confirm TTL is working, deleted store stays small | Annual | 30min |
| 36 | **Export/import round-trip test** — Manual verification with real data | Quarterly | 30min |

### Growth Accommodations (as needed)

| # | Action | Trigger | Effort |
|:-:|--------|---------|:------:|
| 37 | **Block sub-grouping in zones** — Nested collapsible sections within zones | Block count > 50 | 4h |
| 38 | **Mode hierarchy** — Sub-modes or mode groups | Mode count > 4 | 8h |
| 39 | **Offline-first sync** — Queue local changes for later push (replaces poll) | Frequent offline use | 16h |
| 40 | **Alternative sync backend** — Migrate from jsonbin.io if needed | Service degradation | 4h (using abstract interface from #28) |

### Platform Adaptation

| # | Action | Trigger | Effort |
|:-:|--------|---------|:------:|
| 41 | **ES2025+ features** — Adopt new JS features as browser support reaches 95% | Annual evaluation | Varies |
| 42 | **Storage API changes** — Adapt if IndexedDB spec evolves | Spec change | Varies |
| 43 | **GitHub Pages alternative** — Deploy to Cloudflare/Netlify if GH changes terms | Policy change | 2h |

**Phase 3 Total: ~10 hours/year + as-needed items**

---

## Timeline Summary

```
2026 ──────────────── 2028 ──────────────── 2031 ──────────────── 2036
  │ Phase 1: Harden    │ Phase 2: Scale      │ Phase 3: Maintain    │
  │ 26h focused work   │ 34h over 3 years    │ 10h/year ongoing     │
  │                     │                     │                      │
  │ Fix 3 HIGH risks   │ Remove legacy path  │ Adapt to platform    │
  │ Add critical tests │ Scale search/export │ Monitor + tune       │
  │ Bridge events      │ Abstract sync       │ Grow as needed       │
  │ Harden SW offline  │ Split shell.js      │                      │
```

---

## Investment Summary

| Phase | Period | Hours | Items |
|-------|--------|:-----:|:-----:|
| Phase 1 | Year 1-2 | 26h | 19 |
| Phase 2 | Year 3-5 | 34h | 11 |
| Phase 3 | Year 5-10 | ~50h total | Ongoing + 7 as-needed |

**Total 10-year maintenance investment: ~110 hours**

That's approximately 11 hours per year — less than one day per year of focused maintenance to keep BORIS OS stable, performant, and secure for a decade.
