import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { isoDay } from './dates';
import { supabase } from './supabase';
import type { EventRow, People } from './types';

export type MemberMap = Record<string, { here: boolean }>;

export async function fetchMemberships(userId: string): Promise<MemberMap> {
  const { data } = await supabase.from('event_members').select('event_id, checked_in_on').eq('user_id', userId);
  const today = isoDay(new Date());
  return Object.fromEntries((data ?? []).map((r) => [r.event_id, { here: r.checked_in_on === today }]));
}

export async function fetchEvents(q: string): Promise<EventRow[]> {
  let query = supabase.from('events').select('*');
  const term = q.trim().replace(/[%,()]/g, ' ');
  if (term) {
    query = query.or(['title', 'venue', 'city', 'description', 'category'].map((c) => `${c}.ilike.%${term}%`).join(','));
  } else {
    const from = new Date(); from.setDate(from.getDate() - 60);
    query = query.or(`starts_on.gte.${isoDay(from)},ends_on.gte.${isoDay(from)}`);
  }
  const { data, error } = await query.order('starts_on').limit(term ? 60 : 300);
  if (error) throw error;
  return (data as EventRow[]) ?? [];
}

export async function fetchEvent(id: string) {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as EventRow | null;
}

export async function fetchPeople(id: string): Promise<People | null> {
  const { data } = await supabase.rpc('event_people', { p_event: id });
  return (data as People) ?? null;
}

export async function joinEvent(eventId: string, userId: string) {
  const { error } = await supabase.from('event_members').upsert({ event_id: eventId, user_id: userId });
  if (error) throw error;
}
export async function leaveEvent(eventId: string, userId: string) {
  const { error } = await supabase.from('event_members').delete().eq('event_id', eventId).eq('user_id', userId);
  if (error) throw error;
}

/** Re-runs a loader whenever the screen gains focus. */
export function useFocusLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const run = useCallback(async () => {
    try { setData(await load()); setError(''); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useFocusEffect(useCallback(() => { run(); }, [run]));
  return { data, setData, error, loading, reload: run };
}
