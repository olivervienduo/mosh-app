import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'fs';

const db = new PGlite({ extensions: { pgcrypto } });
const stub = `
create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
grant usage on schema public, auth, storage to authenticated;
`;
await db.exec(stub);
const sql = fs.readFileSync(new URL('../migrations/20261107000000_init.sql', import.meta.url), 'utf8');
await db.exec(sql);
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated; grant usage on all sequences in schema public to authenticated; grant execute on all functions in schema auth to authenticated; grant select, insert on storage.objects to authenticated;`);
console.log('migration ok');

const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222', C = '33333333-3333-3333-3333-333333333333';
for (const id of [A, B, C]) await db.query('insert into auth.users (id) values ($1)', [id]);
await db.exec(`
update profiles set name='Lena', birthdate='1999-05-01', gender='w', open_all=true, modes='{friends,date,business}', onboarded=true, lines='{"friends":"Erste Reihe"}' where id='${A}';
update profiles set name='Jonas', birthdate='1997-03-01', gender='m', open_all=false, seek='{w}', modes='{friends,date}', onboarded=true where id='${B}';
update profiles set name='Kim', birthdate='1995-03-01', gender='nb', open_all=false, seek='{nb}', modes='{date}', onboarded=true where id='${C}';
`);
async function as(user, q, params = []) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try { return await db.query(q, params); } finally { await db.exec('reset role;'); }
}
const ok = (label, v) => console.log((v ? 'PASS ' : 'FAIL ') + label);

// event created by A, live today
const today = (await db.query(`select today_local() d`)).rows[0].d;
const ev = (await as(A, `insert into events (creator_id, title, category, starts_on, venue, city, official) values ($1,'Launch Party','party',today_local(),'Club','Wien', true) returning id, official`, [A])).rows[0];
ok('creator cannot self-verify official', ev.official === false);
ok('secret created', (await db.query('select count(*)::int n from event_secrets')).rows[0].n === 1);
ok('secret hidden from users', (await as(A, 'select * from event_secrets')).rows.length === 0);
for (const u of [A, B, C]) await as(u, 'insert into event_members (event_id, user_id, checked_in_on) values ($1, $2, today_local())', [ev.id, u]);
ok('client cannot fake check-in', (await db.query('select count(*)::int n from event_members where checked_in_on is not null')).rows[0].n === 0);

// deck & mutual date filter
let deckA = (await as(A, `select * from get_deck($1,'date',false)`, [ev.id])).rows.map(r => r.name);
ok('A (w) sees Jonas in date, not Kim (seeks nb only): ' + deckA, deckA.includes('Jonas') && !deckA.includes('Kim'));
let deckC = (await as(C, `select * from get_deck($1,'date',false)`, [ev.id])).rows.map(r => r.name);
ok('Kim sees nobody (seeks nb): ' + deckC, deckC.length === 0);

// swipes & match
let m1 = (await as(A, `select swipe($1,'date',true,$2) m`, [B, ev.id])).rows[0].m;
ok('no match after one like', m1 === null);
let likesB = (await as(B, 'select * from get_likes()')).rows.map(r => r.name);
ok('B sees like from Lena', likesB.includes('Lena'));
let m2 = (await as(B, `select swipe($1,'date',true,$2) m`, [A, ev.id])).rows[0].m;
ok('match after both like', !!m2);
ok('deck excludes matched', !(await as(A, `select * from get_deck($1,'date',false)`, [ev.id])).rows.some(r => r.name === 'Jonas'));

// messages
await as(A, `insert into messages (match_id, sender_id, body) values ($1,$2,'Hallo!')`, [m2, A]);
let chatsB = (await as(B, 'select * from get_chats()')).rows;
ok('chat listed with unread 1', chatsB.length === 1 && chatsB[0].unread === 1 && chatsB[0].last_body === 'Hallo!');
let sneak = await as(C, `select count(*)::int n from messages`); ok('outsider cannot read messages', sneak.rows[0].n === 0);
let fail = false; try { await as(C, `insert into messages (match_id, sender_id, body) values ($1,$2,'x')`, [m2, C]); } catch { fail = true; }
ok('outsider cannot write into chat', fail);
await as(B, `update messages set read_at = now(), body='hacked' where match_id=$1`, [m2]);
const msg = (await db.query('select body, read_at from messages')).rows[0];
ok('recipient marks read but cannot edit body', msg.body === 'Hallo!' && msg.read_at);

// check-in
const code = (await as(A, `select event_checkin_code($1) c`, [ev.id])).rows[0].c;
ok('organiser gets code', code && code.startsWith('mosh://checkin/'));
ok('others get no code', (await as(B, `select event_checkin_code($1) c`, [ev.id])).rows[0].c === null);
const secret = code.split('/').pop();
fail = false; try { await as(B, `select check_in($1,'wrong')`, [ev.id]); } catch { fail = true; }
ok('wrong code refused', fail);
await as(B, `select check_in($1,$2)`, [ev.id, secret]);
await as(A, `select check_in($1,$2)`, [ev.id, secret]);
const ppl = (await as(A, `select event_people($1) p`, [ev.id])).rows[0].p;
ok('presence: 2 here, 3 joined: ' + JSON.stringify({ j: ppl.joined, h: ppl.here }), ppl.here === 2 && ppl.joined === 3 && ppl.me_here === true);
const chatsA = (await as(A, 'select * from get_chats()')).rows;
ok('chat shows other is here', chatsA[0].here === true);

// feed
const post = (await as(A, `insert into posts (event_id, author_id, body) values ($1,$2,'Einlass ab 20 Uhr') returning id`, [ev.id, A])).rows[0];
fail = false; try { await as(B, `insert into posts (event_id, author_id, body) values ($1,$2,'spam')`, [ev.id, B]); } catch { fail = true; }
ok('non-organiser cannot post', fail);
await as(A, `insert into poll_options (post_id, idx, label) values ($1,0,'Ja'),($1,1,'Nein')`, [post.id]);
await as(B, `insert into poll_votes (post_id, user_id, idx) values ($1,$2,1)`, [post.id, B]);
await as(B, `insert into post_reactions (post_id, user_id, kind) values ($1,$2,'fire')`, [post.id, B]);
const cm = (await as(B, `insert into comments (post_id, author_id, body) values ($1,$2,'Super') returning id`, [post.id, B])).rows[0];
await as(A, `delete from comments where id=$1`, [cm.id]);
ok('organiser can delete comment', (await db.query('select count(*)::int n from comments')).rows[0].n === 0);
const st = (await as(A, `select event_stats($1) s`, [ev.id])).rows[0].s;
ok('stats: ' + JSON.stringify({ j: st.joined, c: st.checked_in, m: st.matches, r: st.reactions, days: st.days.length }), st.joined === 3 && st.matches === 1 && st.days.length === 7);
fail = false; try { await as(B, `select event_stats($1)`, [ev.id]); } catch { fail = true; }
ok('stats only for organiser', fail);

// profile privacy & admin guard
ok('cannot read other profile row', (await as(B, `select * from profiles where id=$1`, [A])).rows.length === 0);
const pub = (await as(B, `select * from public_profiles where id=$1`, [A])).rows[0];
ok('public profile has age, no birthdate', pub && pub.age >= 18 && !('birthdate' in pub));
await as(B, `update profiles set is_admin=true where id=$1`, [B]);
ok('cannot make self admin', (await db.query('select is_admin from profiles where id=$1', [B])).rows[0].is_admin === false);
fail = false; try { await as(B, `update profiles set birthdate='2015-01-01' where id=$1`, [B]); } catch { fail = true; }
ok('under 18 refused', fail);

// block
await as(B, `select block_user($1)`, [A]);
ok('block removes match', (await db.query('select count(*)::int n from matches')).rows[0].n === 0);
ok('blocked profile hidden', (await as(B, `select * from public_profiles where id=$1`, [A])).rows.length === 0);
const exp = (await as(B, `select export_my_data() d`)).rows[0].d;
ok('export has profile and blocks', exp.profile.name === 'Jonas' && exp.blocks.length === 1);

// undo
await as(C, `select swipe($1,'date',false,$2)`, [A, ev.id]);
await as(C, `select undo_swipe($1,'date')`, [A]);
ok('undo removes swipe', (await db.query(`select count(*)::int n from swipes where swiper_id=$1`, [C])).rows[0].n === 0);

// storage policy shape
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${A}', false);`);
let sfail = false; try { await db.query(`insert into storage.objects (bucket_id, name) values ('avatars', '${B}/x.jpg')`); } catch { sfail = true; }
await db.query(`insert into storage.objects (bucket_id, name) values ('avatars', '${A}/x.jpg')`);
await db.exec('reset role;');
ok('upload only into own folder', sfail);

const feed = (await as(A, `select * from get_feed()`)).rows;
ok('feed for organiser: ' + feed.length, feed.length === 1 && feed[0].poll.length === 2 && feed[0].reactions.fire === 1);
await as(A, `insert into comments (post_id, author_id, body) values ($1,$2,'Danke!')`, [feed[0].id, A]);
const cms = (await as(C, `select * from get_comments($1)`, [feed[0].id])).rows;
ok('comment by organiser shows event name', cms[0].is_organiser && cms[0].author_name === 'Launch Party');
console.log('done');
