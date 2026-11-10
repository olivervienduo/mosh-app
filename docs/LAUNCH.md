# Launch-Checkliste

## Was du selbst erledigen musst

| Schritt | Kosten | Wo |
|---|---|---|
| Apple Developer Program | 99 USD / Jahr | developer.apple.com/programs |
| Google Play Console | 25 USD einmalig | play.google.com/console |
| Domain + Website mit Datenschutz, AGB, Impressum, Support-Mail | ab ca. 10 € / Jahr | z. B. bei deinem Hoster |
| Supabase, Expo, E-Mail-Versand (Resend/Brevo) | 0 € | siehe README |

Als Firma brauchst du für Apple eine **D-U-N-S-Nummer** (gratis, dauert ein paar Tage). Als Privatperson nicht, dann steht aber dein Name im Store.
Google verlangt bei neuen privaten Konten einen **geschlossenen Test mit mindestens 12 Testern über 14 Tage**, bevor du veröffentlichen darfst. Früh starten!

## Vor dem ersten Build

- [ ] `app.json`: `ios.bundleIdentifier` und `android.package` auf deine Domain ändern (z. B. `at.deinefirma.moshchat`). **Später nicht mehr änderbar.**
- [ ] Name „MOSHCHAT“ markenrechtlich prüfen (EUIPO/ÖPA-Recherche) und im App Store verfügbar? Sonst Untertitel ergänzen, z. B. „MOSHCHAT – Events & Leute“.
- [ ] `eas init` ausführen (füllt `extra.eas.projectId`).
- [ ] Umgebungsvariablen in EAS für `production` anlegen (siehe README).
- [ ] Impressum in `src/app/(app)/legal.tsx` ausfüllen; Datenschutz und AGB aus `docs/legal/` anpassen und auf deiner Website veröffentlichen.
- [ ] Eigenen E-Mail-Versand (SMTP) in Supabase eintragen.
- [ ] Push: `notify` deployen und `supabase/webhooks.sql` ausführen. Für iOS fragt `eas build` beim ersten Mal nach dem Push-Schlüssel – „Ja“ wählen.
- [ ] Test-Events löschen: `delete from public.events where title like '[Test]%';`
- [ ] Demo-Konto für die Prüfer anlegen (siehe unten).

## Bauen und einreichen

```bash
eas build --profile production --platform all
eas submit --platform ios       # landet in TestFlight / App Store Connect
eas submit --platform android   # landet im internen Test-Track
```

Für Android-Submit brauchst du einen Google-Service-Account-Schlüssel (Anleitung: docs.expo.dev/submit/android).

## Demo-Konto für App Review

Lege in Supabase → Authentication → Users → **Add user** ein Konto mit Passwort an (z. B. `review@deine-domain.at`), „Auto Confirm“ an. Prüfer melden sich damit ganz normal über „Anmelden“ an.
Melde dich einmal selbst damit an, schließ das Onboarding ab und tritt dem Test-Event bei. Lege 2–3 weitere Testkonten an, die das Demo-Konto liken, damit Prüfer Swipen, Match und Chat sehen.

**Hinweis für die Prüfer (Review Notes):**
> MOSHCHAT is a free app to meet people at events. Sign in with the demo account: tap “Anmelden”, email: review@…, password: …. All content is user-generated; users can report and block from every profile, chat and event (⋯ menu). Account deletion: Profil → ⚙ → Konto löschen.

(Solange der Check-in ausgeblendet ist, ist kein QR-Code-Screenshot nötig.)

## Apple-Richtlinien, die MOSHCHAT betreffen

- **1.2 User Generated Content**: Melden, Blockieren, Community-Regeln und Moderation sind eingebaut (Admin-Bereich). Reagiere auf Meldungen innerhalb von 24 h.
- **5.1.1(v) Konto löschen**: in der App möglich.
- **Altersfreigabe**: Im Fragebogen „Dating/Unrestricted Web Access“ ehrlich beantworten → MOSHCHAT wird 18+ (Dating-Funktion). Google Play: IARC-Fragebogen, Zielgruppe 18+.
- **4.3 Spam (Dating-Apps)**: Apple ist bei Dating-Apps streng. Betone im Text das Event-Konzept und die drei Modi.

## App-Datenschutz (App Store) / Datensicherheit (Google Play)

Erfasste Daten, alle **mit deiner Identität verknüpft**, **kein Tracking**, nicht verkauft, nicht für Werbung:

| Datentyp | Zweck |
|---|---|
| Kontaktinfo: E-Mail-Adresse | App-Funktion (Login) |
| Benutzerinhalte: Fotos, Videos, Nachrichten, sonstige Inhalte (Profiltexte, Kommentare) | App-Funktion |
| Identifikatoren: Benutzer-ID | App-Funktion |
| Sensible Infos: Geschlecht, sexuelle Orientierung (Date-Vorlieben) – freiwillig | App-Funktion |
| Sonstige Daten: Geburtsdatum, Stadt, Beruf | App-Funktion |
| Nutzungsdaten: Produktinteraktion (Swipes, Beitritte, Reaktionen) | App-Funktion |

Google zusätzlich: Daten werden **verschlüsselt übertragen** (HTTPS) und Nutzer **können die Löschung beantragen** (in der App). Kein Standort wird erfasst.

## Store-Texte

### Deutsch

**Name:** MOSHCHAT
**Untertitel (30):** Leute treffen auf Events
**Werbetext (170):** Du gehst auf ein Konzert, Festival oder eine Messe? Mit MOSHCHAT lernst du dort Leute kennen – als Freunde, für ein Date oder fürs Business. Gratis.

**Beschreibung:**
MOSHCHAT verbindet Menschen, die auf dieselben Events gehen.

Tritt einem Event bei – Konzert, Festival, Party, Ball, Messe, Konferenz oder Sportevent – und sieh, wer noch hingeht. Wisch nach rechts, wenn du jemanden kennenlernen willst. Wenn ihr euch beide mögt, ist es ein Match und ihr könnt chatten.

DREI MODI, EIN PROFIL
Freunde, Date oder Business: Du entscheidest, wofür du da bist – auch alles gleichzeitig. Für jeden Modus zeigst du einen eigenen Satz.

TREFFPUNKT AUSMACHEN
Schlag im Chat einen Treffpunkt vor: an der Bar, vor der Bühne, in der Pause.

<!-- Ausgeblendet (docs/SPAETER.md), beim Zurückholen wieder aufnehmen:
LIVE AM EVENT
Scann am Einlass den MOSHCHAT-Code und sieh, wer gerade wirklich da ist. Schlag einen Treffpunkt vor: an der Bar, vor der Bühne, in der Pause.
-->

AUCH DANACH
Events bleiben auffindbar. Lern die Leute vom letzten Konzert auch noch nächste Woche kennen.

<!-- Ausgeblendet (docs/SPAETER.md):
NEWS VOM VERANSTALTER
Im Feed posten nur offizielle Veranstalter: Line-up, Zeitplan, Umfragen, Fotos und Videos.
-->

FÜR ALLE
Pronomen, nicht-binär, „offen für alle“ – MOSHCHAT ist für jede und jeden gemacht.

SICHER
Melden und Blockieren überall, Profil pausieren, Altersbereich, Sicherheitstipps.

GRATIS
Keine Abos, keine Werbung, keine In-App-Käufe. Ab 18.

**Schlüsselwörter (100):** event,festival,konzert,leute,kennenlernen,freunde,dating,networking,messe,party,match,chat

### English

**Subtitle:** Meet people at events
**Promotional text:** Going to a concert, festival or trade fair? MOSHCHAT helps you meet people there – as friends, for a date or for business. Free.

**Description:**
MOSHCHAT connects people who go to the same events.

Join an event – concert, festival, party, ball, trade fair, conference or sports – and see who else is going. Swipe right if you want to meet someone. If you both like each other, it’s a match and you can chat.

THREE MODES, ONE PROFILE – Friends, Date or Business. Pick one or all of them, with a different line for each.
MEET UP – Suggest a meeting point right in the chat.
<!-- Hidden for now (docs/SPAETER.md): LIVE AT THE EVENT – Scan the MOSHCHAT code at the entrance and see who is actually there right now. Suggest a meeting point. -->
AFTERWARDS TOO – Past events stay searchable.
<!-- Hidden for now (docs/SPAETER.md): ORGANISER NEWS – Only official organisers post in the feed: line-ups, schedules, polls, photos and videos. -->
FOR EVERYONE – Pronouns, non-binary, “open to everyone”.
SAFE – Report and block everywhere, pause your profile, safety tips.
FREE – No subscriptions, no ads, no in-app purchases. 18+.

**Keywords:** events,festival,concert,meet,people,friends,dating,networking,fair,party,match,chat

### Screenshots

Benötigt: iPhone 6,9" (1320 × 2868) und Android-Telefon (mind. 1080 × 1920), je 3–8 Bilder. Vorschlag: Events-Liste, Event-Detail, Swipen, Match, Chat mit Treffpunkt, Likes.
Am einfachsten: auf dem Handy mit den Test-Konten Screenshots machen.

## Grenzen des Gratis-Betriebs

- Supabase Free: 1 GB Dateien und 5 GB Datenverkehr im Monat. Videos im Feed verbrauchen das schnell → beobachten (Dashboard → Usage). Notfalls Videos auf 20 MB begrenzen (`src/lib/media.ts`) oder auf Pro (25 USD/Monat) wechseln.
- Gratis-Projekte pausieren nach 7 Tagen ohne Nutzung – vor dem Launch kein Problem, danach mit echten Nutzern auch nicht.
- Bei viel Wachstum: Swipe-Stapel lädt pro Abruf 50 Profile; das reicht für zehntausende Nutzer.
