# Empty States

> **Principle:** An empty state is not a dead end — it is an invitation.
> Every zero state tells the user what to do next, in one sentence.
> No illustrations. No multi-paragraph explanations. Just a clear prompt.

---

## Philosophy

**Anti-patterns we avoid:**

- Generic "Nothing here yet" with no action
- Decorative illustrations (adds visual weight, doesn't help)
- Long descriptions (users scan, they don't read)
- Hiding the widget when empty (layout shift, loss of context)

**What we do instead:**

- Keep the widget visible at its normal size
- Show a brief, specific Dutch sentence
- Offer exactly one action
- Use the same card chrome as the loaded state (no layout shift)

---

## Dashboard Empty States

### NextActionCard — Zero State

**Condition:** No incomplete todos in today's daily plan AND no incomplete
tasks for the current mode.

**Copy (by mode):**

| Mode | Heading | Body | CTA label |
|------|---------|------|-----------|
| School | Volgende actie | Kies één taak die je vandaag af wilt maken. | Kies actie in Vandaag |
| Personal | Volgende actie | Wat wil je vandaag bereiken? | Kies actie in Vandaag |
| BPV | Volgende actie | Voeg een taak toe voor vandaag. | Kies actie in Vandaag |

**Layout:**

```
┌──────────────────────────────────────┐
│  Volgende actie                      │  ← label, --font-xs, --color-text-secondary, uppercase
│                                      │
│  Kies één taak die je vandaag af     │  ← body, --font-md, --color-text
│  wilt maken.                         │
│                                      │
│          [ Kies actie in Vandaag → ] │  ← ghost button, right-aligned
└──────────────────────────────────────┘
```

Rules:
- Same card padding and chrome as the loaded state (`p-5 rounded-lg shadow-sm`)
- Body text: `--font-md`, `--color-text` — not muted (this is the primary message)
- CTA: ghost button style — `--color-accent` text, no background fill
- CTA navigates to `#today?focus=tasks`
- Card height should match the approximate loaded height (no layout shift when
  a task appears after Quick Capture → "Voltooid" cycle)

**Minimum card height:** `min-height: 96px` — prevents collapse when zero state
body is shorter than a typical task string.

---

### NextActionCard — "Just Done" Micro-state

**Condition:** User just marked the action as done. No next action exists.

This is a transitional state, not a true empty state. Show it for 600 ms before
settling into the zero state.

**Copy:**

```
✓  Goed gedaan!
```

Single line, centered, `--color-success`, fades out → zero state fades in.

---

### QuickCapture — No True Empty State

QuickCapture is always shown with its placeholder. It never has a "no items"
empty state because it's a create-only widget.

**Placeholder text:** `"Vang een gedachte op..."`

This does not count as an empty state — the placeholder is a permanent affordance.

---

### StatusStrip — Loading State

**Condition:** Data fetch in flight (< 300 ms typically).

Show a single shimmer bar at 55% width, same height as the strip text.
Do not show partial counts (e.g. do not show "0/0 taken" before data arrives —
that reads as a real count).

Once loaded, if all counts are zero:
- Omit task count segment entirely (not "0/0 taken" — just absent)
- Omit inbox count segment if inbox is empty

**Minimum content:** Mode pill + date are always shown, even if counts are zero.
The strip is never blank.

---

### Dashboard — Full Loading State

**Condition:** First render, before `loadDashboardData` resolves.

Render order (immediate, no async dependency):
1. StatusStrip → shimmer
2. NextActionCard → skeleton (one shimmer line for task text, one shimmer block for button)
3. QuickCapture → input rendered, enabled immediately (user can start typing while data loads)
4. OpenVandaag → rendered immediately

QuickCapture being interactive during load is intentional — the user's input
is captured on submit, not on render. By the time they finish typing, data
will have loaded.

**Skeleton rules:**
- Use `<div class="skeleton">` with CSS animation (`background: linear-gradient(...)`)
- Skeleton elements match the exact dimensions of their loaded equivalents
- No text inside skeletons
- No skeleton for QuickCapture or OpenVandaag (they have no data dependency)

---

## Global Empty State Rules

### Copy Rules

1. **One sentence max** for the body. If you need two sentences, the message is too complex.
2. **Dutch throughout.** Never mix Dutch and English in empty states.
3. **Active voice.** "Kies één taak" not "Geen taken gevonden".
4. **No apology.** Do not write "Er zijn nog geen taken." The app isn't broken.
5. **Specific action.** "Kies actie in Vandaag" not "Ga naar Vandaag".
6. **No ellipsis in headings.** "Volgende actie" not "Volgende actie...".

### Layout Rules

1. **Never collapse a widget to zero height.** Empty widgets keep their minimum height.
2. **Same chrome in all states.** Card padding, radius, and shadow do not change between
   loaded, loading, and zero states. Only the content inside changes.
3. **No decorative icons in zero states.** A simple text prompt is cleaner.
4. **Zero state is not dimmed.** Do not use `opacity: 0.5` on zero state content —
   it reads as broken, not intentional.
5. **One CTA per zero state.** Never two buttons. The single button is the obvious path.

---

## Mode-Copy Map (quick reference)

| Widget | School | Personal | BPV |
|--------|--------|----------|-----|
| NextActionCard body | "Kies één taak die je vandaag af wilt maken." | "Wat wil je vandaag bereiken?" | "Voeg een taak toe voor vandaag." |
| NextActionCard CTA | "Kies actie in Vandaag" | "Kies actie in Vandaag" | "Kies actie in Vandaag" |

The CTA label is intentionally identical across modes — it's a navigation label,
not a description. The body text is where mode-personality shows.

---

## Future Widgets (placeholder)

When new Dashboard widgets are added, they must have an entry in this file before
implementation. The empty state spec is part of the component definition.
