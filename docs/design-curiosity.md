# Design: Curiosity Studio

A contemplative space inside BORIS OS. Not a dashboard. Not a productivity feature. Not reflection journaling. Not analytics. A place that gently triggers curiosity — and succeeds even if the user does nothing.

---

## 1. Emotional Target

### What the user should feel within 10 seconds

Stillness. A slight deceleration. The sensation of entering a quieter room — like opening a book you forgot you owned, or noticing a pattern in ceiling tiles you walk under every day. There should be a pull toward lingering, not toward doing.

The feeling is closer to browsing a bookshop than checking a feed. You might pick something up. You might not. Both outcomes are equal.

### What the user must NOT feel

- Guilt about unfinished work.
- Pressure to engage, respond, or act.
- Anxiety from numbers, counts, or progress indicators.
- Performance awareness — no sense of being measured.
- Overwhelm from too many choices or too much content.
- Fear of missing something important.

### Cognitive load level

Minimal. Below the threshold of the Vandaag page. Closer to a screensaver than a workspace. The page should be parseable in a single glance, with no hierarchy demanding sequential reading. If the user's eyes wander, that is the intended behavior.

---

## 2. Curiosity Mechanics

Curiosity is not commanded. It is triggered by specific cognitive conditions. Curiosity Studio uses four mechanisms, never simultaneously, and never forcefully.

### Incomplete information

Surface a fragment — a sentence from an old note, a project title without context, a tag without its items. The incompleteness creates a gap the mind wants to close. Never resolve the gap automatically. Let the user decide whether to follow it.

### Contrast (past vs present)

Place something from weeks or months ago alongside something recent. Do not label the contrast. Do not say "then vs now." Let proximity do the work. The user notices the distance, or doesn't. Both are fine.

### Unexpected resurfacing

Bring back something the user forgot they wrote, captured, or started. The surprise of re-encountering your own thought is one of the strongest curiosity triggers. Selection must feel random enough to be surprising but relevant enough to not feel arbitrary. Never resurface deleted items.

### Pattern hints

When the same tag, word, or theme appears across separate entries, surface the connection without naming it. Show the items, not the analysis. The user draws their own conclusion. If they see no pattern, the items still stand on their own.

---

## 3. Information Behavior Rules

These rules are non-negotiable. They define what Curiosity is by defining what it refuses to become.

1. **Never demand action.** No buttons labeled "Do this now." No calls to action. No prompts to "add to tasks" or "follow up." If actions exist, they are deeply secondary — a quiet link, not a highlighted button.

2. **Never present red warnings.** No error states. No urgency colors. No exclamation marks. If something cannot be loaded, the space simply shows less. Emptiness is not an error.

3. **Never present counts as pressure.** No "You have 12 unread items." No badges. No notification dots. If a count appears at all, it is descriptive ("3 fragments"), never imperative.

4. **Never convert into tasks.** Curiosity items do not have checkboxes. They do not have due dates. They do not have priorities. They exist to be noticed, not to be done.

5. **Never auto-suggest productivity moves.** No "Would you like to schedule this?" No "Add to your daily plan?" No "This project needs attention." Curiosity observes. It does not advise.

6. **Never rank or sort by importance.** Items appear without hierarchy. No item is presented as more important than another. Position is determined by variety and balance, not urgency.

7. **Never show empty states as failure.** If there is nothing to surface, the space remains calm. A quiet message at most — not a prompt to "add more data" or "get started."

---

## 4. Stability vs Variation

The layout is a constant. The content breathes.

### Stability (70%)

- The overall spatial structure does not change between visits.
- Widget positions are fixed. The user always knows where to look.
- Typography, spacing, and color temperature remain constant.
- The page never rearranges itself based on data volume.

### Variation (30%)

- Content within each area rotates. What was surfaced yesterday is replaced today.
- One element per day is intentionally different — a fragment from a different time period, a different store, a different mode.
- Variation is seeded by date, so the same day always shows the same content (no flicker on re-entry within a day).
- The user cannot force a refresh. Tomorrow's variation comes tomorrow.

### What never varies

- Number of visible areas.
- Spacing between elements.
- Font sizes.
- Background color.

---

## 5. Visual Language

Curiosity is the quietest page in BORIS OS. Every visual choice reduces presence.

### Whitespace

Maximum. More than any other page. Content floats in space rather than filling it. Whitespace is not wasted space — it is the primary material of the page.

### Typography

- Slightly softer than Vandaag. Use `--ui-text-muted` as the default text color, not `--ui-text`.
- Headings use normal weight (400), not semibold. They label, they do not shout.
- Body text at standard size (0.875rem). No large stat numbers. No `.ui-stat`.
- Line height generous — 1.6 or higher. Text should breathe.

### Color

- Lower contrast than productivity sections. Background uses `--ui-surface`, not `--ui-bg`.
- Mode accent is present but subdued — used only as a thin top line or a faint tint, never as a fill.
- No semantic colors (no green/amber/red). No status indicators.
- Text colors limited to `--ui-text-muted` and `--ui-text-faint`. Primary text color used sparingly, for the single most important word in a fragment.

### Borders and containment

- No hard borders. Cards are defined by whitespace and subtle background difference, not by lines.
- If a border is necessary, use `--ui-border-light` at reduced opacity.
- No box shadows in default state. No hover shadows. Cards are planes, not objects.
- Border radius generous — `--ui-card-radius` (12px) or higher. Softness over precision.

### Cards as planes of space

Cards should not feel like containers holding content. They should feel like areas of slightly different air. The metaphor is a clearing in a forest, not a box on a shelf. Achieve this through:
- Minimal background difference from the page.
- No visible edges unless hovered (and even then, barely).
- Content that appears to rest on the surface, not be trapped inside it.

---

## 6. Motion

Motion in Curiosity is atmospheric, not functional. It exists to create a sense of life, not to guide attention.

### Allowed

- Fade-in on page entry: opacity 0 → 1, duration 150–200ms, ease-out.
- Staggered fade-in for multiple elements: 50ms delay between items.
- Content crossfade when daily rotation changes (if the user happens to be on the page at midnight): 200ms.

### Forbidden

- Bounce, spring, or elastic easing.
- Scale transitions (grow/shrink).
- Slide-in from edges.
- Parallax or scroll-linked animation.
- Continuous animation (pulsing, rotating, breathing).
- Any motion exceeding 200ms duration.

### Reduced motion

All motion disabled when `prefers-reduced-motion: reduce` is active. Content appears instantly. No exceptions.

---

## 7. Content Limits

Curiosity shows less than the user expects. This is intentional. Scarcity creates attention.

### Hard limits

- Maximum **3 surfaced items** per widget/area. Not 4. Not "up to 5." Three.
- Maximum **1 sentence** of context per item. If the original is longer, truncate with no "read more" link.
- Maximum **2 words** for any label or heading within the Curiosity space.

### Forbidden content types

- Percentages.
- Graphs or charts of any kind.
- Trend arrows (up/down indicators).
- Streak counters ("5 days in a row").
- Completion ratios ("3/7 done").
- Time-based metrics ("last active 2 days ago").
- Comparative data ("more than last week").
- Numbered lists longer than 3 items.

### What CAN appear

- A sentence from an old note.
- A project title the user hasn't visited recently.
- A tag that appears across multiple items.
- A date from the past with no explanation.
- An inbox item that was captured but never processed.
- A question the user once wrote down.

---

## 8. Permissionless Exit

The user owes Curiosity nothing. Leaving is always instant, always safe, always without consequence.

### Rules

1. **No confirmation dialogs.** Navigating away requires zero clicks beyond the navigation itself.
2. **No state loss.** Curiosity does not create state. There is nothing to save. There is nothing to lose.
3. **No save buttons.** Nothing on this page is editable. It is read-only by design.
4. **No "are you sure?" prompts.** Ever. For any reason.
5. **No breadcrumb trail.** The user does not need to "return" to Curiosity. It is always there, always in the same state it was (content rotates daily, not on exit/re-entry).
6. **No session memory.** Curiosity does not track whether the user visited today, how long they stayed, or what they looked at. It is the one place in BORIS that does not observe the user.
7. **Re-entry is identical to first entry.** Opening Curiosity at 9:00 and again at 14:00 shows the same content. The daily seed ensures consistency within a day. The user can trust that nothing changed while they were away.

---

## Summary

Curiosity Studio is defined more by what it refuses than by what it does. It refuses urgency, measurement, action, and performance. What remains is a quiet surface where fragments of the user's own thinking reappear — unhurried, unranked, and unjudged.

If the user opens Curiosity and closes it ten seconds later having done nothing, the page has succeeded. If they notice something they forgot and smile, even better. But the smile is not the goal. The stillness is.
