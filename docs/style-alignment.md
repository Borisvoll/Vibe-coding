# Style alignment audit (BORIS OS ↔ BPV Tracker)

## Originele app: canonieke stijlbronnen
- **Design tokens / variabelen**: `src/styles/variables.css`
- **Globale basisstijl**: `src/styles/base.css`
- **Componentpatronen**: `src/styles/components.css`
- **Paginaspecifieke patronen**: `src/styles/pages.css`

### Canonieke UI-taal in de originele app
- **Kaarten**: `.card` gebruikt `--color-surface`, subtiele border `--color-border`, afgeronde hoeken (`--radius-lg`) en rustige schaduw op interactie.
- **Knoppen**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm` met consistente spacing, hover/focus en dezelfde typografie.
- **Inputs**: `.form-input`, `.form-select`, `.form-textarea` met uniforme border, radius en focus ring (`box-shadow` met `--color-accent-light`).
- **Headers/dividers**: dunne borders via `--color-border`/`--color-border-light`, geen zware visuele scheiding.

## BORIS OS: huidige stijlbronnen
- **Token-injectie**: `src/core/designSystem.js`
- **BORIS blokken gedeeld**: `src/blocks/styles.css`
- **Blokniveau overrides**: `src/blocks/**/styles.css`
- **Shell rendering**: inline-styles in `src/main.js` (afwijkend van app-conventies)

## Divergenties die zijn aangepakt
1. **Inline shell-styling in JS**
   - Afwijking: inline styles in `src/main.js` i.p.v. gedeelde CSS.
   - Aanpak: shell gestandaardiseerd met gedeelde classes in `src/blocks/styles.css`.

2. **Typografie/tekst niet volledig NL-consistent**
   - Afwijking: meerdere zichtbare labels in Engels.
   - Aanpak: New OS zichtbare UI-teksten geharmoniseerd naar Nederlands.

3. **Losse blok-specifieke stijlpatronen**
   - Afwijking: meerdere kleine one-off patronen buiten gedeelde componenttaal.
   - Aanpak: basispatronen gecentraliseerd rond bestaande `.card`, `.btn`, `.form-*`, `.divider` en BORIS shared block classes.

4. **Dashboard/Vandaag shell gedrag niet stabiel per tab**
   - Afwijking: tabnavigatie gaf geen consistente content-activatie.
   - Aanpak: stabiele shell-structuur met actieve tab state en nette lege staten.

## Resultaat van alignment pass
- BORIS OS gebruikt nu dezelfde visuele taal als de originele app (spacing, cards, buttons, inputs, dividers).
- Aanpassingen zijn minimaal en geconcentreerd in **design tokens + gedeelde BORIS CSS + shell gedrag**, zonder legacy BPV-flow te wijzigen.
