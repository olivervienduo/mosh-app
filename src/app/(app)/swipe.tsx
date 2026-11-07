import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { PersonCard } from '@/components/PersonCard';
import { Avatar, Btn, Empty, H, LivePill, P, Segmented, T, TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { MODES, type Mode } from '@/lib/constants';
import { isLive } from '@/lib/dates';
import { fetchEvent } from '@/lib/events';
import { errorText, supabase } from '@/lib/supabase';
import type { DeckCard, EventRow } from '@/lib/types';
import { C } from '@/lib/theme';

export default function Swipe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const [mode, setMode] = useState<Mode>(me.modes[0]);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [here, setHere] = useState(false);
  const [liveOnly, setLiveOnly] = useState(true);
  const [deck, setDeck] = useState<DeckCard[] | null>(null);
  const [last, setLast] = useState<{ id: string; mode: Mode; matched: boolean } | null>(null);
  const [match, setMatch] = useState<{ id: string; p: DeckCard } | null>(null);
  const [err, setErr] = useState('');
  const pos = useRef(new Animated.ValueXY()).current;
  const busy = useRef(false);

  useEffect(() => {
    fetchEvent(id).then(setEvent);
    supabase.rpc('event_people', { p_event: id }).then(({ data }) => setHere(!!(data as { me_here?: boolean })?.me_here));
  }, [id]);

  const load = useCallback(async () => {
    setDeck(null);
    const { data, error } = await supabase.rpc('get_deck', { p_event: id, p_mode: mode, p_live_only: here && liveOnly });
    if (error) setErr(errorText(error));
    setDeck((data as DeckCard[]) ?? []);
  }, [id, mode, here, liveOnly]);
  useEffect(() => { load(); }, [load]);

  const decide = useCallback(async (liked: boolean) => {
    const top = deck?.[0];
    if (!top || busy.current) return;
    busy.current = true;
    Haptics.selectionAsync().catch(() => {});
    Animated.timing(pos, { toValue: { x: liked ? 520 : -520, y: 30 }, duration: 220, useNativeDriver: true }).start(async () => {
      setDeck((d) => (d ? d.slice(1) : d));
      pos.setValue({ x: 0, y: 0 });
      busy.current = false;
      const { data, error } = await supabase.rpc('swipe', { p_target: top.id, p_mode: mode, p_liked: liked, p_event: id });
      if (error) { setErr(errorText(error)); return; }
      setLast({ id: top.id, mode, matched: !!data });
      if (data) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setMatch({ id: data as string, p: top }); }
    });
  }, [deck, mode, id, pos]);

  const undo = async () => {
    if (!last || last.matched) return;
    await supabase.rpc('undo_swipe', { p_target: last.id, p_mode: last.mode });
    setLast(null); load();
  };

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8,
    onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_e, g) => {
      if (g.dx > 110) decide(true);
      else if (g.dx < -110) decide(false);
      else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    },
  }), [decide, pos]);

  const rotate = pos.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-16deg', '0deg', '16deg'] });
  const yes = pos.x.interpolate({ inputRange: [0, 110], outputRange: [0, 1], extrapolate: 'clamp' });
  const no = pos.x.interpolate({ inputRange: [-110, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const live = event ? isLive(event) : false;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back title={event?.title ?? ''} />
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        {me.modes.length > 1 && <Segmented options={me.modes.map((k) => ({ key: k, label: MODES[k].label }))} value={mode} onChange={setMode} colors={{ friends: C.friends, date: C.date, business: C.business }} />}
        {me.paused && <Text style={[T.mono(11), { textAlign: 'center' }]}>Dein Profil ist pausiert. Niemand sieht dich gerade.</Text>}
        {live && !here && (
          <Pressable onPress={() => router.push('/scan')} style={{ backgroundColor: C.green, borderWidth: 2, borderColor: C.ink, borderRadius: 16, padding: 10 }}>
            <Text style={[T.mono(11), { textAlign: 'center' }]}>LIVE · Checke am Einlass ein, um zu sehen, wer gerade hier ist</Text>
          </Pressable>
        )}
        {here && (
          <Pressable onPress={() => setLiveOnly(!liveOnly)} accessibilityRole="switch" accessibilityState={{ checked: liveOnly }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, backgroundColor: C.white, padding: 10 }}>
            <LivePill /><Text style={[T.semi(15), { flex: 1 }]}>Nur wer gerade hier ist</Text>
            <View style={{ width: 46, height: 28, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, backgroundColor: liveOnly ? C.ink : C.white }}>
              <View style={{ position: 'absolute', top: 3, left: liveOnly ? 21 : 3, width: 17, height: 17, borderRadius: 9, backgroundColor: liveOnly ? C.white : C.ink }} />
            </View>
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {deck === null ? null : deck.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Empty title="Alle gesehen" text={err || `Bei diesem Event gibt es gerade niemanden mehr im Modus ${MODES[mode].label}. Schau später nochmal vorbei.`} />
            </View>
          ) : (
            <>
              {deck[1] && <View style={{ position: 'absolute', top: 14, left: 0, right: 0, bottom: 0, transform: [{ scale: 0.95 }] }}><PersonCard p={deck[1]} mode={mode} /></View>}
              <Animated.View {...pan.panHandlers} style={{ flex: 1, transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }}>
                <PersonCard p={deck[0]} mode={mode} yes={yes} no={no} />
              </Animated.View>
            </>
          )}
        </View>
        <SafeAreaView edges={['bottom']} style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={undo} disabled={!last || last.matched} accessibilityLabel="Letzten Swipe zurücknehmen"
            style={{ width: 54, borderWidth: 2.5, borderColor: C.ink, borderRadius: 4, alignItems: 'center', justifyContent: 'center', opacity: !last || last.matched ? 0.3 : 1 }}>
            <Icon name="undo" />
          </Pressable>
          <Btn title="Weiter" onPress={() => decide(false)} disabled={!deck?.length} />
          <Btn solid title={MODES[mode].yes} onPress={() => decide(true)} disabled={!deck?.length} style={{ flex: 1.4 }} />
        </SafeAreaView>
      </View>

      <Modal visible={!!match} animationType="fade" onRequestClose={() => setMatch(null)}>
        {match && (
          <SafeAreaView style={{ flex: 1, backgroundColor: MODES[mode].color, padding: 20, justifyContent: 'center', gap: 16 }}>
            <Text style={T.mono(12)}>{MODES[mode].label} · {event?.title}</Text>
            <H size={96}>Match!</H>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ borderWidth: 3, borderColor: C.ink, borderRadius: 60 }}><Avatar path={me.photo_path} name={me.name} color={me.color} size={96} /></View>
              <View style={{ borderWidth: 3, borderColor: C.ink, borderRadius: 60, marginLeft: -18 }}><Avatar path={match.p.photo_path} name={match.p.name} color={match.p.color} size={96} /></View>
            </View>
            <P style={{ fontSize: 18 }}>Du und {match.p.name} wollt euch {MODES[mode].verb}.{here && match.p.here ? ' Ihr seid beide gerade hier.' : ''}</P>
            {here && match.p.here
              ? <Btn solid title="Jetzt treffen" onPress={() => { const m = match.id; setMatch(null); router.push({ pathname: '/chat/[id]', params: { id: m, meet: 'now' } }); }} style={{ flex: 0 }} />
              : null}
            <Btn solid={!(here && match.p.here)} title="Nachricht schreiben" onPress={() => { const m = match.id; setMatch(null); router.push({ pathname: '/chat/[id]', params: { id: m } }); }} style={{ flex: 0 }} />
            <Btn title="Weiter swipen" onPress={() => setMatch(null)} style={{ flex: 0 }} />
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

