# BORIS OS — Design Principles

## Philosophy

Inspired by:
- **Dieter Rams** — Less but better. As little design as possible.
- **Steve Jobs** — Focus and simplicity. Ship the essential first.
- **Jony Ive** — Craftsmanship even in parts users rarely notice.
- **Brian Eno** — Ambient calm. The interface should reduce cognitive load.

## Core Rules

### 1. Deference to Content
The UI serves the content, not itself. No decorative elements. Every pixel must earn its place.

### 2. Calm Interaction
- No aggressive colors or warning overload
- No gamification pressure
- Gentle progress feedback
- Soft transitions (300ms ease)
- Respect reduced motion preferences

### 3. Focus Protection
- Hard cap: 3 tasks in BPV/School, 5 in Personal
- Focus mode: hide everything except Today
- No performance pressure metrics
- Progressive disclosure for advanced features

### 4. Visual Hierarchy
- Clear typography scale: h1 (1.75rem) > h2 (1.375rem) > h3 (1.125rem) > body (0.9375rem) > small (0.8125rem)
- Generous spacing (8px base unit)
- Minimal borders, subtle shadows
- Color used sparingly and meaningfully

### 5. Consistency
- All spacing from the spacing scale (space-1 through space-12)
- All colors from CSS custom properties
- All typography from the type scale
- Blocks consume design tokens — never define arbitrary values

## Color System

### Mode Accents
- BPV: Blue (`--color-blue`)
- School: Purple (`--color-purple`)
- Personal: Teal (`--color-teal`)

### Semantic Colors
- Success: Emerald
- Warning: Amber
- Error: Rose
- Info: Blue

### Theme Support
- Light / Dark / System (auto)
- 8 accent color presets
- Compact / Relaxed density modes

## Component Constraints

### Cards
- Neutral background (`--color-surface`)
- Subtle border (`--color-border`)
- Small radius (`--radius-lg`)
- No heavy shadows

### Buttons
- Primary: filled with accent color
- Secondary: ghost/outline
- Small (btn-sm) for inline actions
- Never more than 2 primary buttons visible

### Forms
- Labels above inputs
- Hints below inputs (muted color)
- Generous padding
- Auto-save where possible (debounced)

### Empty States
- Centered, calm
- Icon + title + description
- Optional single action button
- Never feel like failure

## Accessibility Basics

- ARIA labels on navigation elements
- Proper heading hierarchy (h1 > h2 > h3, no skipping)
- Color contrast ratios maintained (4.5:1 minimum)
- Focus indicators visible
- Keyboard navigation supported
- Reduced motion respected

## Personality-Adaptive Design

Target user profile:
- High openness, low conscientiousness
- Easily overwhelmed, perfectionistic
- Highly technical, aesthetically motivated

Therefore the system:
- Limits choices (max 3/5 tasks)
- Hides complexity behind progressive disclosure
- Uses calm, neutral language
- Never shows red "failure" states
- Celebrates small progress gently
