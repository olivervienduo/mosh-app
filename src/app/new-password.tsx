import { router } from 'expo-router';
import { useState } from 'react';
import { Btn, Field, H, P, Screen, TopBar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { MIN_PASSWORD, authErrorText } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

/**
 * Set a new password. Reached two ways:
 * - from the "Passwort vergessen" mail (web: the link signs you in for this one step),
 * - from Einstellungen → Passwort ändern.
 */
export default function NewPassword() {
  const { session } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const save = async () => {
    setErr('');
    if (pw.length < MIN_PASSWORD) { setErr(`Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`); return; }
    if (pw !== pw2) { setErr('Die beiden Passwörter sind nicht gleich.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setErr(authErrorText(error)); else setDone(true);
  };

  if (!session) {
    return (
      <>
        <TopBar back title="Neues Passwort" />
        <Screen>
          <H size={40}>Link abgelaufen</H>
          <P muted>Dieser Link funktioniert nicht mehr. Fordere einfach einen neuen an.</P>
          <Btn solid title="Neuen Link anfordern" onPress={() => router.replace('/sign-in')} style={{ flex: 0 }} />
        </Screen>
      </>
    );
  }

  if (done) {
    return (
      <>
        <TopBar title="Neues Passwort" />
        <Screen>
          <H size={40}>Gespeichert</H>
          <P muted>Dein neues Passwort gilt ab sofort. Ab jetzt meldest du dich damit an, auch in der App am Handy.</P>
          <Btn solid title="Weiter" onPress={() => router.replace('/')} style={{ flex: 0 }} />
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar back title="Neues Passwort" />
      <Screen>
        <H size={40}>Neues Passwort</H>
        <P muted>Für {session.user.email}</P>
        <Field label="Neues Passwort" value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" autoCorrect={false}
          autoComplete="new-password" textContentType="newPassword" hint={`Mindestens ${MIN_PASSWORD} Zeichen.`} />
        <Field label="Passwort wiederholen" value={pw2} onChangeText={setPw2} secureTextEntry autoCapitalize="none" autoCorrect={false}
          autoComplete="new-password" textContentType="newPassword" error={err} onSubmitEditing={save} />
        <Btn solid title="Passwort speichern" onPress={save} loading={busy} style={{ flex: 0 }} />
      </Screen>
    </>
  );
}
