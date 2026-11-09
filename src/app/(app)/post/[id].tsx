import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { PostCard } from '@/components/PostCard';
import { ReportSheet, useToast } from '@/components/ReportSheet';
import { Avatar, Loading, MenuRow, P, Segmented, Sheet, T, TopBar } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { ago } from '@/lib/dates';
import { errorText, supabase } from '@/lib/supabase';
import type { CommentRow, FeedPost } from '@/lib/types';
import { C, F } from '@/lib/theme';
import { featureGate } from '@/components/FeatureGate';

const QUICK = ['🔥', '❤️', '😂', '👏', '🙌', '😮'];

function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const toast = useToast();
  const [post, setPost] = useState<FeedPost | null | undefined>(undefined);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [text, setText] = useState('');
  const [reply, setReply] = useState<CommentRow | null>(null);
  const [menu, setMenu] = useState<CommentRow | null>(null);
  const [report, setReport] = useState<CommentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const loadComments = useCallback(async () => {
    const { data } = await supabase.rpc('get_comments', { p_post: id });
    setComments((data as CommentRow[]) ?? []);
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('posts').select('event_id').eq('id', id).maybeSingle();
      if (!p) { setPost(null); return; }
      const { data } = await supabase.rpc('get_feed', { p_event: p.event_id, p_limit: 200 });
      setPost(((data as FeedPost[]) ?? []).find((x) => x.id === id) ?? null);
    })();
    loadComments();
  }, [id, loadComments]);

  const tops = useMemo(() => {
    const t = comments.filter((c) => !c.parent_id);
    return sort === 'new' ? [...t].reverse() : [...t].sort((a, b) => b.likes - a.likes || a.created_at.localeCompare(b.created_at));
  }, [comments, sort]);
  const replies = (pid: string) => comments.filter((c) => c.parent_id === pid);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const parent = reply ? (reply.parent_id ?? reply.id) : null;
    const { error } = await supabase.from('comments').insert({ post_id: id, author_id: me.id, body, parent_id: parent });
    setBusy(false);
    if (error) return toast.show(errorText(error));
    setText(''); setReply(null);
    if (post) setPost({ ...post, comment_count: post.comment_count + 1 });
    loadComments();
  };
  const like = async (c: CommentRow) => {
    setComments((cur) => cur.map((x) => (x.id === c.id ? { ...x, liked: !c.liked, likes: x.likes + (c.liked ? -1 : 1) } : x)));
    if (c.liked) await supabase.from('comment_likes').delete().match({ comment_id: c.id, user_id: me.id });
    else await supabase.from('comment_likes').insert({ comment_id: c.id, user_id: me.id });
  };
  const del = async (c: CommentRow) => {
    setMenu(null);
    const { error } = await supabase.from('comments').delete().eq('id', c.id);
    if (error) return toast.show(errorText(error));
    loadComments();
  };

  if (post === undefined) return <Loading />;
  if (post === null) return <><TopBar back title="Beitrag" /><View style={{ padding: 16 }}><P>Dieser Beitrag ist nicht mehr verfügbar.</P></View></>;
  const organiser = post.mine;

  const Item = ({ c, child }: { c: CommentRow; child?: boolean }) => (
    <View style={{ flexDirection: 'row', gap: 10, marginLeft: child ? 46 : 0 }}>
      <Avatar path={c.is_organiser ? null : c.author_photo} name={c.author_name} color={c.author_color} size={child ? 30 : 38} />
      <View style={{ flex: 1, gap: 4 }}>
        <Pressable onLongPress={() => setMenu(c)} style={{ alignSelf: 'flex-start', backgroundColor: c.is_organiser ? c.author_color : C.white, borderWidth: 2, borderColor: C.ink, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' }}>
          <Text style={T.semi(14)}>{c.author_name}{c.is_organiser ? ' · Veranstalter' : ''}</Text>
          <Text selectable style={T.body(15)}>{c.body}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 16, paddingLeft: 8, alignItems: 'center' }}>
          <Text style={[T.body(12), { color: C.muted }]}>{ago(c.created_at)}</Text>
          <Pressable onPress={() => like(c)} hitSlop={8}><Text style={[T.semi(13), { color: c.liked ? C.ink : C.muted }]}>{c.liked ? 'Gefällt dir' : 'Gefällt mir'}{c.likes ? ` · ${c.likes}` : ''}</Text></Pressable>
          <Pressable onPress={() => { setReply(c); }} hitSlop={8}><Text style={[T.semi(13), { color: C.muted }]}>Antworten</Text></Pressable>
          <Pressable onPress={() => setMenu(c)} hitSlop={8} accessibilityLabel="Kommentaroptionen"><Text style={[T.semi(13), { color: C.muted }]}>···</Text></Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: C.paper }}>
      <TopBar back title="Beitrag" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <PostCard post={post} detail onChange={setPost} onRemove={() => router.back()} />
          {comments.length > 1 && <Segmented options={[{ key: 'top', label: 'Relevanteste' }, { key: 'new', label: 'Neueste' }]} value={sort} onChange={setSort} />}
          {comments.length === 0 && <P muted style={{ textAlign: 'center' }}>Noch keine Kommentare. Schreib den ersten.</P>}
          {tops.map((c) => (
            <View key={c.id} style={{ gap: 12 }}>
              <Item c={c} />
              {replies(c.id).map((r) => <Item key={r.id} c={r} child />)}
            </View>
          ))}
        </ScrollView>
        <View style={{ borderTopWidth: 3, borderColor: C.ink, padding: 10, gap: 8, backgroundColor: C.paper }}>
          {reply && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[T.body(13), { color: C.muted }]}>Antwort an {reply.author_name}</Text>
              <Pressable onPress={() => setReply(null)} hitSlop={8}><Icon name="close" size={18} /></Pressable>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {QUICK.map((q) => <Pressable key={q} onPress={() => setText((t) => t + q)} style={{ paddingHorizontal: 6 }}><Text style={{ fontSize: 22 }}>{q}</Text></Pressable>)}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <Avatar path={me.photo_path} name={me.name} color={me.color} size={40} />
            <TextInput value={text} onChangeText={setText} placeholder={organiser ? `Als ${post.event_title} kommentieren` : 'Kommentieren …'} placeholderTextColor={C.muted} multiline maxLength={600}
              style={{ flex: 1, minHeight: 44, maxHeight: 110, fontFamily: F.bodyMedium, fontSize: 16, color: C.ink, borderWidth: 2.5, borderColor: C.ink, borderRadius: 22, backgroundColor: C.white, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 }} />
            <Pressable onPress={send} disabled={!text.trim() || busy} accessibilityLabel="Kommentar senden"
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.35 }}>
              <Icon name="send" color={C.white} size={20} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={!!menu} onClose={() => setMenu(null)}>
        {menu && <MenuRow title="Antworten" onPress={() => { setReply(menu); setMenu(null); }} />}
        {menu && (menu.mine || organiser || me.is_admin) && <MenuRow title="Kommentar löschen" onPress={() => del(menu)} danger />}
        {menu && !menu.mine && <MenuRow title="Kommentar melden" onPress={() => { setReport(menu); setMenu(null); }} danger />}
      </Sheet>
      {report && <ReportSheet target={{ comment: report.id, user: report.is_organiser ? undefined : report.author_id }} visible onClose={() => setReport(null)} onDone={(m) => { setReport(null); toast.show(m); }} />}
      {toast.node}
    </SafeAreaView>
  );
}

// Hidden while FEATURES.feed is off (see src/lib/features.ts).
export default featureGate('feed', PostDetail);
