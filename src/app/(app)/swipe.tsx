import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Modal, PanResponder, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { PersonCard } from '@/components/PersonCard';
import { Avatar, Btn, Empty, H, LivePill, P, Segmented, T, TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { MODES, type Mode } from '@/lib/constants';
import { isLive } from '@/lib/dates';
import { fetchEvent } from '@/lib/events';
import { FEATURES } from '@/lib/features';
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
  // also = you already had a chat with this person; this swipe adds another shared mode.
  const [match, setMatch] = useState<{ id: string; p: DeckCard; also: boolean } | null>(null);
  const [err, setErr] = useState('');
  // Every card gets its own position. A card that was swiped away stays off screen,
  // so the old card never flashes back before the next one is shown.
  const [positions] = useState(() => new Map<string, Animated.ValueXY>());
  const posFor = useCallback((cardId: string) => {
    let v = positions.get(cardId);
    if (!v) { v = new Animated.ValueXY(); positions.set(cardId, v); }
    return v;
  }, [positions]);
  const topId = deck?.[0]?.id ?? '';
  const pos = posFor(topId);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const busy = useRef(false);

  // Back (arrow and Android back gesture) leaves the swipe area straight to the event list.
  const leave = useCallback(() => { router.dismissTo('/events'); }, []);
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { leave(); return true; });
    return () => sub.remove();
  }, [leave]));

  useEffect(() => {
    fetchEvent(id).then(setEvent);
    if (FEATURES.checkin) supabase.rpc('event_people', { p_event: id }).then(({ data }) => setHere(!!(data as { me_here?: boolean })?.me_here));
  }, [id]);

  const load = useCallback(async () => {
    setDeck(null);
    positions.clear();
    const { data, error } = await supabase.rpc('get_deck', { p_event: id, p_mode: mode, p_live_only: here && liveOnly });
    if (error) setErr(errorText(error));
    setDeck((data as DeckCard[]) ?? []);
  }, [id, mode, here, liveOnly, positions]);
  useEffect(() => { load(); }, [load]);

  const decide = useCallback(async (liked: boolean) => {
    const top = deck?.[0];
    if (!top || busy.current) return;
    busy.current = true;
    Haptics.selectionAsync().catch(() => {});
    const p = posFor(top.id);
    Animated.timing(p, { toValue: { x: liked ? 560 : -560, y: 30 }, duration: 220, useNativeDriver: false }).start(async () => {
      setDeck((d) => (d && d[0]?.id === top.id ? d.slice(1) : d));
      positions.delete(top.id);
      busy.current = false;
      const { data, error } = await supabase.rpc('swipe', { p_target: top.id, p_mode: mode, p_liked: liked, p_event: id });
      if (error) { setErr(errorText(error)); return; }
      setLast({ id: top.id, mode, matched: !!data });
      if (data) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const { data: m } = await supabase.from('matches').select('modes').eq('id', data as string).maybeSingle();
        setMatch({ id: data as string, p: top, also: ((m?.modes as string[] | undefined)?.length ?? 1) > 1 });
      }
    });
  }, [deck, mode, id, posFor, positions]);

  const undo = async () => {
    if (!last || last.matched) return;
    await supabase.rpc('undo_swipe', { p_target: last.id, p_mode: last.mode });
    setLast(null); load();
  };

  // Latest decide() for the gesture handlers (created once).
  const decideRef = useRef(decide);
  useEffect(() => { decideRef.current = decide; }, [decide]);
  // eslint-disable-next-line react-hooks/refs -- refs are read inside gesture callbacks, not during render
  const [pan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8,
    onPanResponderMove: (_e, g) => posRef.current.setValue({ x: g.dx, y: g.dy }),
    onPanResponderRelease: (_e, g) => {
      if (g.dx > 110) decideRef.current(true);
      else if (g.dx < -110) decideRef.current(false);
      else Animated.spring(posRef.current, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
  }));

  const rotate = pos.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-16deg', '0deg', '16deg'] });
  const yes = pos.x.interpolate({ inputRange: [0, 110], outputRange: [0, 1], extrapolate: 'clamp' });
  const no = pos.x.interpolate({ inputRange: [-110, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  // The next card grows into place while the top card moves away.
  const nextScale = pos.x.interpolate({ inputRange: [-220, 0, 220], outputRange: [1, 0.95, 1], extrapolate: 'clamp' });
  const nextTop = pos.x.interpolate({ inputRange: [-220, 0, 220], outputRange: [0, 14, 0], extrapolate: 'clamp' });
  const live = FEATURES.checkin && event ? isLive(event) : false;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back onBack={leave} title={event?.title ?? ''} />
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
              {deck[1] && <Animated.View key={`next-${deck[1].id}`} style={{ position: 'absolute', top: nextTop, left: 0, right: 0, bottom: 0, transform: [{ scale: nextScale }] }}><PersonCard p={deck[1]} mode={mode} /></Animated.View>}
              <Animated.View key={`top-${deck[0].id}`} {...pan.panHandlers} style={{ flex: 1, transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }}>
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
            <P style={{ fontSize: 18 }}>{match.also
              ? `Du und ${match.p.name} wollt euch jetzt auch ${MODES[mode].verb}. Es bleibt bei eurem einen Chat.`
              : `Du und ${match.p.name} wollt euch ${MODES[mode].verb}.`}{here && match.p.here ? ' Ihr seid beide gerade hier.' : ''}</P>
            {here && match.p.here
              ? <Btn solid title="Jetzt treffen" onPress={() => { const m = match.id; setMatch(null); router.push({ pathname: '/chat/[id]', params: { id: m, meet: 'now' } }); }} style={{ flex: 0 }} />
              : null}
            <Btn solid={!(here && match.p.here)} title={match.also ? 'Zum Chat' : 'Nachricht schreiben'} onPress={() => { const m = match.id; setMatch(null); router.push({ pathname: '/chat/[id]', params: { id: m } }); }} style={{ flex: 0 }} />
            <Btn title="Weiter swipen" onPress={() => setMatch(null)} style={{ flex: 0 }} />
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

