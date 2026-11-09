import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Text } from 'react-native';
import { Btn, Field, H, P, Screen, T, TopBar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { LEGAL_URLS, WEB_URL } from '@/lib/constants';
import { MIN_PASSWORD, authErrorText } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

type Mode = 'login' | 'signup' | 'forgot';

const TITLES: Record<Mode, [string, string]> = {
  login: ['Anmelden', 'Mit deiner E-Mail-Adresse und deinem Passwort.'],
  signup: ['Konto erstellen', 'Nur E-Mail-Adresse und Passwort. Dein Profil richtest du gleich danach ein.'],
  forgot: ['Passwort vergessen', 'Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst.'],
};

export default function SignIn() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  if (session) return <Redirect href="/" />;

  const mail = email.trim().toLowerCase();
  const switchTo = (m: Mode) => { setMode(m); setErr(''); setInfo(''); setPw(''); setPw2(''); };

  const submit = async () => {
    setErr(''); setInfo('');
    if (!/^\S+@\S+\.\S+$/.test(mail)) { setErr('Bitte gib eine gültige E-Mail-Adresse ein.'); return; }
    if (mode === 'signup') {
      if (pw.length < MIN_PASSWORD) { setErr(`Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`); return; }
      if (pw !== pw2) { setErr('Die beiden Passwörter sind nicht gleich.'); return; }
    }
    if (mode === 'login' && !pw) { setErr('Bitte gib dein Passwort ein.'); return; }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pw });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: mail, password: pw });
        if (error) throw error;
        // With "Confirm email" switched on, Supabase hides existing accounts behind an empty identities list.
        if (data.user && data.user.identities?.length === 0) { setErr('Für diese E-Mail-Adresse gibt es schon ein Konto. Melde dich an.'); return; }
        if (!data.session) { setInfo(`Fast geschafft. Wir haben dir einen Link an ${mail} geschickt. Klick darauf, um dein Konto zu bestätigen, und melde dich dann hier an. Schau auch im Spam-Ordner nach.`); setMode('login'); setPw(''); setPw2(''); }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${WEB_URL}/new-password` });
        if (error) throw error;
        setInfo(`Wenn es für ${mail} ein Konto gibt, ist jetzt eine Mail mit einem Link unterwegs. Schau auch im Spam-Ordner nach.`);
      }
    } catch (x) {
      setErr(authErrorText(x));
    } finally {
      setBusy(false);
    }
  };

  const [title, sub] = TITLES[mode];
  const link = { color: C.muted, textDecorationLine: 'underline' as const };

  return (
    <>
      <TopBar back title={title} />
      <Screen>
        <H size={40}>{title}</H>
        <P muted>{sub}</P>
        {info ? <P style={{ backgroundColor: C.white, borderWidth: 2, borderColor: C.ink, borderRadius: 12, padding: 12 }}>{info}</P> : null}

        <Field label="E-Mail-Adresse" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
          autoComplete="email" keyboardType="email-address" inputMode="email" textContentType={mode === 'signup' ? 'username' : 'emailAddress'}
          error={mode === 'forgot' ? err : undefined} onSubmitEditing={mode === 'forgot' ? submit : undefined} />

        {mode !== 'forgot' && (
          <Field label="Passwort" value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" autoCorrect={false}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            hint={mode === 'signup' ? `Mindestens ${MIN_PASSWORD} Zeichen.` : undefined}
            error={mode === 'login' ? err : undefined} onSubmitEditing={mode === 'login' ? submit : undefined} />
        )}
        {mode === 'signup' && (
          <Field label="Passwort wiederholen" value={pw2} onChangeText={setPw2} secureTextEntry autoCapitalize="none" autoCorrect={false}
            autoComplete="new-password" textContentType="newPassword" error={err} onSubmitEditing={submit} />
        )}

        <Btn solid title={mode === 'login' ? 'Anmelden' : mode === 'signup' ? 'Konto erstellen' : 'Link schicken'} onPress={submit} loading={busy} style={{ flex: 0 }} />

        {mode === 'login' && <Text onPress={() => switchTo('forgot')} style={[T.body(14), link]}>Passwort vergessen?</Text>}
        {mode === 'signup' && (
          <Text style={[T.body(13), { color: C.muted }]}>
            Mit dem Erstellen des Kontos akzeptierst du die{' '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => LEGAL_URLS.terms && Linking.openURL(LEGAL_URLS.terms)}>Nutzungsbedingungen</Text> und die{' '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => LEGAL_URLS.privacy && Linking.openURL(LEGAL_URLS.privacy)}>Datenschutzerklärung</Text>. MOSHCHAT ist ab 18.
          </Text>
        )}

        <Text onPress={() => switchTo(mode === 'signup' ? 'login' : mode === 'login' ? 'signup' : 'login')} style={[T.body(14), link]}>
          {mode === 'login' ? 'Noch kein Konto? Jetzt erstellen' : mode === 'signup' ? 'Schon ein Konto? Anmelden' : 'Zurück zum Anmelden'}
        </Text>
      </Screen>
    </>
  );
}
