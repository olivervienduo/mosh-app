import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Empty, H, Loading, Mono, P, T, TopBar } from '@/components/ui';
import { MODES, MODE_KEYS, type Mode } from '@/lib/constants';
import { fmtN, parseDay } from '@/lib/dates';
import { fetchEvent, useFocusLoad } from '@/lib/events';
import { errorText, supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Stats = { joined: number; checked_in: number; matches: number; reactions: number; comments: number; modes: Record<Mode, number>; days: { day: string; n: number }[] };
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** Organiser statistics. Aggregated only, never individual people. */
export default function EventStats() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading } = useFocusLoad(async () => {
    const [e, s] = await Promise.all([fetchEvent(id), supabase.rpc('event_stats', { p_event: id })]);
    if (s.error) throw s.error;
    return { e, s: s.data as Stats };
  }, [id]);

  if (loading && !data) return <Loading />;
  if (error || !data?.s) return <><TopBar back title="Statistik" /><View style={{ padding: 16 }}><Empty title="Nicht verfügbar" text={errorText(error) || 'Nur Veranstalter sehen die Statistik.'} /></View></>;
  const { e, s } = data;
  const max = Math.max(1, ...s.days.map((d) => d.n));
  const totalModes = Math.max(1, MODE_KEYS.reduce((a, k) => a + (s.modes[k] ?? 0), 0));
  const tiles: [string, number, string][] = [
    ['Beigetreten', s.joined, e?.color ?? C.green], ['Eingecheckt', s.checked_in, C.green], ['Matches', s.matches, C.date],
    ['Reaktionen', s.reactions, C.friends], ['Kommentare', s.comments, C.business],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back title="Statistik" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }}>
        <H size={34}>{e?.title}</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {tiles.map(([label, n, color]) => (
            <View key={label} style={{ width: '47%', borderWidth: 2.5, borderColor: C.ink, borderRadius: 22, backgroundColor: color, padding: 14, gap: 2 }}>
              <Text style={T.display(40)}>{fmtN(n)}</Text><Mono size={11}>{label}</Mono>
            </View>
          ))}
        </View>
        <View style={{ borderWidth: 2.5, borderColor: C.ink, borderRadius: 22, backgroundColor: C.white, padding: 16, gap: 12 }}>
          <Mono>Neue Teilnehmende · 7 Tage</Mono>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 8 }}>
            {s.days.map((d) => (
              <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={T.body(12)}>{d.n || ''}</Text>
                <View style={{ width: '100%', height: Math.max(4, (d.n / max) * 100), backgroundColor: e?.color ?? C.green, borderWidth: 2, borderColor: C.ink, borderRadius: 4 }} />
                <Text style={T.mono(10)}>{WD[parseDay(d.day).getDay()]}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ borderWidth: 2.5, borderColor: C.ink, borderRadius: 22, backgroundColor: C.white, padding: 16, gap: 12 }}>
          <Mono>Wofür die Leute da sind</Mono>
          {MODE_KEYS.map((k) => {
            const n = s.modes[k] ?? 0;
            return (
              <View key={k} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={T.semi(15)}>{MODES[k].label}</Text><Text style={T.body(15)}>{fmtN(n)}</Text></View>
                <View style={{ height: 14, borderWidth: 2, borderColor: C.ink, borderRadius: 999, overflow: 'hidden' }}>
                  <View style={{ width: `${(n / totalModes) * 100}%`, height: '100%', backgroundColor: MODES[k].color }} />
                </View>
              </View>
            );
          })}
        </View>
        <P muted style={{ fontSize: 13 }}>Du siehst nur Summen. Wer mit wem matcht oder chattet, bleibt privat.</P>
      </ScrollView>
    </View>
  );
}
