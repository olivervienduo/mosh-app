import { Image } from 'expo-image';
import { Animated, Text, View } from 'react-native';
import { FEATURES } from '@/lib/features';
import { MODES, type Mode } from '@/lib/constants';
import { publicUrl } from '@/lib/supabase';
import type { DeckCard } from '@/lib/types';
import { C } from '@/lib/theme';
import { Halftone } from './EventCard';
import { T } from './ui';

type Op = number | Animated.AnimatedInterpolation<number>;
export function PersonCard({ p, mode, yes = 0, no = 0 }: { p: DeckCard; mode: Mode; yes?: Op; no?: Op }) {
  const url = publicUrl('avatars', p.photo_path);
  return (
    <View style={{ flex: 1, borderRadius: 30, overflow: 'hidden', backgroundColor: MODES[mode].color }}>
      <View style={{ flex: 1, backgroundColor: p.color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {url ? <Image source={{ uri: url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
          : <><View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.35, overflow: 'hidden' }}><Halftone height="100%" /></View><Text style={T.display(120)}>{(p.name[0] ?? '?').toUpperCase()}</Text></>}
        {FEATURES.checkin && p.here && (
          <View style={{ position: 'absolute', left: 16, top: 16, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.white, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.green }} /><Text style={T.mono(11)}>Gerade hier</Text>
          </View>
        )}
        <Animated.Text style={[T.display(26), stamp, { left: 20, transform: [{ rotate: '-10deg' }], opacity: yes }]}>{MODES[mode].yes}</Animated.Text>
        <Animated.Text style={[T.display(26), stamp, { right: 20, transform: [{ rotate: '10deg' }], opacity: no }]}>Weiter</Animated.Text>
      </View>
      {/* Text area: always a solid colour, never the dot pattern, so the text stays readable. */}
      <View style={{ padding: 18, paddingBottom: 20, borderTopWidth: 3, borderColor: C.ink, gap: 6, backgroundColor: MODES[mode].color, zIndex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <Text style={T.display(32)}>{p.name}, {p.age}</Text>
          {p.pronouns ? <Text style={[T.body(13), { borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 9, backgroundColor: C.white }]}>{p.pronouns}</Text> : null}
        </View>
        {(p.job || p.city) ? <Text style={[T.mono(12), { textTransform: 'none', letterSpacing: 0 }]}>{[p.job, p.city].filter(Boolean).join(' · ')}</Text> : null}
        {p.line ? <Text style={T.semi(18)}>„{p.line}“</Text> : null}
        {p.bio ? <Text style={T.body(15)} numberOfLines={p.line ? 2 : 3}>{p.bio}</Text> : null}
      </View>
    </View>
  );
}
const stamp = { position: 'absolute' as const, top: 62, backgroundColor: C.white, borderWidth: 3, borderColor: C.ink, paddingHorizontal: 12, paddingVertical: 4 };
