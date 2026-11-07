import { Tabs, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

const TABS = [
  { name: 'events', label: 'Events' },
  { name: 'feed', label: 'Feed' },
  { name: 'chats', label: 'Chats' },
  { name: 'profile', label: 'Profil' },
] as const;

function useUnread() {
  const path = usePathname();
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () => supabase.rpc('get_chats').then(({ data }) => {
      if (alive && data) setN((data as { unread: number }[]).reduce((a, r) => a + (r.unread > 0 ? 1 : 0), 0));
    });
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [path]);
  return n;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const unread = useUnread();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.paper } }}
      tabBar={({ state, navigateToTab }) => (
        <View style={{ flexDirection: 'row', borderTopWidth: 3, borderColor: C.ink, backgroundColor: C.paper, paddingBottom: insets.bottom }}>
          {state.routes.map((r, i) => {
            const t = TABS.find((x) => x.name === r.name) ?? { name: r.name, label: r.name };
            const active = state.index === i;
            return (
              <Pressable key={t.name} accessibilityRole="tab" accessibilityState={{ selected: active }}
                onPress={() => navigateToTab(r.key)}
                style={{ flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
                  backgroundColor: active ? C.ink : C.paper, borderLeftWidth: i ? 2 : 0, borderColor: C.ink }}>
                <Text style={[T.mono(12), { color: active ? C.white : C.ink }]}>{t.label}</Text>
                {t.name === 'chats' && unread > 0 && (
                  <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.date, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                    <Text style={T.mono(10)}>{unread}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    >
      {TABS.map((t) => <Tabs.Screen key={t.name} name={t.name} />)}
    </Tabs>
  );
}
