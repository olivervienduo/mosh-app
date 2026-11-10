import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { ModeChips, alsoMatchText } from '@/components/ModeSettings';
import { Avatar, Btn, Empty, H, Mono, P, T, TopBar } from '@/components/ui';
import { MODES, type Mode } from '@/lib/constants';
import { useFocusLoad } from '@/lib/events';
import { supabase } from '@/lib/supabase';
import type { ChatRow, LikeRow } from '@/lib/types';
import { C } from '@/lib/theme';

const WEEK = 7 * 864e5;

function ChatItem({ c }: { c: ChatRow }) {
  const last = c.last_kind === 'meet' ? 'Treffpunkt vorgeschlagen' : c.last_kind === 'system' ? alsoMatchText(c.last_body as Mode) : c.last_body ?? '';
  return (
    <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.match_id } })} accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 2, borderStyle: 'dashed', borderColor: C.line }}>
      <View>
        <Avatar path={c.other_photo} name={c.other_name} color={c.other_color} size={60} />
        {c.here && <View style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: C.green, borderWidth: 3, borderColor: C.paper }} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={T.display(20)}>{c.other_name}</Text><View style={{ flexShrink: 1 }}><ModeChips modes={c.modes?.length ? c.modes : [c.mode]} /></View></View>
        <Text numberOfLines={1} style={[T.body(15), { color: c.unread ? C.ink : C.muted }, c.unread ? { fontFamily: 'Archivo-SemiBold' } : null]}>{c.last_kind !== 'system' && c.last_sender && c.last_sender !== c.other_id ? 'Du: ' : ''}{last}</Text>
        {c.event_title ? <Mono size={11} style={{ color: C.muted }}>{c.event_title}</Mono> : null}
      </View>
      {c.unread > 0 && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.ink }} />}
    </Pressable>
  );
}

export default function Chats() {
  const [older, setOlder] = useState(false);
  const { data, loading, reload } = useFocusLoad(async () => {
    const [chats, likes] = await Promise.all([supabase.rpc('get_chats'), supabase.rpc('get_likes')]);
    return { chats: (chats.data as ChatRow[]) ?? [], likes: (likes.data as LikeRow[]) ?? [], now: Date.now() };
  }, []);
  const chats = data?.chats ?? [];
  const fresh = chats.filter((c) => !c.last_body && c.last_kind === null);
  const talks = chats.filter((c) => c.last_kind !== null);
  const now = data?.now ?? 0;
  const recent = talks.filter((c) => now - new Date(c.last_message_at).getTime() < WEEK);
  const old = talks.filter((c) => now - new Date(c.last_message_at).getTime() >= WEEK);
  const likes = data?.likes ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar brand title="Chats" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        <H size={26}>Deine Matches</H>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingVertical: 16, paddingHorizontal: 4 }}>
          <Pressable onPress={() => router.push('/likes')} accessibilityLabel={`${likes.length} Likes ansehen`} style={{ width: 96, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 96, height: 96 }}>
              <View style={{ position: 'absolute', right: 0, top: 6, width: 80, height: 88, borderRadius: 16, backgroundColor: likes[0] ? MODES[likes[0].mode].color : C.sand, borderWidth: 2.5, borderColor: C.ink }} />
              <View style={{ position: 'absolute', left: 0, top: 0, width: 80, height: 92, borderRadius: 16, backgroundColor: likes[0]?.color ?? C.sand, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Icon name="heart" size={34} /></View>
              <View style={{ position: 'absolute', left: -6, bottom: -8, minWidth: 36, height: 36, borderRadius: 18, backgroundColor: C.ink, borderWidth: 3, borderColor: C.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                <Text style={[T.display(17), { color: C.white }]}>{likes.length}</Text>
              </View>
            </View>
            <Mono>Likes</Mono>
          </Pressable>
          {fresh.map((c) => (
            <Pressable key={c.match_id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.match_id } })} style={{ width: 96, alignItems: 'center', gap: 12 }}>
              <View style={{ padding: 4, borderRadius: 60, borderWidth: 5, borderColor: MODES[c.mode].color }}>
                <Avatar path={c.other_photo} name={c.other_name} color={c.other_color} size={76} />
              </View>
              <Text numberOfLines={1} style={T.mono(12)}>{c.other_name}</Text>
            </Pressable>
          ))}
          {fresh.length === 0 && <View style={{ justifyContent: 'center', maxWidth: 200 }}><P muted style={{ fontSize: 14 }}>Neue Matches erscheinen hier. Tipp drauf und schreib den ersten Satz.</P></View>}
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 3, borderColor: C.ink, paddingBottom: 4, marginTop: 10 }}>
          <H size={26}>Chats</H><Mono style={{ color: C.muted }}>Aktuell</Mono>
        </View>
        {data && talks.length === 0 && fresh.length === 0 && (
          <View style={{ marginTop: 16 }}><Empty title="Noch keine Chats" text="Tritt einem Event bei und tippe auf „Leute treffen“." action={<Btn solid title="Zu den Events" onPress={() => router.push('/events')} style={{ flex: 0 }} />} /></View>
        )}
        {recent.map((c) => <ChatItem key={c.match_id} c={c} />)}
        {data && talks.length > 0 && recent.length === 0 && <P muted style={{ paddingVertical: 14 }}>Keine aktuellen Chats.</P>}
        {old.length > 0 && (
          <>
            <Pressable onPress={() => setOlder(!older)} accessibilityRole="button" accessibilityState={{ expanded: older }} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18 }}>
              <Text style={T.body(19)}>Ältere Chats <Text style={{ color: C.muted }}>({old.length})</Text></Text>
              <View style={{ transform: [{ rotate: older ? '180deg' : '0deg' }] }}><Icon name="chev" size={26} /></View>
            </Pressable>
            {older && old.map((c) => <ChatItem key={c.match_id} c={c} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}
