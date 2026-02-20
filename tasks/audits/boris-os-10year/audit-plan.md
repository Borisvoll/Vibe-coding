# BORIS OS — 10+ Year Sustainability & Durability Audit Plan

**Date**: 2026-02-20
**Auditor**: Claude (Opus 4.6)
**Scope**: Full-stack durability assessment of BORIS OS as a local-first PWA
**Target**: Can this system survive 10+ years without rewrite?

---

## 1. Audit Domains

### A. Architecture Resilience
- [ ] Coupling analysis between core modules (EventBus, ModeManager, BlockRegistry)
- [ ] Block isolation: can blocks be added/removed without side effects?
- [ ] Event bus fragility: unhandled events, listener leaks, ordering assumptions
- [ ] Mode switching logic: correctness under concurrent state changes
- [ ] Feature flag scalability: what happens at 20+ flags?
- [ ] Hidden dependencies: imports that bypass the kernel contract
- [ ] Dual-path (OS vs Legacy) maintenance burden

### B. Data Durability (IndexedDB)
- [ ] Schema design: 31 stores, keyPath consistency, index coverage
- [ ] Store isolation: cross-store transaction safety
- [ ] Unified task store robustness (`os_tasks` with mode index)
- [ ] Tombstone/soft-delete strategy: `deleted` store growth, purge policy
- [ ] Conflict resolution: last-write-wins correctness
- [ ] Atomic export/import: partial failure scenarios
- [ ] Corruption scenarios: browser crash mid-transaction, quota exceeded, private browsing

### C. Migration & Schema Versioning
- [ ] Idempotency: can migrations run twice safely?
- [ ] Roll-forward safety: v1->v8 sequential correctness
- [ ] Rollback viability: is downgrade possible?
- [ ] Per-store version tracking vs. single DB_VERSION
- [ ] v7 dailyPlans migration: cursor-based data transform correctness
- [ ] Future migration complexity forecast (v9, v10, v20+)

### D. Service Worker & Deployment
- [ ] Cache versioning strategy (VERSION param from APP_VERSION)
- [ ] Update reliability: SKIP_WAITING + controllerchange flow
- [ ] Stale build risk: what if SW caches wrong assets?
- [ ] SW/DB upgrade race conditions: SW activates before DB migration?
- [ ] GitHub Pages constraints: no server-side logic, 404.html SPA fallback
- [ ] Offline guarantees: what works offline, what breaks?
- [ ] CDN cache invalidation: GitHub Pages cache headers

### E. Security Audit
- [ ] AES-256-GCM correctness: proper IV generation, no IV reuse
- [ ] PBKDF2 parameters: 250,000 iterations, SHA-256 — adequate for 10 years?
- [ ] Salt management: per-encryption random salt (16 bytes)
- [ ] Key exposure risk: password never stored, derived key non-extractable
- [ ] Corrupt import handling: malformed JSON, truncated binary
- [ ] Replay risk: no nonce/counter in sync protocol
- [ ] Vault isolation: encrypted at rest, cleartext only in memory
- [ ] XSS prevention: escapeHTML usage audit
- [ ] jsonbin.io API key exposure: stored in IndexedDB settings

### F. Performance Forecast (10 Years)
- [ ] Simulate: 10,000+ tasks, 5,000+ logs, 1GB+ vault
- [ ] Index strategy: which queries degrade at scale?
- [ ] `getAll()` usage: full-table scans in stores, search, aggregation
- [ ] Rendering load: block mount/unmount with 30+ blocks
- [ ] Memory pressure: DOM node count, event listener accumulation
- [ ] Long session stability: memory leaks from mode switching
- [ ] Search performance: fuzzy search across all stores

### G. UX Cognitive Sustainability
- [ ] Hierarchy future-proofing: 3 levels + 6 zones + 11 host slots
- [ ] Clutter creep risk: 39 blocks, mode-specific visibility
- [ ] Modularity chaos risk: can a user accidentally enable too many blocks?
- [ ] Complexity scaling: does adding features increase cognitive load linearly?
- [ ] Mode confusion: 3 contexts with different defaults

### H. Refactor & Technical Debt
- [ ] Code readability: consistent patterns, naming conventions
- [ ] Responsibility boundaries: store vs block vs shell
- [ ] Upgrade safety: Vite/Vitest major version bumps
- [ ] Technical debt inventory: legacy path, dual event systems, orphaned stores
- [ ] Long-term maintenance ergonomics: can a new developer onboard?

### I. Modular Block System
- [ ] Block contract enforcement: what happens if a block violates the contract?
- [ ] Block dependency on shell internals
- [ ] Hot-reload / dynamic registration feasibility
- [ ] Block testing: current coverage, testability of mount/unmount
- [ ] Module preset system: preset conflicts, orphaned blocks

---

## 2. Analysis Method

Each domain will be analyzed by a dedicated subagent that:
1. Reads all relevant source files
2. Identifies concrete weaknesses with file:line references
3. Constructs failure scenarios (what breaks, when, why)
4. Classifies risk (High / Medium / Low)
5. Proposes minimal-impact structural reinforcement
6. Answers: "Would a principal engineer approve this?"

---

## 3. Deliverable Schedule

| Order | Deliverable | Depends On |
|-------|------------|------------|
| 1 | audit-plan.md | (this file) |
| 2 | architecture-resilience.md | Subagent A |
| 3 | data-durability.md | Subagent B |
| 4 | migration-audit.md | Subagent C |
| 5 | service-worker-deployment.md | Subagent D |
| 6 | security-audit.md | Subagent E |
| 7 | performance-forecast.md | Subagent F + B |
| 8 | ux-sustainability.md | Subagent G |
| 9 | refactor-resilience.md | Subagent H + I |
| 10 | risk-heatmap.md | All subagents |
| 11 | 10year-roadmap.md | Risk heatmap |
| 12 | executive-summary.md | All deliverables |
| 13 | review-notes.md | Final pass |

---

## 4. Verification Criteria

No section is marked complete without:
- Concrete findings with code references
- Root cause analysis (not symptoms)
- Example failure scenarios
- Risk classification (High/Medium/Low)
- Minimal-impact remediation proposals
- Principal engineer approval check

---

## 5. Core Principles

- **Simplicity First**: Prefer the simplest explanation and fix
- **Minimal Impact**: No recommendations that require rewrite
- **No Lazy Fixes**: Every recommendation addresses root cause
- **Preserve Working Systems**: If it works, document why and protect it
- **No Over-Engineering**: Resist adding complexity to solve complexity
- **Honest Assessment**: No optimism bias, no alarmism
