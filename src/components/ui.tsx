import { router } from 'expo-router';
import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { publicUrl } from '@/lib/supabase';
import { BORDER, C, F } from '@/lib/theme';
import { Icon, type IconName } from './Icon';

// ---------- text ----------
export const T = {
  display: (size = 36): TextStyle => ({ fontFamily: F.display, fontSize: size, lineHeight: size * 1.08, color: C.ink, textTransform: 'uppercase' }),
  mono: (size = 12): TextStyle => ({ fontFamily: F.monoSemi, fontSize: size, letterSpacing: size * 0.08, color: C.ink, textTransform: 'uppercase' }),
  body: (size = 16): TextStyle => ({ fontFamily: F.body, fontSize: size, lineHeight: size * 1.45, color: C.ink }),
  semi: (size = 16): TextStyle => ({ fontFamily: F.bodySemi, fontSize: size, lineHeight: size * 1.35, color: C.ink }),
};
export const Mono = ({ children, style, size }: { children: ReactNode; style?: StyleProp<TextStyle>; size?: number }) => <Text style={[T.mono(size), style]}>{children}</Text>;
export const H = ({ children, size = 30, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) => <Text style={[T.display(size), style]}>{children}</Text>;
export const P = ({ children, style, muted }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean }) => <Text style={[T.body(), muted && { color: C.muted }, style]}>{children}</Text>;

// ---------- layout ----------
export function Screen({ children, scroll = true, style, footer }: { children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle>; footer?: ReactNode }) {
  const body = scroll
    ? <ScrollView contentContainerStyle={[{ padding: 16, paddingBottom: 40, gap: 18 }, style]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={[{ flex: 1 }, style]}>{children}</View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.paper }} behavior="padding">
      {body}
      {footer}
    </KeyboardAvoidingView>
  );
}

export function TopBar({ title, back = false, right, brand }: { title?: string; back?: boolean; right?: ReactNode; brand?: boolean }) {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: C.paper }}>
      <View style={s.top}>
        {back && <IconBtn name="back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} label="Zurück" />}
        {brand
          ? <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}><H size={30}>MOSHCHAT</H>{title ? <Mono style={{ color: C.muted }}>/ {title}</Mono> : null}</View>
          : <Text numberOfLines={1} style={[T.mono(13), { flex: 1 }]}>{title}</Text>}
        {right}
      </View>
    </SafeAreaView>
  );
}

export function IconBtn({ name, onPress, label, size = 40, filled }: { name: IconName; onPress: () => void; label: string; size?: number; filled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => [s.iconBtn, { width: size, height: size }, filled && { backgroundColor: C.ink }, pressed && { opacity: 0.6 }]}>
      <Icon name={name} color={filled ? C.white : C.ink} />
    </Pressable>
  );
}

// ---------- buttons ----------
export function Btn({ title, onPress, solid, small, disabled, loading, style, color }: {
  title: string; onPress?: () => void; solid?: boolean; small?: boolean; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; color?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [s.btn, small ? s.btnSmall : { flex: 1 }, solid && { backgroundColor: C.ink }, color ? { backgroundColor: color } : null,
        (disabled || loading) && { opacity: 0.35 }, pressed && { transform: [{ translateY: 1 }] }, style]}>
      {loading ? <ActivityIndicator color={solid ? C.white : C.ink} /> :
        <Text style={[T.semi(small ? 14 : 16), solid && !color && { color: C.white }, { textAlign: 'center' }]}>{title}</Text>}
    </Pressable>
  );
}
export const Row = ({ children, style, gap = 12 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) => <View style={[{ flexDirection: 'row', gap }, style]}>{children}</View>;

export function Pill({ label, color, onPress, active, style, textStyle }: { label: string; color: string; onPress?: () => void; active?: boolean; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const on = active ?? true;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ selected: on }}
      style={[s.pill, { backgroundColor: on ? color : 'transparent' }, style]}>
      <Text style={[T.semi(15), textStyle]}>{label}</Text>
    </Pressable>
  );
}
export const Chip = ({ label, color = C.white }: { label: string; color?: string }) => (
  <View style={[s.chip, { backgroundColor: color }]}><Text style={T.mono(10)}>{label}</Text></View>
);

/** Segmented control, e.g. Freunde | Date | Business. */
export function Segmented<K extends string>({ options, value, onChange, colors }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; colors?: Partial<Record<K, string>> }) {
  return (
    <View style={s.seg}>
      {options.map((o, i) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="button" accessibilityState={{ selected: value === o.key }}
          style={[s.segItem, i > 0 && { borderLeftWidth: BORDER, borderLeftColor: C.ink }, value === o.key && { backgroundColor: colors?.[o.key] ?? C.ink }]}>
          <Text style={[T.semi(15), value === o.key && !colors?.[o.key] && { color: C.white }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ value, onChange, title, sub, color }: { value: boolean; onChange: (v: boolean) => void; title: string; sub?: string; color?: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}
      style={[s.toggleRow, color && value ? { backgroundColor: color, borderWidth: BORDER, borderColor: C.ink, borderRadius: 20, paddingHorizontal: 16 } : null]}>
      <View style={{ flex: 1 }}>
        <Text style={T.semi(17)}>{title}</Text>
        {sub ? <Text style={[T.body(14), { color: C.muted }]}>{sub}</Text> : null}
      </View>
      <View style={[s.sw, value && { backgroundColor: C.ink }]}><View style={[s.knob, value && { left: 21, backgroundColor: C.white }]} /></View>
    </Pressable>
  );
}

export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Mono size={11}>{label}</Mono>
      <TextInput placeholderTextColor="#8a8378" {...props} style={[s.input, props.multiline && { minHeight: 100, textAlignVertical: 'top' }, props.style]} />
      {hint ? <Text style={[T.body(13), { color: C.muted }]}>{hint}</Text> : null}
      {error ? <Text style={[T.semi(14), { color: C.danger }]}>{error}</Text> : null}
    </View>
  );
}

export const Dash = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[{ borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.line, marginVertical: 4 }, style]} />;
export const Rule = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[{ height: 3, backgroundColor: C.ink }, style]} />;

export function SectionHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ borderBottomWidth: 3, borderColor: C.ink, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <H size={24}>{title}</H>{right}
    </View>
  );
}

export function Avatar({ path, name, color, size = 48, bucket = 'avatars' }: { path?: string | null; name: string; color: string; size?: number; bucket?: 'avatars' | 'events' }) {
  const url = publicUrl(bucket, path);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {url ? <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="cover" />
        : <Text style={T.display(size * 0.46)}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>}
    </View>
  );
}

export function Faces({ people, size = 34, border = C.paper }: { people: { id: string; name: string; photo_path: string | null; color: string }[]; size?: number; border?: string }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i ? -10 : 0, borderWidth: 2.5, borderColor: border, borderRadius: size }}>
          <Avatar path={p.photo_path} name={p.name} color={p.color} size={size} />
        </View>
      ))}
    </View>
  );
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <View style={s.empty}>
      <H size={28} style={{ textAlign: 'center' }}>{title}</H>
      <P style={{ textAlign: 'center', maxWidth: 280 }}>{text}</P>
      {action}
    </View>
  );
}

export const Loading = () => <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}><ActivityIndicator color={C.ink} /></View>;

export function LivePill({ dark }: { dark?: boolean }) {
  return (
    <View style={[s.live, dark && { backgroundColor: C.green }]}>
      <View style={[s.liveDot, dark && { backgroundColor: C.ink }]} />
      <Text style={[T.mono(10), { color: dark ? C.ink : C.white }]}>LIVE</Text>
    </View>
  );
}

/** Bottom sheet. */
export function Sheet({ visible, onClose, children, title }: { visible: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(21,20,19,0.5)' }} onPress={onClose} accessibilityLabel="Schließen" />
        <View style={[s.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            {title ? <H size={26}>{title}</H> : null}
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Row with a title and an arrow, for menus and settings. */
export function MenuRow({ title, sub, onPress, danger }: { title: string; sub?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.menuRow, pressed && { opacity: 0.6 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[T.semi(17), danger && { color: C.danger }]}>{title}</Text>
        {sub ? <Text style={[T.body(14), { color: C.muted }]}>{sub}</Text> : null}
      </View>
      <Text style={[T.semi(20), danger && { color: C.danger }]}>→</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 3, borderColor: C.ink, minHeight: 62 },
  iconBtn: { borderWidth: BORDER, borderColor: C.ink, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  btn: { borderWidth: BORDER, borderColor: C.ink, borderRadius: 4, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 14, flexShrink: 0 },
  pill: { borderWidth: BORDER, borderColor: C.ink, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chip: { borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  seg: { flexDirection: 'row', borderWidth: BORDER, borderColor: C.ink, borderRadius: 999, overflow: 'hidden', backgroundColor: C.white },
  segItem: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  sw: { width: 46, height: 28, borderWidth: BORDER, borderColor: C.ink, borderRadius: 999, backgroundColor: C.white },
  knob: { position: 'absolute', top: 3, left: 3, width: 17, height: 17, borderRadius: 9, backgroundColor: C.ink },
  input: { fontFamily: F.bodyMedium, fontSize: 16, color: C.ink, borderWidth: BORDER, borderColor: C.ink, borderRadius: 4, backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 12 },
  empty: { borderWidth: BORDER, borderStyle: 'dashed', borderColor: C.ink, borderRadius: 26, padding: 24, alignItems: 'center', gap: 12 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.ink, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, alignSelf: 'flex-start' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  sheet: { backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 3, borderColor: C.ink, padding: 18, maxHeight: '90%' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, borderBottomWidth: 2, borderStyle: 'dashed', borderColor: C.line },
});
