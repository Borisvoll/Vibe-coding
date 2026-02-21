# Morning Flow Mode

## Overview

A calm, step-by-step morning planning ritual. Auto-opens once per day when the user lands on Vandaag with empty outcomes. Guides through setting Top 3 outcomes, reviewing next actions, and optionally choosing a project focus. Ends with a summary focus card.

## Trigger

- **Auto**: Opens on Vandaag tab load when today's outcomes are empty and the flow hasn't been completed or dismissed
- **Manual**: "Start ochtendplan" command in the Ctrl+K palette
- **Frequency**: Once per day per mode (dismissed = won't auto-open again)

## Steps

### 1. Top 3 Outcomes
Three input fields for today's goals. Pre-fills from existing daily entry if any. Saved to `dailyPlans` store on step advance.

### 2. Next Actions (read-only)
Lists all active projects in the current mode with their next action status. Informational — helps the user see what's pending.

### 3. Project Focus (optional)
Radio picker: choose one project as today's focus, or "Geen focus vandaag". Pins the selected project via `setPinned()`.

### 4. Confirm
Summary of the morning plan. "Start je dag" button completes the flow.

## Persistence

| Data | Where | Key/Store |
|------|-------|-----------|
| Top 3 outcomes | IndexedDB | `dailyPlans` (`${date}__${mode}`) |
| Project focus | IndexedDB | `os_projects.pinnedForMode` |
| Flow progress | localStorage | `boris_morning_${date}_${mode}` |

### Resume Logic
- Each step advance saves `{ step, completed: false }` to localStorage
- Reopening the flow resumes at the saved step
- Completing saves `{ completed: true }`
- Dismissing (Esc/backdrop) saves `{ dismissed: true }`

## Focus Card

After flow completion, the `morning-focus` block renders on the Vandaag page (host: `vandaag-hero`, order: 7):
- Checkmark + "Ochtendplan klaar"
- Top 3 outcomes (compact, read-only)
- Focus project name + next action (if set)
- Mode-colored accent border

## Architecture

| File | Purpose |
|------|---------|
| `src/ui/morning-flow.js` | Stepper overlay + persistence logic |
| `src/ui/morning-flow.css` | Stepper + focus card styles |
| `src/blocks/morning-focus/index.js` | Block registration |
| `src/blocks/morning-focus/view.js` | Focus card rendering |
| `src/os/shell.js` | Auto-open check + command registration |

## Design

- Full-screen overlay with backdrop blur (same pattern as modal/tutorial)
- Progress dots in header
- Mode-colored accents on titles
- Smooth transitions (respects `prefers-reduced-motion`)
- Keyboard: Escape dismisses, Enter advances in outcome inputs
