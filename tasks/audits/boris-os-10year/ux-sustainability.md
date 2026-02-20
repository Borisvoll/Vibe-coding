# UX Cognitive Sustainability — 10-Year Audit

**Risk Level: MEDIUM**
**Confidence: High** — based on analysis of shell.js, block registry, module presets, collapsible sections

---

## 1. Information Hierarchy

### Current Structure (Vandaag Page)

```
Level 0 — Non-collapsible (always visible)
  ├── vandaag-hero (daily outcomes / Top 3)
  └── vandaag-cockpit (stats)

Level 1 — Focus
  └── vandaag-tasks [collapsible] — Taken Vandaag

Level 2 — Projects & Lists
  ├── vandaag-projects [collapsible] — Projecten & Lijsten
  └── vandaag-capture [collapsible] — Inbox

Level 3 — Context & Review
  ├── vandaag-reflection [collapsible] — Reflectie
  ├── vandaag-mode [collapsible] — Mode-specific context
  └── vandaag-weekly [collapsible] — Weekoverzicht
```

**Assessment: Strong hierarchy.** The 3-level design follows a clear information scent:
1. **What matters today** (always visible)
2. **What needs focus** (tasks — usually open)
3. **What supports** (projects, inbox — usually open)
4. **What deepens** (reflection, context, review — often closed)

**10-Year Risk:** The hierarchy itself is stable. The risk is not the structure but what goes *inside* each zone.

---

## 2. Block Count vs. Cognitive Load

### Current: 39 Registered Blocks

**But** a user never sees all 39 at once. Mode filtering and host slot assignment limit visibility:

| Mode | Blocks on Vandaag | Blocks on Dashboard | Total Visible |
|------|-------------------|--------------------|--------------:|
| School | ~18 | 2 | ~20 |
| Personal | ~19 | 2 | ~21 |
| BPV | ~18 | 2 | ~20 |

On the Vandaag page with default collapse state (School mode):
- **Open sections:** tasks (5 blocks), projects (3 blocks), capture (1 block) = **9 blocks visible**
- **Closed sections:** reflection (2), mode (4), weekly (1) = **7 blocks hidden**

**Assessment: Manageable.** The collapsible section pattern means the default cognitive load is ~9 blocks, which is within Miller's Law (7 ± 2) for information chunks.

### Clutter Creep Risk

| Scenario | Impact | Probability |
|----------|--------|-------------|
| Adding 5 blocks to vandaag-tasks | Visible section grows from 5 to 10 blocks | **Medium** |
| Adding 3 blocks to vandaag-mode | Hidden by default, user must opt-in | **Low** |
| Adding new Level 4 | Vandaag page scrolls below fold | **Medium** |
| New mode (e.g., "Work") | +10 new mode-specific blocks | **Low-Medium** |

**Structural Safeguard:** The module preset system (`src/core/modulePresets.js`) controls which blocks are active. The "minimaal" preset shows only 7 blocks. Users who feel overwhelmed can switch to minimal.

**Risk: Low-Medium** — The preset system provides an escape valve, but requires user awareness.

---

## 3. Module Presets as Complexity Governor

### 5 Presets

| Preset | Active Blocks | Cognitive Level |
|--------|:------------:|:---------------:|
| minimaal | 7 | Very Low |
| school | 13 | Low |
| bpv | 13 | Low |
| persoonlijk | 17 | Medium |
| alles (default) | ALL (~27+) | Medium-High |

**Critical Finding:** The default preset is "alles" (all blocks enabled). This means new users see maximum complexity on first load.

**Failure Scenario:** A student installs BORIS OS for the first time. Default mode is School, default preset is "alles." They see: daily outcomes, cockpit stats, 5 task blocks (daily-todos, done-list, 2-min launcher, brain-state, context-checklist), projects, lists, worry-dump, inbox, reflection, conversation-debrief, weekly review, and 4 school-specific blocks. That's ~17 visible sections.

**Risk: Medium-High for first impressions**

**Minimal Fix:** Change default preset to match the user's initial mode:
- School → "school" preset (13 blocks)
- BPV → "bpv" preset (13 blocks)
- Personal → "persoonlijk" preset (17 blocks)

The "alles" preset becomes an opt-in for power users.

---

## 4. Collapsible Section Persistence

### Per-Mode Defaults (`COLLAPSE_DEFAULTS` in `src/os/shell.js:395-399`)

```javascript
School:   { tasks: open, projects: open, capture: open, reflection: closed, mode: closed, weekly: closed }
Personal: { tasks: open, projects: open, capture: open, reflection: open,  mode: closed, weekly: closed }
BPV:      { tasks: open, projects: open, capture: open, reflection: closed, mode: open,   weekly: closed }
```

**Strengths:**
- Defaults vary by mode (BPV users see BPV context, Personal users see reflection)
- State persists per mode in localStorage (`boris_collapse_<id>_<mode>`)
- User choice is remembered

**Weakness:** After a year of use, the user may have customized collapse states for all modes. If the app adds a new collapsible section, it defaults to open/closed per the code — but the user's persisted state takes precedence. The user may **never discover** a new section.

**Minimal Fix:** Track a `version` in the collapse state. When a new section is added, show it as open once for discovery, then respect user preference:
```javascript
const STATE_VERSION = 2; // bump when new sections added
if (savedVersion < STATE_VERSION) { showNewSectionsOnce(); }
```

---

## 5. Mode Confusion Risk

### Visual Differentiation

| Cue | Strength | Reliability |
|-----|----------|-------------|
| Color accent (purple/green/blue) | **Strong** | Always visible via mode badge |
| Emoji (📚/🌱/🏢) | **Strong** | In header, badges, mode picker |
| Mode badge on Vandaag header | **Strong** | Always visible |
| Ambient wash animation | **Medium** | Only on mode switch (transient) |
| Sidebar mode pill | **Strong** | Desktop only |
| Mobile mode button | **Strong** | Always visible |

**Assessment: Mode confusion risk is LOW.** The combination of color, emoji, badge, and button provides 4+ simultaneous cues. A user always knows which mode they're in.

**Edge Case:** If a user has color blindness (8% of males), the color distinction between purple (School) and blue (BPV) may be unclear. The emoji provides a reliable backup.

---

## 6. Feature Discovery

### Tutorial System
`src/core/tutorial.js` provides 8 contextual tooltips:
1. Welcome
2. Mode switching
3. Navigation buttons
4. Inbox
5. Planning
6. Reflectie
7. Settings

**Coverage Gap:**

| Feature | Covered by Tutorial? | Discovery Risk |
|---------|---------------------|---------------|
| Daily Top 3 outcomes | No | **Medium** — above fold, likely found |
| Command palette (Ctrl+K) | No | **High** — keyboard-only |
| Collapsible sections | No | **Medium** — toggle button visible |
| Module presets | No | **High** — buried in settings |
| Worry dump | No | **Medium** — appears in projects zone |
| Weekly review | Yes (tip #7) | Low |
| Brain state | No | **Medium** — in tasks zone |
| 2-min launcher | No | **Low** — prominent quick action buttons |

**Risk: Medium** — Advanced features like command palette and module presets require self-discovery or documentation.

**Minimal Fix:** Add 2-3 more tutorial tips for command palette, presets, and Top 3 outcomes.

---

## 7. Scaling Complexity — 10-Year Projection

### Block Growth Trajectory

| Year | Estimated Blocks | Modes | Zones | Cognitive Risk |
|------|:----------------:|:-----:|:-----:|:--------------:|
| 2026 | 39 | 3 | 6 | Managed |
| 2028 | 50 | 3-4 | 7 | Needs preset discipline |
| 2031 | 65 | 4 | 8 | Needs category hierarchy |
| 2036 | 80+ | 4-5 | 9+ | Requires sub-navigation |

**Inflection Point: ~50 blocks**
At 50 blocks, even the "school" preset will show 15+ blocks. The current flat list of blocks within each zone becomes too long. At this point, blocks within a zone need sub-grouping or pagination.

**Minimal Fix (future):** Nest blocks within collapsible sub-sections:
```
Taken (collapsible)
  ├── Core Tasks (sub-group)
  │   ├── daily-todos
  │   └── context-checklist
  └── Productivity Tools (sub-group)
      ├── 2-min launcher
      ├── brain-state
      └── done-list
```

### Mode Growth
Adding a 4th mode (e.g., "Work" or "Health") is architecturally supported — `MODES` array in modeManager, `MODE_META` in shell.js. The UI picker shows 3 cards; a 4th would still fit. At 5+ modes, the card picker needs scrolling.

**Assessment: Mode system scales to 4-5 modes.** Beyond 5, consider hierarchical modes.

---

## 8. Design Philosophy Alignment

BORIS OS follows Dieter Rams / Jony Ive principles:
- Max 2 font sizes per block
- No unnecessary toggles
- Strong defaults, minimal user decisions

### 10-Year Risk to Design Philosophy

| Principle | Current State | Threat |
|-----------|--------------|--------|
| Simplicity | ✓ Clean, focused | Block creep adds visual noise |
| Strong defaults | ✓ Mode-aware collapse | Preset defaults may become stale |
| Minimal decisions | ✓ Mode picker is simple | Module preset choice adds a decision |
| Ambient transitions | ✓ Mode wash, crossfade | More modes = more transition states |

**Assessment:** The design philosophy is a **protective constraint**. As long as new features are added as blocks (not as new architectural layers), the system absorbs complexity without changing the surface.

---

## Summary

| Domain | Risk | Verdict |
|--------|------|---------|
| Information hierarchy | Low | 3-level structure is sound |
| Cognitive load (default) | Medium | "alles" preset shows too much for new users |
| Mode confusion | Low | 4+ visual cues per mode |
| Feature discovery | Medium | Command palette, presets undiscoverable |
| Collapsible persistence | Low | Per-mode state is durable |
| Block growth scaling | Medium | Sustainable to ~50 blocks, then needs sub-grouping |
| Mode scaling | Low | Supports 4-5 modes |
| Design philosophy | Low | Protected by block pattern |

### Principal Engineer Assessment
> The UX architecture is thoughtfully designed with correct default behaviors. The main improvement is changing the default preset from "alles" to a mode-appropriate preset. This single change would dramatically improve the first-use experience. For long-term sustainability, the block system absorbs new features gracefully, but will need sub-grouping within zones once block count exceeds ~50. The 3-mode system scales naturally to 4-5 modes without UI changes.
