import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { unregisterPush } from './push';
import { supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<Profile | null>;
  updateProfile: (patch: Partial<Profile>) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid?: string) => {
    if (!uid) { setProfile(null); return null; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
    return (data as Profile) ?? null;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      loadProfile(s?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session]);

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    if (!session) return 'Nicht angemeldet.';
    setProfile((p) => (p ? { ...p, ...patch } : p));
    const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
    if (error) { await loadProfile(session.user.id); return error.message; }
    return null;
  }, [session, loadProfile]);

  const signOut = useCallback(async () => {
    const uid = (await supabase.auth.getSession()).data.session?.user.id;
    if (uid) await unregisterPush(uid);
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return <Ctx.Provider value={{ session, profile, loading, refreshProfile, updateProfile, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

/** Profile of the signed-in, onboarded person (only call inside the (app) group). */
export function useMe(): Profile {
  const { profile } = useAuth();
  return profile as Profile;
}
