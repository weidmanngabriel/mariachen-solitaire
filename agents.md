# Agent Requirements Log

Dieses Projekt enthält ein browserbasiertes Single-Page-Spiel "Worditaire" in reinem HTML/CSS/Vanilla-JS.

## Wichtige Anforderungen (bindend)
- Plattform: iPad/Safari-tauglich, keine App-Installation, keine Werbung, lokal als statische Seite lauffähig.
- Tech-Stack: nur `index.html`, `style.css`, `game.js`; Theme-Daten als JSON unter `/themes`.
- Keine Frameworks, keine Icons/Emojis.
- Spielregeln gemäß Solitaire-ähnlichem Layout mit:
  - Tableau 7 Spalten (2..8 Karten), nur jeweils unterste Karte aufgedeckt.
  - Stock/Waste Logik inkl. Recycling (Waste -> Stock in umgekehrter Reihenfolge).
  - Bis zu 5 Foundation-Slots.
- Kartenmodell:
  - `{ uid, label, groupId, type: "root"|"item", faceUp }`
- Bewegungslogik:
  - Tap-to-move statt Drag & Drop.
  - Auswahl toggelbar; ungültige Ziele dürfen nicht zu UI-"Festhängen" führen.
  - Gültige Ziele werden visuell markiert.
  - Tableau-Stack-Moves: maximal zusammenhängender faceUp-Block gleicher Kategorie vom Spaltenende wird gemeinsam bewegt.
- Placement-Regeln strikt umsetzen (Root nur auf leere Tableau-Spalte bzw. leeren Foundation-Slot als Start).
- Foundation-UI:
  - Header zeigt `Kategorienname (Anzahl Items)` einzeilig (kein Umbruch).
  - Fortschritt unten rechts `itemsPlaced/totalItems` (Root zählt nicht).
  - Vollständige Kategorie (Root + alle Items) wird automatisch aus Foundation entfernt (Slot wird frei).
- Kartentypografie:
  - Root-Karten visuell abgesetzt (Farbe + dicker Rand), keine Eckmarkierung.
  - Pro Karte zwei Textelemente: große mittige `.card-title` (nur Topcard), kleine `.card-label` oben (nur nicht-Top).
  - Einzeilig, ggf. abschneiden, kein Umbruch.
- Extras:
  - Button `Neues Spiel`.
  - Win-Check: gewonnen, wenn Stock + Waste + Tableau leer sind.

## Prozess-Hinweis für nachfolgende Agenten
- Diese Datei bei Änderungen an Anforderungen/Interpretation aktualisieren.
- Vor Implementierungsänderungen kurz prüfen, ob neue Constraints hinzugekommen sind.
- Bei UI-Änderungen nach Möglichkeit Screenshot erzeugen und dokumentieren.
