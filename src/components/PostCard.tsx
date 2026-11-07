import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useMe } from '@/lib/auth';
import { REACTIONS, type ReactionKind } from '@/lib/constants';
import { ago, fmtN } from '@/lib/dates';
import { publicUrl, supabase } from '@/lib/supabase';
import type { FeedPost, Media } from '@/lib/types';
import { C } from '@/lib/theme';
import { Icon, Thumb } from './Icon';
import { ReportSheet } from './ReportSheet';
import { Avatar, IconBtn, MenuRow, Sheet, T } from './ui';

const KINDS = Object.keys(REACTIONS) as ReactionKind[];

function Video({ m, width }: { m: Media; width: number }) {
  const player = useVideoPlayer(publicUrl('posts', m.path) ?? '', (p) => { p.loop = true; p.muted = true; });
  const ratio = m.width && m.height ? m.width / m.height : 16 / 9;
  return <VideoView player={player} nativeControls contentFit="cover" style={{ width, height: Math.min(width / ratio, width * 1.25), backgroundColor: C.ink }} />;
}

function MediaGrid({ media, width }: { media: Media[]; width: number }) {
  if (!media.length) return null;
  const [first, ...rest] = media;
  const one = (m: Media, w: number, h?: number) => m.type === 'video' ? <Video key={m.path} m={m} width={w} />
    : <Image key={m.path} source={{ uri: publicUrl('posts', m.path) ?? undefined }} contentFit="cover" transition={150}
        style={{ width: w, height: h ?? Math.min(w / ((m.width && m.height) ? m.width / m.height : 4 / 3), w * 1.25), backgroundColor: C.sand }} />;
  if (media.length === 1) return <View style={{ borderTopWidth: 2.5, borderBottomWidth: 2.5, borderColor: C.ink }}>{one(first, width)}</View>;
  const small = rest.slice(0, 3);
  const sw = (width - 3 * (small.length - 1)) / small.length;
  return (
    <View style={{ borderTopWidth: 2.5, borderBottomWidth: 2.5, borderColor: C.ink, gap: 3, backgroundColor: C.ink }}>
      {one(first, width, width * 0.66)}
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {small.map((m, i) => (
          <View key={m.path}>
            {m.type === 'video' ? <View style={{ width: sw, height: sw, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Text style={[T.display(28), { color: C.white }]}>▶</Text></View> : one(m, sw, sw)}
            {i === small.length - 1 && media.length > 4 && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(21,20,19,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[T.display(30), { color: C.white }]}>+{media.length - 4}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ReactionSummary({ reactions, color }: { reactions: FeedPost['reactions']; color: string }) {
  const sorted = KINDS.filter((k) => (reactions[k] ?? 0) > 0).sort((a, b) => (reactions[b] ?? 0) - (reactions[a] ?? 0)).slice(0, 3);
  const total = KINDS.reduce((a, k) => a + (reactions[k] ?? 0), 0);
  if (!total) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row' }}>
        {sorted.map((k, i) => (
          <View key={k} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.white, backgroundColor: k === 'like' ? color : C.white, alignItems: 'center', justifyContent: 'center', marginLeft: i ? -7 : 0, zIndex: 3 - i }}>
            {k === 'like' ? <Thumb size={14} fill={color} sw={2.4} /> : <Text style={{ fontSize: 13 }}>{REACTIONS[k].emoji}</Text>}
          </View>
        ))}
      </View>
      <Text style={[T.body(14), { color: C.muted }]}>{fmtN(total)}</Text>
    </View>
  );
}

/** One organiser post: event header, text, photos/videos, poll, reactions, comments. */
export function PostCard({ post, onChange, onRemove, detail }: { post: FeedPost; onChange: (p: FeedPost) => void; onRemove: () => void; detail?: boolean }) {
  const me = useMe();
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [more, setMore] = useState(false);

  const react = async (kind: ReactionKind | null) => {
    setPicker(false);
    Haptics.selectionAsync().catch(() => {});
    const r = { ...post.reactions };
    if (post.my_reaction) r[post.my_reaction] = Math.max(0, (r[post.my_reaction] ?? 1) - 1);
    if (kind) r[kind] = (r[kind] ?? 0) + 1;
    onChange({ ...post, reactions: r, my_reaction: kind });
    if (kind) await supabase.from('post_reactions').upsert({ post_id: post.id, user_id: me.id, kind });
    else await supabase.from('post_reactions').delete().eq('post_id', post.id).eq('user_id', me.id);
  };
  const vote = async (idx: number) => {
    if (!post.poll) return;
    const prev = post.my_vote;
    onChange({ ...post, my_vote: idx, poll: post.poll.map((o) => ({ ...o, votes: o.votes + (o.idx === idx ? 1 : 0) - (o.idx === prev ? 1 : 0) })) });
    await supabase.from('poll_votes').upsert({ post_id: post.id, user_id: me.id, idx });
  };
  const toggleSave = async () => {
    setMenu(false);
    onChange({ ...post, saved: !post.saved });
    if (post.saved) await supabase.from('post_flags').delete().match({ post_id: post.id, user_id: me.id, kind: 'saved' });
    else await supabase.from('post_flags').upsert({ post_id: post.id, user_id: me.id, kind: 'saved' });
  };
  const hide = async () => {
    setMenu(false); onRemove();
    await supabase.from('post_flags').upsert({ post_id: post.id, user_id: me.id, kind: 'hidden' });
  };
  const del = async () => {
    setMenu(false); onRemove();
    await supabase.from('posts').delete().eq('id', post.id);
  };
  const totalVotes = post.poll?.reduce((a, o) => a + o.votes, 0) ?? 0;
  const long = post.body.length > 280 && !detail && !more;
  const mine = post.my_reaction;

  return (
    <View style={{ backgroundColor: C.white, borderWidth: 2.5, borderColor: C.ink, borderRadius: 26, overflow: 'hidden' }}>
      <View style={{ height: 10, backgroundColor: post.event_color, borderBottomWidth: 2.5, borderColor: C.ink }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
        <Pressable onPress={() => router.push({ pathname: '/event/[id]', params: { id: post.event_id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={{ borderWidth: 2.5, borderColor: C.ink, borderRadius: 30 }}><Avatar name={post.event_title} color={post.event_color} size={42} /></View>
          <View style={{ flex: 1 }}>
            <Text style={T.display(18)} numberOfLines={1}>{post.event_title}{post.event_official ? ' ✓' : ''}</Text>
            <Text style={[T.body(13), { color: C.muted }]}>{post.pinned ? '📌 Angeheftet · ' : ''}{ago(post.created_at)}{post.event_live ? ' · LIVE' : ''}</Text>
          </View>
        </Pressable>
        <IconBtn name="more" label="Beitragsoptionen" size={36} onPress={() => setMenu(true)} />
      </View>
      {post.body ? (
        <Pressable disabled={!long} onPress={() => setMore(true)} style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text selectable style={T.body(16)} numberOfLines={long ? 6 : undefined}>{post.body}</Text>
          {long && <Text style={[T.semi(15), { color: C.muted }]}>Mehr anzeigen</Text>}
        </Pressable>
      ) : null}
      <MediaGrid media={post.media ?? []} width={cardW - 5} />
      {post.poll && (
        <View style={{ padding: 16, gap: 8 }}>
          {post.poll.map((o) => {
            const pct = totalVotes ? Math.round((o.votes / totalVotes) * 100) : 0;
            const chosen = post.my_vote === o.idx;
            return (
              <Pressable key={o.idx} onPress={() => vote(o.idx)} accessibilityRole="button" accessibilityState={{ selected: chosen }}
                style={{ borderWidth: 2.5, borderColor: C.ink, borderRadius: 4, overflow: 'hidden', minHeight: 46, justifyContent: 'center' }}>
                {post.my_vote !== null && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: chosen ? post.event_color : C.paper2 }} />}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
                  <Text style={T.semi(16)}>{chosen ? '✓ ' : ''}{o.label}</Text>
                  {post.my_vote !== null && <Text style={T.mono(12)}>{pct}%</Text>}
                </View>
              </Pressable>
            );
          })}
          <Text style={[T.body(13), { color: C.muted }]}>{fmtN(totalVotes)} {totalVotes === 1 ? 'Stimme' : 'Stimmen'}{post.my_vote === null ? ' · Tippe zum Abstimmen' : ''}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, minHeight: 34 }}>
        <ReactionSummary reactions={post.reactions} color={post.event_color} />
        {post.comment_count > 0 && <Text style={[T.body(14), { color: C.muted }]}>{fmtN(post.comment_count)} {post.comment_count === 1 ? 'Kommentar' : 'Kommentare'}</Text>}
      </View>
      {picker && (
        <View style={{ flexDirection: 'row', alignSelf: 'flex-start', marginLeft: 12, marginTop: 8, gap: 4, backgroundColor: C.white, borderWidth: 2.5, borderColor: C.ink, borderRadius: 999, padding: 6 }}>
          {KINDS.map((k) => (
            <Pressable key={k} onPress={() => react(mine === k ? null : k)} accessibilityLabel={REACTIONS[k].label}
              style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: mine === k ? C.paper2 : 'transparent' }}>
              {k === 'like' ? <Thumb size={26} fill={post.event_color} /> : <Text style={{ fontSize: 26 }}>{REACTIONS[k].emoji}</Text>}
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.line, marginTop: 10 }}>
        <Pressable onPress={() => react(mine ? null : 'like')} onLongPress={() => setPicker(!picker)} delayLongPress={250}
          accessibilityLabel={mine ? 'Reaktion entfernen' : 'Gefällt mir (lange drücken für mehr)'}
          style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 13 }}>
          {mine && mine !== 'like' ? <Text style={{ fontSize: 20 }}>{REACTIONS[mine].emoji}</Text> : <Thumb size={22} fill={mine === 'like' ? post.event_color : C.white} />}
          <Text style={T.semi(15)}>{mine ? REACTIONS[mine].label : 'Gefällt mir'}</Text>
        </Pressable>
        <Pressable onPress={() => detail ? undefined : router.push({ pathname: '/post/[id]', params: { id: post.id } })}
          style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 13 }}>
          <Icon name="bubble" /><Text style={T.semi(15)}>Kommentieren</Text>
        </Pressable>
      </View>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <MenuRow title={post.saved ? 'Nicht mehr speichern' : 'Beitrag speichern'} onPress={toggleSave} />
        <MenuRow title="Zum Event" onPress={() => { setMenu(false); router.push({ pathname: '/event/[id]', params: { id: post.event_id } }); }} />
        {!post.mine && <MenuRow title="Beitrag ausblenden" sub="Du siehst ihn nicht mehr im Feed." onPress={hide} />}
        {!post.mine && <MenuRow title="Beitrag melden" onPress={() => { setMenu(false); setReport(true); }} danger />}
        {(post.mine || me.is_admin) && <MenuRow title="Beitrag löschen" onPress={del} danger />}
      </Sheet>
      <ReportSheet target={{ post: post.id }} visible={report} onClose={() => setReport(false)} onDone={() => { setReport(false); hide(); }} />
    </View>
  );
}
