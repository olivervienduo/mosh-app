import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useToast } from '@/components/ReportSheet';
import { Btn, Empty, Mono, P, Segmented, T, TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { ago, range } from '@/lib/dates';
import { useFocusLoad } from '@/lib/events';
import { errorText, supabase } from '@/lib/supabase';
import type { EventRow } from '@/lib/types';
import { C } from '@/lib/theme';

type Report = {
  id: string; created_at: string; reason: string; details: string; reporter: string | null;
  target_user: string | null; target_name: string | null; target_post: string | null; post_body: string | null;
  target_comment: string | null; comment_body: string | null; target_event: string | null; event_title: string | null;
};

/** Moderation for the app owner: reports and the "Offiziell" checkmark. */
export default function Admin() {
  const me = useMe();
  const toast = useToast();
  const [tab, setTab] = useState<'reports' | 'events'>('reports');
  const { data, reload } = useFocusLoad(async () => {
    const [r, e] = await Promise.all([
      supabase.rpc('admin_reports'),
      supabase.from('events').select('*').eq('official', false).order('created_at', { ascending: false }).limit(100),
    ]);
    if (r.error) throw r.error;
    return { reports: (r.data as Report[]) ?? [], events: (e.data as EventRow[]) ?? [] };
  }, []);

  if (!me.is_admin) return <><TopBar back title="Admin" /><View style={{ padding: 16 }}><P>Kein Zugriff.</P></View></>;

  const close = async (id: string) => {
    const { error } = await supabase.from('reports').update({ status: 'done' }).eq('id', id);
    if (error) toast.show(errorText(error)); else reload();
  };
  const confirm = (title: string, run: () => Promise<{ error: unknown } | void>) => Alert.alert(title, 'Das kann nicht rückgängig gemacht werden.', [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Löschen', style: 'destructive', onPress: async () => { const r = await run(); if (r && r.error) toast.show(errorText(r.error)); else { toast.show('Erledigt.'); reload(); } } },
  ]);
  const removeContent = (r: Report) => confirm('Inhalt löschen?', async () => {
    if (r.target_comment) await supabase.from('comments').delete().eq('id', r.target_comment);
    if (r.target_post) await supabase.from('posts').delete().eq('id', r.target_post);
    if (r.target_event) await supabase.from('events').delete().eq('id', r.target_event);
    return supabase.from('reports').update({ status: 'done' }).eq('id', r.id);
  });
  const banUser = (r: Report) => confirm(`${r.target_name ?? 'Konto'} sperren und löschen?`, async () => {
    const { error } = await supabase.functions.invoke('delete-account', { body: { user_id: r.target_user } });
    if (error) return { error };
    return supabase.from('reports').update({ status: 'done' }).eq('id', r.id);
  });
  const verify = async (e: EventRow) => {
    const { error } = await supabase.from('events').update({ official: true }).eq('id', e.id);
    if (error) toast.show(errorText(error)); else { toast.show(`${e.title} ist jetzt offiziell.`); reload(); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back title="Admin" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Segmented options={[{ key: 'reports', label: `Meldungen (${data?.reports.length ?? 0})` }, { key: 'events', label: 'Verifizieren' }]} value={tab} onChange={setTab} />
        {tab === 'reports' && data?.reports.length === 0 && <Empty title="Alles erledigt" text="Keine offenen Meldungen." />}
        {tab === 'reports' && data?.reports.map((r) => (
          <View key={r.id} style={{ borderWidth: 2.5, borderColor: C.ink, borderRadius: 20, backgroundColor: C.white, padding: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Mono size={11}>{r.reason}</Mono><Text style={[T.body(12), { color: C.muted }]}>{ago(r.created_at)}</Text></View>
            {r.target_name && <Text style={T.semi(16)}>Person: {r.target_name}</Text>}
            {r.event_title && <Text style={T.semi(16)}>Event: {r.event_title}</Text>}
            {r.post_body !== null && r.target_post && <P style={{ fontSize: 15 }}>Beitrag: „{r.post_body.slice(0, 200)}“</P>}
            {r.comment_body && <P style={{ fontSize: 15 }}>Kommentar: „{r.comment_body}“</P>}
            {r.details ? <P muted style={{ fontSize: 14 }}>{r.details}</P> : null}
            <Text style={[T.body(12), { color: C.muted }]}>Gemeldet von {r.reporter ?? 'gelöschtem Konto'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Btn small title="Erledigt" onPress={() => close(r.id)} />
              {(r.target_post || r.target_comment || r.target_event) && <Btn small title="Inhalt löschen" onPress={() => removeContent(r)} />}
              {r.target_event && <Btn small title="Event ansehen" onPress={() => router.push({ pathname: '/event/[id]', params: { id: r.target_event! } })} />}
              {r.target_user && <Btn small solid title="Konto sperren" onPress={() => banUser(r)} />}
            </View>
          </View>
        ))}
        {tab === 'events' && (
          <>
            <P muted style={{ fontSize: 14 }}>Offizielle Events bekommen ein Häkchen. Prüfe vorher, ob die Person wirklich zum Veranstalter gehört (z. B. per E-Mail von der offiziellen Domain).</P>
            {data?.events.length === 0 && <Empty title="Nichts zu prüfen" text="Alle Events sind verifiziert." />}
            {data?.events.map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2.5, borderColor: C.ink, borderRadius: 20, backgroundColor: e.color, padding: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={T.display(18)}>{e.title}</Text>
                  <Text style={T.body(13)}>{range(e)} · {e.venue}, {e.city}</Text>
                </View>
                <Btn small title="Ansehen" onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })} style={{ backgroundColor: C.white }} />
                <Btn small solid title="✓" onPress={() => verify(e)} />
              </View>
            ))}
          </>
        )}
      </ScrollView>
      {toast.node}
    </View>
  );
}
