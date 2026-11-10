import { Pressable, Text, View } from 'react-native';
import { GENDER, MODE_KEYS, MODES, SEEK, sortModes, type Gender, type Mode } from '@/lib/constants';
import type { Profile } from '@/lib/types';
import { C } from '@/lib/theme';
import { Field, Mono, Pill, Segmented, T, Toggle } from './ui';

type Patch = (p: Partial<Profile>) => void;

/** "Ich bin hier für": modes, a line per mode and the date preferences. */
export function ModeSettings({ me, onChange }: { me: Pick<Profile, 'modes' | 'lines' | 'gender' | 'gender_text' | 'open_all' | 'seek'>; onChange: Patch }) {
  const toggle = (k: Mode) => {
    const on = me.modes.includes(k);
    const next = on ? me.modes.filter((x) => x !== k) : MODE_KEYS.filter((x) => x === k || me.modes.includes(x));
    onChange({ modes: next });
  };
  return (
    <View style={{ gap: 14 }}>
      {MODE_KEYS.map((k) => {
        const on = me.modes.includes(k);
        return (
          <View key={k} style={{ gap: 10 }}>
            <Toggle value={on} onChange={() => toggle(k)} title={MODES[k].label} sub={MODES[k].desc} color={MODES[k].color} />
            {on && (
              <View style={{ gap: 12, paddingHorizontal: 4 }}>
                {k === 'date' && <DateBlock me={me} onChange={onChange} />}
                <Field label={`Dein Satz für ${MODES[k].label}`} value={me.lines[k] ?? ''} maxLength={80} placeholder={MODES[k].ph}
                  onChangeText={(t) => onChange({ lines: { ...me.lines, [k]: t } })} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function DateBlock({ me, onChange }: { me: Pick<Profile, 'gender' | 'gender_text' | 'open_all' | 'seek'>; onChange: Patch }) {
  const seek = me.seek ?? [];
  const toggleSeek = (g: Gender) => {
    const next = seek.includes(g) ? seek.filter((x) => x !== g) : (['w', 'm', 'nb'] as Gender[]).filter((x) => x === g || seek.includes(x));
    onChange({ seek: next });
  };
  return (
    <View style={{ gap: 10 }}>
      <Mono size={11}>Ich bin</Mono>
      <Segmented options={(Object.keys(GENDER) as Gender[]).map((g) => ({ key: g, label: GENDER[g] }))} value={(me.gender ?? '') as Gender}
        onChange={(g) => onChange({ gender: g })} colors={{ w: C.date, m: C.date, nb: C.date }} />
      <Field label="Genauer beschreiben (optional)" value={me.gender_text} maxLength={40} onChangeText={(t) => onChange({ gender_text: t })} placeholder="z. B. genderfluid" />
      <Toggle value={me.open_all} onChange={(v) => onChange({ open_all: v, seek: v || seek.length ? seek : ['w', 'm', 'nb'] })}
        title="Ich bin offen für alle" sub="Du siehst Frauen, Männer und nicht-binäre Menschen" />
      {!me.open_all && (
        <View style={{ gap: 8 }}>
          <Mono size={11}>Zeig mir</Mono>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(SEEK) as Gender[]).map((g) => <Pill key={g} label={SEEK[g]} color={C.date} active={seek.includes(g)} onPress={() => toggleSeek(g)} />)}
          </View>
        </View>
      )}
      <Text style={[T.body(12), { color: C.muted }]}>
        Freiwillig. Mit dem Date-Modus willigst du ein, dass MOSHCHAT diese Angaben nur zum Abgleich nutzt. Andere sehen sie nicht. Widerruf jederzeit: Date-Modus ausschalten.
      </Text>
    </View>
  );
}

export function modeError(me: Pick<Profile, 'modes' | 'gender' | 'open_all' | 'seek'>): string {
  if (!me.modes.length) return 'Wähle mindestens eine Option.';
  if (me.modes.includes('date') && !me.gender) return 'Bitte wähle bei Date aus, wie du dich beschreibst.';
  if (me.modes.includes('date') && !me.open_all && !me.seek.length) return 'Wähle bei Date aus, wen du sehen möchtest.';
  return '';
}

export const ModeChip = ({ mode }: { mode: Mode }) => (
  <View style={{ backgroundColor: MODES[mode].color, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 }}>
    <Text style={T.mono(10)}>{MODES[mode].label}</Text>
  </View>
);

/** All modes two people share in one chat, e.g. "Freunde · Date". */
export const ModeChips = ({ modes }: { modes: Mode[] }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{sortModes(modes).map((m) => <ModeChip key={m} mode={m} />)}</View>
);

/** Text for the note in a chat when two people also match in another mode. */
export const alsoMatchText = (mode: Mode) => `Ihr passt jetzt auch ${mode === 'business' ? 'beruflich' : mode === 'date' ? 'für ein Date' : 'als Freunde'} zusammen.`;

export const PressableText = ({ children, onPress }: { children: string; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button"><Text style={[T.semi(14), { textDecorationLine: 'underline' }]}>{children}</Text></Pressable>
);
