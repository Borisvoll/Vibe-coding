# BORIS OS — Design Scorecard

**Audit date:** 2026-02-21
**Scale:** 0 (absent) – 5 (exemplary)

---

## A. Dieter Rams Principles

### Useful — 2/5

**Evidence:** The store layer (tasks, inbox, projects, daily, BPV) is fully functional and well-tested (13/13 stores, 508 tests). But the UI migration broke the delivery mechanism — 7/8 routes show placeholder text. The app cannot fulfill its core promise ("used daily") right now.

- **Keep:** Store architecture, EventBus communication, mode-aware filtering
- **Fix:** Restore functional UI for Today, Inbox, Projects at minimum

### Understandable — 3/5

**Evidence:** The design token system is excellent: `variables.css` → `tokens.css` → `tailwind.css` provides a clear 3-layer hierarchy. Dutch-language UI is consistent. Mode picker with emoji + color is immediately clear.

- **Keep:** Token architecture, Dutch UI language, mode color coding
- **Simplify:** Dashboard.jsx `text-[var(--color-text)]` should be `text-text` (use mapped tokens)
- **Remove:** The 12 unregistered blocks that add confusion (e.g., `schedule-placeholder`, `personal-energy`, `school-skill-tracker`)

### Unobtrusive — 4/5

**Evidence:** Notion-inspired palette (neutral grays, accent-on-demand). Mode wash animation is subtle. No aggressive alerts or notifications. The Friday weekly review prompt (`os-friday-prompt`) is polite.

- **Keep:** Notion palette, mode wash, collapsible sections, ambient feel
- **Watch:** The `balatro.css` card effects — ensure they stay subtle, not distracting

### Honest — 3/5

**Evidence:** Data flows are transparent (IndexedDB → stores → UI). No fake data or loading spinners pretending to be content. But the placeholders saying "wordt gemigreerd naar React" are honest about incompleteness, which is both good (transparent) and bad (shipped incomplete).

- **Fix:** Don't ship placeholder pages. Either show working vanilla blocks or hide the route.

### Long-lasting — 4/5

**Evidence:** Framework-agnostic stores survive any UI rewrite. CSS custom properties work across frameworks. IndexedDB with soft-delete and export/import is built for longevity. Schema migrations (v1→v8) show care for data evolution.

- **Keep:** Store adapters, migration system, export/import, CSS custom properties
- **Risk:** React Router v7 is major-version specific. Keep routing thin.

### As little design as possible — 3/5

**Evidence:** The token system constrains choices well (8 font sizes, 10 spacing values, 5 radii). But 50 CSS files and 43 blocks suggest feature accumulation beyond what a student OS needs daily.

- **Simplify:** Reduce to 15-20 essential blocks. Hide or remove the rest.
- **Remove:** `balatro.css` (decorative card effects), `theme-studio.css` (if unused)

**Rams Total: 19/30**

---

## B. Steve Jobs Principles

### Focus — 2/5

**Evidence:** The app tries to be too many things: BPV tracker, school planner, personal dashboard, inbox processor, project manager, weekly reviewer, habit tracker, conversation debriefer, worry dumper, brain state logger, boundary setter, two-minute launcher, context checklist. That's 13+ distinct features across 31 blocks.

Jobs would ask: "What is the ONE thing this does?" The answer should be: **"It helps you plan and review your day."**

- **Say no list:** conversation-debrief, worry-dump, brain-state, boundaries, two-min-launcher, context-checklist, schedule-placeholder, personal-energy, school-concept-vault, school-skill-tracker
- **Keep:** daily-todos, daily-outcomes, inbox, projects, weekly-review

### Simplicity — 2/5

**Evidence:** 3 modes (BPV/School/Personal) × 31 blocks × 13 host slots = enormous configuration space. The Vandaag page alone has 6 collapsible sections with 8+ blocks per mode. A student opening this for the first time faces 15+ interactive elements.

- **Simplify:** One mode at a time (already done), max 5 blocks visible per mode on Today page
- **Remove:** Collapsible section complexity — just show the 5 most important blocks, always open

### Scope discipline — 1/5

**Evidence:** The codebase has accumulated features faster than it can validate them. 12 blocks are built but never registered. 20 legacy pages exist but are dead code. The React migration was started before the vanilla UI was complete, creating a half-migrated state.

- **Fix:** Finish one path (React OR vanilla) before starting the next. Establish a feature freeze.

### "One home, one workflow" — 3/5

**Evidence:** The Today page IS the intended home. The hash defaults to `/today`. The mode system provides context switching. But the existence of Dashboard, Planning, AND Today as separate routes fragments the daily workflow.

- **Consider:** Merge Dashboard stats into Today page. Make Today the single home.

**Jobs Total: 8/20**

---

## C. Jony Ive Principles

### Typographic hierarchy — 4/5

**Evidence:** `variables.css` defines 9 font sizes from 11px to 32px with clear roles (captions, meta, body, headings, stats). The naming convention (`--font-xs` through `--font-stat`) is self-documenting.

- **Keep:** Font scale, semantic naming
- **Fix:** Dashboard.jsx uses Tailwind's `text-2xl`, `text-sm` instead of the mapped tokens. Two type systems running in parallel.

### Spacing rhythm — 4/5

**Evidence:** 11-step spacing scale (0.125rem – 4rem) on a 4px base. Card padding uses `--ui-card-padding`. Consistent `--space-*` usage across vanilla blocks.

- **Keep:** Spacing scale
- **Watch:** React components use Tailwind's `p-6`, `mb-8`, `gap-4` — verify these map to the token scale

### Micro-interactions — 3/5

**Evidence:** Mode wash animation (ambient color fade). Card hover shadows. Collapsible section transitions. `--ease-spring` for bouncy interactions. Focus overlay on mode switch.

- **Keep:** Mode wash, hover shadows, spring easing
- **Missing:** No loading skeleton states. No transition between route changes.

### Coherence — 2/5

**Evidence:** Two UI paradigms coexist: vanilla blocks use `.os-mini-card` BEM classes, React uses Tailwind utilities. The Dashboard card uses `rounded-xl border border-[var(--color-border)]` while vanilla cards use `.os-mini-card { border-radius: var(--radius-lg) }`. Same visual result, different authoring patterns.

- **Fix:** Choose ONE styling approach for components. Recommend: Tailwind utilities referencing CSS tokens for new code, don't touch working vanilla CSS.

**Ive Total: 13/20**

---

## D. Brian Eno Principles

### Calmness — 4/5

**Evidence:** Neutral Notion-inspired palette. No red badges screaming for attention. No notification sounds. Mode transitions use ambient color wash, not jarring switches. Weekly review prompt appears gently on Fridays.

- **Keep:** All of this. It's the best-executed design principle in the app.
- **Watch:** Inbox badge count exists (`#sidebar-inbox-badge`) — keep it subtle

### Cognitive noise — 3/5

**Evidence:** The Today page (when it worked) had 6 collapsible sections × multiple blocks per section. Even with defaults collapsing some sections, a user in BPV mode would see: Taken, Projecten, Inbox, plus BPV-today, BPV-quick-log, BPV-log-summary, BPV-weekly-overview. That's 7+ content areas before scrolling.

- **Reduce:** Max 4 visible areas. Hide mode-specific blocks behind a single "Context" section that stays collapsed by default.

### Ambient feel — 4/5

**Evidence:** The design system language is "studio, not admin panel." Mode colors are environmental (purple = study, green = personal, blue = work). The mode wash animation creates a sense of physical space changing. Card designs are understated.

- **Keep:** Mode colors as environment, not decoration
- **Enhance:** Route transitions could fade/slide to reinforce the spatial metaphor

### Progressive disclosure — 3/5

**Evidence:** Collapsible sections exist. Weekly review is collapsed by default. Mode-specific blocks only appear in relevant mode. But: ALL features are available from the start. No onboarding flow decides what to show.

- **Add:** First-time experience that starts with just Today + Tasks + Inbox. Other sections unlock as the user builds a habit.
- **Consider:** Hide Planning, Projects, Lijsten from the sidebar until the user creates their first project.

**Eno Total: 14/20**

---

## Summary Scorecard

| Principle | Score | Max | Rating |
|-----------|-------|-----|--------|
| **Rams** (useful, understandable, unobtrusive, honest, lasting, minimal) | 19 | 30 | 63% |
| **Jobs** (focus, simplicity, scope, one workflow) | 8 | 20 | 40% |
| **Ive** (typography, spacing, micro-interactions, coherence) | 13 | 20 | 65% |
| **Eno** (calm, low-noise, ambient, progressive disclosure) | 14 | 20 | 70% |
| **TOTAL** | **54** | **90** | **60%** |

---

## Remove / Simplify List (subtractive fixes)

1. **Delete** `src/pages/` (20 dead files)
2. **Delete** `src/os/shell.js` (716 LOC, dead)
3. **Delete** `src/os/deepLinks.js` (119 LOC, dead)
4. **Delete** `src/core/featureFlags.js` (dead)
5. **Unregister** 10+ low-value blocks: conversation-debrief, worry-dump, brain-state, boundaries, two-min-launcher, context-checklist, schedule-placeholder, done-list, bpv-log-summary
6. **Merge** Dashboard stats into Today page (eliminate a route)
7. **Collapse** 6 Vandaag sections → 4 max (Tasks, Projects, Inbox, Context)
8. **Refactor** Dashboard.jsx to use mapped Tailwind tokens (`bg-surface` not `bg-[var(--color-surface)]`)

## Keep / Strengthen List

1. **Keep** CSS custom property token system — it's excellent
2. **Keep** Tailwind @theme bridge — correct architecture
3. **Keep** Framework-agnostic stores — survive any UI rewrite
4. **Keep** EventBus pub/sub — clean inter-component communication
5. **Keep** Mode system — ambient context switching is the app's soul
6. **Keep** Notion-inspired palette — calm, professional, long-lasting
7. **Keep** Dutch-language UI throughout
8. **Strengthen** Progressive disclosure — add onboarding flow
9. **Strengthen** Route transitions — fade/slide between pages
