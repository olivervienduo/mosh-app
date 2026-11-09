import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Btn, Field, Mono, P, T, Toggle, TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { fetchEvent } from '@/lib/events';
import { pick, upload, type Picked } from '@/lib/media';
import { errorText, supabase } from '@/lib/supabase';
import type { EventRow, Media } from '@/lib/types';
import { C, F } from '@/lib/theme';
import { featureGate } from '@/components/FeatureGate';

/** Organiser writes a feed post: text, up to 10 photos/videos, optional poll. */
function Compose() {
  const params = useLocalSearchParams<{ id?: string; event?: string }>();
  const eventId = (params.id ?? params.event)!;
  const me = useMe();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<Picked[]>([]);
  const [poll, setPoll] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { fetchEvent(eventId).then(setEvent); }, [eventId]);

  const add = async () => {
    try {
      const picked = await pick({ video: true, multiple: true });
      const tooBig = picked.find((p) => p.type === 'video' && (p.size ?? 0) > 50 * 1024 * 1024);
      if (tooBig) setErr('Videos dürfen höchstens 50 MB groß sein.');
      setMedia((m) => [...m, ...picked.filter((p) => p !== tooBig)].slice(0, 10));
    } catch (e) { setErr((e as Error).message); }
  };

  const opts = options.map((o) => o.trim()).filter(Boolean);
  const valid = (body.trim() || media.length || (poll && opts.length >= 2)) && (!poll || opts.length >= 2);

  const publish = async () => {
    if (!event || !valid) return;
    setBusy(true); setErr('');
    try {
      const uploaded: Media[] = [];
      for (let i = 0; i < media.length; i++) {
        setProgress(`Lade ${i + 1} von ${media.length} hoch …`);
        const r = await upload('posts', me.id, media[i], 1600);
        uploaded.push({ type: media[i].type, path: r.path, width: r.width, height: r.height });
      }
      setProgress('');
      if (pinned) await supabase.from('posts').update({ pinned: false }).eq('event_id', event.id).eq('author_id', me.id);
      const { data, error } = await supabase.from('posts').insert({ event_id: event.id, author_id: me.id, body: body.trim(), media: uploaded, pinned }).select('id').single();
      if (error) throw error;
      if (poll) {
        const { error: pe } = await supabase.from('poll_options').insert(opts.map((label, idx) => ({ post_id: data.id, idx, label })));
        if (pe) throw pe;
      }
      router.back();
    } catch (e) { setErr(errorText(e)); setProgress(''); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back title="Neuer Beitrag" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {event && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: event.color, borderWidth: 2, borderColor: C.ink }} />
              <Mono>Als {event.title}</Mono>
            </View>
          )}
          <TextInput value={body} onChangeText={setBody} multiline maxLength={1500} placeholder="Was gibt’s Neues? Line-up, Zeitplan, Einlass, Wetter …" placeholderTextColor={C.muted}
            style={{ minHeight: 150, textAlignVertical: 'top', fontFamily: F.bodyMedium, fontSize: 18, color: C.ink, borderWidth: 2.5, borderColor: C.ink, borderRadius: 4, backgroundColor: C.white, padding: 14 }} />
          <Text style={[T.body(12), { color: C.muted, textAlign: 'right' }]}>{body.length}/1500</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {media.map((m, i) => (
              <View key={m.uri} style={{ width: 96, height: 96, borderWidth: 2.5, borderColor: C.ink, borderRadius: 12, overflow: 'hidden', backgroundColor: C.ink }}>
                {m.type === 'image' ? <Image source={{ uri: m.uri }} style={{ flex: 1 }} contentFit="cover" />
                  : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={[T.display(30), { color: C.white }]}>▶</Text></View>}
                <Pressable onPress={() => setMedia(media.filter((_, j) => j !== i))} accessibilityLabel="Entfernen"
                  style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: C.white, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={14} />
                </Pressable>
              </View>
            ))}
            {media.length < 10 && (
              <Pressable onPress={add} accessibilityLabel="Fotos oder Videos hinzufügen"
                style={{ width: 96, height: 96, borderWidth: 2.5, borderStyle: 'dashed', borderColor: C.ink, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Icon name="camera" /><Text style={T.mono(10)}>Foto/Video</Text>
              </Pressable>
            )}
          </View>
          <Text style={[T.body(13), { color: C.muted }]}>Bis zu 10 Fotos oder Videos. Videos höchstens 50 MB und 2 Minuten.</Text>

          <Toggle value={poll} onChange={setPoll} title="Umfrage hinzufügen" sub="2 bis 4 Antworten" color={event?.color} />
          {poll && (
            <View style={{ gap: 10 }}>
              {options.map((o, i) => (
                <Field key={i} label={`Antwort ${i + 1}`} value={o} maxLength={60} onChangeText={(t) => setOptions(options.map((x, j) => (j === i ? t : x)))} />
              ))}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {options.length < 4 && <Btn small title="+ Antwort" onPress={() => setOptions([...options, ''])} />}
                {options.length > 2 && <Btn small title="– Antwort" onPress={() => setOptions(options.slice(0, -1))} />}
              </View>
            </View>
          )}
          <Toggle value={pinned} onChange={setPinned} title="Oben anheften" sub="Bleibt ganz oben im Feed dieses Events" color={event?.color} />
          <P muted style={{ fontSize: 14 }}>Alle, die dem Event beigetreten sind, sehen den Beitrag im Feed und bekommen eine Mitteilung.</P>
          {progress ? <Mono>{progress}</Mono> : null}
          {err ? <Text style={[T.semi(14), { color: C.danger }]}>{err}</Text> : null}
          <Btn solid title="Veröffentlichen" loading={busy} disabled={!valid || !event} onPress={publish} style={{ flex: 0 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Hidden while FEATURES.feed is off (see src/lib/features.ts).
export default featureGate('feed', Compose);
