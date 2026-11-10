import { Pressable, Text, View } from 'react-native';
import { FullScreen, H, P, T } from '@/components/ui';
import { C } from '@/lib/theme';

export const SAFETY_TIPS: [string, string][] = [
  ['Öffentlich bleiben', 'Trefft euch am Event oder an einem belebten Ort. Nicht bei jemandem zu Hause.'],
  ['Jemandem Bescheid geben', 'Sag einer Freundin oder einem Freund, mit wem und wo du dich triffst.'],
  ['Eigene Anreise', 'Komm und geh selbstständig. Behalte dein Getränk im Blick.'],
  ['Nichts überweisen', 'Schick nie Geld und gib keine Bankdaten weiter, egal mit welcher Geschichte.'],
  ['Bauchgefühl zählt', 'Fühlt sich etwas falsch an, geh. Blockiere und melde, wir prüfen jede Meldung.'],
];

/** The full safety tips and community rules. */
export function SafetySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <FullScreen visible={visible} onClose={onClose} title="Sicher treffen">
      <H size={40}>Sicher treffen</H>
      {SAFETY_TIPS.map(([t, d]) => <View key={t} style={{ gap: 2 }}><Text style={T.semi(17)}>{t}</Text><P muted style={{ fontSize: 15 }}>{d}</P></View>)}
      <H size={22} style={{ marginTop: 8 }}>Community-Regeln</H>
      <P style={{ fontSize: 15 }}>MOSHCHAT ist ab 18. Sei du selbst: echte Fotos, echter Name. Kein Hass, keine Belästigung, keine Nacktbilder, kein Spam, kein Verkauf. Respektiere ein Nein und Pronomen. Verstöße führen zur Sperre.</P>
      <P muted style={{ fontSize: 14 }}>In einem Notfall: 112.</P>
    </FullScreen>
  );
}

/** Small card at the top of a chat: a short reminder with a link to all tips. */
export function SafetyCard({ date, onOpen }: { date: boolean; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="Tipps fürs erste Treffen anzeigen"
      style={{ alignSelf: 'stretch', marginTop: 6, borderWidth: 2, borderColor: C.ink, borderRadius: 14, backgroundColor: C.white, padding: 12, gap: 4 }}>
      <Text style={T.semi(15)}>🛡️ {date ? 'Sicher zum ersten Date' : 'Sicher treffen'}</Text>
      <Text style={[T.body(14), { color: C.muted }]}>Trefft euch an einem belebten Ort, sag jemandem Bescheid und schick nie Geld.</Text>
      <Text style={[T.semi(14), { textDecorationLine: 'underline' }]}>Alle Tipps ansehen</Text>
    </Pressable>
  );
}
