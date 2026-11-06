# Schulplaner – PWA

Moderner Schulplaner als Progressive Web App: Hausaufgaben und anstehende Tests/Klassenarbeiten verwalten, mit Google-Anmeldung, Cloud-Sync, Offline-Unterstützung sowie Light-/Dark-Mode.

**Live:** https://school-planner-hf26.web.app
**Repository:** https://github.com/hankfreewood-lgtm/school-planner

---

## Funktionen

| Bereich | Funktion |
| --- | --- |
| Hausaufgaben | Anlegen, bearbeiten, löschen, als erledigt markieren (ausgrauen + durchstreichen) |
| Hausaufgaben | Intelligente Sortierung: überfällig → heute → später → erledigt; Badges „Überfällig“, „Heute fällig“, „Morgen fällig“ |
| Hausaufgaben | Automatisches Ausblenden ab dem Tag **nach** dem Fälligkeitsdatum (Daten bleiben in Firestore) |
| Tests | Anlegen, bearbeiten, löschen; chronologische Sortierung |
| Tests | Dynamischer Countdown („Heute“, „Morgen“, „In 3 Tagen“, „In 2 Wochen“) mit Dringlichkeitsstufen, aktualisiert sich beim Tageswechsel |
| Tests | Ausblendung ab dem Testdatum (Daten bleiben in Firestore) |
| Profil | Google-Login, dauerhafte Sitzung, Profilbild/Name/E-Mail, Abmelden |
| Profil | Theme: Hell / Dunkel / System (lokal gespeichert, kein Flash beim Laden, optional mit Konto synchronisiert) |
| Profil | Fachfarben-Hintergrund ein-/ausschaltbar, App-Infos, Installations-Button |
| Design | Material-3-Expressiv-Optik, Bottom-Navigation (mobil) / Navigation Rail (Desktop), Bottom Sheets, Toasts, Skeleton-Loader, Empty States, reduzierte Bewegung respektiert |
| PWA | Manifest, Service Worker, Offline-Fallback, installierbar auf Android & Desktop |
| Offline | Firestore Persistent Cache (IndexedDB) – Schreibvorgänge werden gepuffert und automatisch synchronisiert; Statusanzeige „Offline“ / „Synchronisiere …“ |
| Sicherheit | Firestore Security Rules: ausschließlich eigene Daten, Validierung von Fach/Datum/Text, Benutzertrennung |

**Fachfarben** (konsistent in Karten, Badges, Akzentstreifen; je eigene Light-/Dark-Variante):
Mathematik blau · Deutsch rot · Englisch violett · Biologie grün · Chemie türkis · Physik orange · Geschichte braun · Geografie petrol · Informatik indigo · Musik pink · Kunst magenta · Sport gelb · Sozialkunde grau · Sonstiges neutral.

---

## Technologien

- **HTML5 / CSS3 / JavaScript (ES Modules)** – kein UI-Framework
- **Vite 6** als Build-Tool (nur Bundling/Minifizierung, keine Runtime-Abhängigkeit)
- **Firebase**: Authentication (Google), Cloud Firestore, Hosting
- **GitHub Actions** für automatisches Deployment
- **Web App Manifest + eigener Service Worker**
- **DM Sans** (variable Schrift, lokal als WOFF2 gehostet, keine externen Font-Requests; Lizenz OFL, siehe `public/fonts/OFL.txt`)
- Tests: `node:test` (Datums-/Sortierlogik) und `@firebase/rules-unit-testing` (Security Rules)

---

## Projektstruktur

```
school-planner/
├── index.html                  App-Shell (Theme-Script inline gegen Flash)
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js                   Service Worker
│   ├── offline.html            Offline-Fallback
│   ├── fonts/                  DM Sans (WOFF2, variabel) + OFL-Lizenz
│   └── icons/                  generierte PNG/SVG-Icons
├── src/
│   ├── css/
│   │   ├── fonts.css           @font-face (DM Sans, lokal)
│   │   ├── style.css           Tokens-Import, Layout, Navigation
│   │   ├── themes.css          Light-/Dark-Tokens, Fachfarben
│   │   └── components.css      Karten, Sheets, Buttons, Profil …
│   └── js/
│       ├── app.js              Bootstrap, State, Navigation, Auth-Flow, Tageswechsel
│       ├── firebase.js         Firebase-Init (Persistenz, Offline-Cache, Emulator-Switch)
│       ├── auth.js             Google-Login/-Logout, Profildokument
│       ├── store.js            Firestore-Zugriff (watch/CRUD/Preferences)
│       ├── dates.js            reine Datums-/Sortier-/Countdown-Logik (getestet)
│       ├── homework.js         Hausaufgaben-View
│       ├── tests.js            Tests-View
│       ├── profile.js          Profil-View
│       ├── forms.js            gemeinsames Bottom-Sheet-Formular
│       ├── ui.js               Dialoge, Toasts, Reconciliation, Fehlertexte
│       ├── theme.js            Theme/Tint-Verwaltung
│       ├── subjects.js         Fachliste + Farb-Keys
│       └── icons.js            Inline-SVG-Icons
├── scripts/generate-icons.mjs  erzeugt PWA-Icons ohne Abhängigkeiten
├── tests/
│   ├── dates.test.js
│   └── firestore.rules.test.js
├── .github/workflows/firebase-hosting-merge.yml
├── firestore.rules
├── firestore.indexes.json
├── firebase.json / .firebaserc
└── package.json
```

---

## Lokale Entwicklung

Voraussetzungen: Node.js ≥ 20, npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

Weitere Skripte:

```bash
npm test             # Datums-/Sortier-/Countdown-Logik
npm run test:rules   # Security Rules gegen den Firestore-Emulator (benötigt Java 21+)
npm run build        # Produktions-Build nach dist/
npm run preview      # Build lokal testen
npm run icons        # PWA-Icons neu erzeugen
```

### Mit lokalen Firebase-Emulatoren entwickeln

```bash
firebase emulators:start --only auth,firestore --project demo-school-planner
# App mit Emulator-Verbindung öffnen:
# http://localhost:5173/?emulator
```

Der Emulator-Schalter ist nur im Dev-Build aktiv (`import.meta.env.DEV`) und wird aus dem Produktions-Bundle entfernt.

---

## Firebase-Konfiguration

Projekt: **school-planner-hf26** (Region `eur3`).

| Dienst | Status |
| --- | --- |
| Firestore | Datenbank `(default)`, Rules deployed |
| Hosting | Site `school-planner-hf26`, Rewrite auf `index.html` |
| Authentication | Google-Provider aktiviert, autorisierte Domains: `localhost`, `school-planner-hf26.web.app`, `school-planner-hf26.firebaseapp.com` |

Die Web-Konfiguration (`src/js/firebase.js`) enthält **nur öffentliche** Schlüssel – das ist bei Firebase so vorgesehen. Der Schutz erfolgt über Authentication und Security Rules. Service-Account-Schlüssel werden **nie** eingecheckt (siehe `.gitignore`).

### Datenstruktur

```
users/{uid}
  displayName, email, photoURL, createdAt, lastLoginAt

users/{uid}/homework/{id}
  subject, content, dueDate ("JJJJ-MM-TT"), completed, createdAt, updatedAt

users/{uid}/tests/{id}
  subject, topic, testDate ("JJJJ-MM-TT"), createdAt, updatedAt

users/{uid}/settings/preferences
  theme ("light" | "dark" | "system"), subjectTint (bool), updatedAt
```

Datumsangaben werden bewusst als kalendarische ISO-Strings ohne Uhrzeit gespeichert – dadurch gibt es keine Zeitzonen-Verschiebungen. Die Anzeige erfolgt als `TT.MM.JJJJ`.

### Security Rules

`firestore.rules` erlaubt Lesen/Schreiben ausschließlich unter `users/{uid}` für den angemeldeten Nutzer selbst, validiert alle Felder (erlaubte Fächer, Datumsformat, Textlängen, boolesche Werte, keine Fremdfelder) und sperrt alles andere. Getestet mit 6 Testfällen (eigene Daten, fremde Daten, anonym, Validierung, unbekannte Pfade):

```bash
npm run test:rules
```

### Regeln/Indexe manuell deployen

```bash
firebase deploy --only firestore
```

---

## Deployment

### Automatisch (GitHub Actions)

Workflow: `.github/workflows/firebase-hosting-merge.yml`

Bei jedem Push auf `main` (oder manuell über „Run workflow“):
1. Checkout + Node 22
2. `npm ci`
3. `npm test`
4. `npm run build`
5. Deploy auf den Live-Kanal via `FirebaseExtended/action-hosting-deploy`

Benötigtes Repository-Secret:

| Secret | Inhalt |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_SCHOOL_PLANNER_HF26` | JSON-Key eines Service Accounts mit Rolle *Firebase Hosting Admin* |

### Manuell (Fallback)

```bash
npm run build
firebase deploy --only hosting
```

---

## PWA-Installation

- **Android (Chrome):** Website öffnen → Menü → „App installieren“ / „Zum Startbildschirm hinzufügen“. Alternativ der Button im Profil-Tab, sobald verfügbar.
- **Desktop (Chrome/Edge):** Installations-Icon in der Adressleiste oder Profil-Tab → „App installieren“.
- Die App startet im Standalone-Modus, hat eigene Icons, Theme-Farbe und einen Offline-Fallback.

### Offline-Verhalten

- App-Shell und Build-Assets werden vom Service Worker gecacht (Navigation Network-First mit Timeout, Assets Cache-First).
- Firestore nutzt den Persistent Cache (IndexedDB): gelesene Daten bleiben offline sichtbar, Änderungen werden lokal gespeichert und beim nächsten Verbindungsaufbau synchronisiert. Die App zeigt währenddessen „Offline – Änderungen warten“ bzw. „Synchronisiere …“.
- Ist eine Seite noch nie geladen worden, erscheint `offline.html`.

---

## Einrichtung – bereits erledigt

- Firebase-Projekt `school-planner-hf26` mit Firestore, Hosting und Web-App.
- Firestore Security Rules deployt (`firebase deploy --only firestore`).
- **Google-Anmeldung aktiviert** über `firebase deploy --only auth` (Konfiguration in `firebase.json` unter `auth.providers.googleSignIn`). Kein manueller Console-Schritt nötig.
- GitHub-Repository erstellt; Service Account `github-actions@school-planner-hf26.iam.gserviceaccount.com` mit den Rollen *Firebase Hosting Admin*, *Firebase Viewer*, *Firebase Rules Admin*, *Service Usage Consumer*; Secret `FIREBASE_SERVICE_ACCOUNT_SCHOOL_PLANNER_HF26` gesetzt.
- Erster Deploy über GitHub Actions erfolgreich.

## Noch manuell möglich (optional)

1. Eigene Domain unter Firebase Hosting verbinden.
2. Bei eigener Domain: Firebase Console → Authentication → Settings → autorisierte Domains ergänzen.

---

## Bewusste Entscheidungen

Zwei Anforderungen widersprechen sich – hier die gewählte Auflösung, jeweils über eine Konstante steuerbar (`src/js/dates.js`):

- **Tests ab Testdatum ausblenden vs. Countdown „Heute“:** Die Ausblendung hat Vorrang, deshalb ist `TEST_VISIBLE_UNTIL_DAYS_BEFORE = 1` (ein Test ist am Tag davor sichtbar, ab dem Testdatum nicht mehr). Der Countdown kennt „Heute“ weiterhin, wird für sichtbare Tests aber nie erreicht. Wer den Test am Testtag sehen will, setzt den Wert auf `0`.
- **Überfällige Hausaufgaben vs. Ausblenden nach Fälligkeit:** Die Ausblendung hat Vorrang, `HOMEWORK_GRACE_DAYS = 0` (sichtbar bis einschließlich Fälligkeitstag, ab dem Folgetag ausgeblendet). Die Sortiergruppe „Überfällig“ und das Badge sind implementiert und erscheinen automatisch, sobald `HOMEWORK_GRACE_DAYS` z. B. auf `2` gesetzt wird.
- **Datumsfelder** werden als `JJJJ-MM-TT` ohne Uhrzeit gespeichert und rein kalendarisch gerechnet – dadurch keine Zeitzonen-/Sommerzeit-Fehler. Anzeige immer `TT.MM.JJJJ`.
- **Theme** wird lokal in `localStorage` gespeichert und vor dem ersten Rendern inline angewendet (kein Flash). Zusätzlich wird es – wenn angemeldet – in Firestore gespiegelt und auf anderen Geräten übernommen.
- **Firestore-Offline:** Persistent Cache in IndexedDB; Schreibvorgänge werden lokal gepuffert und automatisch synchronisiert. `settle()` in `store.js` verhindert, dass die UI offline blockiert.


---

## Lizenz

Privates Schulprojekt. Nutzung auf eigene Verantwortung.
