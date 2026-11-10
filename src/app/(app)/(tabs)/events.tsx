import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { EventCard } from '@/components/EventCard';
import { Icon } from '@/components/Icon';
import { Btn, Empty, Faces, FadeEdge, LivePill, Mono, SectionHead, T, TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { isLive, isPast, monthKey, time } from '@/lib/dates';
import { FEATURES } from '@/lib/features';
import { fetchEvents, fetchMemberships, fetchPeople, joinEvent, useFocusLoad, type MemberMap } from '@/lib/events';
import type { EventRow, People } from '@/lib/types';
import { C, F } from '@/lib/theme';

function LiveBanner({ e, people, here }: { e: EventRow; people: People | null; here: boolean }) {
  return (
    <View style={{ backgroundColor: C.ink, borderRadius: 26, padding: 18, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <LivePill dark />
        <Mono style={{ color: C.sand }}>{here ? 'Du bist eingecheckt' : `Heute${e.start_time ? ' ab ' + time(e.start_time) : ''}`}</Mono>
      </View>
      <Text style={[T.display(30), { color: C.white }]}>{e.title}</Text>
      {people && people.here > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Faces people={people.here_faces.slice(0, 5)} size={30} border={C.ink} />
          <Text style={[T.semi(15), { color: C.white }]}>{people.here} {people.here === 1 ? 'Person ist' : 'Leute sind'} gerade hier</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
        {here
          ? <Btn title="Leute hier treffen" color={e.color} onPress={() => router.push({ pathname: '/swipe', params: { id: e.id } })} />
          : <Btn title="Einchecken" color={e.color} onPress={() => router.push('/scan')} />}
        <Pressable onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })} style={{ flex: 1, borderWidth: 2.5, borderColor: C.white, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[T.semi(16), { color: C.white }]}>Zum Event</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Events() {
  const me = useMe();
  const [q, setQ] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  const anchorY = useRef<number | null>(null);
  const didScroll = useRef(false);

  const { data, loading, reload, error } = useFocusLoad(async () => {
    const [events, mem] = await Promise.all([fetchEvents(q), fetchMemberships(me.id)]);
    const live = FEATURES.checkin ? events.filter((e) => mem[e.id] && isLive(e)) : [];
    const people: Record<string, People | null> = {};
    await Promise.all(live.map(async (e) => { people[e.id] = await fetchPeople(e.id); }));
    return { events, mem, live, people };
  }, [q, me.id]);

  const groups = useMemo(() => {
    const out: { key: string; items: EventRow[]; past: boolean }[] = [];
    const evs = data?.events ?? [];
    const past = evs.filter(isPast), upcoming = evs.filter((e) => !isPast(e));
    if (q.trim()) {
      if (upcoming.length) out.push({ key: 'Demnächst', items: upcoming, past: false });
      if (past.length) out.push({ key: 'Vergangen', items: [...past].reverse(), past: true });
      return out;
    }
    for (const e of evs) {
      const k = monthKey(e), p = isPast(e) && monthKey(e) !== monthKey({ starts_on: new Date().toISOString().slice(0, 10) });
      const g = out.find((x) => x.key === k);
      if (g) g.items.push(e); else out.push({ key: k, items: [e], past: p });
    }
    return out;
  }, [data, q]);

  const mem: MemberMap = data?.mem ?? {};
  const firstCurrent = groups.findIndex((g) => !g.past);

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar brand title="Events" right={<Btn small solid title="+ Event" onPress={() => router.push('/event/edit')} />} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, backgroundColor: C.white, paddingHorizontal: 14 }}>
          <Icon name="search" size={20} />
          <TextInput value={q} onChangeText={setQ} placeholder="Events, Orte oder Städte suchen" placeholderTextColor="#8a8378" returnKeyType="search"
            onSubmitEditing={reload} onEndEditing={reload} style={{ flex: 1, fontFamily: F.bodyMedium, fontSize: 16, paddingVertical: 11, paddingHorizontal: 10, color: C.ink }} />
          {q ? <Pressable onPress={() => { setQ(''); setTimeout(reload, 0); }} accessibilityLabel="Suche leeren"><Icon name="close" size={18} /></Pressable> : null}
        </View>
      </View>
      <View style={{ flex: 1 }}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingTop: 34, gap: 18, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}
        onContentSizeChange={() => {
          if (!didScroll.current && anchorY.current != null && !q) { didScroll.current = true; scroll.current?.scrollTo({ y: anchorY.current, animated: false }); }
        }}>
        {error ? <Text style={[T.semi(15), { color: C.danger }]}>{error}</Text> : null}
        {!loading && groups.length === 0 && (
          <Empty title={q ? 'Nichts gefunden' : 'Noch keine Events'} text={q ? 'Versuch einen anderen Namen, Ort oder eine Stadt. Oder leg das Event selbst an.' : 'Leg das erste Event an und lade Leute ein.'}
            action={<Btn solid title="+ Event erstellen" onPress={() => router.push('/event/edit')} style={{ flex: 0 }} />} />
        )}
        {groups.map((g, gi) => (
          <View key={g.key} style={{ gap: 18 }} onLayout={(ev) => { if (gi === firstCurrent && gi > 0) anchorY.current = ev.nativeEvent.layout.y - 8; }}>
            {gi === firstCurrent && gi > 0 && !q && <Mono style={{ textAlign: 'center', color: C.muted }}>↑ Vergangene Events</Mono>}
            {gi === firstCurrent && !q && (data?.live ?? []).map((e) => <LiveBanner key={e.id} e={e} people={data?.people[e.id] ?? null} here={!!mem[e.id]?.here} />)}
            <SectionHead title={g.key} right={<Mono style={{ color: C.muted }}>{g.items.length} {g.items.length === 1 ? 'Event' : 'Events'}</Mono>} />
            {g.items.map((e) => <EventCard key={e.id} e={e} m={{ joined: !!mem[e.id], here: !!mem[e.id]?.here }} onJoin={() => joinEvent(e.id, me.id).then(reload).catch(() => {})} />)}
          </View>
        ))}
      </ScrollView>
        <FadeEdge />
      </View>
    </View>
  );
}
