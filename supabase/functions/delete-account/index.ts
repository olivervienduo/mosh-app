// Deletes the caller's account for good (App Store requirement 5.1.1(v)).
// Admins may pass { user_id } to ban and delete someone else.
//
// Deploy: supabase functions deploy delete-account
// All rows cascade from auth.users -> profiles -> everything else.
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

async function removeFiles(userId: string) {
  for (const bucket of ['avatars', 'events', 'posts']) {
    const { data } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (data?.length) await admin.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!jwt) return new Response('unauthorized', { status: 401, headers: cors });
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return new Response('unauthorized', { status: 401, headers: cors });

  let target = user.id;
  const body = await req.json().catch(() => ({}));
  if (body?.user_id && body.user_id !== user.id) {
    const { data: me } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) return new Response('forbidden', { status: 403, headers: cors });
    target = body.user_id;
  }

  try {
    await removeFiles(target);
    const { error } = await admin.auth.admin.deleteUser(target);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'content-type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { ...cors, 'content-type': 'application/json' } });
  }
});
