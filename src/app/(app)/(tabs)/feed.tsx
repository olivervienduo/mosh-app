import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { PostCard } from '@/components/PostCard';
import { Btn, Empty, IconBtn, Loading, TopBar, T } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { FeedPost } from '@/lib/types';
import { C } from '@/lib/theme';

type Chip = { key: string; label: string; color: string };
const PAGE = 20;

/** News from the organisers of the events you joined. Only organisers can post. */
export default function Feed() {
  const me = useMe();
  const params = useLocalSearchParams<{ event?: string }>();
  const [filter, setFilter] = useState<string>(params.event ?? 'all');
  const [chips, setChips] = useState<Chip[]>([]);
  const [own, setOwn] = useState<{ id: string; title: string }[]>([]);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [end, setEnd] = useState(false);

  useEffect(() => { if (params.event) setFilter(params.event); }, [params.event]);

  // Event chips = events I joined or created
  useEffect(() => {
    (async () => {
      const [{ data: mem }, { data: mine }] = await Promise.all([
        supabase.from('event_members').select('event:events(id,title,color,starts_on)').eq('user_id', me.id),
        supabase.from('events').select('id,title,color,starts_on').eq('creator_id', me.id),
      ]);
      const all = new Map<string, Chip & { starts_on: string }>();
      for (const r of (mem ?? []) as unknown as { event: { id: string; title: string; color: string; starts_on: string } | null }[]) {
        if (r.event) all.set(r.event.id, { key: r.event.id, label: r.event.title, color: r.event.color, starts_on: r.event.starts_on });
      }
      for (const e of mine ?? []) all.set(e.id, { key: e.id, label: e.title, color: e.color, starts_on: e.starts_on });
      setChips([...all.values()].sort((a, b) => b.starts_on.localeCompare(a.starts_on)));
      setOwn((mine ?? []).map((e) => ({ id: e.id, title: e.title })));
    })();
  }, [me.id]);

  const load = useCallback(async (before?: string) => {
    const { data } = await supabase.rpc('get_feed', {
      p_event: filter === 'all' || filter === 'saved' ? null : filter,
      p_saved: filter === 'saved', p_limit: PAGE, p_before: before ?? null,
    });
    const rows = (data as FeedPost[]) ?? [];
    setEnd(rows.length < PAGE);
    setPosts((cur) => (before && cur ? [...cur, ...rows.filter((r) => !cur.some((c) => c.id === r.id))] : rows));
  }, [filter]);

  useEffect(() => { setPosts(null); load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const update = (p: FeedPost) => setPosts((cur) => cur?.map((x) => (x.id === p.id ? p : x)) ?? cur);
  const remove = (id: string) => setPosts((cur) => cur?.filter((x) => x.id !== id) ?? cur);
  const canPost = filter !== 'all' && filter !== 'saved' ? own.find((o) => o.id === filter) : own[0];

  const all: Chip[] = [{ key: 'all', label: 'Alle', color: C.ink }, ...chips, { key: 'saved', label: '★ Gespeichert', color: C.sand }];

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar brand title="Feed" right={canPost ? <IconBtn name="plus" label="Beitrag erstellen" onPress={() => router.push({ pathname: '/event/compose', params: { event: canPost.id } })} /> : undefined} />
      <View style={{ borderBottomWidth: 2.5, borderColor: C.ink }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12 }}>
          {all.map((c) => {
            const active = filter === c.key;
            return (
              <Pressable key={c.key} onPress={() => setFilter(c.key)} accessibilityRole="tab" accessibilityState={{ selected: active }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7,
                  backgroundColor: active ? C.ink : C.white }}>
                {c.key !== 'all' && c.key !== 'saved' && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.color, borderWidth: 1.5, borderColor: active ? C.white : C.ink }} />}
                <Text style={[T.semi(14), { color: active ? C.white : C.ink }]} numberOfLines={1}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {posts === null ? <Loading /> : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => { if (!end && posts.length) load(posts[posts.length - 1].created_at); }}
          renderItem={({ item }) => <PostCard post={item} onChange={update} onRemove={() => remove(item.id)} />}
          ListEmptyComponent={
            filter === 'saved'
              ? <Empty title="Nichts gespeichert" text="Tippe bei einem Beitrag auf ··· und dann auf „Beitrag speichern“." />
              : chips.length === 0
                ? <Empty title="Dein Feed ist leer" text="Tritt Events bei. Hier erscheinen dann News von den Veranstaltern: Line-ups, Zeitpläne, Umfragen." action={<Btn solid title="Events entdecken" onPress={() => router.push('/events')} style={{ flex: 0 }} />} />
                : <Empty title="Noch keine Beiträge" text="Die Veranstalter haben hier noch nichts gepostet." />
          }
        />
      )}
    </View>
  );
}
