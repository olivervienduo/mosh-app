import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { cat } from '@/lib/constants';
import { FEATURES } from '@/lib/features';
import { days, isLive, isPast, longDate, multi, range, until } from '@/lib/dates';
import { publicUrl } from '@/lib/supabase';
import type { EventRow } from '@/lib/types';
import { C } from '@/lib/theme';
import { Btn, Dash, LivePill, Rule, T } from './ui';

export function Halftone({ height = 190, radius = 0 }: { height?: number | `${number}%`; radius?: number }) {
  return (
    <Svg width="100%" height={height} style={{ borderTopLeftRadius: radius, borderTopRightRadius: radius }}>
      <Defs>
        <Pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><Circle cx="4.5" cy="4.5" r="1.1" fill={C.ink} opacity={0.55} /></Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={C.white} />
      <Rect width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}

export function EventImage({ e, height = 190 }: { e: EventRow; height?: number }) {
  const url = publicUrl('events', e.image_path);
  return (
    <View style={{ height, backgroundColor: C.white, overflow: 'hidden' }}>
      {url ? <Image source={{ uri: url }} style={{ width: '100%', height }} contentFit="cover" />
        : <>
          <Halftone height={height} />
          <Text style={[T.display(56), { position: 'absolute', left: 18, bottom: 10, backgroundColor: C.white, paddingHorizontal: 8 }]}>{cat(e.category).short ?? cat(e.category).label}</Text>
        </>}
      {FEATURES.official && e.official && <View style={{ position: 'absolute', left: 14, top: 14, backgroundColor: C.white, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Text style={T.mono(11)}>✓ Offiziell</Text></View>}
      {FEATURES.checkin && isLive(e) && <View style={{ position: 'absolute', right: 14, top: 14 }}><LivePill /></View>}
    </View>
  );
}

export type Membership = { joined: boolean; here: boolean };

export function primaryAction(e: EventRow, m: Membership): { title: string; onPress: () => void } {
  if (!m.joined) return { title: isPast(e) ? 'Ich war dabei' : 'Beitreten', onPress: () => router.push({ pathname: '/event/[id]', params: { id: e.id } }) };
  if (FEATURES.checkin && isLive(e) && !m.here) return { title: 'Einchecken', onPress: () => router.push('/scan') };
  return { title: FEATURES.checkin && m.here ? 'Leute hier treffen' : 'Leute treffen', onPress: () => router.push({ pathname: '/swipe', params: { id: e.id } }) };
}

export function EventCard({ e, m, onJoin }: { e: EventRow; m: Membership; onJoin?: () => void }) {
  const c = cat(e.category);
  const act = primaryAction(e, m);
  const open = () => router.push({ pathname: '/event/[id]', params: { id: e.id } });
  return (
    <View style={{ borderRadius: 30, overflow: 'hidden', backgroundColor: e.color }}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Details zu ${e.title}`}><EventImage e={e} /></Pressable>
      <View style={{ padding: 20, gap: 0 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
          <Text style={T.display(multi(e) ? 32 : 40)}>{range(e)}</Text>
          <Text style={T.mono(11)}>{c.label}{multi(e) ? ` · ${days(e)} Tage` : ''} · {until(e)}{m.joined ? ' · ✓ Dabei' : ''}</Text>
        </View>
        <Rule style={{ marginVertical: 12 }} />
        <Text style={T.display(34)}>{e.title}</Text>
        <Dash style={{ marginVertical: 12 }} />
        <Text style={T.display(20)}>{longDate(e)}</Text>
        <Text style={[T.mono(13), { textTransform: 'none', letterSpacing: 0, marginTop: 6 }]}>{e.venue}{e.city ? ` — ${e.city}` : ''}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Btn solid title={act.title} onPress={!m.joined && onJoin ? onJoin : act.onPress} />
          {e.ticket_url && !isPast(e)
            ? <Btn title="Tickets" onPress={() => Linking.openURL(e.ticket_url!)} />
            : <Btn title="Details" onPress={open} />}
        </View>
      </View>
    </View>
  );
}
