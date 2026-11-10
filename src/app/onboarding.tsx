import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ModeSettings, modeError } from '@/components/ModeSettings';
import { BasicFields, PhotoPicker } from '@/components/ProfileFields';
import { Btn, H, IconBtn, Mono, P, Screen, T } from '@/components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { AVATAR_COLORS } from '@/lib/constants';
import { registerPush } from '@/lib/push';
import { errorText } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { C } from '@/lib/theme';

const STEPS = 2;

export default function Onboarding() {
  const { session, profile, updateProfile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const withColor = (p: Profile) => ({ ...p, color: p.color === '#D8CDBB' ? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] : p.color });
  const [draft, setDraft] = useState<Profile | null>(() => (profile ? withColor(profile) : null));
  const [err, setErr] = useState('');
  const [nudged, setNudged] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile && !draft) setDraft(withColor(profile));
  }, [profile, draft]);

  if (!session) return <Redirect href="/welcome" />;
  if (profile?.onboarded) return <Redirect href="/" />;
  if (!draft) return null;

  const patch = (p: Partial<Profile>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const next = async () => {
    setErr('');
    if (step === 1) {
      if (!draft.name.trim()) return setErr('Bitte gib deinen Vornamen ein.');
      if (!draft.birthdate) return setErr('Bitte gib deinen Geburtstag ein. MOSHCHAT ist ab 18.');
      // Ask once for a photo; the second tap on "Weiter" continues without one.
      if (!draft.photo_path && !nudged) { setNudged(true); return; }
    }
    if (step === 2) { const m = modeError(draft); if (m) return setErr(m); }
    setBusy(true);
    const { name, birthdate, pronouns, job, city, photo_path, color, modes, lines, gender, gender_text, open_all, seek } = draft;
    const last = step === STEPS;
    // The last step finishes setup and takes you straight to the event list.
    const e = await updateProfile({ name: name.trim(), birthdate, pronouns, job, city, photo_path, color, modes, lines, gender, gender_text, open_all, seek, ...(last ? { onboarded: true } : {}) });
    if (e) { setBusy(false); return setErr(errorText({ message: e })); }
    if (!last) { setBusy(false); return setStep(step + 1); }
    try {
      await refreshProfile();
      registerPush(draft.id);
      router.replace('/events');
    } catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <SafeAreaView edges={['top']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 3, borderColor: C.ink }}>
          {step > 1 ? <IconBtn name="back" label="Zurück" onPress={() => setStep(step - 1)} /> : <H size={28}>MOSHCHAT</H>}
          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
            {[1, 2].map((i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? C.ink : 'rgba(21,20,19,0.18)' }} />)}
          </View>
          <Mono>Schritt {step}/{STEPS}</Mono>
        </View>
      </SafeAreaView>
      <Screen>
        {step === 1 && <>
          <H size={42}>Wer bist du?</H>
          <PhotoPicker me={draft} onChange={patch} onError={setErr} />
          <BasicFields me={draft} onChange={patch} withBio={false} />
        </>}
        {step === 2 && <>
          <H size={42}>Wofür bist du hier?</H>
          <P muted>Wähle eins oder mehrere. Beim Swipen wechselst du mit einem Tipp, und du kannst es jederzeit im Profil ändern.</P>
          <ModeSettings me={draft} onChange={patch} />
        </>}
        {step === 1 && nudged && !draft.photo_path ? (
          <View style={{ borderWidth: 2.5, borderColor: C.ink, borderRadius: 16, backgroundColor: C.friends, padding: 14, gap: 4 }}>
            <Text style={T.semi(16)}>📸 Magst du noch ein Foto hinzufügen?</Text>
            <Text style={T.body(15)}>Mit Foto findest du viel leichter Leute. Tippe oben auf „Foto hinzufügen“, oder tippe nochmal auf „Weiter“, dann geht es ohne Foto weiter.</Text>
          </View>
        ) : null}
        {err ? <Text style={[T.semi(15), { color: C.danger }]}>{err}</Text> : null}
        <Btn solid title={step === STEPS ? "Los geht's" : 'Weiter'} onPress={next} loading={busy} style={{ flex: 0 }} />
      </Screen>
    </View>
  );
}
