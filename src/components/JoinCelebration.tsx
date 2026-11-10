import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Modal, Platform, Text, View, useWindowDimensions } from 'react-native';
import { Btn, H, T } from '@/components/ui';
import { AVATAR_COLORS } from '@/lib/constants';
import { isPast } from '@/lib/dates';
import type { EventRow } from '@/lib/types';
import { C } from '@/lib/theme';

const PIECES = 70;
const COLORS = [...AVATAR_COLORS, C.ink];

type Piece = { x: number; drift: number; size: number; long: boolean; color: string; delay: number; duration: number; spin: number; round: boolean };

function makePieces(width: number): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => ({
    x: Math.random() * width,
    drift: (Math.random() - 0.5) * 160,
    size: 7 + Math.random() * 7,
    long: Math.random() > 0.45,
    round: Math.random() > 0.8,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 450,
    duration: 1900 + Math.random() * 1500,
    spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
  }));
}

/** Confetti raining over the whole screen once. Uses the native driver, so it stays smooth. */
function Confetti({ pieces }: { pieces: Piece[] }) {
  const { height } = useWindowDimensions();
  const progress = useMemo(() => pieces.map(() => new Animated.Value(0)), [pieces]);

  useEffect(() => {
    progress.forEach((v) => v.setValue(0));
    Animated.parallel(progress.map((v, i) => Animated.timing(v, {
      toValue: 1, duration: pieces[i].duration, delay: pieces[i].delay, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web',
    }))).start();
  }, [progress, pieces]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {pieces.map((p, i) => {
        const v = progress[i];
        return (
          <Animated.View key={i} style={{
            position: 'absolute', left: p.x, top: -30,
            width: p.round ? p.size : p.long ? p.size * 0.55 : p.size, height: p.round ? p.size : p.long ? p.size * 1.6 : p.size,
            borderRadius: p.round ? p.size : 2, backgroundColor: p.color, borderWidth: p.color === C.ink ? 0 : 1.5, borderColor: C.ink,
            opacity: v.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
              { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.drift, p.drift * 0.4] }) },
              { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }} />
        );
      })}
    </View>
  );
}

/**
 * Celebrates joining an event: confetti plus a short message with a way to meet people right away.
 * Usage: const party = useJoinCelebration(); … party.celebrate(event); … {party.node}
 */
export function useJoinCelebration() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const { width } = useWindowDimensions();

  const celebrate = useCallback((e: EventRow) => {
    setEvent(e);
    setPieces(makePieces(width));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [width]);

  const close = () => setEvent(null);
  const past = event ? isPast(event) : false;

  const node = (
    <Modal visible={!!event} transparent animationType="fade" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,19,18,0.55)', justifyContent: 'center', padding: 22 }}>
        {event && (
          <View style={{ backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink, borderRadius: 28, overflow: 'hidden' }}>
            <View style={{ backgroundColor: event.color, borderBottomWidth: 3, borderColor: C.ink, paddingVertical: 22, alignItems: 'center' }}>
              <Text style={{ fontSize: 54 }}>{past ? '🙌' : '🎉'}</Text>
            </View>
            <View style={{ padding: 22, gap: 14 }}>
              <H size={36}>{past ? 'Gespeichert!' : 'Du bist dabei!'}</H>
              <Text style={[T.body(17), { lineHeight: 25 }]}>
                {past
                  ? <>Du warst beim Event <Text style={T.semi(17)}>„{event.title}“</Text> dabei und kannst jetzt Leute treffen, die auch dort waren. Viel Spaß!</>
                  : <>Du bist erfolgreich dem Event <Text style={T.semi(17)}>„{event.title}“</Text> beigetreten und kannst jetzt Leute treffen, die auf dasselbe Event gehen. Viel Spaß!</>}
              </Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                <Btn solid title="Leute treffen" onPress={() => { const id = event.id; close(); router.push({ pathname: '/swipe', params: { id } }); }} style={{ flex: 0, minHeight: 54 }} />
                <Btn title="Später" onPress={close} style={{ flex: 0, minHeight: 54 }} />
              </View>
            </View>
          </View>
        )}
        {event && <Confetti key={pieces.length ? String(pieces[0].x) : 'none'} pieces={pieces} />}
      </View>
    </Modal>
  );

  return { celebrate, node };
}
