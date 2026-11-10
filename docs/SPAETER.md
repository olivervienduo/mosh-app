# Für später: ausgeblendete Funktionen

Stand: 9. November 2026

MOSHCHAT wurde verschlankt. Die App konzentriert sich jetzt auf zwei Dinge:
**Events erstellen** und **sich über Events vernetzen**.
Die folgenden Funktionen sind fertig gebaut, aber vorübergehend ausgeblendet.
Nichts davon ist verloren.

## Wo die komplette Version liegt

| Wo | Was |
|---|---|
| GitHub-Branch `voll-version` | Die komplette App, wie sie am 9.11.2026 war, mit allen Funktionen |
| `MOSHCHAT_Voll-Version_2026-11-09.zip` im Ordner MOSH auf dem Desktop | Derselbe Stand als Zip |
| Dieser Code (`main`) | Alle Bildschirme und Funktionen sind noch drin, nur ausgeschaltet |

Die Datenbank in Supabase ist **unverändert**. Alle Tabellen und Funktionen
für Feed, Check-in, „Offiziell“ und Statistik sind weiterhin vorhanden.

## Was ausgeblendet ist

| Schalter | Was dazugehört |
|---|---|
| `feed` | Feed-Tab, Beiträge mit Fotos/Videos, Umfragen, Reaktionen, Kommentare, „Beitrag schreiben“ für Veranstalter, letzter Beitrag auf der Event-Seite, Push-Einstellung „News von Veranstaltern“ |
| `checkin` | QR-Code am Einlass („Check-in-Code“ für Veranstalter, Scanner für Gäste), „gerade hier“, Live-Hinweise und LIVE-Abzeichen, Filter „Nur wer gerade hier ist“ beim Swipen, „Jetzt treffen“ nach einem Match, Einstellung „Als ‚gerade hier‘ zeigen“, Auschecken |
| `official` | Abzeichen „✓ Offiziell“ auf Events, Hinweis für Veranstalter, Admin-Schalter auf der Event-Seite, Bereich „Verifizieren“ im Admin-Bereich |
| `stats` | Statistik für Veranstalter (nur Summen, keine Personen) |

**Geblieben** sind: Anmelden, Profil mit drei Modi, Events erstellen, suchen und beitreten,
Swipen, Matches, Likes, Chat mit Treffpunkt-Vorschlag, Melden und Blockieren,
Einstellungen, Admin-Bereich für Meldungen.

## So holst du eine Funktion zurück

1. Datei `src/lib/features.ts` öffnen.
2. Beim gewünschten Schalter `false` auf `true` ändern, z. B. `feed: true`.
3. Neu bauen (Web-Vorschau bzw. App-Build). Fertig.

Die Bildschirme dieser Funktionen sind mit `featureGate(...)` geschützt.
Solange der Schalter aus ist, leiten sie auf die Event-Liste um.

Alternativ die komplette Version 1:1 zurückholen:

```bash
git checkout voll-version
```

## Worauf du beim Zurückholen achten musst

- **Feed:** Für Push-Mitteilungen bei neuen Beiträgen müssen die Funktion `notify`
  und `supabase/webhooks.sql` eingerichtet sein (siehe README). Ohne Push funktioniert der Feed trotzdem.
- **Check-in:** Braucht die Kamera, funktioniert also nur in der Handy-App, nicht in der Web-Version.
  Die Kamera ist für Android derzeit gesperrt. Beim Zurückholen in `app.json` unter `android`
  `"android.permission.CAMERA"` aus `blockedPermissions` entfernen und `"CAMERA"` wieder bei `permissions` eintragen.
  Für iPhone ist der Text zur Kamera-Nutzung noch hinterlegt (`NSCameraUsageDescription`).
- **Offiziell:** Wenn du das Abzeichen wieder einschaltest, prüfe vorher, welche Events in Supabase
  `official = true` haben. Die vier Test-Events stehen auf „offiziell“.
- **Store-Texte:** In `docs/LAUNCH.md` sind die Abschnitte „LIVE AM EVENT“ und
  „NEWS VOM VERANSTALTER“ aktuell ausgeklammert. Beim Zurückholen wieder aufnehmen.
- **Datenschutz:** Der Satz „Veranstalter sehen nur Summen, keine Personen“ in der Datenschutzerklärung
  betrifft die Statistik. Er stimmt auch ohne Statistik, kann aber bleiben.

## Was in der App noch eingebaut, aber jetzt unsichtbar ist

Die App-Größe ändert sich dadurch kaum. Falls du die Funktionen endgültig nicht mehr willst,
kann man die Bildschirme und die dazugehörigen Datenbank-Teile später komplett löschen.
Der Branch `voll-version` bleibt davon unberührt.
