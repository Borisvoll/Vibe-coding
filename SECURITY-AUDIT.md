# Security Audit Report — BORIS

**Datum:** 2026-03-08
**Scope:** Volledige codebase (`src/`, `.github/`, `package.json`, `index.html`)

---

## Samenvatting

| Ernst | Aantal | Status |
|-------|--------|--------|
| HOOG | 2 | Actie vereist |
| MEDIUM | 4 | Aanbevolen |
| LAAG | 3 | Informatief |

Totaal: **9 bevindingen**. De codebase heeft een sterke security-baseline — consequent `escapeHTML()` gebruik, sterke crypto (AES-256-GCM + PBKDF2), geen `eval()`, en goede deep link validatie. Hieronder de gevonden aandachtspunten.

---

## HOOG

### 1. NPM dependency: Rollup path traversal (CVE)

**Bestand:** `package-lock.json` (rollup 4.x)
**Ernst:** HOOG
**Beschrijving:** Rollup 4.0.0–4.58.0 heeft een Arbitrary File Write via Path Traversal kwetsbaarheid ([GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc)). Dit kan misbruikt worden via kwaadaardige build-inputs.

**Impact:** Een aanvaller die invloed heeft op build-inputs (bijv. via een dependency) kan willekeurige bestanden schrijven op het build-systeem.

**Oplossing:**
```bash
npm audit fix
```

### 2. NPM dependency: esbuild development server request forwarding

**Bestand:** `package-lock.json` (esbuild ≤0.24.2, via vite)
**Ernst:** MEDIUM (maar 2 kwetsbaarheden samen)
**Beschrijving:** esbuild ≤0.24.2 laat elke website requests sturen naar de development server en het antwoord lezen ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)).

**Impact:** Alleen relevant tijdens `npm run dev` (niet in productie). Een kwaadaardige pagina in dezelfde browser kan data lezen van de dev server.

**Oplossing:**
```bash
npm audit fix --force  # Upgrade naar vite 7.x (breaking change)
```

---

## MEDIUM

### 3. Geen Content Security Policy (CSP)

**Bestand:** `index.html`
**Ernst:** MEDIUM
**Beschrijving:** Er is geen `<meta http-equiv="Content-Security-Policy">` tag en geen CSP headers via de GitHub Pages deploy. Dit maakt XSS-aanvallen makkelijker als er ooit een injectie-punt gevonden wordt.

**Impact:** Als een XSS-kwetsbaarheid gevonden wordt, kan een aanvaller onbeperkt scripts laden van externe bronnen.

**Aanbeveling:** Voeg een CSP meta tag toe aan `index.html`:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'">
```

### 4. Import/backup data validatie — geen record-level sanitatie

**Bestanden:** `src/db.js:579-598`, `src/stores/backup.js:135-156`
**Ernst:** MEDIUM
**Beschrijving:** `importAll()` schrijft records direct naar IndexedDB zonder veld-level validatie. `validateBundle()` controleert de structuur (app naam, stores als arrays), maar valideert niet de inhoud van individuele records. Een kwaadaardig backup-bestand kan records bevatten met XSS-payloads in tekstvelden die later gerenderd worden.

**Impact:** Een gebruiker die een gemanipuleerd `.json` backup-bestand importeert, kan XSS-payloads in de database krijgen die bij het renderen uitgevoerd worden. Dit is een stored XSS via data import.

**Mitigatie:** De app rendert bijna alle user content via `escapeHTML()`, wat het risico aanzienlijk vermindert. Maar het is defense-in-depth om ook bij import te valideren.

**Aanbeveling:** Overweeg record-level sanitatie bij import (strip HTML tags uit tekstvelden).

### 5. GitHub Actions: unpinned action versions

**Bestand:** `.github/workflows/deploy.yml:20-21, 34, 45`
**Ernst:** MEDIUM
**Beschrijving:** GitHub Actions worden aangesproken met versie-tags (`@v4`) in plaats van specifieke commit SHA's:
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
- uses: actions/upload-pages-artifact@v3
- uses: actions/deploy-pages@v4
```

**Impact:** Als een dependency (de GitHub Action) gecompromitteerd wordt, kan een aanvaller code injecteren in je CI/CD pipeline. Dit is een supply chain risico.

**Aanbeveling:** Pin actions op specifieke commit SHA's:
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
```

### 6. Web Worker: geen origin validatie op message events

**Bestanden:** `src/workers/search.worker.js`, `src/ui/command-palette.js:61,150,414`
**Ernst:** LAAG-MEDIUM
**Beschrijving:** De search worker gebruikt `self.postMessage()` en luistert naar messages zonder origin-verificatie. Dedicated workers (via `new Worker()`) zijn inherent afgeschermd tot dezelfde origin, dus het risico is minimaal. Maar bij toekomstig gebruik van Shared Workers of BroadcastChannel zou dit een probleem worden.

**Impact:** Minimaal voor huidige architectuur (dedicated workers).

---

## LAAG

### 7. Geen Subresource Integrity (SRI) of import maps

**Bestand:** `index.html:359`
**Ernst:** LAAG
**Beschrijving:** De app laadt `src/main.js` als ES module. Omdat alles self-hosted is op GitHub Pages (geen CDN dependencies), is SRI niet strikt nodig. Maar het ontbreken van import maps betekent dat er geen controle is op welke modules geladen worden.

**Impact:** Minimaal — de app heeft nul runtime dependencies en laadt alles van dezelfde origin.

### 8. localStorage data niet versleuteld

**Bestanden:** Meerdere (`boris_mode`, tutorial state, collapsible section states)
**Ernst:** LAAG
**Beschrijving:** Diverse app-instellingen worden opgeslagen in `localStorage` zonder encryptie. Dit betreft UI-preferences (mode, sectie-states, tutorial-progress) en geen gevoelige data.

**Impact:** Minimaal — er worden geen wachtwoorden, tokens of persoonlijke data in localStorage opgeslagen. IndexedDB data (de eigenlijke gebruikersdata) is lokaal en beschermd door de browser same-origin policy.

### 9. Service worker: cache-first strategie zonder versie-controle

**Bestand:** Service worker (geregistreerd in `src/main.js`)
**Ernst:** LAAG
**Beschrijving:** De service worker registratie bevat een `SKIP_WAITING` message (`src/main.js:205`). De app toont een update banner wanneer een nieuwe versie beschikbaar is, wat goed is. Maar er is geen integriteitscontrole op gecachete assets.

**Impact:** Minimaal — GitHub Pages serveert assets over HTTPS, en de browser verifieert SSL certificates.

---

## Positieve bevindingen

De codebase scoort sterk op de volgende security-aspecten:

1. **XSS preventie**: Consequent gebruik van `escapeHTML()` in alle render-functies. 92 `innerHTML` assignments gecontroleerd — allemaal gebruiken `escapeHTML()` voor user content.
2. **Geen eval/Function**: Geen gebruik van `eval()` of `new Function()` in de hele codebase.
3. **Sterke crypto**: AES-256-GCM met PBKDF2 (250.000 iteraties), correcte salt/IV generatie via `crypto.getRandomValues()`.
4. **Deep link validatie**: Routes worden gevalideerd tegen `VALID_ROUTES` whitelist. `CSS.escape()` wordt gebruikt voor selector-injectie preventie.
5. **CI/CD permissions**: GitHub Actions workflow heeft minimal permissions (`contents: read`, `pages: write`, `id-token: write`).
6. **Geen hardcoded secrets**: Geen API keys, tokens of credentials gevonden in de codebase.
7. **Input validatie**: `src/stores/validate.js` biedt gestructureerde validatie met `ValidationError`.
8. **Write guard**: `acquireWriteGuard()` / `releaseWriteGuard()` voorkomt concurrent write conflicts bij imports.

---

## Aanbevolen acties (prioriteit)

| # | Actie | Ernst | Moeite |
|---|-------|-------|--------|
| 1 | `npm audit fix` — fix Rollup kwetsbaarheid | HOOG | 1 min |
| 2 | CSP meta tag toevoegen aan `index.html` | MEDIUM | 15 min |
| 3 | GitHub Actions pinnen op SHA | MEDIUM | 10 min |
| 4 | Record-level sanitatie bij backup import | MEDIUM | 30 min |
| 5 | Vite upgraden (breaking change evalueren) | MEDIUM | 1-2 uur |
