import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { EventImage, primaryAction } from '@/components/EventCard';
import { useJoinCelebration } from '@/components/JoinCelebration';
import { ReportSheet, useToast } from '@/components/ReportSheet';
import { Btn, Dash, Faces, H, IconBtn, LivePill, Loading, MenuRow, Mono, P, Rule, Sheet, T, Toggle, TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { MODES, cat } from '@/lib/constants';
import { ago, days, isLive, isPast, longDate, multi, range, until } from '@/lib/dates';
import { fetchEvent, fetchPeople, joinEvent, leaveEvent, useFocusLoad } from '@/lib/events';
import { FEATURES } from '@/lib/features';
import { errorText, supabase } from '@/lib/supabase';
import type { FeedPost } from '@/lib/types';
import { C } from '@/lib/theme';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const toast = useToast();
  const party = useJoinCelebration();
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, loading, reload, setData } = useFocusLoad(async () => {
    const [e, people, posts] = await Promise.all([
      fetchEvent(id), fetchPeople(id),
      FEATURES.feed ? supabase.rpc('get_feed', { p_event: id, p_limit: 1 }).then((r) => (r.data as FeedPost[]) ?? []) : Promise.resolve([] as FeedPost[]),
    ]);
    return { e, people, last: posts[0] ?? null };
  }, [id]);

  if (loading && !data) return <Loading />;
  const e = data?.e;
  if (!e) return <><TopBar back title="Event" /><View style={{ padding: 16 }}><P>Dieses Event gibt es nicht mehr.</P></View></>;
  const p = data!.people;
  const joined = !!p?.me_joined, here = !!p?.me_here;
  const organiser = e.creator_id === me.id || me.is_admin;
  const act = primaryAction(e, { joined, here });

  const join = async () => {
    setBusy(true);
    try { await joinEvent(e.id, me.id); party.celebrate(e); await reload(); }
    catch (x) { toast.show(errorText(x)); } finally { setBusy(false); }
  };
  const leave = async () => { setMenu(false); await leaveEvent(e.id, me.id); toast.show('Du bist nicht mehr dabei.'); reload(); };
  const checkout = async () => { await supabase.rpc('check_out', { p_event: e.id }); toast.show('Ausgecheckt.'); reload(); };
  const setOfficial = async (v: boolean) => {
    const { error } = await supabase.from('events').update({ official: v }).eq('id', e.id);
    if (error) toast.show(errorText(error)); else setData({ ...data!, e: { ...e, official: v } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back title={cat(e.category).label} right={<IconBtn name="more" label="Optionen" onPress={() => setMenu(true)} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ borderRadius: 30, overflow: 'hidden', backgroundColor: e.color }}>
          <EventImage e={e} height={260} />
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
              <Text style={T.display(multi(e) ? 32 : 40)}>{range(e)}</Text>
              <Text style={T.mono(11)}>{cat(e.category).label}{multi(e) ? ` · ${days(e)} Tage` : ''} · {until(e)}</Text>
            </View>
            <Rule style={{ marginVertical: 12 }} />
            <H size={36}>{e.title}</H>
            <Dash style={{ marginVertical: 12 }} />
            <Text style={T.display(20)}>{longDate(e)}</Text>
            <Text style={[T.mono(13), { textTransform: 'none', letterSpacing: 0, marginTop: 6 }]}>{e.venue}{e.city ? ` — ${e.city}` : ''}</Text>
            {e.description ? <P style={{ marginTop: 14 }}>{e.description}</P> : null}
            {e.partner_place && e.partner_deal ? (
              <View style={{ marginTop: 14, backgroundColor: C.white, borderWidth: 2, borderColor: C.ink, borderRadius: 12, padding: 12 }}>
                <Mono size={11}>MOSHCHAT-Deal · {e.partner_place}</Mono><P>{e.partner_deal}</P>
              </View>
            ) : null}

            {FEATURES.checkin && isLive(e) && (
              <View style={{ marginTop: 16, backgroundColor: C.white, borderWidth: 2.5, borderColor: C.ink, borderRadius: 20, padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><LivePill /><Mono>{p?.here ?? 0} gerade hier</Mono></View>
                {p && p.here_faces.length > 0 && <Faces people={p.here_faces} border={C.white} />}
                <P>{here ? (me.live_visible ? 'Du bist eingecheckt. Andere sehen dich als „gerade hier“.' : 'Du bist eingecheckt, aber für andere unsichtbar.') : 'Scanne am Einlass den QR-Code, dann siehst du, wer gerade hier ist.'}</P>
                {here && <Text onPress={checkout} style={[T.mono(12), { textDecorationLine: 'underline' }]}>Auschecken</Text>}
              </View>
            )}

            {FEATURES.feed && data?.last && joined && (
              <>
                <Dash style={{ marginVertical: 14 }} />
                <Mono size={11}>✓ Vom Veranstalter · {ago(data.last.created_at)}</Mono>
                <P>{data.last.body || 'Neuer Beitrag mit Fotos oder Video'}</P>
                <Text onPress={() => router.push({ pathname: '/feed', params: { event: e.id } })} style={[T.mono(12), { textDecorationLine: 'underline', marginTop: 6 }]}>Alle Beiträge im Feed</Text>
              </>
            )}

            <Dash style={{ marginVertical: 14 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {p && p.faces.length > 0 && <Faces people={p.faces.slice(0, 5)} border={e.color} />}
              <View style={{ flex: 1 }}>
                <Mono>{p?.joined ?? 0} Leute {isPast(e) ? 'waren dabei' : 'gehen hin'}</Mono>
                {p && <Mono style={{ marginTop: 3 }}>{me.modes.map((m) => `${p.modes[m]} ${MODES[m].label}`).join(' · ')}</Mono>}
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 18 }}>
              {joined ? <Btn solid title={act.title} onPress={act.onPress} style={{ flex: 0 }} /> : <Btn title={isPast(e) ? 'Ich war dabei' : 'Beitreten'} onPress={join} loading={busy} style={{ flex: 0, backgroundColor: C.white }} />}
              {e.ticket_url && !isPast(e) && <Btn title="Tickets" onPress={() => Linking.openURL(e.ticket_url!)} style={{ flex: 0 }} />}
            </View>

            {organiser && (
              <View style={{ marginTop: 22, gap: 12 }}>
                <View style={{ borderBottomWidth: 3, borderColor: C.ink, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <H size={22}>Für Veranstalter</H>{FEATURES.official && <Mono>{e.official ? '✓ Offiziell' : 'Nicht verifiziert'}</Mono>}
                </View>
                {(FEATURES.feed || FEATURES.stats) && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {FEATURES.feed && <Btn solid title="Beitrag schreiben" onPress={() => router.push({ pathname: '/event/compose', params: { id: e.id } })} />}
                    {FEATURES.stats && <Btn title="Statistik" onPress={() => router.push({ pathname: '/event/stats', params: { id: e.id } })} />}
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {FEATURES.checkin && <Btn title="Check-in-Code" onPress={() => router.push({ pathname: '/event/qr', params: { id: e.id } })} />}
                  <Btn title="Bearbeiten" onPress={() => router.push({ pathname: '/event/edit', params: { id: e.id } })} />
                </View>
                {FEATURES.official && !e.official && !me.is_admin && <P muted style={{ fontSize: 14 }}>Das Häkchen „Offiziell“ vergibt das MOSHCHAT-Team, nachdem es geprüft hat, dass du der echte Veranstalter bist. Schreib uns dafür über Einstellungen → Hilfe.</P>}
                {FEATURES.official && me.is_admin && <Toggle value={e.official} onChange={setOfficial} title="Offiziell (Admin)" sub="Nur nach Prüfung des Veranstalters" />}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Sheet visible={menu} onClose={() => setMenu(false)} title={e.title}>
        {joined && e.creator_id !== me.id && <MenuRow title="Nicht mehr dabei" onPress={leave} />}
        {e.creator_id !== me.id && <MenuRow title="Event melden" onPress={() => { setMenu(false); setReport(true); }} />}
        {organiser && <MenuRow title="Bearbeiten" onPress={() => { setMenu(false); router.push({ pathname: '/event/edit', params: { id: e.id } }); }} />}
        <Btn title="Schließen" onPress={() => setMenu(false)} style={{ flex: 0 }} />
      </Sheet>
      <ReportSheet target={{ event: e.id }} visible={report} onClose={() => setReport(false)} onDone={(m) => { setReport(false); toast.show(m); }} />
      {toast.node}
      {party.node}
    </View>
  );
}
