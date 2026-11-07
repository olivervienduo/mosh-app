import './localstorage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isConfigured = !!url && !!key;

export const supabase = createClient(url ?? 'https://example.supabase.co', key ?? 'missing-key', {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export const publicUrl = (bucket: 'avatars' | 'events' | 'posts', path?: string | null) =>
  path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;

/** Turns a Supabase/Postgres error into a sentence for people. */
export function errorText(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/network|fetch/i.test(msg)) return 'Keine Verbindung. Prüf dein Internet und versuch es nochmal.';
  if (/JWT|session/i.test(msg)) return 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.';
  return msg.replace(/^.*?ERROR:\s*/, '');
}
