import { errorText } from './supabase';

export const MIN_PASSWORD = 8;

/** Turns Supabase auth errors into German sentences. */
export function authErrorText(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'E-Mail oder Passwort stimmt nicht.';
  if (code === 'email_not_confirmed' || /not confirmed/i.test(msg)) return 'Bitte bestätige zuerst deine E-Mail-Adresse. Den Link dafür haben wir dir geschickt.';
  if (code === 'user_already_exists' || /already registered|already exists/i.test(msg)) return 'Für diese E-Mail-Adresse gibt es schon ein Konto. Melde dich an.';
  if (code === 'weak_password' || /password should|weak/i.test(msg)) return `Das Passwort ist zu schwach. Nimm mindestens ${MIN_PASSWORD} Zeichen.`;
  if (code === 'same_password' || /different from the old/i.test(msg)) return 'Das neue Passwort muss sich vom alten unterscheiden.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit|too many/i.test(msg)) return 'Zu viele Versuche. Warte ein paar Minuten und versuch es nochmal.';
  if (code === 'signup_disabled' || /signups not allowed/i.test(msg)) return 'Neue Konten sind gerade nicht möglich.';
  return errorText(e);
}
