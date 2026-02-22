# Vandaag — MVP Spec

> **Goal:** Vandaag (`#today`) is the true home screen. Every session starts
> here. The page is never empty: outcomes, tasks, capture, and context are
> always present and always persisted.

---

## Scope of This MVP

Five things must work on `#today` before anything else:

| # | Feature | New? | Host slot |
|---|---------|------|-----------|
| 1 | Date header + mode selector | **New** (`src/ui/vandaag-header.js`) | `[data-vandaag-header]` |
| 2 | Top 3 outcomes | **New** (`src/blocks/daily-outcomes/`) | `vandaag-hero` |
| 3 | Quick capture → Inbox | Exists (`src/blocks/inbox/`) | `vandaag-capture` |
| 4 | Next actions list | Exists (`src/blocks/daily-todos/`) | `vandaag-tasks` |
| 5 | BPV quick log | **New** (`src/blocks/bpv-quick-log/`) | `vandaag-mode` |

Existing blocks (3 & 4) are verified to be correctly mounted and reactive;
no rewrite needed unless a bug is found.

---

## Default Home Screen

`src/os/shell.js` must set `activeTab = 'today'` (not `'dashboard'`) as the
fallback when no URL hash is present. Confirm or change the single line that
sets the initial tab (around line 45 of `shell.js`).

After the change: opening the app with no hash → lands on Vandaag.

---

## Layout

```
┌───────────────────────────────────────────────┐
│  VandaagHeader                                │  ← NOT a block; component in shell
│  vrijdag 21 februari  [ School ] [Personal]   │
│                       [ BPV    ]              │
├───────────────────────────────────────────────┤
│                                               │
│  DailyOutcomes         [vandaag-hero]         │  ← new block
│  Doel 1  [ ___________________ ]             │
│  Doel 2  [ ___________________ ]             │
│  Doel 3  [ ___________________ ]             │
│                                               │
├─ Taken ──────────────────────────────── [▾] ─┤
│  DailyTodos            [vandaag-tasks]        │  ← existing block
│  ○ Samenvatting maken                         │
│  ○ Email sturen                               │
│  [ + Taak toevoegen ]                         │
│                                               │
├─ Vastleggen ─────────────────────────── [▾] ─┤
│  QuickCapture          [vandaag-capture]      │  ← existing block
│  [ Vang een gedachte op...            ]       │
│                                               │
├─ BPV ────────────────────────────────── [▾] ─┤  ← ONLY School & BPV modes
│  BPVQuickLog           [vandaag-mode]         │  ← new block
│  Starttijd [ 08:30 ]  Eindtijd [ 17:00 ]      │
│  Pauze     [ 30    ]  min                     │
│  Notitie   [ _____ ]                          │
│  [ Opslaan ]                                  │
│                                               │
└───────────────────────────────────────────────┘
```

Collapsible sections (Taken, Vastleggen, BPV) use the existing
`createCollapsibleSection()` from `src/ui/collapsible-section.js`.
Their open/close state persists per mode in `localStorage`.

---

## 1. VandaagHeader

**File:** `src/ui/vandaag-header.js`

A UI component (not a block — not registered with `blockRegistry`).
The shell mounts it directly into `[data-vandaag-header]` after cloning
the Today template.

### What it renders

```
vrijdag 21 februari 2026        [ School ] [ Personal ] [ BPV ]
```

- Date: `formatDateLong(getToday())` — Dutch long format, never interactive
- Mode pills: one per active non-archived mode from `modeManager.getModes()`
- Active mode pill has accent background (`--color-accent`) + white text
- Inactive pills: surface background, muted text, subtle border

### Props / dependencies

| Dep | Source | How |
|-----|--------|-----|
| current mode | `modeManager.getMode()` | at render time |
| available modes | `modeManager.getModes()` | at render time |
| switch mode | `modeManager.setMode(m)` | on pill click |
| today's date | `getToday()` + `formatDateLong()` from `src/utils.js` | at render time |

No prop drilling. The component receives `{ modeManager }` directly from the
shell at mount time.

### Reactivity

Subscribes to `mode:changed` on `eventBus`. On fire: re-render the pills only
(date doesn't change during a session).

### States

| State | Render |
|-------|--------|
| Default | Date + pills with one active |
| Mode switching | Active pill flips immediately (optimistic) |
| Only one mode available | Single pill, still rendered (no hiding) |

### Factory signature

```javascript
// src/ui/vandaag-header.js
export function mountVandaagHeader(container, { modeManager, eventBus }) {
  // renders into container
  // returns { unmount() }
}
```

### Notes

- Pills are `<button>` elements, not `<div>` — keyboard-navigable
- Active pill has `aria-pressed="true"`
- No mode confirmation dialog — switch is instant
- The component does NOT render a back button or tab nav — that's the shell's job

---

## 2. DailyOutcomes Block

**File:** `src/blocks/daily-outcomes/`

### Purpose

Three labeled text inputs. The user writes what they want to accomplish today.
Persisted immediately on blur or Enter; pre-populated on load.

### Block registration

```javascript
registry.register({
  id: 'daily-outcomes',
  hosts: ['vandaag-hero'],
  modes: [],           // All modes — but label/placeholder varies
  order: 1,
  mount(container, context) { return mountDailyOutcomes(container, context); }
});
```

### What it renders

```
Doel 1  [ __________________________________ ]
Doel 2  [ __________________________________ ]
Doel 3  [ __________________________________ ]
```

- Three `<input type="text">` elements
- Labels: "Doel 1", "Doel 2", "Doel 3" (same in all modes — simple beats clever)
- Placeholder: "Wat wil je vandaag bereiken?"
- No character counter (outcomes are short by design)
- No save button — saves on blur or Enter keydown

### Data flow

Load:
```javascript
const entry = await getDailyEntry(mode, getToday());
// entry?.outcomes ?? ['', '', '']
```

Save (on blur or Enter on any input):
```javascript
await saveOutcomes(mode, getToday(), [val1, val2, val3]);
eventBus.emit('daily:changed', { mode, date: getToday() });
```

`saveOutcomes()` from `src/stores/daily.js` preserves `todos` and `notes`.

### States

| State | Render |
|-------|--------|
| `loading` | Three shimmer bars |
| `loaded, empty` | Three inputs with placeholder |
| `loaded, partial` | Some inputs filled, some with placeholder |
| `saving` | No visible change (silent background save) |
| `error` | Toast: "Kon niet opslaan — probeer opnieuw" |

### Reactivity

| Event | Action |
|-------|--------|
| `mode:changed` | Reload outcomes for new mode, repopulate inputs |
| `daily:changed` | Re-read if changed by another component (e.g. morning flow) |

### No prop drilling

Reads `mode` from `context.modeManager.getMode()` at load time, and again at
`mode:changed` to get the new mode value. The `context` object is the only
dependency passed in at mount — no intermediate data objects.

### Accessibility

- Each input has a visible `<label>` with `for` pointing to the input's `id`
- `aria-label` on the section: "Top 3 doelen voor vandaag"

---

## 3. QuickCapture (Existing Block — Verify Only)

**File:** `src/blocks/inbox/` (or wherever the vandaag-capture block lives)
**Host:** `vandaag-capture`

No new code. Verify:

1. Block registers with `hosts: ['vandaag-capture']`
2. On Enter: calls `addInboxItem(text, mode)`, emits `inbox:changed`, clears input
3. Toast confirms capture
4. Mode switching: next capture uses fresh `modeManager.getMode()` at submit time
5. Empty Enter → no-op (no error)

If any of these fail → fix in a single targeted change to the existing block,
not a rewrite.

---

## 4. Next Actions / DailyTodos (Existing Block — Verify Only)

**File:** `src/blocks/daily-todos/`
**Host:** `vandaag-tasks`

No new code. Verify:

1. Block registers with `hosts: ['vandaag-tasks']`, `modes: []` (all modes)
2. Loads `dailyPlans.todos[]` for `(mode, today)`
3. Add todo: Enter in input → `addTodo(mode, today, text)` → emit `daily:changed`
4. Check off todo: click → `toggleTodo(mode, today, id)` → emit `daily:changed`
5. Delete todo: click × → `deleteTodo(mode, today, id)` → emit `daily:changed`
6. Mode switch: re-renders with new mode's todos
7. Reload: todos survive — IDB persistence confirmed

Hard cap display: do NOT show more than `getTaskCap(mode)` active (non-done)
todos at once. When at cap, the add input is hidden and a count label shows
"3/3 taken" in accent color.

---

## 5. BPVQuickLog Block

**File:** `src/blocks/bpv-quick-log/`
**Host:** `vandaag-mode`
**Modes:** `['School', 'BPV']` — not `Personal`

### Purpose

Log today's work hours with a start time, end time, break duration, and an
optional note. One entry per day per mode. Pre-populated if an entry already
exists.

### Block registration

```javascript
registry.register({
  id: 'bpv-quick-log',
  hosts: ['vandaag-mode'],
  modes: ['School', 'BPV'],
  order: 10,
  mount(container, context) { return mountBPVQuickLog(container, context); }
});
```

### What it renders

```
┌──────────────────────────────────────────┐
│  Uren loggen                             │
│                                          │
│  Start  [ 08:30 ]   Einde  [ 17:00 ]    │
│  Pauze  [ 30    ] min                    │
│                                          │
│  Notitie (optioneel)                     │
│  [ ____________________________________] │
│                                          │
│  Netto: 8u 30m            [ Opslaan ]    │
└──────────────────────────────────────────┘
```

- Start/Einde: `<input type="time">` — browser time picker, HH:MM format
- Pauze: `<input type="number" min="0" max="120" step="5">` — minutes
- Notitie: `<input type="text">` — optional, max 120 chars
- "Netto" label: computed live (`endTime - startTime - breakMinutes`),
  displayed as `formatMinutes(netMinutes)` from `src/utils.js`
- If `netMinutes <= 0`: net label shows `"—"` (not a negative number)
- "Opslaan" button: saves via `addHoursEntry(date, { startTime, endTime, breakMinutes, note })`
  or `updateHoursEntry(id, ...)` if entry already exists for today

### Data flow

Load:
```javascript
const entry = await getHoursEntry(getToday());
// Pre-populate fields if entry exists
```

Save (on "Opslaan" click):
```javascript
if (entry) {
  await updateHoursEntry(entry.id, { startTime, endTime, breakMinutes, note });
} else {
  await addHoursEntry(getToday(), { startTime, endTime, breakMinutes, note });
}
eventBus.emit('bpv:changed');
```

### Computed net hours

Computed live on every `input` event on start/end/break fields:
```javascript
const net = calcNetMinutes(startTime, endTime, breakMinutes); // from src/utils.js
netLabel.textContent = net > 0 ? formatMinutes(net) : '—';
```

No debounce needed — this is pure computation, not a save.

### States

| State | Render |
|-------|--------|
| `loading` | Shimmer on input fields |
| `empty` | All inputs blank, net shows `"—"` |
| `prefilled` | Fields populated from today's existing entry |
| `dirty` | Fields changed, "Opslaan" enabled (not disabled) |
| `saving` | "Opslaan" shows spinner, inputs disabled |
| `saved` | Brief "✓ Opgeslagen" text on button for 1 s, then resets |
| `error` | Toast: "Kon niet opslaan — probeer opnieuw" |

### Validation

- Start time required if end time is present (and vice versa)
- `netMinutes > 0` required to save — button is disabled if net ≤ 0
- Break minutes: clamped to 0–480 (no negative, no > 8 hours)

### Reactivity

No event subscription needed. This block is self-contained per day.
If `bpv:changed` is emitted by another source (BPV tools block), the
quick log does NOT auto-reload — it would overwrite user input. Instead,
it only reloads on full mode change.

| Event | Action |
|-------|--------|
| `mode:changed` | Full unmount + remount (shell handles this) |

---

## Data Dependencies Summary

| Widget | Store | Function | Emit |
|--------|-------|----------|------|
| VandaagHeader | — | `modeManager.getMode/getModes/setMode` | `mode:changed` (via modeManager) |
| DailyOutcomes | `dailyPlans` | `getDailyEntry`, `saveOutcomes` | `daily:changed` |
| DailyTodos (existing) | `dailyPlans` | `addTodo`, `toggleTodo`, `deleteTodo` | `daily:changed` |
| QuickCapture (existing) | `os_inbox` | `addInboxItem` | `inbox:changed` |
| BPVQuickLog | `hours` | `getHoursEntry`, `addHoursEntry`, `updateHoursEntry` | `bpv:changed` |

---

## Persistence Contract

After any save operation, a page reload must restore the same state.

| Data | Persisted in | Key |
|------|-------------|-----|
| Outcomes | IDB `dailyPlans` | `"${today}__${mode}"` → `outcomes[]` |
| Todos | IDB `dailyPlans` | `"${today}__${mode}"` → `todos[]` |
| Inbox items | IDB `os_inbox` | UUID key |
| Hours entry | IDB `hours` | UUID key, `date` index |
| Mode selection | `localStorage` + IDB | `boris_mode` |
| Collapse state | `localStorage` | `boris_collapse_{id}_{mode}` |

None of these use sessionStorage or in-memory-only state. All survive hard reload.

---

## Component Size Rules

Each component must stay within these limits to stay "small":

| File | Max lines |
|------|-----------|
| `src/ui/vandaag-header.js` | 80 |
| `src/blocks/daily-outcomes/view.js` | 100 |
| `src/blocks/bpv-quick-log/view.js` | 130 |
| Any `index.js` (registration only) | 20 |
| Any `styles.css` | 60 |

If a view file approaches the limit, extract a pure helper function into the
block's own `store.js` or a utility function in `src/utils.js`.

---

## File Map

### New files

| File | Role |
|------|------|
| `src/ui/vandaag-header.js` | Date + mode selector component |
| `src/blocks/daily-outcomes/index.js` | Block registration |
| `src/blocks/daily-outcomes/view.js` | `mountDailyOutcomes(container, context)` |
| `src/blocks/daily-outcomes/styles.css` | Card layout, input styling |
| `src/blocks/bpv-quick-log/index.js` | Block registration (modes: School, BPV) |
| `src/blocks/bpv-quick-log/view.js` | `mountBPVQuickLog(container, context)` |
| `src/blocks/bpv-quick-log/styles.css` | Time inputs, net hours label |

### Modified files

| File | Change |
|------|--------|
| `src/blocks/registerBlocks.js` | Import + call `registerDailyOutcomesBlock`, `registerBPVQuickLogBlock` |
| `src/os/shell.js` | Call `mountVandaagHeader(headerEl, { modeManager, eventBus })` after cloning the Today template; confirm default tab is `'today'` |

### Unchanged files (verify only)

| File | What to verify |
|------|---------------|
| `src/blocks/daily-todos/` | Correctly wired to `vandaag-tasks`, persistence works |
| `src/blocks/inbox/` | Correctly wired to `vandaag-capture`, captures with current mode |

---

## XSS

All user-authored text (outcomes, todo text, notes) rendered via `escapeHTML()`
from `src/utils.js`. No `.innerHTML` with raw user strings anywhere in new files.

---

## Accessibility Checklist

- VandaagHeader mode pills: `<button aria-pressed="true/false">`
- DailyOutcomes: `<label for="outcome-1">` + `<input id="outcome-1">`
- BPVQuickLog: `<label for="start-time">Start</label>` + `<input id="start-time">`
- BPVQuickLog net label: `aria-live="polite"` so screen reader announces net change
- Collapsible sections: already handle `aria-expanded` in `collapsible-section.js`
