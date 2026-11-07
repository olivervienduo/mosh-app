import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Halftone } from '@/components/EventCard';
import { Btn, Field, H, Loading, Mono, P, Pill, Row, Rule, Screen, Sheet, T, TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { CATEGORIES, PALETTE, cat } from '@/lib/constants';
import { parseInputDate, parseInputTime, range, toInputDate } from '@/lib/dates';
import { fetchEvent } from '@/lib/events';
import { pick, upload, type Picked } from '@/lib/media';
import { errorText, publicUrl, supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Draft = { title: string; category: string; color: string; customColor: boolean; from: string; to: string; time: string; venue: string; city: string; description: string; ticket: string; image_path: string | null };

export default function EditEvent() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const me = useMe();
  const [d, setD] = useState<Draft | null>(id ? null : { title: '', category: 'festival', color: cat('festival').color, customColor: false, from: '', to: '', time: '', venue: '', city: me.city, description: '', ticket: '', image_path: null });
  const [img, setImg] = useState<Picked | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchEvent(id).then((e) => {
      if (!e) return;
      setD({ title: e.title, category: e.category, color: e.color, customColor: e.color.toUpperCase() !== cat(e.category).color.toUpperCase(), from: toInputDate(e.starts_on), to: toInputDate(e.ends_on),
        time: e.start_time ? e.start_time.slice(0, 5) : '', venue: e.venue, city: e.city, description: e.description, ticket: e.ticket_url ?? '', image_path: e.image_path });
    });
  }, [id]);
  if (!d) return <Loading />;
  const set = (p: Partial<Draft>) => setD({ ...d, ...p });

  const chooseImage = async () => {
    try { const [p] = await pick(); if (p) setImg(p); } catch (e) { setErr((e as Error).message); }
  };

  const save = async () => {
    setErr('');
    const starts = parseInputDate(d.from), ends = d.to ? parseInputDate(d.to) : null, time = d.time ? parseInputTime(d.time) : null;
    const missing = [!d.title.trim() && 'Name', !starts && 'Datum (TT.MM.JJJJ)', !d.venue.trim() && 'Location'].filter(Boolean);
    if (missing.length) return setErr(`Bitte noch ausfüllen: ${missing.join(', ')}.`);
    if (d.to && !ends) return setErr('Das Enddatum bitte im Format TT.MM.JJJJ.');
    if (ends && ends < starts!) return setErr('Das Enddatum liegt vor dem Beginn.');
    if (d.time && !time) return setErr('Die Uhrzeit bitte im Format HH:MM.');
    if (d.ticket && !/^https:\/\//.test(d.ticket.trim())) return setErr('Der Ticket-Link muss mit https:// beginnen.');
    setBusy(true);
    try {
      let image_path = d.image_path;
      if (img) image_path = (await upload('events', me.id, img, 1600)).path;
      const row = { title: d.title.trim(), category: d.category, color: d.color, starts_on: starts!, ends_on: ends && ends > starts! ? ends : null, start_time: time,
        venue: d.venue.trim(), city: d.city.trim(), description: d.description.trim(), ticket_url: d.ticket.trim() || null, image_path };
      if (id) {
        const { error } = await supabase.from('events').update(row).eq('id', id);
        if (error) throw error;
        router.back();
      } else {
        const { data, error } = await supabase.from('events').insert({ ...row, creator_id: me.id }).select('id').single();
        if (error) throw error;
        await supabase.from('event_members').insert({ event_id: data.id, user_id: me.id });
        router.replace({ pathname: '/event/[id]', params: { id: data.id } });
      }
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  const del = async () => {
    const { error } = await supabase.from('events').delete().eq('id', id!);
    if (error) return setErr(errorText(error));
    setConfirmDel(false);
    router.dismissAll(); router.replace('/events');
  };

  const preview = img?.uri ?? publicUrl('events', d.image_path);
  const colorName = PALETTE.find(([h]) => h.toUpperCase() === d.color.toUpperCase())?.[1] ?? '';

  return (
    <>
      <TopBar back title={id ? 'Event bearbeiten' : 'Neues Event'} />
      <Screen>
        <Pressable onPress={chooseImage} accessibilityRole="button" accessibilityLabel="Bild wählen"
          style={{ borderWidth: 2.5, borderStyle: 'dashed', borderColor: C.ink, borderRadius: 24, overflow: 'hidden', aspectRatio: 16 / 9, backgroundColor: C.white }}>
          {preview ? <Image source={{ uri: preview }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <H size={26}>Bild hochladen</H><Mono size={11}>Plakat, Line-up oder Foto · 16:9</Mono>
            </View>
          )}
        </Pressable>
        <Field label="Name des Events" value={d.title} onChangeText={(t) => set({ title: t })} maxLength={60} placeholder="z. B. Sommerfest im Hof" />
        <View style={{ gap: 8 }}>
          <Mono size={11}>Art</Mono>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map((c) => <Pill key={c.key} label={c.label} color={c.color} active={d.category === c.key}
              onPress={() => set({ category: c.key, color: d.customColor ? d.color : c.color })} />)}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Mono size={11}>Farbe</Mono>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {PALETTE.map(([h, n]) => {
              const on = h.toUpperCase() === d.color.toUpperCase();
              return (
                <Pressable key={h} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={n}
                  onPress={() => set({ color: h, customColor: h.toUpperCase() !== cat(d.category).color.toUpperCase() })}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: h, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center',
                    ...(on ? { transform: [{ scale: 1.12 }] } : {}) }}>
                  {on && <Text style={T.semi(18)}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
          <View style={{ backgroundColor: d.color, borderRadius: 22, padding: 16, gap: 6, marginTop: 4 }}>
            <Text style={T.display(24)}>{parseInputDate(d.from) ? range({ starts_on: parseInputDate(d.from)!, ends_on: parseInputDate(d.to) }) : 'TT.MM.JJ'}</Text>
            <Rule /><Text style={T.display(24)}>{d.title || 'Dein Event'}</Text>
            <Mono size={11}>{colorName}{!d.customColor ? ` · Standard für ${cat(d.category).label}` : ''}</Mono>
          </View>
        </View>
        <Row>
          <View style={{ flex: 1 }}><Field label="Von" value={d.from} onChangeText={(t) => set({ from: t })} placeholder="TT.MM.JJJJ" keyboardType="numbers-and-punctuation" maxLength={10} /></View>
          <View style={{ flex: 1 }}><Field label="Bis (optional)" value={d.to} onChangeText={(t) => set({ to: t })} placeholder="TT.MM.JJJJ" keyboardType="numbers-and-punctuation" maxLength={10} /></View>
        </Row>
        <P muted style={{ fontSize: 14, marginTop: -8 }}>„Bis“ nur für Events über mehrere Tage, etwa Festivals oder Messen.</P>
        <Row>
          <View style={{ flex: 1 }}><Field label="Beginn" value={d.time} onChangeText={(t) => set({ time: t })} placeholder="20:00" keyboardType="numbers-and-punctuation" maxLength={5} /></View>
          <View style={{ flex: 1 }}><Field label="Stadt" value={d.city} onChangeText={(t) => set({ city: t })} maxLength={40} /></View>
        </Row>
        <Field label="Location" value={d.venue} onChangeText={(t) => set({ venue: t })} maxLength={80} placeholder="z. B. Arena, Halle C" />
        <Field label="Was erwartet die Leute?" value={d.description} onChangeText={(t) => set({ description: t })} multiline maxLength={600} placeholder="Line-up, Dresscode, Einlass …" />
        <Field label="Ticket-Link (optional)" value={d.ticket} onChangeText={(t) => set({ ticket: t })} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        {err ? <Text style={[T.semi(15), { color: C.danger }]}>{err}</Text> : null}
        <Btn solid title={id ? 'Änderungen speichern' : 'Event veröffentlichen'} onPress={save} loading={busy} style={{ flex: 0 }} />
        {id && <Btn title="Event löschen" onPress={() => setConfirmDel(true)} style={{ flex: 0 }} />}
      </Screen>
      <Sheet visible={confirmDel} onClose={() => setConfirmDel(false)} title="Event löschen?">
        <P>„{d.title}“ verschwindet für alle, mit allen Beiträgen. Bestehende Matches und Chats bleiben erhalten.</P>
        <Row><Btn title="Abbrechen" onPress={() => setConfirmDel(false)} /><Btn solid title="Löschen" onPress={del} /></Row>
      </Sheet>
    </>
  );
}
