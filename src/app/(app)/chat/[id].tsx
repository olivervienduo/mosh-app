import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ModeChip, ModeChips, alsoMatchText } from '@/components/ModeSettings';
import { ReportSheet, useToast } from '@/components/ReportSheet';
import { SafetyCard, SafetySheet } from '@/components/Safety';
import { Avatar, Btn, IconBtn, Loading, MenuRow, Mono, P, Pill, Row, Sheet, T } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { MODES, meetWhen, meetWhere, sortModes, type Mode } from '@/lib/constants';
import { eventDays, isLive, multi, time } from '@/lib/dates';
import { errorText, supabase } from '@/lib/supabase';
import type { EventRow, Meet, Message } from '@/lib/types';
import { C, F } from '@/lib/theme';

type Other = { id: string; name: string; age: number; job: string; city: string; bio: string; pronouns: string; photo_path: string | null; color: string; lines: Partial<Record<Mode, string>> };
type Info = { modes: Mode[]; other: Other | null; event: EventRow | null };

const hhmm = (ts: string) => new Date(ts).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });

export default function Chat() {
  const { id, meet: meetParam } = useLocalSearchParams<{ id: string; meet?: string }>();
  const me = useMe();
  const toast = useToast();
  const [info, setInfo] = useState<Info | null>(null);
  const [gone, setGone] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [safety, setSafety] = useState(false);
  const [report, setReport] = useState(false);
  const [profile, setProfile] = useState(false);
  const [meetOpen, setMeetOpen] = useState(meetParam === 'now');
  const list = useRef<FlatList<Message>>(null);

  // Load match, other person, event, messages
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: m } = await supabase.from('matches').select('*').eq('id', id).maybeSingle();
      if (!m) { if (alive) setGone(true); return; }
      const otherId = m.user_a === me.id ? m.user_b : m.user_a;
      const [o, e, ms] = await Promise.all([
        supabase.from('public_profiles').select('*').eq('id', otherId).maybeSingle(),
        m.event_id ? supabase.from('events').select('*').eq('id', m.event_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('messages').select('*').eq('match_id', id).order('created_at', { ascending: true }).limit(500),
      ]);
      if (!alive) return;
      setInfo({ modes: sortModes((m.modes?.length ? m.modes : [m.mode]) as Mode[]), other: (o.data as Other) ?? null, event: (e.data as EventRow) ?? null });
      setMsgs((ms.data as Message[]) ?? []);
    })();
    return () => { alive = false; };
  }, [id, me.id]);

  // Realtime: new messages and updates (read receipts, accepted meet-ups)
  useEffect(() => {
    const ch = supabase.channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` }, (p) => {
        const m = p.new as Message;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
        // A new shared mode: show it in the header right away.
        if (m.kind === 'system') setInfo((i) => (i && !i.modes.includes(m.body as Mode) ? { ...i, modes: sortModes([...i.modes, m.body as Mode]) } : i));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` }, (p) => {
        const m = p.new as Message;
        setMsgs((cur) => cur.map((x) => (x.id === m.id ? m : x)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => setGone(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Mark incoming messages as read
  useEffect(() => {
    const unread = msgs.filter((m) => m.sender_id !== me.id && !m.read_at && m.kind !== 'system').map((m) => m.id);
    if (unread.length) supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unread).then(() => {});
  }, [msgs, me.id]);

  const scrollEnd = useCallback(() => setTimeout(() => list.current?.scrollToEnd({ animated: true }), 60), []);
  useEffect(() => { scrollEnd(); }, [msgs.length, scrollEnd]);

  const send = async (payload: { kind?: 'text' | 'meet'; body?: string; meet?: Meet }) => {
    setSending(true);
    const { data, error } = await supabase.from('messages')
      .insert({ match_id: id, sender_id: me.id, kind: payload.kind ?? 'text', body: payload.body ?? '', meet: payload.meet ?? null })
      .select().single();
    setSending(false);
    if (error) { toast.show(errorText(error)); return false; }
    setMsgs((cur) => (cur.some((x) => x.id === (data as Message).id) ? cur : [...cur, data as Message]));
    return true;
  };
  const sendText = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText('');
    if (!(await send({ body }))) setText(body);
  };
  const accept = async (m: Message) => {
    setMsgs((cur) => cur.map((x) => (x.id === m.id ? { ...x, meet_accepted: true } : x)));
    await supabase.from('messages').update({ meet_accepted: true }).eq('id', m.id);
    await send({ body: 'Passt, bis gleich! 👋' });
  };
  const unmatch = async () => {
    setMenu(false);
    await supabase.rpc('unmatch', { p_match: id });
    router.back();
  };
  const block = async () => {
    setMenu(false);
    if (info?.other) await supabase.rpc('block_user', { p_user: info.other.id });
    router.back();
  };

  if (gone) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper, padding: 20, gap: 16, justifyContent: 'center' }}>
      <P>Dieser Chat ist nicht mehr verfügbar.</P><Btn title="Zurück" onPress={() => router.back()} style={{ flex: 0 }} />
    </SafeAreaView>
  );
  if (!info) return <Loading />;
  const o = info.other;
  const mode = MODES[info.modes[0]];
  const verbs = info.modes.map((k) => MODES[k].verb);
  const ev = info.event;
  const lastMine = [...msgs].reverse().find((m) => m.sender_id === me.id && m.kind !== 'system');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 3, borderColor: C.ink }}>
        <IconBtn name="back" label="Zurück" onPress={() => router.back()} />
        <Pressable onPress={() => setProfile(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel="Profil ansehen">
          <Avatar path={o?.photo_path} name={o?.name ?? '?'} color={o?.color ?? C.sand} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={T.display(20)} numberOfLines={1}>{o?.name ?? 'Gelöschtes Profil'}</Text>
            <Row gap={6} style={{ alignItems: 'center' }}><ModeChips modes={info.modes} />{ev ? <Text numberOfLines={1} style={[T.mono(10), { flexShrink: 1 }]}>{ev.title}</Text> : null}</Row>
          </View>
        </Pressable>
        <IconBtn name="more" label="Optionen" onPress={() => setMenu(true)} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <FlatList
          ref={list}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          onContentSizeChange={scrollEnd}
          ListHeaderComponent={
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
              <Avatar path={o?.photo_path} name={o?.name ?? '?'} color={o?.color ?? C.sand} size={84} />
              <Mono>Match · {info.modes.map((k) => MODES[k].label).join(' · ')}</Mono>
              {msgs.length === 0 && <P muted style={{ textAlign: 'center' }}>Ihr wollt euch {verbs.length > 1 ? `${verbs.slice(0, -1).join(', ')} und ${verbs[verbs.length - 1]}` : verbs[0]}. Sag Hallo{ev ? ` oder schlag einen Treffpunkt bei ${ev.title} vor` : ''}.</P>}
              <SafetyCard date={info.modes.includes('date')} onOpen={() => setSafety(true)} />
            </View>
          }
          renderItem={({ item: m }) => {
            const mine = m.sender_id === me.id;
            if (m.kind === 'system') {
              const k = m.body as Mode;
              return (
                <View style={{ alignSelf: 'center', alignItems: 'center', gap: 6, marginVertical: 10, maxWidth: '86%' }}>
                  {MODES[k] ? <ModeChip mode={k} /> : null}
                  <Text style={[T.semi(15), { textAlign: 'center' }]}>{MODES[k] ? alsoMatchText(k) : ''}</Text>
                  <Text style={[T.body(11), { color: C.muted }]}>{hhmm(m.created_at)}</Text>
                </View>
              );
            }
            if (m.kind === 'meet' && m.meet) {
              return (
                <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', width: '82%', borderWidth: 2.5, borderColor: C.ink, borderRadius: 22, backgroundColor: ev?.color ?? mode.color, padding: 14, gap: 6 }}>
                  <Mono size={10}>{mine ? 'Du schlägst vor' : `${o?.name ?? ''} schlägt vor`}</Mono>
                  <Text style={T.display(26)}>{m.meet.when}</Text>
                  <Text style={T.semi(17)}>{[m.meet.day, m.meet.where].filter(Boolean).join(' · ')}</Text>
                  {m.meet.deal ? <Text style={[T.body(14)]}>🎁 {m.meet.deal}</Text> : null}
                  {m.meet_accepted ? <Text style={[T.mono(11), { marginTop: 4 }]}>✓ Zugesagt</Text>
                    : !mine ? <Btn small solid title="Passt mir" onPress={() => accept(m)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                    : <Text style={[T.mono(10), { color: C.ink, opacity: 0.7 }]}>Wartet auf Antwort</Text>}
                </View>
              );
            }
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', gap: 2 }}>
                <Text selectable style={[T.body(16), {
                  backgroundColor: mine ? C.ink : C.white, color: mine ? C.white : C.ink, borderWidth: 2, borderColor: C.ink,
                  borderRadius: 20, borderBottomRightRadius: mine ? 4 : 20, borderBottomLeftRadius: mine ? 20 : 4,
                  paddingHorizontal: 14, paddingVertical: 9, overflow: 'hidden',
                }]}>{m.body}</Text>
                <Text style={[T.body(11), { color: C.muted, textAlign: mine ? 'right' : 'left' }]}>
                  {hhmm(m.created_at)}{mine && m.id === lastMine?.id && m.read_at && me.read_receipts ? ' · Gelesen' : ''}
                </Text>
              </View>
            );
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 3, borderColor: C.ink }}>
          {ev && (
            <Pressable onPress={() => setMeetOpen(true)} accessibilityLabel="Treffpunkt vorschlagen"
              style={{ width: 48, height: 48, borderWidth: 2.5, borderColor: C.ink, borderRadius: 4, backgroundColor: ev.color, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="pin" />
            </Pressable>
          )}
          <TextInput
            value={text} onChangeText={setText} placeholder="Nachricht" placeholderTextColor={C.muted} multiline maxLength={1000}
            style={{ flex: 1, minHeight: 48, maxHeight: 120, fontFamily: F.bodyMedium, fontSize: 16, color: C.ink, borderWidth: 2.5, borderColor: C.ink, borderRadius: 24, backgroundColor: C.white, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}
          />
          <Pressable onPress={sendText} disabled={!text.trim() || sending} accessibilityLabel="Senden"
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.35 }}>
            <Icon name="send" color={C.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {ev && <MeetSheet visible={meetOpen} onClose={() => setMeetOpen(false)} event={ev} preferNow={meetParam === 'now'}
        onSend={async (m) => { if (await send({ kind: 'meet', meet: m })) setMeetOpen(false); }} />}

      <SafetySheet visible={safety} onClose={() => setSafety(false)} />
      <Sheet visible={menu} onClose={() => setMenu(false)}>
        {o && <MenuRow title={`Profil von ${o.name}`} onPress={() => { setMenu(false); setProfile(true); }} />}
        {ev && <MenuRow title="Zum Event" sub={ev.title} onPress={() => { setMenu(false); router.push({ pathname: '/event/[id]', params: { id: ev.id } }); }} />}
        <MenuRow title="Match auflösen" sub="Der Chat verschwindet für euch beide." onPress={unmatch} />
        {o && <MenuRow title="Blockieren" sub="Ihr seht euch nirgends mehr in MOSHCHAT." onPress={block} danger />}
        {o && <MenuRow title="Melden" onPress={() => { setMenu(false); setReport(true); }} danger />}
      </Sheet>
      {o && <ReportSheet target={{ user: o.id }} blockToo visible={report} onClose={() => setReport(false)} onDone={() => { setReport(false); router.back(); }} />}

      <Sheet visible={profile} onClose={() => setProfile(false)}>
        {o && (
          <View style={{ gap: 10 }}>
            <View style={{ alignItems: 'center' }}><Avatar path={o.photo_path} name={o.name} color={o.color} size={160} /></View>
            <Text style={T.display(34)}>{o.name}, {o.age}</Text>
            {o.pronouns ? <Mono style={{ textTransform: 'none' }}>{o.pronouns}</Mono> : null}
            {(o.job || o.city) ? <P muted>{[o.job, o.city].filter(Boolean).join(' · ')}</P> : null}
            {info.modes.map((k) => (o.lines?.[k] ? (
              <View key={k} style={{ gap: 4 }}><ModeChip mode={k} /><Text style={T.semi(19)}>„{o.lines[k]}“</Text></View>
            ) : null))}
            {o.bio ? <P>{o.bio}</P> : null}
          </View>
        )}
      </Sheet>
      {toast.node}
    </SafeAreaView>
  );
}

function MeetSheet({ visible, onClose, event, onSend, preferNow }: { visible: boolean; onClose: () => void; event: EventRow; onSend: (m: Meet) => void; preferNow?: boolean }) {
  const live = isLive(event);
  const whens = meetWhen(live);
  const dayList = multi(event) ? eventDays(event) : [];
  const places = [...(event.partner_place ? [event.partner_place] : []), ...meetWhere(event.category)];
  const [day, setDay] = useState(dayList[0] ?? '');
  const [when, setWhen] = useState(preferNow && live ? whens[0] : '');
  const [where, setWhere] = useState(places[0]);
  const [custom, setCustom] = useState('');
  const place = custom.trim() || where;
  return (
    <Sheet visible={visible} onClose={onClose} title="Treffpunkt vorschlagen">
      <P muted>{event.title}{event.start_time ? ` · ab ${time(event.start_time)}` : ''}</P>
      <P style={{ fontSize: 14 }}>🛡️ Am besten an einem belebten Ort, wo ihr euch leicht findet.</P>
      {dayList.length > 0 && (
        <><Mono>Tag</Mono><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{dayList.map((d) => <Pill key={d} label={d} color={event.color} active={day === d} onPress={() => setDay(d)} />)}</View></>
      )}
      <Mono>Wann</Mono>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{whens.map((w) => <Pill key={w} label={w} color={event.color} active={when === w} onPress={() => setWhen(w)} />)}</View>
      <Mono>Wo</Mono>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {places.map((w) => <Pill key={w} label={w === event.partner_place ? `★ ${w}` : w} color={event.color} active={!custom && where === w} onPress={() => { setCustom(''); setWhere(w); }} />)}
      </View>
      {event.partner_place && event.partner_deal && where === event.partner_place && !custom ? <P style={{ fontSize: 14 }}>🎁 {event.partner_deal}</P> : null}
      <TextInput value={custom} onChangeText={setCustom} placeholder="Oder eigener Ort, z. B. „Linker Bühnenrand“" placeholderTextColor={C.muted} maxLength={60}
        style={{ fontFamily: F.bodyMedium, fontSize: 16, color: C.ink, borderWidth: 2.5, borderColor: C.ink, borderRadius: 4, backgroundColor: C.white, padding: 12 }} />
      <Row>
        <Btn title="Abbrechen" onPress={onClose} />
        <Btn solid title="Vorschlagen" disabled={!when || !place}
          onPress={() => onSend({ when, where: place, ...(dayList.length ? { day } : {}), ...(place === event.partner_place && event.partner_deal ? { deal: event.partner_deal } : {}) })} />
      </Row>
    </Sheet>
  );
}
