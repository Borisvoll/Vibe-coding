# Top 10 Risks

> Ordered by likelihood x impact. Each risk includes a concrete mitigation.

---

### 1. No Tests — Silent Regressions

**Risk:** Zero test files in the repo. Any change can break existing features without detection. The dark mode regression (OS shell path skipping settings) is proof this already happened.

**Mitigation:** Add minimal unit tests for store adapters (inbox.js, tasks.js) and integration tests for the boot sequence (main.js). Use Vitest (zero-config with Vite). Start with 5-10 tests, not 100%.

---

### 2. IndexedDB Schema Drift

**Risk:** 28 stores across 5 schema versions with no migration tests. A bad `onupgradeneeded` handler can corrupt or lose all user data. IndexedDB doesn't support rollback.

**Mitigation:** Write migration tests that simulate upgrading from v1→v5. Add a `diagnostics` page data integrity check (partially exists). Never delete stores — only add (append-only strategy is already in place, keep enforcing it).

---

### 3. Dual Architecture Complexity

**Risk:** Two complete UI systems (legacy shell + BORIS OS shell) coexist. Changes to shared code (db.js, constants.js, styles) can break either path in non-obvious ways. The feature flag gate adds a maintenance fork in every boot-related feature.

**Mitigation:** Commit to BORIS OS as primary. Deprecate legacy shell in M2. Remove it in M3. Until then, keep the try/catch fallback but stop adding features to legacy pages.

---

### 4. No Backend = No Recovery

**Risk:** All data lives in a single browser's IndexedDB. Clear browser data, switch device, or corrupt the DB → everything is gone. Users (Boris) may not export regularly.

**Mitigation:** M1: Add auto-export to JSON on weekly basis (save to Downloads). M2: Deploy to Cloudflare Pages + D1 for sync. The `device_id`, `updated_at`, and `deleted` store are already sync-ready.

---

### 5. Store Duplication (os_personal_* vs os_tasks)

**Risk:** `os_personal_tasks` and `os_tasks` overlap. Some blocks read from one, some from the other. Data can diverge, causing user confusion (tasks appearing/disappearing).

**Mitigation:** Migrate `os_personal_tasks` data into `os_tasks` with mode='Personal'. Mark `os_personal_tasks` as deprecated. This is already tracked in todo.md.

---

### 6. Dark Mode / Theme Regression (Active)

**Risk:** Currently staged but not deployed. The `applyUserSettings()` extraction in main.js fixes it, but until committed and deployed, users see a broken light-only UI.

**Mitigation:** Commit and deploy the staged fix immediately. Add a boot-sequence test that verifies `data-theme` is set before shell renders.

---

### 7. No Type Safety

**Risk:** Pure vanilla JS with no TypeScript, no JSDoc types, no runtime validation. Store schemas are informal — any block can write malformed data to any store. A typo in a field name (`updatedAt` vs `updated_at`) silently breaks queries.

**Mitigation:** Add JSDoc `@typedef` for core entities (InboxItem, Task, DailyEntry, TrackerEntry). Add runtime validation in store adapters (simple schema checks, not a library). Consider TypeScript migration in M3.

---

### 8. Service Worker Cache Staleness

**Risk:** The SW caches `index.html` and core assets. If a deploy happens but the SW cache isn't invalidated, users see stale UI. The version-based cache name helps, but `APP_VERSION` must be bumped manually.

**Mitigation:** Use Vite's content-hash filenames (already configured via default Vite behavior). Ensure `APP_VERSION` is auto-generated from `package.json` version or git SHA. Add `skipWaiting()` banner (already exists).

---

### 9. Single Developer Bus Factor

**Risk:** Solo developer (Boris). If Boris stops working on this, the project has no documentation of intent, architecture decisions, or onboarding path for a contributor.

**Mitigation:** The `docs/` folder (architecture.md, design-principles.md, current-state.md) addresses this. Keep updating docs with each milestone. The block `_template/` folder is good for contributor onboarding.

---

### 10. Scope Creep via Mode Proliferation

**Risk:** Three modes (BPV/School/Personal) already create 3x block variants. Adding more modes (e.g., Work, Hobby) would explode the block count. Some blocks (school-current-project, personal-week-planning) are thin wrappers around similar patterns.

**Mitigation:** Keep exactly 3 modes. Extract shared patterns (card layout, CRUD list, status toggles) into reusable block primitives. New "modes" should be label variants, not new blocks.

---

## Risk Matrix Summary

| # | Risk | Likelihood | Impact | Priority |
|---|------|-----------|--------|----------|
| 1 | No tests | High | High | **Critical** |
| 2 | Schema drift | Medium | Critical | **Critical** |
| 3 | Dual architecture | High | Medium | **High** |
| 4 | No backup/recovery | High | Critical | **High** |
| 5 | Store duplication | Medium | Medium | **Medium** |
| 6 | Dark mode regression | Certain | Low | **Medium** |
| 7 | No type safety | Medium | Medium | **Medium** |
| 8 | SW cache staleness | Low | Medium | **Low** |
| 9 | Bus factor | Medium | Low | **Low** |
| 10 | Scope creep | Low | Medium | **Low** |
