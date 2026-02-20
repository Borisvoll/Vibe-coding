# Plan — Project-Hub 2.0 (School-modus pijler)

**Date:** 2026-02-20
**Branch:** `claude/life-dashboard-modular-blocks-AOPzD`
**Status:** In progress

---

## Context

Project Module 1.0 lives in the Planning tab (`planning-main` host slot). Project-Hub 2.0 is a dedicated **Projects tab** — a first-class navigation destination, not a sub-view within Planning.

---

## Gebruikersantwoorden (definitief)

| Vraag | Antwoord |
|-------|----------|
| Max zichtbare projecten | 3 per pagina; paginatie voor meer |
| Cover upload limiet | Geen harde limiet; soft-warn > 10 MB, weigeren > 15 MB |
| PDF cover | Inline first-page via OffscreenCanvas + download-link |
| Timeline zoom | Start week-view; toggle knop → maand-view |
| Projectaccentkleur | Auto: avg-RGB van cover; handmatig overschrijven mogelijk |
| Pin to Today | Max 3 taken van projecten zichtbaar in Vandaag |

---

## Architectuurbeslissingen

1. **Nieuw shell-tab `projects`** — naast dashboard/today/inbox/lijsten/planning/settings
2. **Host-slot `projects-hub`** — in de nieuwe sectie
3. **Block `project-hub`** — mounts in `projects-hub`, beheert intern: lijst-view ↔ detail-view
4. **Geen externe libs** — pure SVG mindmap; geen D3 (zero-dependency filosofie)
5. **Cover opslag** — base64 dataURL in `os_projects` (`cover` veld) — optioneel
6. **Accentkleur** — `accentColor` veld op project-record; auto via avg-RGB tenzij handmatig
7. **Push-to-Today** — `updateTask(id, { date: getToday() })` — task verschijnt in `getTasksForToday()`
8. **Max 3 today-taken** — al afgedwongen door `modCaps`; geen extra logica nodig

---

## Bestanden die worden aangemaakt/gewijzigd

### Nieuwe bestanden

```
src/blocks/project-hub/
  index.js          — block registration (hosts: ['projects-hub'])
  styles.css        — alle stijlen voor project-hub
  view.js           — hoofd-controller (lijst ↔ detail routing)
  list.js           — card-grid, 3 per pagina, paginatie
  detail.js         — detail-view: banner + 4 tabs
  tabs/
    tasks.js        — Tasks-tab (reuse task CRUD, push-to-Today)
    timeline.js     — Timeline-tab (week/maand toggle, milestone drag)
    mindmap.js      — Mindmap-tab (SVG canvas, CRUD, PNG export)
    files.js        — Files-tab (cover preview, download)
```

### Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/os/shell.js` | +`projects` in `SHELL_TABS`, sidebar-item, mobile-nav, content-sectie, alt-G hotkey |
| `src/os/deepLinks.js` | +`projects` in `VALID_TABS` |
| `src/blocks/registerBlocks.js` | +import styles + `registerProjectHubBlock` |
| `src/stores/projects.js` | +`setCover()`, +`setAccentColor()` |

---

## Implementatiefasen

### Fase 1 — Shell Integration (shell.js + deepLinks.js)

1. Voeg `'projects'` toe aan `SHELL_TABS` array
2. Sidebar button (tussen Planning en de divider naar Systeem):
   ```html
   <button class="os-sidebar__item" data-os-tab="projects">
     <svg><!-- rocket icon --></svg>
     <span>Projects</span>
   </button>
   ```
3. Mobile-nav button: `<button data-os-tab="projects">Projects 🚀</button>`
4. Content-sectie:
   ```html
   <section class="os-section" data-os-section="projects" hidden>
     <h2 class="os-section__title">Projects 🚀</h2>
     <div class="os-host-stack" data-os-host="projects-hub"></div>
   </section>
   ```
5. Alt-G hotkey in `handleGlobalKeydown()`:
   ```js
   if (e.altKey && e.key === 'g') { e.preventDefault(); setActiveTab('projects'); }
   ```
6. `deepLinks.js`: voeg `'projects'` toe aan `VALID_TABS`

### Fase 2 — Project-Hub Block (Lijst-view)

`src/blocks/project-hub/list.js`:
- Laadt alle projecten via `getProjects(mode)`
- Toont 3 kaarten per pagina (CSS grid: repeat(3, 1fr))
- Paginatie-buttons (< / >) als er > 3 projecten zijn
- Elke kaart:
  - 16:9 banner/cover (img of placeholder)
  - Projecttitel + doel-snippet
  - Status-badge (Actief / Gepauzeerd / Gereed)
  - Progress-ring (completed/total tasks via `getTasksByProject()`)
  - Hover: `transform: translateY(-4px)` lift
  - Klik → opent detail-view

### Fase 3 — Project Detail View

`src/blocks/project-hub/detail.js`:
- HeroBanner (16:9, `object-cover`)
  - Cover-upload: `<input type="file" accept="image/*,.pdf">`
  - Na upload: `createImageBitmap()` → downscale als > 1 MP → canvas → `toDataURL('image/jpeg', 0.85)` → sla op
  - Waarschuwing als > 10 MB; weiger als > 15 MB
  - Avg-RGB berekening → `--project-accent` CSS-variabele
- Tab-bar: **Taken | Tijdlijn | Mindmap | Bestanden**
- Terug-knop → lijst-view
- Bewerk-knop voor titel/doel

### Fase 4 — Tasks Tab

`src/blocks/project-hub/tabs/tasks.js`:
- Haalt taken op via `getTasksByProject(projectId)`
- Toont max 3 taken (niet-done first), "Meer laden" knop
- Inline toevoegen (form onderaan)
- Checkbox toggle (done/todo)
- "Push naar Vandaag" checkbox per taak:
  - `updateTask(id, { date: getToday() })`
  - Badge "Vandaag" op taak als date === today
- Verwijder-knop per taak

### Fase 5 — Timeline Tab

`src/blocks/project-hub/tabs/timeline.js` (breidt bestaande timeline uit):
- **Week-strip (default)**: 7 kolommen, start op maandag van huidige week
  - Milestones als diamonds op correcte dag-kolom
  - "Vorige / Volgende week" navigatie
  - Toggle-knop → maand-view
- **Maand-view**: 5-6 rijen × 7 kolommen CSS-grid (hergebruik van agenda.js patroon)
  - Milestones als dots op dag-cel
- Milestone drag: `mousedown/mousemove/mouseup` → update `milestone.date`
- Accentkleur = `var(--project-accent)`

### Fase 6 — Mindmap Tab

`src/blocks/project-hub/tabs/mindmap.js`:
- SVG-canvas (geen externe lib)
- Wortel-knoop = projecttitel
- Context-menu op rechtsklik knoop: Toevoegen kind | Bewerken | Verwijderen
- Knopen opgeslagen als `project.mindmap = [{ id, parentId, label, x, y }]`
- Layout: `src/blocks/project-hub/tabs/mindmap.js` → force-free radial layout
- PNG-export: `canvas.getContext('2d')` → `drawImage(svgBlob)` → `canvas.toDataURL()` → download
- Lazy-load: pas `import()` als tab actief wordt

### Fase 7 — Files Tab

`src/blocks/project-hub/tabs/files.js`:
- Toont cover-afbeelding preview + download-button
- Upload-zone voor extra bestanden (worden als base64 in IndexedDB opgeslagen als `project.files = [{ id, name, size, dataUrl, type }]`)
- Bestandsgrootte-check: warn > 10 MB, block > 15 MB
- PDF: toon download-link + first-page canvas preview (native PDF rendering via `<canvas>` + OffscreenCanvas)

### Fase 8 — Store Updates

`src/stores/projects.js` uitbreidingen:
```js
export async function setCover(projectId, dataUrl) {
  return updateProject(projectId, { cover: dataUrl });
}

export async function setAccentColor(projectId, color) {
  return updateProject(projectId, { accentColor: color });
}

export async function updateMindmap(projectId, nodes) {
  return updateProject(projectId, { mindmap: nodes });
}

export async function addFile(projectId, file) {
  const project = await getByKey(STORE, projectId);
  if (!project) return null;
  const files = project.files || [];
  files.push(file);
  return updateProject(projectId, { files });
}

export async function removeFile(projectId, fileId) {
  const project = await getByKey(STORE, projectId);
  if (!project) return null;
  const files = (project.files || []).filter(f => f.id !== fileId);
  return updateProject(projectId, { files });
}
```

### Fase 9 — CSS Design Tokens

In `src/blocks/project-hub/styles.css`:
```css
:root {
  --project-accent: var(--color-accent); /* overridden per-project */
}

.project-hub-card {
  /* 3-column grid, hover lift, progress ring */
}

.project-hub-detail {
  /* HeroBanner, tabs, content area */
}
```

Accentkleur wordt runtime gezet:
```js
detailEl.style.setProperty('--project-accent', project.accentColor || 'var(--color-accent)');
```

---

## Data Model (geen schema-wijzigingen)

Alle nieuwe velden zijn **optioneel** op bestaande records:

```
os_projects:
  + cover        (string|null)   — base64 dataURL van cover-afbeelding
  + accentColor  (string|null)   — CSS kleurwaarde (auto of handmatig)
  + mindmap      (array|null)    — [{ id, parentId, label, x, y }]
  + files        (array|null)    — [{ id, name, size, dataUrl, type }]

os_tasks: (geen nieuwe velden nodig)
  date === getToday() = "vandaag" status
```

Geen DB-versie bump. Geen migratie. Bestaande records werken ongewijzigd.

---

## Verificatie (Definition of Done)

- [ ] Projects-tab verschijnt in sidebar + mobile-nav
- [ ] Alt-G opent Projects-tab
- [ ] Projectlijst toont max 3 kaarten; paginatie werkt bij >3
- [ ] Hover-lift animatie op kaarten
- [ ] Progress-ring toont completed/total ratio
- [ ] Cover-upload > 10 MB toont waarschuwing, > 15 MB geeft fout
- [ ] Cover-upload zet accentkleur via avg-RGB
- [ ] Tasks-tab: max 3 tasks zichtbaar, "Meer laden" werkt
- [ ] "Push naar Vandaag" zet task-datum op vandaag
- [ ] Vandaag-view toont nooit meer dan 3 projecttaken
- [ ] Timeline-tab: week-view default, toggle → maand, milestone drag
- [ ] Mindmap-tab: SVG knopen, context-menu CRUD, PNG export
- [ ] Files-tab: cover preview + download
- [ ] Alle bestaande 415+ tests blijven groen
- [ ] Zero console errors

---

## Open punten (post-implementatie)

1. **Kleurpalet**: auto avg-RGB of vaste set 4 hues? → Gekozen: auto (handmatig overschrijven optioneel)
2. **Projecten > 3**: paginatie (niet hard-cap tot 3)
3. **Bestanden > 15 MB naar Vault**: nee; weiger met foutmelding

---

## Risico's

| Risico | Mitigatie |
|--------|-----------|
| Base64 cover groot → IndexedDB traag | Downscale naar max 800px wide; gebruik JPEG 85% |
| SVG mindmap complex op mobile | Touch-events voor drag; min tap-target 44px |
| Week-strip timeline drag op iPhone | `touchstart/touchmove/touchend` polyfill |
| Veel tests door grote feature | Incrementeel bouwen; tests na elke fase |
