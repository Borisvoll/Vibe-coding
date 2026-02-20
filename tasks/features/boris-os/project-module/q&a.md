# Phase 0 — Design Questions for Boris

**Feature:** School-Mode Project Module 1.0
**Date:** 2026-02-20

---

## Context

Before building the agenda, project-task linking, and visual timeline, I need clarity on five design decisions that affect data model and UI structure.

### Current State (what exists)

- **`os_projects`** store: id, title, goal, mode, status, nextActionId
- **`os_tasks`** store: id, text, mode, status, priority, date
- **`os_school_milestones`** store: already in IndexedDB (v3), has `dueDate` index
- **Projects block**: expand/collapse list, next-action (1 per project), status badges
- **Planning tab**: empty placeholder ("Planningmodules volgen in een volgende iteratie")
- **Lesson #13**: All task-like data must flow through `os_tasks` — no private task stores

---

## Questions

### Q1. Eén project tegelijk actief of meerdere?

> Mag een School-gebruiker meerdere actieve projecten hebben, of forceren we focus op één huidig project?

**Options:**
- **A) Meerdere actief** — Huidige `os_projects` werkt al zo. Agenda en timeline tonen alle actieve.
- **B) Eén actief, rest gepauzeerd** — Dwingt focus af. UI toont alleen het actieve project prominent.

**Impact:** Bepaalt of de agenda taken van alle projecten toont of slechts één.

---

### Q2. Agenda weergave: maandgrid of list?

> De mini-agenda bovenaan het project-detail — welke vorm?

**Options:**
- **A) Maandgrid** — Kalender met datumbadges + taakdots, tap opent takenlijst voor die dag. Compacte visuele overzicht.
- **B) Lijst (komende 14 dagen)** — Chronologische lijst van aankomende taken/deadlines. Eenvoudiger, minder visueel.

**Impact:** Grid vereist meer CSS maar biedt beter visueel overzicht. Lijst is simpeler en past beter bij de rest van de UI.

---

### Q3. Time-blocking nodig of alleen datum?

> Moeten taken een specifiek tijdstip krijgen (09:00-10:30) of is alleen een datum genoeg?

**Options:**
- **A) Alleen datum** — Taken hebben een `date` veld (YYYY-MM-DD). Simpel, past bij huidig model.
- **B) Datum + tijdblok** — Vereist `startTime` en `endTime` velden. Agenda wordt een dagplanner.

**Impact:** Tijdblokken voegen complexiteit toe aan het datamodel en de UI. Datum-only past bij het bestaande `os_tasks` schema.

---

### Q4. Timeline granulariteit: milestones vs fasen?

> De horizontale tijdlijn — toont die individuele milestones (punten) of fasen (ranges)?

**Options:**
- **A) Milestones** — Punten op de tijdlijn met naam + datum. Simpel, duidelijk.
- **B) Fasen** — Blokken met start- en einddatum (Gantt-achtig). Rijker, complexer.
- **C) Beide** — Milestones als punten, fasen als achtergrondblokken.

**Impact:** Fasen vereisen `startDate` + `endDate` per fase. Milestones zijn punten met één datum.

---

### Q5. Moet project-taken pushen naar Today automatisch?

> Wanneer een taak een `date` heeft die vandaag is — verschijnt die automatisch in de Vandaag-pagina?

**Options:**
- **A) Automatisch** — Taken met `date === today` en een `project_id` verschijnen automatisch in vandaag-tasks.
- **B) Handmatig "push"** — Gebruiker kiest expliciet welke taken naar Today gaan (via een knop).
- **C) Hybrid** — Automatisch tonen, maar gebruiker kan individuele taken "verbergen" van Today.

**Impact:** Automatisch is simpeler en consistent met hoe `getTasksForToday()` al werkt (filtert op date). Handmatig geeft meer controle.

---

## Answers

| # | Keuze | Toelichting |
|:-:|:-----:|-------------|
| Q1 | **A) Meerdere actief** | Huidige os_projects flow behouden. Agenda toont alle actieve projecten. |
| Q2 | **A) Maandgrid** | Kalender met datumbadges + taakdots. Visueel overzicht. |
| Q3 | **A) Alleen datum** | Past bij bestaand os_tasks schema. Geen tijdblokken. |
| Q4 | **C) Beide** | Milestones als punten + fasen als achtergrondblokken op de tijdlijn. |
| Q5 | **A) Automatisch** | Taken met date === today verschijnen automatisch in Vandaag. Consistent met getTasksForToday(). |
