import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useMe } from './auth';
import { supabase } from './supabase';

/** Number of open reports. Only admins can read reports; for everyone else this stays 0. */
export function useOpenReports() {
  const me = useMe();
  const [count, setCount] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!me.is_admin) return;
    let alive = true;
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open')
      .then(({ count: c }) => { if (alive) setCount(c ?? 0); });
    return () => { alive = false; };
  }, [me.is_admin]));
  return me.is_admin ? count : 0;
}
