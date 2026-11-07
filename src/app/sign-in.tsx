import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Linking, Text } from 'react-native';
import { Btn, Field, H, P, Screen, T, TopBar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { LEGAL_URLS } from '@/lib/constants';
import { errorText, supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

/** Passwordless sign-in: e-mail address, then the one-time code from the mail. */
export default function SignIn() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pw, setPw] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  const send = async () => {
    setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Bitte gib eine gültige E-Mail-Adresse ein.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setErr(errorText(error)); else setSent(true);
  };
  const verify = async () => {
    setErr('');
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setErr('Der Code stimmt nicht oder ist abgelaufen. Fordere einen neuen an.');
  };

  // Password login exists only for the App Store / Play review demo account (created in Supabase → Auth → Users).
  const passwordLogin = async () => {
    setErr(''); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw ?? '' });
    setBusy(false);
    if (error) setErr('E-Mail oder Passwort stimmt nicht.');
  };

  return (
    <>
      <TopBar back title="Anmelden" />
      <Screen>
        <H size={40}>{sent ? 'Code eingeben' : 'Wie lautet deine E-Mail?'}</H>
        <P muted>{sent ? `Wir haben dir einen Code an ${email.trim()} geschickt. Schau auch im Spam-Ordner nach.` : 'Wir schicken dir einen Code. Kein Passwort nötig.'}</P>
        {!sent ? (
          <>
            <Field label="E-Mail-Adresse" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" textContentType="emailAddress" error={err} onSubmitEditing={send} />
            {pw === null ? <Btn solid title="Code schicken" onPress={send} loading={busy} style={{ flex: 0 }} /> : (
              <>
                <Field label="Passwort" value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" textContentType="password" onSubmitEditing={passwordLogin} />
                <Btn solid title="Anmelden" onPress={passwordLogin} loading={busy} disabled={!pw} style={{ flex: 0 }} />
              </>
            )}
            <Text style={[T.body(13), { color: C.muted }]}>
              Mit dem Fortfahren akzeptierst du die{' '}
              <Text style={{ textDecorationLine: 'underline' }} onPress={() => LEGAL_URLS.terms && Linking.openURL(LEGAL_URLS.terms)}>Nutzungsbedingungen</Text> und die{' '}
              <Text style={{ textDecorationLine: 'underline' }} onPress={() => LEGAL_URLS.privacy && Linking.openURL(LEGAL_URLS.privacy)}>Datenschutzerklärung</Text>. Mosh ist ab 18.
            </Text>
            <Text onPress={() => setPw(pw === null ? '' : null)} style={[T.body(13), { color: C.muted, textDecorationLine: 'underline' }]}>
              {pw === null ? 'Mit Passwort anmelden' : 'Lieber mit Code anmelden'}
            </Text>
          </>
        ) : (
          <>
            <Field label="Code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" error={err} maxLength={10} />
            <Btn solid title="Anmelden" onPress={verify} loading={busy} disabled={code.length < 6} style={{ flex: 0 }} />
            <Btn title="Andere E-Mail oder neuer Code" onPress={() => { setSent(false); setCode(''); }} style={{ flex: 0 }} />
          </>
        )}
      </Screen>
    </>
  );
}
