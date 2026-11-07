# Mosh

Leute über Events kennenlernen – als Freunde, für ein Date oder fürs Business.
iOS- und Android-App mit Expo (React Native) und Supabase. Komplett gratis, ohne Werbung, ohne In-App-Käufe.

## Was die App kann

- **Login ohne Passwort**: E-Mail eingeben, Code aus der Mail eintippen.
- **Onboarding** in 3 Schritten: Profil (Foto, Vorname, Geburtstag ab 18, Pronomen), Modi (Freunde / Date / Business, je ein eigener Satz), erste Events.
- **Events**: suchen, nach Monaten blättern, vergangene Events weiter finden, beitreten, mehrtägige Events, Tickets-Link. Eigene Events anlegen mit Kategorie, Farbe (Vorauswahl je Kategorie), Bild, Ort, Datum.
- **Swipen** pro Event und Modus. Date-Vorlieben werden in beide Richtungen geprüft (inkl. nicht-binär und „offen für alle“). Rückgängig-Knopf.
- **Live-Modus**: Veranstalter zeigen am Einlass einen QR-Code, Gäste scannen ihn und sind „gerade hier“. Danach kann man nur Leute sehen, die gerade vor Ort sind, und sich mit „Jetzt treffen“ verabreden.
- **Chats** in Echtzeit, Lesebestätigungen, Treffpunkt-Vorschläge (Tag, Zeit, Ort) mit „Passt mir“.
- **Likes**: sehen, wer einen mag – gratis.
- **Feed**: nur Veranstalter posten (Text, Fotos, Videos bis 50 MB, Umfragen, Anheften). Alle können reagieren (eigenes Daumen-Icon in Eventfarbe + 4 Emojis), kommentieren, antworten, Kommentare liken, Beiträge speichern oder ausblenden.
- **Statistik** für Veranstalter (nur Summen, keine Personen).
- **Sicherheit**: melden, blockieren, Match auflösen, Profil pausieren, Altersbereich, Sicherheitstipps, Community-Regeln.
- **Datenschutz**: Daten-Export als Datei, Konto endgültig löschen (Pflicht im App Store).
- **Admin** (nur du): Meldungen bearbeiten, Inhalte löschen, Konten sperren, Events als „Offiziell ✓“ markieren.
- **Push-Mitteilungen** für Matches, Nachrichten, Likes und Veranstalter-News, einzeln abschaltbar.

## Ordner

```
src/app/           Screens (Expo Router)
src/components/    Bausteine (Buttons, Karten, Feed-Beitrag …)
src/lib/           Supabase, Login, Daten, Datum, Medien, Push
supabase/migrations/  Datenbank: Tabellen, Zugriffsregeln (RLS), Funktionen
supabase/functions/   Edge Functions: notify (Push), delete-account
supabase/tests/       Datenbank-Tests (laufen lokal ohne Server)
supabase/webhooks.sql Push-Auslöser (einmalig ausführen)
supabase/seed.sql     Beispiel-Events zum Testen
docs/              Store-Texte, Datenschutz- und AGB-Vorlagen, Launch-Checkliste
```

---

## Einrichtung Schritt für Schritt

Du brauchst: einen Computer mit [Node.js 20+](https://nodejs.org), ein Handy, ein kostenloses [Supabase](https://supabase.com)- und [Expo](https://expo.dev)-Konto.

### 1. Supabase-Projekt anlegen (gratis)

1. Auf supabase.com → **New project**. Region: **Frankfurt (eu-central-1)** (wichtig für DSGVO). Datenbank-Passwort sicher aufbewahren.
2. **Datenbank aufsetzen** – entweder:
   - Ohne Kommandozeile: Projekt → **SQL Editor** → Inhalt von `supabase/migrations/20261107000000_init.sql` einfügen → **Run**.
   - Oder mit CLI: `npx supabase login`, `npx supabase link --project-ref <REF>`, `npx supabase db push`.
3. **Login per Code**: Authentication → **Email Templates** → „Magic Link“ und „Confirm signup“: den Text so ändern, dass der Code drinsteht, z. B.
   ```html
   <h2>Dein Mosh-Code</h2>
   <p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>Gib den Code in der App ein. Er gilt 1 Stunde.</p>
   ```
4. **E-Mail-Versand**: Supabase verschickt im Gratis-Tarif nur wenige Mails pro Stunde. Für den Launch unter Authentication → **SMTP Settings** einen eigenen Versand eintragen. Gratis-Optionen: [Resend](https://resend.com) (3.000 Mails/Monat) oder [Brevo](https://brevo.com) (300/Tag). Absender z. B. `hallo@deine-domain.at`.
5. Authentication → **URL Configuration**: Site URL `mosh://` eintragen.
6. Project Settings → **API Keys**: die **Project URL** und den **Publishable key** kopieren.

### 2. App konfigurieren

```bash
git clone https://github.com/olivervienduo/mosh-app.git
cd mosh-app
npm install
cp .env.example .env      # dann .env mit deinen Werten füllen
```

**Niemals** den `service_role`/Secret Key in die App oder in `.env` schreiben – nur den Publishable Key.

### 3. Push-Mitteilungen und Konto-Löschung (Edge Functions)

```bash
npx supabase functions deploy notify --no-verify-jwt
npx supabase functions deploy delete-account
npx supabase secrets set WEBHOOK_SECRET=$(openssl rand -hex 24)   # Wert notieren
```

Dann `supabase/webhooks.sql` öffnen, `<PROJECT_REF>` und `<WEBHOOK_SECRET>` ersetzen und im SQL Editor ausführen.
(Falls `supabase_functions.http_request` fehlt: einmal Database → Webhooks öffnen und aktivieren.)

### 4. Dich zum Admin machen

In der App einmal anmelden, dann im SQL Editor:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'deine@email.at');
```

Optional Test-Events anlegen: `supabase/seed.sql` ausführen.

### 5. Auf dem Handy testen

Mosh nutzt Kamera, Push und Video – dafür braucht es einen **Development Build** (Expo Go reicht nicht):

```bash
npm install -g eas-cli
eas login
eas init                       # trägt die Projekt-ID in app.json ein
eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value https://…supabase.co --visibility plaintext
eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_… --visibility plaintext
eas build --profile development --platform android   # oder ios
npx expo start
```

Die Variablen genauso für `preview` und `production` anlegen (auch SUPPORT_EMAIL, PRIVACY_URL, TERMS_URL).
Gratis-Kontingent bei EAS: 15 iOS- und 15 Android-Builds pro Monat.

### 6. In die Stores

Siehe **[docs/LAUNCH.md](docs/LAUNCH.md)** – Checkliste, Kosten, Store-Texte, Datenschutz-Angaben, Review-Zugang.

---

## Entwickeln

```bash
npx expo start          # Dev-Server
npm run typecheck       # TypeScript
npx expo lint           # Lint
npm run test:db         # Datenbank-Tests (34 Prüfungen, ohne Server)
```

**Sicherheit**: Jede Tabelle hat Row Level Security. Heikle Abläufe (Swipen, Matches, Check-in, Feed, Statistik, Daten-Export) laufen über geprüfte Datenbank-Funktionen. Geburtsdatum und Einstellungen anderer sind nie lesbar, nur das Alter. Nachrichten sehen nur die beiden im Match. Fotos werden nur in den eigenen Ordner hochgeladen.

**Kosten im Betrieb**: Supabase Free (500 MB Datenbank, 1 GB Dateien, 50.000 aktive Nutzer/Monat), Expo Push gratis, EAS Free. Wenn Mosh wächst: Supabase Pro 25 USD/Monat. Achtung: Gratis-Projekte pausieren nach 7 Tagen ohne Aktivität.
