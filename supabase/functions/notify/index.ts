// Mosh push notifications.
//
// Called by Supabase Database Webhooks on INSERT into
//   public.messages, public.matches, public.swipes, public.posts
// Sends Expo push notifications (free) to the right people, respecting
// each person's notification settings (profiles.notify).
//
// Deploy:  supabase functions deploy notify --no-verify-jwt
// Secret:  supabase secrets set WEBHOOK_SECRET=<long random string>
// Webhook: add HTTP header  x-webhook-secret: <same string>
import { createClient } from 'npm:@supabase/supabase-js@2';

type Payload = { type: 'INSERT' | 'UPDATE' | 'DELETE'; table: string; schema: string; record: Record<string, unknown> };
type Push = { to: string; title: string; body: string; data: { url: string }; sound: 'default'; channelId: 'default' };
type Kind = 'messages' | 'matches' | 'likes' | 'events';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const MODE: Record<string, string> = { friends: 'Freunde', date: 'Date', business: 'Business' };

async function recipients(userIds: string[], kind: Kind) {
  if (!userIds.length) return [] as { token: string; user_id: string }[];
  const { data: profiles } = await db.from('profiles').select('id, notify, paused').in('id', userIds);
  const allowed = (profiles ?? []).filter((p) => p.notify?.[kind] !== false).map((p) => p.id);
  if (!allowed.length) return [];
  const { data: tokens } = await db.from('push_tokens').select('token, user_id').in('user_id', allowed);
  return tokens ?? [];
}

async function send(messages: Push[]) {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}) },
      body: JSON.stringify(chunk),
    });
    const json = await res.json().catch(() => null);
    // Remove tokens of uninstalled apps
    const dead = (json?.data ?? [])
      .map((t: { status: string; details?: { error?: string } }, j: number) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? chunk[j].to : null))
      .filter(Boolean);
    if (dead.length) await db.from('push_tokens').delete().in('token', dead);
  }
}

const to = (tokens: { token: string }[], title: string, body: string, url: string): Push[] =>
  tokens.map((t) => ({ to: t.token, title, body, data: { url }, sound: 'default', channelId: 'default' }));

async function handle(p: Payload) {
  const r = p.record;
  if (p.type !== 'INSERT') return;

  if (p.table === 'messages') {
    const { data: m } = await db.from('matches').select('user_a, user_b').eq('id', r.match_id).single();
    if (!m) return;
    const recipient = m.user_a === r.sender_id ? m.user_b : m.user_a;
    const { data: sender } = await db.from('profiles').select('name').eq('id', r.sender_id).single();
    const body = r.kind === 'meet' ? 'hat einen Treffpunkt vorgeschlagen 📍' : String(r.body ?? '').slice(0, 140);
    await send(to(await recipients([recipient], 'messages'), sender?.name ?? 'Mosh', body, `/chat/${r.match_id}`));
  }

  if (p.table === 'matches') {
    const [a, b] = [r.user_a as string, r.user_b as string];
    const { data: ps } = await db.from('profiles').select('id, name').in('id', [a, b]);
    const name = (id: string) => ps?.find((x) => x.id === id)?.name ?? 'Jemand';
    const mode = MODE[String(r.mode)] ?? '';
    for (const [me, other] of [[a, b], [b, a]]) {
      await send(to(await recipients([me], 'matches'), "It's a Match! 🎉", `Du und ${name(other)} · ${mode}. Sag Hallo!`, `/chat/${r.id}`));
    }
  }

  if (p.table === 'swipes' && r.liked) {
    // Don't notify if this like just created a match (the match push covers it)
    const { data: back } = await db.from('swipes').select('liked').match({ swiper_id: r.target_id, target_id: r.swiper_id, mode: r.mode }).maybeSingle();
    if (back?.liked) return;
    const { data: target } = await db.from('profiles').select('paused').eq('id', r.target_id).single();
    if (target?.paused) return;
    await send(to(await recipients([r.target_id as string], 'likes'), 'Neuer Like ♥', 'Jemand möchte dich kennenlernen. Schau nach, wer.', '/likes'));
  }

  if (p.table === 'posts') {
    const { data: ev } = await db.from('events').select('title').eq('id', r.event_id).single();
    const { data: members } = await db.from('event_members').select('user_id').eq('event_id', r.event_id).neq('user_id', r.author_id);
    const ids = (members ?? []).map((x) => x.user_id);
    const text = String(r.body ?? '').trim();
    for (let i = 0; i < ids.length; i += 500) {
      const tokens = await recipients(ids.slice(i, i + 500), 'events');
      await send(to(tokens, ev?.title ?? 'Mosh', text ? text.slice(0, 140) : 'Neuer Beitrag im Feed', `/post/${r.id}`));
    }
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return new Response('forbidden', { status: 403 });
  try {
    await handle(await req.json());
    return new Response('ok');
  } catch (e) {
    console.error(e);
    return new Response('error', { status: 500 });
  }
});
