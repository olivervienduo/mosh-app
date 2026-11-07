import { supabase, errorText } from './supabase';

/** Parses "mosh://checkin/<event>/<secret>" (also accepts https links ending the same way). */
export function parseCheckin(data: string): { event: string; secret: string } | null {
  const m = data.trim().match(/checkin\/([0-9a-f-]{36})\/([0-9a-f]{16,64})\/?$/i);
  return m ? { event: m[1], secret: m[2] } : null;
}

export async function checkIn(event: string, secret: string): Promise<string | null> {
  const { error } = await supabase.rpc('check_in', { p_event: event, p_secret: secret });
  return error ? errorText(error) : null;
}
