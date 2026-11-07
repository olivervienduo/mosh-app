import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, Text, View } from 'react-native';
import { Btn, H, P, T, TopBar } from '@/components/ui';
import { LEGAL_URLS, SUPPORT_EMAIL } from '@/lib/constants';
import { C } from '@/lib/theme';

/**
 * Short in-app versions of the legal texts. The full texts live on your website
 * (EXPO_PUBLIC_PRIVACY_URL / EXPO_PUBLIC_TERMS_URL), see docs/legal/.
 */
const DOCS: Record<string, { title: string; url?: string; body: [string, string][] }> = {
  privacy: {
    title: 'Datenschutz', url: LEGAL_URLS.privacy,
    body: [
      ['Was wir speichern', 'Deine E-Mail-Adresse für den Login, dein Profil (Vorname, Geburtsdatum, Fotos, Angaben), Events, denen du beitrittst, Swipes, Matches, Nachrichten, Kommentare und Reaktionen.'],
      ['Was andere sehen', 'Andere sehen Vorname, Alter (nicht dein Geburtsdatum), Fotos und Profiltexte. Nachrichten sehen nur du und dein Match. Veranstalter sehen nur Summen, keine Personen.'],
      ['Sensible Angaben', 'Geschlecht und wen du daten möchtest, können Rückschlüsse auf deine sexuelle Orientierung erlauben. Diese Angaben sind freiwillig, nur im Date-Modus nötig und werden ausschließlich zum Abgleich genutzt.'],
      ['Wo die Daten liegen', 'Bei unserem Hosting-Anbieter Supabase in einem Rechenzentrum in der EU. Push-Mitteilungen laufen über Expo, Apple und Google.'],
      ['Keine Werbung, kein Verkauf', 'MOSHCHAT zeigt keine Werbung und verkauft keine Daten. Es gibt kein Tracking durch Dritte.'],
      ['Deine Rechte', 'Du kannst deine Daten jederzeit in den Einstellungen herunterladen, ändern und dein Konto endgültig löschen. Fragen und Beschwerden: ' + SUPPORT_EMAIL + '. Du kannst dich auch bei der Datenschutzbehörde beschweren.'],
    ],
  },
  terms: {
    title: 'Nutzungsbedingungen', url: LEGAL_URLS.terms,
    body: [
      ['Ab 18', 'MOSHCHAT ist nur für Menschen ab 18 Jahren.'],
      ['Gratis', 'MOSHCHAT ist kostenlos. Es gibt keine Abos und keine In-App-Käufe.'],
      ['Echt sein', 'Nutze deinen echten Vornamen und Fotos, die dich zeigen. Ein Konto pro Person.'],
      ['Respekt', 'Keine Belästigung, kein Hass, keine Nacktbilder, kein Spam, keine Werbung, keine illegalen Inhalte. Wir können Inhalte löschen und Konten sperren.'],
      ['Events', 'Wer ein Event anlegt, ist für die Angaben verantwortlich. MOSHCHAT verkauft keine Tickets und ist nicht Veranstalter.'],
      ['Treffen', 'Treffen finden auf eigene Verantwortung statt. Lies unsere Sicherheitstipps.'],
    ],
  },
  imprint: {
    title: 'Impressum',
    body: [
      ['Anbieter', 'Bitte vor dem Launch ergänzen: Name bzw. Firma, Anschrift, E-Mail, ggf. Firmenbuchnummer und UID (§ 5 ECG, § 25 MedienG).'],
      ['Kontakt', SUPPORT_EMAIL],
    ],
  },
  licenses: {
    title: 'Open-Source-Lizenzen',
    body: [
      ['Schriften', 'Anton, Archivo und IBM Plex Mono stehen unter der SIL Open Font License 1.1.'],
      ['Software', 'MOSHCHAT nutzt React Native, Expo, Supabase und weitere Open-Source-Pakete unter MIT-, Apache-2.0- und BSD-Lizenzen.'],
    ],
  },
};

export default function Legal() {
  const { doc = 'privacy' } = useLocalSearchParams<{ doc?: string }>();
  const d = DOCS[doc] ?? DOCS.privacy;
  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back title={d.title} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }}>
        <H size={34}>{d.title}</H>
        {d.body.map(([t, b]) => <View key={t} style={{ gap: 4 }}><Text style={T.semi(17)}>{t}</Text><P>{b}</P></View>)}
        {d.url ? <Btn title="Vollständige Fassung öffnen" onPress={() => WebBrowser.openBrowserAsync(d.url!)} style={{ flex: 0 }} /> : null}
      </ScrollView>
    </View>
  );
}
