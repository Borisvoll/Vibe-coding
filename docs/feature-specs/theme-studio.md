# Feature Spec: Smart Theme Studio

**Milestone:** 4
**Date:** 2026-02-21
**Status:** Implemented

## Overview

Enhanced the existing theme system with user knobs, color harmony suggestions, WCAG AA contrast auto-fix guardrails, and progressive disclosure (Default ↔ Advanced toggle). Improved import/export with validation feedback.

## Design Decisions

| Question | Answer |
|----------|--------|
| Contrast target | AA (4.5:1 body text, 3:1 muted text) — existing `enforceContrast` |
| Guardrail behavior | Auto-fix (silent) — existing `autoFixContrast` pattern |
| User knobs | Full manual (5 color knobs + 2 sliders) behind Advanced toggle |
| Harmony suggestions | Both analogous (±30°) and split-complementary (180° ± 30°) |

## Architecture

### Color Harmony — `src/core/themeEngine.js`

New pure functions added to the existing theme engine:

| Export | Returns | Purpose |
|--------|---------|---------|
| `generateAnalogous(hex)` | `[hex, hex]` | Two colors at ±30° hue offset |
| `generateSplitComplementary(hex)` | `[hex, hex]` | Two colors at 180° ± 30° |
| `generateHarmonySuggestions(hex)` | `{ analogous, splitComplementary }` | Both sets combined |

All functions use existing `hexToHSL` / `hslToHex` helpers. Saturation and lightness are preserved from the source accent color.

### Theme Studio UI — `src/ui/theme-studio.js`

Enhanced `createThemeStudio()` with progressive disclosure:

**Default mode (collapsed):**
- Preset buttons (unchanged)
- Live preview (unchanged)
- Actions: reset, export, import with feedback messages

**Advanced mode (toggled):**
- 5 color knobs: Accent, App Background, Block Background, Text Color, Muted Text
  - Each has: native color picker + hex text input + clear button (for non-accent knobs)
- 2 range sliders: Tint Strength (0–100), Shadow Strength (0–100)
- Harmony Suggestions: 4 clickable color dots (2 analogous + 2 split-complementary)
  - Click applies the color as new accent and re-renders harmony suggestions

### Import/Export Feedback

- Export: shows "Thema geëxporteerd" success message (3s auto-dismiss)
- Import success: shows "Thema geïmporteerd" message
- Import failure: shows "Ongeldig themabestand" or "Fout bij importeren" error message
- Feedback styled with semantic colors (success-light/error-light backgrounds)

## Contrast Guardrails

The existing `enforceContrast` function in `themeEngine.js` silently auto-fixes:
- `blockFg` against `blockBg` to meet 4.5:1 ratio (WCAG AA)
- `mutedFg` against `blockBg` to meet 3:1 ratio (WCAG AA large)

This runs on every `setTheme()` call, including when users type custom hex values.

## Styles — `src/ui/theme-studio.css`

New CSS classes:

| Class | Purpose |
|-------|---------|
| `.theme-studio__advanced-toggle` | Collapsible toggle button with chevron |
| `.theme-studio__chevron` | Rotating chevron indicator |
| `.theme-studio__knobs` | Vertical layout for color/slider controls |
| `.theme-studio__knob` | Individual control (label + input) |
| `.theme-studio__color-input` | Flex row: color picker + hex input + clear |
| `.theme-studio__color-picker` | 32×32 native color picker |
| `.theme-studio__hex-input` | Monospace hex text input |
| `.theme-studio__knob-clear` | × button to reset to default |
| `.theme-studio__range` | Styled range slider |
| `.theme-studio__harmony` | Harmony suggestions container |
| `.theme-studio__harmony-group` | Labeled group (Analogous / Split-comp.) |
| `.theme-studio__harmony-dot` | 28×28 clickable color dot |
| `.theme-studio__feedback` | Import/export feedback toast |

All colors use CSS custom properties (design tokens). No hardcoded values.

## Tests — `tests/core/themeEngine.test.js`

28 new tests added (49 total, up from 21):

- `generateAnalogous`: 5 tests — valid hex output, hue offsets, saturation/lightness preservation, wrap-around
- `generateSplitComplementary`: 3 tests — valid hex output, hue offsets, preservation
- `generateHarmonySuggestions`: 3 tests — structure, valid hex, different from input
- `autoFixContrast`: 4 tests — already sufficient, fix on light bg, fix on dark bg, valid hex
- `importThemeJson edge cases`: 4 tests — reject non-JSON, reject primitives, reject arrays, valid parse

## UI Language

All labels in Dutch: Geavanceerd, Accentkleur, Achtergrondkleur, Blok achtergrond, Tekstkleur, Gedempte tekst, Tint sterkte, Schaduw sterkte, Harmonie suggesties, Analoog, Split-comp., Herstel standaard, Exporteer thema, Importeer thema, Thema geëxporteerd, Thema geïmporteerd, Ongeldig themabestand.
