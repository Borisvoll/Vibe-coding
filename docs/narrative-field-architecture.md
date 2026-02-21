# Narrative Field — Architecture (Phase 1)

> Route: `/curiosity`
> Status: Phase 1 complete — design only, no implementation yet.

---

## 1. What It Is (and Is Not)

The Narrative Field is a **conceptual exploration engine** embedded in the Curiosity tab.

| It is | It is not |
|-------|-----------|
| A branching thought-space seeded by real data | A task manager or productivity tool |
| A calm, open-ended reading experience | A journal or editor |
| Technical-creative in tone | Therapeutic or analytical |
| Complete when the user exits without doing anything | Incomplete when the user doesn't convert |

The success condition is *presence*, not *output*.

---

## 2. Placement in the Curiosity Page

The Narrative Field lives **below** the existing Vonk/Draad/Vergeten/Echo widgets on the `/curiosity` route. It does not replace them. It extends the contemplative arc: widgets resurface fragments; the Narrative Field invites a step deeper.

```
/curiosity page
├── curiosity-header           (existing — "Fragmenten uit je denken")
├── curiosity-grid             (existing — Vonk + 3 hints)
└── narrative-section          (NEW)
    └── narrative-field        (branching text + choices)
```

---

## 3. New Files

```
src/
  stores/narrative-fragments.js   # Fragment extraction from indexed stores
  stores/narrative-engine.js      # Deterministic DSL: node tree generation
  os/narrative.js                 # Mount function, state management
  os/narrative.css                # Minimal styles — no card borders, wide space

tests/
  stores/narrative-fragments.test.js
  stores/narrative-engine.test.js
```

`curiosity.js` gains a single call: `mountNarrativeSection(container, context)`.

---

## 4. Data Sources

Constraints: indexed range queries only, ≤ 20 records total, no full-table scans,
memoize within the session (one call per source per page mount).

| Source | Store | Index / Key Strategy | Max Records |
|--------|-------|----------------------|-------------|
| Active projects | `os_projects` | `getByIndex('os_projects', 'status', 'active')` | 5 |
| Dormant projects | `os_projects` | `getByIndex('os_projects', 'status', 'archived')` | 3 |
| Inbox ideas | `os_inbox` | `getByIndex('os_inbox', 'status', 'inbox')`, filter `tags.includes('idea')` or age ≥ 14 days | 5 |
| Daily reflections | `dailyPlans` | key-range `[mode:date-13, mode:today]`, extract `notes` | 4 |
| Recurring keywords | derived | re-use `getDraad()` from `curiosity-data.js` (already indexed + memoizable) | 3 phrases |
| **Total** | | | **≤ 20** |

`dailyPlans` key range: compose `${mode}:${dateN}` … `${mode}:${today}` using the same `IDBKeyRange.bound()` pattern already established in the codebase.

---

## 5. Fragment Extraction

A *fragment* is a 2–6 word abstract phrase derived from raw data. Never a full sentence.
Never metadata (dates, counts, statuses).

### 5.1 Transformation Pipeline

```
raw text
  → normalize (lowercase, strip punctuation, collapse whitespace)
  → tokenize (split by whitespace)
  → filter stop words  (Dutch + English list — reuse curiosity-data.js's STOP_WORDS)
  → build 2-grams      (consecutive meaningful word pairs)
  → score 2-grams      (score = len(w1) + len(w2); prefer longer / more specific)
  → select top gram    (highest score wins; if tie, use seeded pick)
  → capitalize         (title-case the output)
  → session-deduplicate (never repeat a phrase already shown this mount)
```

### 5.2 Rules

1. **Minimum 2 words.** If no 2-gram exists, use the single longest non-stop word.
2. **Maximum 6 words.** Truncate at the last full word boundary.
3. **No action verbs at head.** Strip leading infinitives: "to build…" → "building…" or skip.
4. **No raw metadata.** Phrases like "3 days ago", "due tomorrow", "BPV mode" are illegal.
5. **No duplication within a session.** A fragment pool is maintained per mount; used phrases are removed.

### 5.3 Per-Source Rules

| Source | Special rule |
|--------|--------------|
| `os_projects` | Use project `.name` field; strip trailing parentheticals |
| `os_inbox` | Use `.text` field; skip if `type === 'link'` |
| `dailyPlans` | Use `.notes` field; skip entries with < 10 chars |
| Recurring keywords | Already extracted by `getDraad()` — use `.word` directly as a 1-gram seed, pair with nearest other fragment for a 2-gram |

---

## 6. Narrative DSL

### 6.1 Type Definitions

```typescript
interface NarrativeNode {
  id:      string;       // "root" | "root:0" | "root:2:1" etc.
  depth:   0 | 1 | 2;   // 0 = opening; 1 = first branch; 2 = terminal
  text:    string;       // generated paragraph (1–3 sentences)
  choices: Choice[];     // empty at depth 2 (terminal)
}

interface Choice {
  label:      string;    // 2–5 words, the clickable text
  targetId:   string;    // id of the pre-generated child node
}
```

### 6.2 Tree Structure

```
root (depth=0)           — 1 opening paragraph + 3 choices
├── :0 (depth=1)         — 1 paragraph + 3 choices
│   ├── :0:0 (depth=2)   — terminal, no choices
│   ├── :0:1 (depth=2)
│   └── :0:2 (depth=2)
├── :1 (depth=1)
│   ├── :1:0 / :1:1 / :1:2
└── :2 (depth=1)
    └── :2:0 / :2:1 / :2:2
```

Total nodes: 13 (1 + 3 + 9). All pre-generated at mount time.

### 6.3 Generation Algorithm

```
generateTree(fragments, today) → Map<id, NarrativeNode>

  1. Assign fragments to nodes deterministically (seeded shuffle)
  2. For each node: pick a template matching (depth, fragmentCount)
  3. Interpolate fragments into template placeholders
  4. Generate choice labels from remaining fragments (not used in node text)
  5. Return complete id→node map
```

No recursion beyond depth 2. No loops. No lazy generation.

---

## 7. Seeded Pseudo-Randomness

Seed formula:

```javascript
const seed = fnv32a(today + ':' + fragmentIds.join(',') + ':' + depth);
```

Where `fnv32a` is a fast, non-cryptographic FNV-1a 32-bit hash:

```javascript
function fnv32a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
```

Seeded selection helper:

```javascript
// Stable pick from array, offset allows distinct picks from same seed
function seededPick(arr, seed, offset = 0) {
  return arr[(seed + offset) % arr.length];
}
```

Effects of the seed:
- **Day boundary**: slightly different tree each day (`today` changes)
- **Session stability**: same tree on reload within one day
- **No flicker**: seed is deterministic from inputs, not from `Math.random()`

---

## 8. Narrative Templates

Templates are plain strings with `{A}` and `{B}` placeholders for fragments.
Selection is seeded (not random). Minimum 10 templates per depth level.

### Depth 0 — Opening

```
"Something in {A} keeps returning."
"There is a question buried in {A}."
"{A} and {B} — an unexpected proximity."
"The thread through {A} is still unfinished."
"Where does {A} point when you stop looking directly at it?"
"Something called {A} is waiting to be named."
"{A} appeared again. It means something."
"The space between {A} and {B} is interesting."
"Not sure what {A} is asking. But it keeps asking."
"There is a shape to {A} that is hard to describe."
```

### Depth 1 — Branch

```
"Following {A} leads somewhere unexpected."
"The edge of {A} touches something else."
"{A} might be less about the thing and more about the pattern."
"What if {A} is a symptom, not a cause?"
"The closer you look at {A}, the less certain it becomes."
"There is a discipline hiding inside {A}."
"{A} and {B} might be the same question asked twice."
"One way to approach {A} is to ignore it completely."
"The difficulty with {A} is the difficulty with everything adjacent to it."
"Something about {A} suggests a different order of operations."
```

### Depth 2 — Terminal

```
"This is as far as the thread goes today."
"Here, {A} and {B} almost rhyme."
"There is no next step. That is the point."
"{A} is a good place to leave it for now."
"The thought completes itself here — or it doesn't need to."
"Perhaps {A} was never a problem to solve."
"This is where the idea rests."
"Enough for today. The rest is elsewhere."
"Leave it open."
"The fragment stays as a fragment. That is fine."
```

---

## 9. State Management

State is a single value: `currentNodeId: string`.

```javascript
// Initial state
let currentNodeId = 'root';

// Transition
function navigate(targetId) {
  const nextNode = nodeTree.get(targetId);
  if (!nextNode) return;
  fadeOut(() => {
    currentNodeId = targetId;
    render(nextNode);
    fadeIn();
  });
}
```

No history stack. No back navigation. No persistence. When the user navigates away from the Curiosity tab, state is discarded. On return, a fresh tree is generated (same as first visit within the day).

---

## 10. UI Specification

### 10.1 Layout

```
.narrative-section
  padding-top: var(--space-12)        (generous vertical breathing room)
  max-width: 560px                    (narrower than curiosity grid — focused reading column)
  no border, no card, no background
```

### 10.2 Paragraph

```
.narrative-text
  font-size: var(--font-md)           (14px)
  font-weight: 400
  line-height: 1.9                    (very open — not prose density)
  color: var(--ui-text)               (full contrast — this is the content)
  opacity transition on node change: 200ms ease-out
```

### 10.3 Choices

```
.narrative-choices
  margin-top: var(--space-8)
  display: flex; flex-direction: column; gap: var(--space-3)

.narrative-choice
  font-size: var(--font-sm)           (12px — deliberately smaller than text)
  color: var(--ui-text-faint)         (low contrast — hints, not calls to action)
  cursor: pointer
  text-decoration: none
  transition: opacity 140ms ease

.narrative-choice:hover
  opacity: 0.6                        (softer on hover — counter-intuitive but intentional)
  color: var(--ui-text-muted)         (slight lift only)
```

No buttons. No underlines by default. No accent colors.

### 10.4 Terminal State

At depth 2: render text only, no choices, no affordances.
After 1200ms, optionally fade in a single neutral line: `— ` in `var(--ui-text-faint)`.
No "start over" button. Navigation away from the tab is the reset mechanism.

### 10.5 Empty State

If fragment extraction returns < 3 fragments (too little data):

```html
<p class="narrative-empty">
  Voeg gedachten toe aan je inbox — hier verschijnen ze anders.
</p>
```

Same treatment as other curiosity widget empty states.

### 10.6 Transitions

- Node change: fade out current node text (opacity 0, 200ms), swap content, fade in (opacity 1, 200ms)
- No slide, no transform, no spring
- `prefers-reduced-motion`: skip transition, instant swap

---

## 11. Performance Constraints

| Constraint | Implementation |
|------------|----------------|
| ≤ 20 DB records | Enforced in fragment extraction; each source has a hard `.slice(0, N)` |
| No full-table scans | All queries use `getByIndex()` or `getByKey()`; `getAll()` is forbidden in this module |
| Memoize fragment extraction | `let cachedFragments = null;` per mount — fragments fetched once, reused for all 13 nodes |
| No LLM calls | Templates are local strings; `callClaude()` is never imported |
| Fast mount | Fragment loading is async via `setTimeout(loadFragments, 0)`, same pattern as curiosity.js |

---

## 12. Kernel Boundary Compliance

Per BORIS architecture rules (CLAUDE.md):

- **EventBus**: No events emitted or consumed. The Narrative Field is self-contained.
- **ModeManager**: Fragment extraction uses `modeManager.getMode()` to scope `dailyPlans` queries to the current mode. No mode-specific templates (tone is mode-agnostic).
- **BlockRegistry**: Not a block (no `vandaag-*` slot). Mounted directly by `curiosity.js`.
- **Store access**: Through `src/stores/narrative-fragments.js` (new), never through `db.js` directly.
- **XSS**: All fragment text goes through `escapeHTML()` before insertion.

---

## 13. Open Questions (for Phase 2)

1. **Template language**: Are 10 templates per depth enough? Should they be stored in a `narrative-templates.js` constant file for easy expansion?
2. **Fragment variety**: If the user has ≥ 50 inbox items but only ≤ 5 are old/idea-tagged, is the pool rich enough? Consider adding `os_tasks` (open tasks) as a 4th source if fragment count < 6.
3. **Session reset cadence**: Reset only on date change, or also on explicit "go back to Curiosity" navigation? Current design: date change only.
4. **Curiosity widget integration**: Should the Vonk fragment (resurface from curiosity-data) be injected directly into the narrative tree as a guaranteed starting fragment? Could provide nice continuity.

---

*Phase 2 implements the static Node/Choice rendering system with hardcoded test data. No data integration yet.*
