-- =====================================================================
-- MOSHCHAT: initial schema
-- Tables, row level security, storage buckets and RPC functions.
-- Every table has RLS enabled. Sensitive writes go through
-- security-definer functions that check auth.uid() themselves.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.today_local() returns date
language sql stable as $$ select (now() at time zone 'Europe/Vienna')::date $$;

create or replace function public.age_of(b date) returns int
language sql stable as $$ select extract(year from age(public.today_local(), b))::int $$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  birthdate date,
  job text not null default '' check (char_length(job) <= 60),
  city text not null default '' check (char_length(city) <= 40),
  bio text not null default '' check (char_length(bio) <= 300),
  pronouns text not null default '' check (char_length(pronouns) <= 30),
  gender text check (gender in ('w','m','nb')),
  gender_text text not null default '' check (char_length(gender_text) <= 40),
  open_all boolean not null default true,
  seek text[] not null default '{w,m,nb}',
  modes text[] not null default '{}',
  lines jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  photo_path text,
  color text not null default '#D8CDBB',
  onboarded boolean not null default false,
  paused boolean not null default false,
  live_visible boolean not null default true,
  read_receipts boolean not null default true,
  age_min int not null default 18 check (age_min between 18 and 99),
  age_max int not null default 99 check (age_max between 18 and 99),
  notify jsonb not null default '{"matches":true,"messages":true,"likes":true,"events":true}'::jsonb,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  constraint modes_valid check (modes <@ array['friends','date','business']),
  constraint seek_valid check (seek <@ array['w','m','nb'])
);
alter table public.profiles enable row level security;

-- A profile row is created for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may not make themselves admin and must be 18+.
create or replace function public.guard_profile() returns trigger
language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.uid() is not null
     and not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    new.is_admin := old.is_admin;
  end if;
  if new.birthdate is not null and public.age_of(new.birthdate) < 18 then
    raise exception 'MOSHCHAT ist ab 18.' using errcode = 'check_violation';
  end if;
  if new.age_min > new.age_max then new.age_max := new.age_min; end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ---------- blocks ----------
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "own blocks" on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create or replace function public.blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;


-- ---------- events ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 60),
  category text not null default 'sonstiges' check (category in ('festival','konzert','party','kabarett','kultur','ball','messe','konferenz','markt','sport','sonstiges')),
  color text not null default '#3ED08B' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  starts_on date not null,
  ends_on date,
  start_time time,
  venue text not null check (char_length(venue) between 2 and 80),
  city text not null default '' check (char_length(city) <= 40),
  description text not null default '' check (char_length(description) <= 600),
  image_path text,
  ticket_url text check (ticket_url is null or ticket_url ~ '^https://'),
  official boolean not null default false,
  partner_place text,
  partner_deal text,
  created_at timestamptz not null default now(),
  constraint ends_after_start check (ends_on is null or ends_on >= starts_on)
);
create index events_starts_on on public.events (starts_on);
alter table public.events enable row level security;

create or replace function public.guard_event() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.official := false; new.partner_place := null; new.partner_deal := null;
    else
      new.official := old.official; new.partner_place := old.partner_place; new.partner_deal := old.partner_deal;
      new.creator_id := old.creator_id;
    end if;
  end if;
  return new;
end $$;
create trigger events_guard before insert or update on public.events
  for each row execute function public.guard_event();

create policy "events readable" on public.events for select to authenticated using (true);
create policy "events insert own" on public.events for insert to authenticated with check (creator_id = auth.uid());
create policy "events update own or admin" on public.events for update to authenticated
  using (creator_id = auth.uid() or public.is_admin()) with check (creator_id = auth.uid() or public.is_admin());
create policy "events delete own or admin" on public.events for delete to authenticated
  using (creator_id = auth.uid() or public.is_admin());

-- The check-in secret lives in its own table without any policy: only RPCs read it.
create table public.event_secrets (
  event_id uuid primary key references public.events(id) on delete cascade,
  secret text not null default encode(gen_random_bytes(12), 'hex')
);
alter table public.event_secrets enable row level security;

create or replace function public.create_event_secret() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.event_secrets (event_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger events_secret after insert on public.events
  for each row execute function public.create_event_secret();

create or replace function public.event_is_live(e public.events) returns boolean
language sql stable as $$ select public.today_local() between e.starts_on and coalesce(e.ends_on, e.starts_on) $$;

-- ---------- event members ----------
create table public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  checked_in_on date,
  primary key (event_id, user_id)
);
create index event_members_user on public.event_members (user_id);
alter table public.event_members enable row level security;

create or replace function public.guard_member() returns trigger
language plpgsql as $$
begin
  -- check-ins are only written by public.check_in()
  if coalesce(current_setting('moshchat.checkin', true), '') <> 'on' then
    if tg_op = 'INSERT' then new.checked_in_on := null; else new.checked_in_on := old.checked_in_on; end if;
  end if;
  return new;
end $$;
create trigger members_guard before insert or update on public.event_members
  for each row execute function public.guard_member();

create policy "own memberships readable" on public.event_members for select to authenticated using (user_id = auth.uid());
create policy "join self" on public.event_members for insert to authenticated with check (user_id = auth.uid());
create policy "leave self" on public.event_members for delete to authenticated using (user_id = auth.uid());

-- ---------- swipes & matches ----------
create table public.swipes (
  swiper_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('friends','date','business')),
  event_id uuid references public.events(id) on delete set null,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id, mode),
  check (swiper_id <> target_id)
);
create index swipes_target on public.swipes (target_id, mode) where liked;
alter table public.swipes enable row level security;
create policy "own swipes read" on public.swipes for select to authenticated using (swiper_id = auth.uid());

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('friends','date','business')),
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (user_a, user_b, mode),
  check (user_a < user_b)
);
alter table public.matches enable row level security;
create policy "own matches" on public.matches for select to authenticated using (auth.uid() in (user_a, user_b));

-- Profile view for people you matched with (and yourself): no birthdate, no gender, no settings.
-- Everyone else is only reachable through get_deck / get_likes, so profiles can't be scraped.
create view public.public_profiles as
  select p.id, p.name, public.age_of(p.birthdate) as age, p.job, p.city, p.bio, p.pronouns,
         p.modes, p.lines, p.tags, p.photo_path, p.color
  from public.profiles p
  where auth.uid() is not null and p.onboarded
    and (p.id = auth.uid() or (
      not public.blocked_between(p.id, auth.uid())
      and exists (select 1 from public.matches m
                  where (m.user_a = auth.uid() and m.user_b = p.id) or (m.user_b = auth.uid() and m.user_a = p.id))));
revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated;

create or replace function public.in_match(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matches where id = m and auth.uid() in (user_a, user_b))
$$;

-- ---------- messages ----------
create table public.messages (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','meet')),
  body text not null default '' check (char_length(body) <= 1000),
  meet jsonb,
  meet_accepted boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_match on public.messages (match_id, created_at);
alter table public.messages enable row level security;
create policy "read messages of own matches" on public.messages for select to authenticated using (public.in_match(match_id));
create policy "send in own matches" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.in_match(match_id)
    and not exists (select 1 from public.matches m where m.id = match_id and public.blocked_between(m.user_a, m.user_b)));
create policy "recipient updates read/accept" on public.messages for update to authenticated
  using (public.in_match(match_id) and sender_id <> auth.uid()) with check (public.in_match(match_id) and sender_id <> auth.uid());

create or replace function public.guard_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    -- only read_at and meet_accepted may change
    new.body := old.body; new.meet := old.meet; new.kind := old.kind; new.sender_id := old.sender_id; new.match_id := old.match_id; new.created_at := old.created_at;
  else
    update public.matches set last_message_at = now() where id = new.match_id;
  end if;
  return new;
end $$;
create trigger messages_guard before insert or update on public.messages
  for each row execute function public.guard_message();

-- ---------- feed ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1500),
  media jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index posts_event on public.posts (event_id, created_at desc);
alter table public.posts enable row level security;
create policy "posts readable" on public.posts for select to authenticated using (true);
create policy "organiser posts" on public.posts for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.events e where e.id = event_id and e.creator_id = auth.uid()));
create policy "author edits post" on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "author or admin deletes post" on public.posts for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create table public.poll_options (
  post_id uuid not null references public.posts(id) on delete cascade,
  idx int not null check (idx between 0 and 3),
  label text not null check (char_length(label) between 1 and 60),
  primary key (post_id, idx)
);
alter table public.poll_options enable row level security;
create policy "poll readable" on public.poll_options for select to authenticated using (true);
create policy "poll by post author" on public.poll_options for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

create table public.poll_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  idx int not null,
  primary key (post_id, user_id),
  foreign key (post_id, idx) references public.poll_options(post_id, idx) on delete cascade
);
alter table public.poll_votes enable row level security;
create policy "votes readable" on public.poll_votes for select to authenticated using (true);
create policy "own vote" on public.poll_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('like','love','haha','wow','fire')),
  primary key (post_id, user_id)
);
alter table public.post_reactions enable row level security;
create policy "reactions readable" on public.post_reactions for select to authenticated using (true);
create policy "own reaction" on public.post_reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);
create index comments_post on public.comments (post_id, created_at);
alter table public.comments enable row level security;
create policy "comments readable" on public.comments for select to authenticated
  using (not public.blocked_between(author_id, auth.uid()));
create policy "own comment" on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy "delete own, organiser or admin" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.posts p join public.events e on e.id = p.event_id where p.id = post_id and e.creator_id = auth.uid()));

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);
alter table public.comment_likes enable row level security;
create policy "comment likes readable" on public.comment_likes for select to authenticated using (true);
create policy "own comment like" on public.comment_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.post_flags (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('saved','hidden')),
  primary key (post_id, user_id, kind)
);
alter table public.post_flags enable row level security;
create policy "own flags" on public.post_flags for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- safety ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user uuid references public.profiles(id) on delete cascade,
  target_post uuid references public.posts(id) on delete cascade,
  target_comment uuid references public.comments(id) on delete cascade,
  target_event uuid references public.events(id) on delete cascade,
  reason text not null check (char_length(reason) <= 80),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "file report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "admin reads reports" on public.reports for select to authenticated using (public.is_admin());
create policy "admin closes reports" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Push tokens live apart from profiles; only the owner and the server see them.
create table public.push_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;
create policy "own push tokens" on public.push_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- RPC functions
-- =====================================================================

-- Mutual date preferences: does viewer accept target and target accept viewer?
create or replace function public.date_fit(viewer public.profiles, target public.profiles) returns boolean
language sql stable as $$
  select target.gender is not null and viewer.gender is not null
     and (viewer.open_all or target.gender = any(viewer.seek))
     and (target.open_all or viewer.gender = any(target.seek))
$$;

-- People to swipe at an event in one mode.
create or replace function public.get_deck(p_event uuid, p_mode text, p_live_only boolean default false)
returns table (id uuid, name text, age int, job text, city text, bio text, pronouns text, line text,
               tags text[], photo_path text, color text, here boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare me public.profiles; ev public.events; live boolean;
begin
  select * into me from public.profiles where profiles.id = auth.uid();
  select * into ev from public.events where events.id = p_event;
  if me.id is null or ev.id is null or not (p_mode = any(me.modes)) then return; end if;
  live := public.event_is_live(ev);
  return query
  select t.id, t.name, public.age_of(t.birthdate), t.job, t.city, t.bio, t.pronouns,
         coalesce(t.lines ->> p_mode, ''), t.tags, t.photo_path, t.color,
         (live and m.checked_in_on = public.today_local() and t.live_visible) as here
  from public.event_members m
  join public.profiles t on t.id = m.user_id
  where m.event_id = p_event and t.id <> me.id and t.onboarded and not t.paused
    and p_mode = any(t.modes)
    and public.age_of(t.birthdate) between me.age_min and me.age_max
    and public.age_of(me.birthdate) between t.age_min and t.age_max
    and not public.blocked_between(me.id, t.id)
    and not exists (select 1 from public.swipes s where s.swiper_id = me.id and s.target_id = t.id and s.mode = p_mode)
    and not exists (select 1 from public.matches x where x.mode = p_mode and x.user_a = least(me.id, t.id) and x.user_b = greatest(me.id, t.id))
    and (p_mode <> 'date' or public.date_fit(me, t))
    and (not p_live_only or (live and m.checked_in_on = public.today_local() and t.live_visible))
  order by here desc, random()
  limit 50;
end $$;

-- Record a swipe; returns the match id when both liked each other.
create or replace function public.swipe(p_target uuid, p_mode text, p_liked boolean, p_event uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); mid uuid;
begin
  if me is null or me = p_target then raise exception 'not allowed'; end if;
  if public.blocked_between(me, p_target) then return null; end if;
  if (select paused from public.profiles where id = me) then raise exception 'Profil ist pausiert'; end if;
  insert into public.swipes (swiper_id, target_id, mode, event_id, liked)
  values (me, p_target, p_mode, p_event, p_liked)
  on conflict (swiper_id, target_id, mode) do update set liked = excluded.liked, event_id = excluded.event_id, created_at = now();
  if p_liked and exists (select 1 from public.swipes where swiper_id = p_target and target_id = me and mode = p_mode and liked) then
    insert into public.matches (user_a, user_b, mode, event_id)
    values (least(me, p_target), greatest(me, p_target), p_mode, p_event)
    on conflict (user_a, user_b, mode) do update set event_id = coalesce(public.matches.event_id, excluded.event_id)
    returning id into mid;
  end if;
  return mid;
end $$;

-- Take back the last swipe, as long as it did not create a match.
create or replace function public.undo_swipe(p_target uuid, p_mode text) returns void
language sql security definer set search_path = public as $$
  delete from public.swipes s where s.swiper_id = auth.uid() and s.target_id = p_target and s.mode = p_mode
    and not exists (select 1 from public.matches x where x.mode = p_mode and x.user_a = least(auth.uid(), p_target) and x.user_b = greatest(auth.uid(), p_target));
$$;

-- People who liked me and whom I have not answered yet.
create or replace function public.get_likes()
returns table (id uuid, name text, age int, job text, photo_path text, color text, pronouns text, mode text, event_id uuid, event_title text)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, public.age_of(t.birthdate), t.job, t.photo_path, t.color, t.pronouns, s.mode, s.event_id, e.title
  from public.swipes s
  join public.profiles t on t.id = s.swiper_id
  join public.profiles me on me.id = auth.uid()
  left join public.events e on e.id = s.event_id
  where s.target_id = me.id and s.liked and not t.paused and s.mode = any(me.modes)
    and not public.blocked_between(me.id, t.id)
    and not exists (select 1 from public.swipes r where r.swiper_id = me.id and r.target_id = t.id and r.mode = s.mode)
    and (s.mode <> 'date' or public.date_fit(me, t))
  order by s.created_at desc
$$;

-- Chats with the other person and the latest message.
create or replace function public.get_chats()
returns table (match_id uuid, mode text, event_id uuid, event_title text, created_at timestamptz, last_message_at timestamptz,
               other_id uuid, other_name text, other_photo text, other_color text,
               last_body text, last_kind text, last_sender uuid, unread int, here boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.mode, m.event_id, e.title, m.created_at, m.last_message_at,
         o.id, o.name, o.photo_path, o.color,
         lm.body, lm.kind, lm.sender_id,
         (select count(*)::int from public.messages u where u.match_id = m.id and u.sender_id <> auth.uid() and u.read_at is null),
         exists (select 1 from public.event_members a join public.event_members b on a.event_id = b.event_id
                 join public.events ev on ev.id = a.event_id
                 join public.profiles op on op.id = b.user_id
                 where a.user_id = auth.uid() and b.user_id = o.id and public.event_is_live(ev)
                   and a.checked_in_on = public.today_local() and b.checked_in_on = public.today_local() and op.live_visible)
  from public.matches m
  join public.profiles o on o.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  left join public.events e on e.id = m.event_id
  left join lateral (select body, kind, sender_id from public.messages x where x.match_id = m.id order by x.created_at desc limit 1) lm on true
  where auth.uid() in (m.user_a, m.user_b) and not public.blocked_between(m.user_a, m.user_b)
  order by m.last_message_at desc
$$;

-- Check in at a live event with the QR secret printed at the entrance.
create or replace function public.check_in(p_event uuid, p_secret text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ev public.events;
begin
  select * into ev from public.events where id = p_event;
  if ev.id is null or not exists (select 1 from public.event_secrets where event_id = p_event and secret = p_secret) then raise exception 'Dieser Code gehört zu keinem Event.'; end if;
  if not public.event_is_live(ev) then raise exception 'Dieses Event läuft heute nicht.'; end if;
  perform set_config('moshchat.checkin', 'on', true);
  insert into public.event_members (event_id, user_id, checked_in_on) values (p_event, auth.uid(), public.today_local())
  on conflict (event_id, user_id) do update set checked_in_on = public.today_local();
  perform set_config('moshchat.checkin', 'off', true);
  return true;
end $$;

create or replace function public.check_out(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('moshchat.checkin', 'on', true);
  update public.event_members set checked_in_on = null where event_id = p_event and user_id = auth.uid();
  perform set_config('moshchat.checkin', 'off', true);
end $$;

-- QR payload for the organiser.
create or replace function public.event_checkin_code(p_event uuid) returns text
language sql stable security definer set search_path = public as $$
  select 'moshchat://checkin/' || e.id || '/' || s.secret from public.events e join public.event_secrets s on s.event_id = e.id
  where e.id = p_event and (e.creator_id = auth.uid() or public.is_admin())
$$;

create or replace function public.rotate_checkin_code(p_event uuid) returns void
language sql security definer set search_path = public as $$
  update public.event_secrets set secret = encode(gen_random_bytes(12), 'hex')
  where event_id = p_event and exists (select 1 from public.events e where e.id = p_event and (e.creator_id = auth.uid() or public.is_admin()))
$$;

-- Organiser statistics.
create or replace function public.event_stats(p_event uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not exists (select 1 from public.events where id = p_event and (creator_id = auth.uid() or public.is_admin())) then
    raise exception 'not allowed';
  end if;
  select jsonb_build_object(
    'joined', (select count(*) from public.event_members where event_id = p_event),
    'checked_in', (select count(*) from public.event_members where event_id = p_event and checked_in_on is not null),
    'matches', (select count(*) from public.matches where event_id = p_event),
    'reactions', (select count(*) from public.post_reactions pr join public.posts p on p.id = pr.post_id where p.event_id = p_event),
    'comments', (select count(*) from public.comments c join public.posts p on p.id = c.post_id where p.event_id = p_event),
    'modes', (select jsonb_build_object(
        'friends', count(*) filter (where 'friends' = any(pf.modes)),
        'date', count(*) filter (where 'date' = any(pf.modes)),
        'business', count(*) filter (where 'business' = any(pf.modes)))
      from public.event_members m join public.profiles pf on pf.id = m.user_id where m.event_id = p_event),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', coalesce(c.n, 0)) order by d), '[]'::jsonb)
      from generate_series(public.today_local() - 6, public.today_local(), interval '1 day') d
      left join (select (joined_at at time zone 'Europe/Vienna')::date as day, count(*) n from public.event_members
                 where event_id = p_event group by 1) c on c.day = d::date)
  ) into r;
  return r;
end $$;

-- Who goes to an event: totals, who is here right now (only people visible live) and some faces.
create or replace function public.event_people(p_event uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  with ev as (select * from public.events where id = p_event),
  mem as (
    select m.*, p.name, p.photo_path, p.color, p.live_visible, p.modes
    from public.event_members m join public.profiles p on p.id = m.user_id
    where m.event_id = p_event and p.onboarded and not public.blocked_between(p.id, auth.uid())
  ),
  here as (select mem.* from mem cross join ev where public.event_is_live(ev) and mem.checked_in_on = public.today_local() and mem.live_visible)
  select jsonb_build_object(
    'joined', (select count(*) from mem),
    'here', (select count(*) from here),
    'me_joined', exists (select 1 from mem where user_id = auth.uid()),
    'me_here', exists (select 1 from public.event_members m, ev where m.event_id = p_event and m.user_id = auth.uid() and public.event_is_live(ev) and m.checked_in_on = public.today_local()),
    'modes', jsonb_build_object(
      'friends', (select count(*) from mem where 'friends' = any(modes)),
      'date', (select count(*) from mem where 'date' = any(modes)),
      'business', (select count(*) from mem where 'business' = any(modes))),
    'faces', (select coalesce(jsonb_agg(jsonb_build_object('id', user_id, 'name', name, 'photo_path', photo_path, 'color', color)), '[]')
              from (select * from mem where user_id <> auth.uid() order by joined_at desc limit 8) f),
    'here_faces', (select coalesce(jsonb_agg(jsonb_build_object('id', user_id, 'name', name, 'photo_path', photo_path, 'color', color)), '[]')
              from (select * from here where user_id <> auth.uid() limit 8) h)
  )
$$;

-- Remove a match (and its chat) for both people.
create or replace function public.unmatch(p_match uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.matches where id = p_match and auth.uid() in (user_a, user_b)
$$;

-- Block someone: removes shared matches and hides both from each other.
create or replace function public.block_user(p_user uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), p_user) on conflict do nothing;
  delete from public.matches where user_a = least(auth.uid(), p_user) and user_b = greatest(auth.uid(), p_user);
$$;

-- Everything MOSHCHAT stores about the caller (GDPR art. 15 / 20).
create or replace function public.export_my_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'is_admin' from public.profiles p where p.id = auth.uid()),
    'events_created', (select coalesce(jsonb_agg(to_jsonb(e)), '[]') from public.events e where e.creator_id = auth.uid()),
    'events_joined', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.event_members m where m.user_id = auth.uid()),
    'swipes', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from public.swipes s where s.swiper_id = auth.uid()),
    'matches', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.matches m where auth.uid() in (m.user_a, m.user_b)),
    'messages_sent', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.messages x where x.sender_id = auth.uid()),
    'posts', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from public.posts p where p.author_id = auth.uid()),
    'comments', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.comments c where c.author_id = auth.uid()),
    'reactions', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.post_reactions r where r.user_id = auth.uid()),
    'blocks', (select coalesce(jsonb_agg(to_jsonb(b)), '[]') from public.blocks b where b.blocker_id = auth.uid()),
    'reports', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.reports r where r.reporter_id = auth.uid())
  )
$$;

-- Blocked people with their names, for settings.
create or replace function public.my_blocks()
returns table (id uuid, name text, photo_path text, color text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.photo_path, p.color from public.blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid() order by b.created_at desc
$$;

-- Admin: open reports with context.
create or replace function public.admin_reports()
returns table (id uuid, created_at timestamptz, reason text, details text, reporter text, target_user uuid, target_name text,
               target_post uuid, post_body text, target_comment uuid, comment_body text, target_event uuid, event_title text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select r.id, r.created_at, r.reason, r.details, rp.name, r.target_user, tu.name, r.target_post, po.body, r.target_comment, co.body, r.target_event, ev.title
  from public.reports r
  left join public.profiles rp on rp.id = r.reporter_id
  left join public.profiles tu on tu.id = r.target_user
  left join public.posts po on po.id = r.target_post
  left join public.comments co on co.id = r.target_comment
  left join public.events ev on ev.id = r.target_event
  where r.status = 'open' order by r.created_at desc;
end $$;

-- Lock down function execution to signed-in users.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- =====================================================================
-- Realtime: chats and feed update live.
-- =====================================================================
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.matches;
  end if;
end $$;

-- =====================================================================
-- Storage: public-read buckets, uploads only into your own folder.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('events', 'events', true, 8388608, array['image/jpeg','image/png','image/webp']),
  ('posts', 'posts', true, 52428800, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
on conflict (id) do nothing;

create policy "upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','events','posts') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own folder" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','events','posts') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own folder" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','events','posts') and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Feed and comments (late in the file so the grants below cover them)
-- =====================================================================
create or replace function public.get_feed(p_event uuid default null, p_saved boolean default false, p_limit int default 30, p_before timestamptz default null)
returns table (id uuid, event_id uuid, event_title text, event_color text, event_official boolean, event_live boolean,
               body text, media jsonb, pinned boolean, created_at timestamptz, mine boolean,
               reactions jsonb, my_reaction text, comment_count int, saved boolean,
               poll jsonb, my_vote int)
language sql stable security definer set search_path = public as $$
  select p.id, e.id, e.title, e.color, e.official, public.event_is_live(e),
         p.body, p.media, p.pinned, p.created_at, p.author_id = auth.uid(),
         coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from public.post_reactions r where r.post_id = p.id group by kind) k), '{}'::jsonb),
         (select kind from public.post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
         (select count(*)::int from public.comments c where c.post_id = p.id and not public.blocked_between(c.author_id, auth.uid())),
         exists (select 1 from public.post_flags f where f.post_id = p.id and f.user_id = auth.uid() and f.kind = 'saved'),
         (select jsonb_agg(jsonb_build_object('idx', o.idx, 'label', o.label, 'votes', (select count(*) from public.poll_votes v where v.post_id = p.id and v.idx = o.idx)) order by o.idx)
            from public.poll_options o where o.post_id = p.id),
         (select v.idx from public.poll_votes v where v.post_id = p.id and v.user_id = auth.uid())
  from public.posts p
  join public.events e on e.id = p.event_id
  where (p_event is null or p.event_id = p_event)
    and (p_event is not null or exists (select 1 from public.event_members m where m.event_id = e.id and m.user_id = auth.uid()) or e.creator_id = auth.uid())
    and not exists (select 1 from public.post_flags f where f.post_id = p.id and f.user_id = auth.uid() and f.kind = 'hidden')
    and (not p_saved or exists (select 1 from public.post_flags f where f.post_id = p.id and f.user_id = auth.uid() and f.kind = 'saved'))
    and (p_before is null or p.created_at < p_before)
  order by (p.pinned and p_before is null) desc, p.created_at desc
  limit p_limit
$$;

create or replace function public.get_comments(p_post uuid)
returns table (id uuid, parent_id uuid, body text, created_at timestamptz, author_id uuid, author_name text,
               author_photo text, author_color text, is_organiser boolean, likes int, liked boolean, mine boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.parent_id, c.body, c.created_at, a.id, case when a.id = e.creator_id then e.title else a.name end,
         a.photo_path, case when a.id = e.creator_id then e.color else a.color end, a.id = e.creator_id,
         (select count(*)::int from public.comment_likes l where l.comment_id = c.id),
         exists (select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = auth.uid()),
         c.author_id = auth.uid()
  from public.comments c
  join public.posts p on p.id = c.post_id
  join public.events e on e.id = p.event_id
  join public.profiles a on a.id = c.author_id
  where c.post_id = p_post and not public.blocked_between(c.author_id, auth.uid())
  order by c.created_at
$$;

revoke execute on function public.get_feed(uuid, boolean, int, timestamptz), public.get_comments(uuid) from public, anon;
grant execute on function public.get_feed(uuid, boolean, int, timestamptz), public.get_comments(uuid) to authenticated;
