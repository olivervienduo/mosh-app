import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Linking, Platform, ScrollView, Text, View } from 'react-native';
import { useToast } from '@/components/ReportSheet';
import { Avatar, Btn, H, MenuRow, Mono, P, Sheet, T, Toggle, TopBar } from '@/components/ui';
import { useAuth, useMe } from '@/lib/auth';
import { confirmAction } from '@/lib/confirm';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { range } from '@/lib/dates';
import { useFocusLoad } from '@/lib/events';
import { FEATURES } from '@/lib/features';
import { errorText, supabase } from '@/lib/supabase';
import type { EventRow, Profile } from '@/lib/types';
import { C } from '@/lib/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ borderBottomWidth: 3, borderColor: C.ink, paddingBottom: 4, marginBottom: 4 }}><H size={24}>{title}</H></View>
      {children}
    </View>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Mono size={11}>{label}</Mono>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 2.5, borderColor: C.ink, borderRadius: 4, backgroundColor: C.white }}>
        <Btn small title="–" onPress={() => onChange(Math.max(min, value - 1))} style={{ borderWidth: 0 }} />
        <Text style={[T.display(24), { flex: 1, textAlign: 'center' }]}>{value}{value === 99 ? '+' : ''}</Text>
        <Btn small title="+" onPress={() => onChange(Math.min(max, value + 1))} style={{ borderWidth: 0 }} />
      </View>
    </View>
  );
}

export default function Settings() {
  const me = useMe();
  const { updateProfile, signOut } = useAuth();
  const toast = useToast();
  const [rules, setRules] = useState(false);
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, setData } = useFocusLoad(async () => {
    const [ev, bl] = await Promise.all([
      supabase.from('events').select('*').eq('creator_id', me.id).order('starts_on', { ascending: false }),
      supabase.rpc('my_blocks'),
    ]);
    return { events: (ev.data as EventRow[]) ?? [], blocks: (bl.data as { id: string; name: string; photo_path: string | null; color: string }[]) ?? [] };
  }, [me.id]);

  const set = async (p: Partial<Profile>) => {
    const e = await updateProfile(p);
    if (e) toast.show(errorText({ message: e }));
  };
  const unblock = async (id: string) => {
    await supabase.from('blocks').delete().match({ blocker_id: me.id, blocked_id: id });
    setData((d) => (d ? { ...d, blocks: d.blocks.filter((b) => b.id !== id) } : d));
    toast.show('Blockierung aufgehoben.');
  };
  const exportData = async () => {
    setBusy(true);
    try {
      const { data: json, error } = await supabase.rpc('export_my_data');
      if (error) throw error;
      const name = `moshchat-daten-${new Date().toISOString().slice(0, 10)}.json`;
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }));
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }
      const f = new File(Paths.cache, name);
      if (f.exists) f.delete();
      f.create();
      f.write(JSON.stringify(json, null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Deine MOSHCHAT-Daten' });
      else toast.show('Teilen ist auf diesem Gerät nicht verfügbar.');
    } catch (e) { toast.show(errorText(e)); } finally { setBusy(false); }
  };
  const deleteAccount = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    setBusy(false);
    if (error) return toast.show('Löschen hat nicht geklappt. Bitte versuch es nochmal oder schreib uns.');
    setDel(false);
    await signOut();
    router.replace('/welcome');
  };
  const confirmSignOut = () => confirmAction('Abmelden?', 'Du kannst dich jederzeit wieder mit deiner E-Mail anmelden.', 'Abmelden', async () => { await signOut(); router.replace('/welcome'); });
  const n = me.notify;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back title="Einstellungen" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 28, paddingBottom: 60 }}>
        <Section title="Meine Events">
          {data?.events.length === 0 && <P muted style={{ paddingVertical: 8 }}>Du hast noch kein Event erstellt.</P>}
          {data?.events.map((e) => (
            <MenuRow key={e.id} title={e.title} sub={`${range(e)} · ${e.city}${FEATURES.official && e.official ? ' · Offiziell ✓' : ''}`} onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })} />
          ))}
          <View style={{ marginTop: 10 }}><Btn title="+ Event erstellen" onPress={() => router.push('/event/edit')} style={{ flex: 0 }} /></View>
        </Section>

        <Section title="Sichtbarkeit">
          <Toggle value={me.paused} onChange={(v) => set({ paused: v })} title="Profil pausieren" sub="Niemand sieht dich beim Swipen. Deine Chats bleiben." />
          {FEATURES.checkin && <Toggle value={me.live_visible} onChange={(v) => set({ live_visible: v })} title="Als „gerade hier“ zeigen" sub="Nach dem Check-in sehen andere, dass du vor Ort bist." color={C.green} />}
          <Toggle value={me.read_receipts} onChange={(v) => set({ read_receipts: v })} title="Lesebestätigungen" sub="Zeigt „Gelesen“ unter deinen Nachrichten." />
          <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12 }}>
            <Stepper label="Alter ab" value={me.age_min} min={18} max={me.age_max} onChange={(v) => set({ age_min: v })} />
            <Stepper label="Alter bis" value={me.age_max} min={me.age_min} max={99} onChange={(v) => set({ age_max: v })} />
          </View>
        </Section>

        <Section title="Mitteilungen">
          <Toggle value={n.matches} onChange={(v) => set({ notify: { ...n, matches: v } })} title="Neue Matches" />
          <Toggle value={n.messages} onChange={(v) => set({ notify: { ...n, messages: v } })} title="Nachrichten" />
          <Toggle value={n.likes} onChange={(v) => set({ notify: { ...n, likes: v } })} title="Neue Likes" />
          {FEATURES.feed && <Toggle value={n.events} onChange={(v) => set({ notify: { ...n, events: v } })} title="News von Veranstaltern" />}
        </Section>

        <Section title="Sicherheit">
          <MenuRow title="Tipps fürs erste Treffen" sub="Und unsere Community-Regeln" onPress={() => setRules(true)} />
          <Mono size={11} style={{ marginTop: 14, marginBottom: 4 }}>Blockiert ({data?.blocks.length ?? 0})</Mono>
          {data?.blocks.length === 0 && <P muted>Niemand blockiert.</P>}
          {data?.blocks.map((b) => (
            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <Avatar path={b.photo_path} name={b.name} color={b.color} size={40} />
              <Text style={[T.semi(16), { flex: 1 }]}>{b.name}</Text>
              <Btn small title="Aufheben" onPress={() => unblock(b.id)} />
            </View>
          ))}
        </Section>

        <Section title="Hilfe & Rechtliches">
          <MenuRow title="Hilfe & Kontakt" sub={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=MOSHCHAT%20Support`)} />
          <MenuRow title="Datenschutz" onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })} />
          <MenuRow title="Nutzungsbedingungen" onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })} />
          <MenuRow title="Impressum" onPress={() => router.push({ pathname: '/legal', params: { doc: 'imprint' } })} />
          <MenuRow title="Open-Source-Lizenzen" onPress={() => router.push({ pathname: '/legal', params: { doc: 'licenses' } })} />
        </Section>

        {me.is_admin && (
          <Section title="Admin">
            <MenuRow title="Meldungen & Freigaben" sub={FEATURES.official ? 'Gemeldete Inhalte prüfen, Events verifizieren' : 'Gemeldete Inhalte prüfen'} onPress={() => router.push('/admin')} />
          </Section>
        )}

        <Section title="Konto">
          <MenuRow title="Meine Daten herunterladen" sub="Alles, was MOSHCHAT über dich speichert, als Datei" onPress={exportData} />
          <MenuRow title="Abmelden" onPress={confirmSignOut} />
          <MenuRow title="Konto löschen" sub="Endgültig, mit allen Matches und Chats" onPress={() => setDel(true)} danger />
        </Section>

        <Text style={[T.mono(10), { textAlign: 'center', color: C.muted }]}>MOSHCHAT {version} · Gratis. Ohne Werbung.</Text>
      </ScrollView>

      <Sheet visible={rules} onClose={() => setRules(false)} title="Sicher treffen">
        {[
          ['Öffentlich bleiben', 'Trefft euch am Event, an einem belebten Ort. Nicht bei jemandem zu Hause.'],
          ['Jemandem Bescheid geben', 'Sag einer Freundin oder einem Freund, mit wem und wo du dich triffst.'],
          ['Eigene Anreise', 'Komm und geh selbstständig. Behalte dein Getränk im Blick.'],
          ['Nichts überweisen', 'Schick nie Geld und gib keine Bankdaten weiter, egal mit welcher Geschichte.'],
          ['Bauchgefühl zählt', 'Fühlt sich etwas falsch an, geh. Blockiere und melde, wir prüfen jede Meldung.'],
        ].map(([t, d]) => <View key={t} style={{ gap: 2 }}><Text style={T.semi(17)}>{t}</Text><P muted style={{ fontSize: 15 }}>{d}</P></View>)}
        <H size={22} style={{ marginTop: 8 }}>Community-Regeln</H>
        <P style={{ fontSize: 15 }}>MOSHCHAT ist ab 18. Sei du selbst: echte Fotos, echter Name. Kein Hass, keine Belästigung, keine Nacktbilder, kein Spam, kein Verkauf. Respektiere ein Nein und Pronomen. Verstöße führen zur Sperre.</P>
        <P muted style={{ fontSize: 14 }}>In einem Notfall: 112.</P>
      </Sheet>

      <Sheet visible={del} onClose={() => setDel(false)} title="Konto löschen?">
        <P>Dein Profil, deine Matches, Chats, Likes und alle Fotos werden endgültig gelöscht. Events, die du erstellt hast, verschwinden ebenfalls. Das kann nicht rückgängig gemacht werden.</P>
        <P muted style={{ fontSize: 14 }}>Tipp: Wenn du nur eine Pause brauchst, pausiere dein Profil.</P>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Btn title="Abbrechen" onPress={() => setDel(false)} />
          <Btn solid title="Endgültig löschen" loading={busy} onPress={deleteAccount} />
        </View>
      </Sheet>
      {toast.node}
    </View>
  );
}
