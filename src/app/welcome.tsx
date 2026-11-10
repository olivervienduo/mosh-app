import { Redirect, router } from 'expo-router';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Btn, H, P, Rule, T } from '@/components/ui';
import { MODE_KEYS, MODES } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { C } from '@/lib/theme';

const STEPS: [string, string][] = [
  ['Event wählen', 'Tritt bei, wo du sowieso hingehst.'],
  ['Leute swipen', 'Nur Menschen, die auch dort sind.'],
  ['Vor Ort treffen', 'Treffpunkt direkt im Chat ausmachen.'],
];

export default function Welcome() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  if (session) return <Redirect href="/" />;
  const headline = Math.min(58, Math.max(40, Math.round(width * 0.13)));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 28, paddingBottom: 32, gap: 22, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
        <H size={30}>MOSHCHAT</H>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {MODE_KEYS.map((k, i) => (
            <View key={k} style={{ backgroundColor: MODES[k].color, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 16, transform: [{ rotate: `${[-5, 3, -2][i]}deg` }] }}>
              <Text style={T.display(22)}>{MODES[k].label}</Text>
            </View>
          ))}
        </View>
        <H size={headline}>Triff deine Leute auf Events.</H>
        <P>MOSHCHAT verbindet Menschen, die zum selben Konzert, Festival, Spiel oder zur selben Messe gehen. Als Freunde, als Date oder beruflich.</P>
        <View>
          <Rule />
          {STEPS.map(([h, d], i) => (
            <View key={h} style={{ flexDirection: 'row', gap: 14, paddingVertical: 10, borderBottomWidth: 2, borderStyle: 'dashed', borderColor: C.line }}>
              <Text style={T.display(30)}>{i + 1}</Text>
              <View><Text style={T.display(18)}>{h}</Text><Text style={[T.body(14), { color: C.muted }]}>{d}</Text></View>
            </View>
          ))}
        </View>
        <View style={{ gap: 12 }}>
          <Btn solid title="Konto erstellen" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'signup' } })} style={{ flex: 0 }} />
          <Btn title="Anmelden" onPress={() => router.push('/sign-in')} style={{ flex: 0 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
