# QA-checklist BORIS OS (alignment pass)

## 1) Visuele checks
- [ ] Typografie, spacing en card-stijl komen overeen met de originele BPV Tracker.
- [ ] Knoppen en inputs gebruiken gedeelde componentklassen (`.btn`, `.form-input`, etc.).
- [ ] Geen opvallende one-off stijlen of onrustige animaties.
- [ ] Donkere modus blijft leesbaar (contrast op cards, tekst en borders).

## 2) Interactie checks
- [ ] Moduswissel (BPV / School / Persoonlijk) voelt direct, zonder dubbele renders.
- [ ] Tabwissel (Dashboard/Vandaag/Planning/Reflectie/Archief) werkt zonder layout-sprongen.
- [ ] Lege staten tonen nette melding i.p.v. lege pagina.
- [ ] Focusmodus toont alleen Vandaag en verbergt overige tabs/secties netjes.

## 3) Moduswissel checks
- [ ] BPV toont alleen BPV-relevante blokken.
- [ ] School toont alleen School-relevante blokken.
- [ ] Persoonlijk toont alleen Persoonlijk-relevante blokken.
- [ ] Blokken unmounten schoon bij moduswissel (geen dubbel listeners).

## 4) Vandaag checks per modus
- [ ] **BPV Vandaag**: max 3 focuspunten, uren snelinvoer-link, 1 leermoment, korte reflectie, links naar doelen/project.
- [ ] **School Vandaag**: max 3 focustaken, huidige projectfocus, snelle leeropbrengst, link naar mijlpalen.
- [ ] **Persoonlijk Vandaag**: max 5 taken, simpele agendablokken, energie/stemming + dankbaarheid (1 regel), één betekenisvolle actie.
- [ ] Data-isolatie klopt: School/Persoonlijk tonen geen BPV-records.

## 5) Dashboard checks per modus
- [ ] Dashboard bevat alleen mode-relevante kaarten.
- [ ] Kaarten lezen/schrijven naar de juiste stores.
- [ ] Kaartlinks verwijzen naar passende routes/secties.

## 6) Service worker / update checks
- [ ] Nieuwe versie triggert banner: “Nieuwe versie beschikbaar”.
- [ ] Klik op “Ververs” activeert skipWaiting + herlaadt app.
- [ ] Diagnostiek toont versie + SW status correct.
