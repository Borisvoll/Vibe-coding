# Dashboard — Component Spec

> **Goal:** The Dashboard is never empty. Even on first use, every widget has a
> clear, actionable zero state. The full layout loads in under one render cycle
> (single `await` at the top of `mount()`).

---

## Scope

This spec covers the **main dashboard block** at `src/blocks/dashboard/`.

- Host slot: `dashboard-cards` (rendered on the `#dashboard` tab)
- Modes: all (no `modes` filter — the block is mode-*aware*, not mode-*exclusive*)
- Replaces the current `src/blocks/dashboard/view.js` implementation in-place

Mode-specific blocks (`school-dashboard`, `personal-dashboard`) remain unchanged
on the `vandaag-mode` host — this redesign is for the `#dashboard` tab only.

---

## Layout

Single-column card stack. Responsive: on viewports ≥ 720 px the NextActionCard
and QuickCapture sit side-by-side (2-column grid). Below 720 px: stacked.

```
┌─────────────────────────────────────┐
│  StatusStrip                        │  ← always visible, no card bg
│  School · vrijdag 21 feb · 2/5 · ✉3│
├─────────────────────────────────────┤
│                                     │
│  NextActionCard          [card]     │  ← primary, most visual weight
│  Volgende actie                     │
│  ─────────────────────────────────  │
│  "Samenvatting maken voor wiskunde" │
│                   [ ✓ Voltooid ]    │
│                                     │
├─────────────────────────────────────┤
│  QuickCapture            [card]     │  ← always rendered
│  [ Vang een gedachte op...      ]   │
├─────────────────────────────────────┤
│  [ Open Vandaag →                 ] │  ← text button, no card chrome
└─────────────────────────────────────┘
```

### Spacing

- Gap between all widgets: `var(--space-4)` (16px)
- StatusStrip: no background, no border — floats above the stack
- Cards (NextActionCard, QuickCapture): `var(--ui-surface)` + `var(--shadow-sm)` + `border-radius: var(--radius-lg)`
- OpenVandaag: plain anchor-style button, no card chrome

---

## 1. StatusStrip

**Purpose:** Always tells you where you are: mode, date, and how today looks at a glance.

### Layout

Single horizontal row. Three groups separated by `·` dividers.

```
[ School ]  ·  vrijdag 21 februari  ·  2/5 taken  ·  3 inbox
```

- Mode pill: small badge with mode color (`--color-purple-light` bg + `--color-purple` text for School)
- Date: `formatDate(today, 'long')` — Dutch long format ("vrijdag 21 februari")
- Task count: `${doneTasks}/${totalTasks} taken` — omit if 0 total tasks
- Inbox count: `${inboxCount} inbox` — omit if 0

### Props (from `context`)

| Prop | Source | Type |
|------|--------|------|
| `mode` | `modeManager.getMode()` | `'BPV' \| 'School' \| 'Personal'` |
| `date` | `new Date()` | Date |
| `tasksDone` | `tasks.filter(t => t.done).length` | number |
| `tasksTotal` | `tasks.length` | number |
| `inboxCount` | `getInboxCount()` | number |

### States

| State | Render |
|-------|--------|
| `loading` | Single shimmer line (width 60%) |
| `loaded` | Full pill + date + counts |

### Reactivity

Re-renders on: `tasks:changed`, `inbox:changed`, `mode:changed`

---

## 2. NextActionCard

**Purpose:** Surface the single most important thing to do right now. If there
is nothing, prompt the user to choose one.

### Derivation — "Volgende Actie"

The next action is derived in this priority order:

1. **Today's incomplete todos** — `getDailyEntry(mode, today).todos` where `done === false`, first item
2. **Mode tasks not done** — `getTasksForToday(mode)` where `done === false`, first item
3. **Zero state** — no next action exists

The card does NOT cycle through items. It surfaces item #1 only. The user
marks it done or navigates to Vandaag to reorder.

### Props

| Prop | Source | Type |
|------|--------|------|
| `task` | derived (see above) | `{ id, text, source: 'daily' \| 'task' }` \| `null` |
| `mode` | `modeManager.getMode()` | string |
| `onDone(id, source)` | internal handler | function |
| `onNavigate()` | calls `updateHash('today')` | function |

### States

| State | Condition | Render |
|-------|-----------|--------|
| `loading` | data not yet fetched | Card skeleton (1 shimmer line, 1 shimmer button) |
| `has_action` | `task !== null` | Task text + "Voltooid" button |
| `zero_state` | `task === null` | Zero state layout (see `docs/empty-states.md`) |
| `completing` | button clicked, async in flight | Task text fades, spinner on button |
| `just_done` | async complete | Brief ✓ flash (300 ms), then re-derive next action |

### "Voltooid" Button Behaviour

- Source `daily`: calls `saveDailyEntry(...)` with `todo.done = true`, emits `daily:changed`
- Source `task`: calls `toggleTask(id)`, emits `tasks:changed`
- On success: re-derive next action (might surface a new task, or drop to zero state)
- On error: toast "Kon niet opslaan — probeer opnieuw"

### Reactivity

Re-renders on: `tasks:changed`, `daily:changed`, `mode:changed`

---

## 3. QuickCapture

**Purpose:** Frictionless thought capture from the Dashboard. Never leave the
page just to add an inbox item.

### Behaviour

1. User types in the input
2. Presses **Enter** (or taps **Stuur**) — NOT a form submit button to avoid accidental submits
3. `addInboxItem(text, mode)` is called
4. `inbox:changed` is emitted
5. Input clears
6. Toast: "Vastgelegd in inbox"
7. StatusStrip inbox count updates (via `inbox:changed` listener)

Empty input on Enter → no-op (no error shown).

### Props

| Prop | Source | Type |
|------|--------|------|
| `mode` | `modeManager.getMode()` | string |
| `placeholder` | static string | `"Vang een gedachte op..."` |

### States

| State | Condition | Render |
|-------|-----------|--------|
| `idle` | no text | Input with placeholder, faint border |
| `typing` | text in input | Input with active border (`--color-accent`) |
| `submitting` | Enter pressed, `addInboxItem` in flight | Input disabled, spinner |
| `error` | `addInboxItem` throws | Input re-enabled, toast with error message |

### Reactivity

Does not subscribe to events. It only emits. Mode change → updates which mode
the next item will be tagged to (read fresh from `modeManager.getMode()` at
submit time, not at render time).

---

## 4. OpenVandaagShortcut

**Purpose:** One tap to the place where you do the work.

### Layout

```
[ Open Vandaag  → ]
```

- Text-style button (no card chrome, no border)
- Right-aligned arrow icon (`→`)
- Font: `var(--font-base)` — same as body, not a heading
- Color: `var(--color-accent)` on default; `var(--color-accent-hover)` on hover
- No padding card wrapper — sits flush below QuickCapture

### Behaviour

- Click: `updateHash('today')` from `src/os/deepLinks.js`
- No async, no loading state needed

### States

| State | Render |
|-------|--------|
| Default | accent-colored text + arrow |
| Hover | slightly darker accent + underline |
| Focus | focus ring (`var(--color-accent)`, 2px, 2px offset) |

### No data dependency

This widget is always rendered immediately — it has no async data requirement.

---

## Data Loading Strategy

All data for the Dashboard is loaded in a **single async pass** at mount time:

```javascript
async function loadData(mode) {
  const [daily, tasks, inboxCount] = await Promise.all([
    getDailyEntry(mode, today()),
    getTasksForToday(mode),
    getInboxCount(),
  ]);
  return { daily, tasks, inboxCount };
}
```

- StatusStrip and NextActionCard both consume from this single result
- QuickCapture needs no initial data
- OpenVandaag needs no data

During the `await`, StatusStrip and NextActionCard show skeletons.
QuickCapture and OpenVandaag render immediately (they have no async dependency).

---

## Event Subscriptions & Cleanup

| Event | Handler |
|-------|---------|
| `mode:changed` | Full re-render: call `loadData(newMode)`, re-render all widgets |
| `tasks:changed` | Reload tasks, re-derive NextActionCard, update StatusStrip counts |
| `daily:changed` | Reload daily entry, re-derive NextActionCard |
| `inbox:changed` | Reload inbox count, update StatusStrip |

All subscriptions are registered after mount. All are unsubscribed in `unmount()`.

```javascript
mount(container, context) {
  const unsubs = [
    context.eventBus.on('mode:changed', handleModeChange),
    context.eventBus.on('tasks:changed', handleTasksChange),
    context.eventBus.on('daily:changed', handleDailyChange),
    context.eventBus.on('inbox:changed', handleInboxChange),
  ];
  return {
    unmount() { unsubs.forEach(fn => fn()); }
  };
}
```

---

## File Map

| File | Role |
|------|------|
| `src/blocks/dashboard/index.js` | Block registration (`registerDashboardBlock`) |
| `src/blocks/dashboard/view.js` | `mount(container, context)` — orchestration, event wiring |
| `src/blocks/dashboard/store.js` | `loadDashboardData(mode)` — single `Promise.all` fetch |
| `src/blocks/dashboard/styles.css` | Layout, card chrome, skeleton animations, status strip |

`store.js` is a new file (currently the block reads from `view.js` directly).
Separating it makes the data layer testable in isolation.

---

## XSS

All user content (task text, captured thought) rendered via `escapeHTML()` from
`src/utils.js`. No `.innerHTML` with raw user strings.

---

## Accessibility

- QuickCapture `<input>` has `aria-label="Gedachte vastleggen"`
- NextActionCard "Voltooid" button has `aria-label="Markeer als voltooid: ${escapeHTML(task.text)}"`
- StatusStrip counts have `aria-live="polite"` so screen readers announce changes
- OpenVandaag is an `<a>` or `<button>` (not a `<div>`), keyboard-navigable
- Focus order: StatusStrip (non-interactive) → NextActionCard button → QuickCapture input → OpenVandaag button
