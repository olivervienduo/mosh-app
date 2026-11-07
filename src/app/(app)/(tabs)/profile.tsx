import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ModeSettings, modeError } from '@/components/ModeSettings';
import { PersonCard } from '@/components/PersonCard';
import { BasicFields, PhotoPicker } from '@/components/ProfileFields';
import { useToast } from '@/components/ReportSheet';
import { Btn, H, IconBtn, Mono, Segmented, Sheet, T, TopBar } from '@/components/ui';
import { useAuth, useMe } from '@/lib/auth';
import { AVATAR_COLORS, MODES, type Mode } from '@/lib/constants';
import { ageFrom } from '@/lib/dates';
import { errorText } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { C } from '@/lib/theme';

const EDITABLE = ['name', 'birthdate', 'pronouns', 'job', 'city', 'bio', 'photo_path', 'color', 'modes', 'lines', 'gender', 'gender_text', 'open_all', 'seek', 'tags'] as const;

export default function ProfileTab() {
  const me = useMe();
  const { updateProfile } = useAuth();
  const toast = useToast();
  const [draft, setDraft] = useState<Profile>(me);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pm, setPm] = useState<Mode>(me.modes[0]);
  useEffect(() => { setDraft(me); }, [me]);

  const dirty = useMemo(() => EDITABLE.some((k) => JSON.stringify(draft[k]) !== JSON.stringify(me[k])), [draft, me]);
  const patch = (p: Partial<Profile>) => setDraft((d) => ({ ...d, ...p }));

  const save = async () => {
    if (!draft.name.trim()) return toast.show('Bitte gib deinen Vornamen ein.');
    const m = modeError(draft); if (m) return toast.show(m);
    setBusy(true);
    const p: Partial<Profile> = {};
    for (const k of EDITABLE) (p as Record<string, unknown>)[k] = draft[k];
    p.name = draft.name.trim();
    const e = await updateProfile(p);
    setBusy(false);
    toast.show(e ? errorText({ message: e }) : 'Gespeichert.');
  };

  const card = {
    id: me.id, name: draft.name || '?', age: draft.birthdate ? ageFrom(draft.birthdate) : 0, job: draft.job, city: draft.city, bio: draft.bio,
    pronouns: draft.pronouns, line: draft.lines[pm] ?? '', tags: draft.tags, photo_path: draft.photo_path, color: draft.color, here: false,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar brand title="Profil" right={<IconBtn name="gear" label="Einstellungen" onPress={() => router.push('/settings')} />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {me.paused && (
            <Pressable onPress={() => router.push('/settings')} style={{ borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, backgroundColor: C.friends, padding: 12 }}>
              <Text style={T.semi(15)}>Dein Profil ist pausiert. Niemand sieht dich beim Swipen. Ändern in den Einstellungen →</Text>
            </Pressable>
          )}
          <PhotoPicker me={draft} onChange={patch} onError={toast.show} />
          <View style={{ gap: 8 }}>
            <Mono size={11}>Farbe ohne Foto</Mono>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map((c) => (
                <Pressable key={c} onPress={() => patch({ color: c })} accessibilityLabel={`Farbe ${c}`} accessibilityState={{ selected: draft.color === c }}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: draft.color === c ? 4 : 2, borderColor: C.ink }} />
              ))}
            </View>
          </View>
          <BasicFields me={draft} onChange={patch} />
          <View style={{ gap: 6, borderTopWidth: 3, borderColor: C.ink, paddingTop: 14 }}>
            <H size={26}>Ich bin hier für</H>
            <Text style={[T.body(14), { color: C.muted }]}>Du kannst mehrere Modi gleichzeitig nutzen. Wer dich sieht, sieht nur den Satz für seinen Modus.</Text>
          </View>
          <ModeSettings me={draft} onChange={patch} />
          <Btn title="Vorschau: So sehen dich andere" onPress={() => { setPm(draft.modes[0] ?? 'friends'); setPreview(true); }} style={{ flex: 0 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      {dirty && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 10 }}>
          <Btn title="Verwerfen" onPress={() => setDraft(me)} style={{ backgroundColor: C.paper }} />
          <Btn solid title="Speichern" loading={busy} onPress={save} style={{ flex: 1.6 }} />
        </View>
      )}
      <Sheet visible={preview} onClose={() => setPreview(false)} title="Vorschau">
        {draft.modes.length > 1 && <Segmented options={draft.modes.map((k) => ({ key: k, label: MODES[k].label }))} value={pm} onChange={setPm} colors={{ friends: C.friends, date: C.date, business: C.business }} />}
        <View style={{ height: 520 }}><PersonCard p={card} mode={pm} /></View>
      </Sheet>
      {toast.node}
    </View>
  );
}
