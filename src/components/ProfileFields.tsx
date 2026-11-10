import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { pick, upload } from '@/lib/media';
import type { Profile } from '@/lib/types';
import { ageFrom, parseInputDate, toInputDate } from '@/lib/dates';
import { C } from '@/lib/theme';
import { Avatar, Field, Row, T } from './ui';

type Patch = (p: Partial<Profile>) => void;

export function PhotoPicker({ me, onChange, onError }: { me: Profile; onChange: Patch; onError: (e: string) => void }) {
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    try {
      const [p] = await pick({ square: true });
      if (!p) return;
      setBusy(true);
      const { path } = await upload('avatars', me.id, p, 900);
      onChange({ photo_path: path });
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Pressable onPress={choose} accessibilityRole="button" accessibilityLabel="Profilfoto wählen" style={{ alignSelf: 'center', alignItems: 'center', gap: 8 }}>
      <View style={{ borderWidth: 3, borderColor: C.ink, borderRadius: 80 }}>
        <Avatar path={me.photo_path} name={me.name || '?'} color={me.color} size={140} />
      </View>
      <Text style={[T.mono(11), { backgroundColor: C.ink, color: C.white, paddingHorizontal: 10, paddingVertical: 4 }]}>{busy ? 'Lädt …' : me.photo_path ? 'Foto ändern' : 'Foto hinzufügen'}</Text>
      {!me.photo_path && !busy && (
        <Text style={[T.body(14), { color: C.muted, textAlign: 'center', maxWidth: 280 }]}>Mit Foto bekommst du deutlich mehr Likes. Ohne Foto sehen andere nur deinen Anfangsbuchstaben.</Text>
      )}
    </Pressable>
  );
}

/** Name, birthday, pronouns, job, city, bio. Birthday is stored, only the age is shown to others. */
export function BasicFields({ me, onChange, withBio = true }: { me: Profile; onChange: Patch; withBio?: boolean }) {
  const [bday, setBday] = useState(toInputDate(me.birthdate));
  const [bErr, setBErr] = useState('');
  const commitBday = (t: string) => {
    setBday(t);
    const iso = parseInputDate(t);
    if (!iso) { setBErr(t.length >= 8 ? 'Bitte im Format TT.MM.JJJJ.' : ''); return; }
    if (ageFrom(iso) < 18) { setBErr('MOSHCHAT ist ab 18.'); return; }
    setBErr(''); onChange({ birthdate: iso });
  };
  return (
    <View style={{ gap: 14 }}>
      <Row>
        <View style={{ flex: 1 }}><Field label="Vorname" value={me.name} onChangeText={(t) => onChange({ name: t })} maxLength={40} autoComplete="given-name" /></View>
        <View style={{ flex: 1 }}><Field label="Geburtstag" value={bday} onChangeText={commitBday} placeholder="TT.MM.JJJJ" keyboardType="numbers-and-punctuation" maxLength={10} error={bErr} hint="Andere sehen nur dein Alter." /></View>
      </Row>
      <Field label="Pronomen (optional)" value={me.pronouns} onChangeText={(t) => onChange({ pronouns: t })} maxLength={30} placeholder="z. B. sie/ihr, er/ihm, they/them" />
      <Row>
        <View style={{ flex: 1 }}><Field label="Was machst du?" value={me.job} onChangeText={(t) => onChange({ job: t })} maxLength={60} /></View>
        <View style={{ flex: 1 }}><Field label="Stadt" value={me.city} onChangeText={(t) => onChange({ city: t })} maxLength={40} /></View>
      </Row>
      {withBio && <Field label="Über mich" value={me.bio} onChangeText={(t) => onChange({ bio: t })} multiline maxLength={300} placeholder="Ein paar Sätze, die für alle Modi gelten" />}
    </View>
  );
}
