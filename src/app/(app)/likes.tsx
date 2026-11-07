import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ModeChip } from '@/components/ModeSettings';
import { Avatar, Btn, Empty, Mono, P, T, TopBar } from '@/components/ui';
import { useFocusLoad } from '@/lib/events';
import { errorText, supabase } from '@/lib/supabase';
import type { LikeRow } from '@/lib/types';
import { C } from '@/lib/theme';

/** Who liked me (free for everyone in Mosh). Like back for an instant match. */
export default function Likes() {
  const [err, setErr] = useState('');
  const { data, setData } = useFocusLoad(async () => ((await supabase.rpc('get_likes')).data as LikeRow[]) ?? [], []);
  const answer = async (l: LikeRow, liked: boolean) => {
    setData((d) => (d ? d.filter((x) => !(x.id === l.id && x.mode === l.mode)) : d));
    const { data: m, error } = await supabase.rpc('swipe', { p_target: l.id, p_mode: l.mode, p_liked: liked, p_event: l.event_id });
    if (error) return setErr(errorText(error));
    if (m) router.push({ pathname: '/chat/[id]', params: { id: m as string } });
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back title="Deine Likes" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {data && data.length === 0 ? <Empty title="Gerade keine Likes" text="Tritt Events bei, dann sehen dich mehr Leute." /> : null}
        {data && data.length > 0 && <Mono>{data.length} {data.length === 1 ? 'Person möchte' : 'Leute möchten'} dich kennenlernen</Mono>}
        {err ? <Text style={[T.semi(14), { color: C.danger }]}>{err}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {data?.map((l) => (
            <View key={l.id + l.mode} style={{ width: '47%', borderRadius: 24, overflow: 'hidden', borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.white }}>
              <View style={{ aspectRatio: 1, backgroundColor: l.color, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2.5, borderColor: C.ink }}>
                <Avatar path={l.photo_path} name={l.name} color={l.color} size={150} />
                <View style={{ position: 'absolute', left: 10, top: 10 }}><ModeChip mode={l.mode} /></View>
              </View>
              <View style={{ padding: 12, gap: 4 }}>
                <Text style={T.display(22)}>{l.name}, {l.age}</Text>
                {l.event_title ? <Mono size={10}>{l.event_title}</Mono> : null}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Btn small title="✕" onPress={() => answer(l, false)} style={{ flex: 1 }} />
                  <Btn small solid title="♥" onPress={() => answer(l, true)} style={{ flex: 1 }} />
                </View>
              </View>
            </View>
          ))}
        </View>
        <P muted style={{ fontSize: 14 }}>Wen du überspringst, erfährt davon nichts.</P>
      </ScrollView>
    </View>
  );
}
