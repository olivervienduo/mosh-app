-- MOSHCHAT – Ein Chat pro Person
--
-- Bisher: ein Match (und damit ein Chat) pro Person UND Modus.
-- Wer sich als Freunde und als Date gematcht hat, hatte zwei Chats.
-- Jetzt: ein Match pro Personenpaar. In `modes` steht, in welchen Modi
-- beide zusammenpassen. Kommt ein Modus dazu, erscheint im Chat ein Hinweis
-- (Nachricht mit kind = 'system', body = Modus).
--
-- Bestehende Doppel-Matches werden zusammengeführt, alle Nachrichten bleiben erhalten.

begin;

-- 1. Spalte für alle gemeinsamen Modi ----------------------------------------
alter table public.matches add column if not exists modes text[] not null default '{}';
update public.matches set modes = array[mode] where modes = '{}';

-- 2. Systemhinweise im Chat erlauben ---------------------------------------
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text','meet','system'));

-- 3. Doppel-Matches zusammenführen ------------------------------------------
-- Der Nachrichten-Schutz verhindert sonst das Umhängen von Nachrichten.
alter table public.messages disable trigger messages_guard;

create temp table _keep on commit drop as
  select distinct on (user_a, user_b) user_a, user_b, id as keep_id
    from public.matches order by user_a, user_b, created_at, id;

create temp table _merge on commit drop as
  select m.id as old_id, k.keep_id
    from public.matches m join _keep k using (user_a, user_b)
   where m.id <> k.keep_id;

-- alle Modi und die letzte Aktivität auf das behaltene Match übertragen
update public.matches k set
  modes = (select array_agg(distinct x order by x) from public.matches m, unnest(m.modes) x
            where m.user_a = k.user_a and m.user_b = k.user_b),
  last_message_at = (select max(m.last_message_at) from public.matches m
                      where m.user_a = k.user_a and m.user_b = k.user_b),
  event_id = coalesce(k.event_id, (select m.event_id from public.matches m
                      where m.user_a = k.user_a and m.user_b = k.user_b and m.event_id is not null
                      order by m.created_at limit 1))
 where k.id in (select keep_id from _merge);

update public.messages msg set match_id = g.keep_id from _merge g where msg.match_id = g.old_id;
delete from public.matches where id in (select old_id from _merge);

alter table public.messages enable trigger messages_guard;

-- 4. Ab jetzt höchstens ein Match pro Paar ----------------------------------
alter table public.matches drop constraint if exists matches_user_a_user_b_mode_key;
alter table public.matches drop constraint if exists matches_pair_key;
alter table public.matches add constraint matches_pair_key unique (user_a, user_b);
alter table public.matches drop constraint if exists matches_modes_valid;
alter table public.matches add constraint matches_modes_valid
  check (modes <@ array['friends','date','business'] and cardinality(modes) >= 1);

-- 5. Swipe: neuen Modus zum bestehenden Match hinzufügen --------------------
create or replace function public.swipe(p_target uuid, p_mode text, p_liked boolean, p_event uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); mid uuid; have text[];
begin
  if me is null or me = p_target then raise exception 'not allowed'; end if;
  if public.blocked_between(me, p_target) then return null; end if;
  if (select paused from public.profiles where id = me) then raise exception 'Profil ist pausiert'; end if;
  insert into public.swipes (swiper_id, target_id, mode, event_id, liked)
  values (me, p_target, p_mode, p_event, p_liked)
  on conflict (swiper_id, target_id, mode) do update set liked = excluded.liked, event_id = excluded.event_id, created_at = now();
  if not (p_liked and exists (select 1 from public.swipes where swiper_id = p_target and target_id = me and mode = p_mode and liked)) then
    return null;
  end if;

  select id, modes into mid, have from public.matches
   where user_a = least(me, p_target) and user_b = greatest(me, p_target) for update;
  if mid is null then
    insert into public.matches (user_a, user_b, mode, modes, event_id)
    values (least(me, p_target), greatest(me, p_target), p_mode, array[p_mode], p_event)
    returning id into mid;
  elsif not (p_mode = any(have)) then
    update public.matches set modes = array(select distinct x from unnest(have || p_mode) x order by x),
                              event_id = coalesce(event_id, p_event)
     where id = mid;
    insert into public.messages (match_id, sender_id, kind, body) values (mid, me, 'system', p_mode);
  end if;
  return mid;
end $$;

-- 6. Swipe-Stapel: wer im Modus schon gematcht ist, kommt nicht mehr --------
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
    and not exists (select 1 from public.matches x where p_mode = any(x.modes) and x.user_a = least(me.id, t.id) and x.user_b = greatest(me.id, t.id))
    and (p_mode <> 'date' or public.date_fit(me, t))
    and (not p_live_only or (live and m.checked_in_on = public.today_local() and t.live_visible))
  order by here desc, random()
  limit 50;
end $$;

-- 7. Rückgängig nur, solange der Swipe in diesem Modus kein Match ergeben hat
create or replace function public.undo_swipe(p_target uuid, p_mode text) returns void
language sql security definer set search_path = public as $$
  delete from public.swipes s where s.swiper_id = auth.uid() and s.target_id = p_target and s.mode = p_mode
    and not exists (select 1 from public.matches x where p_mode = any(x.modes) and x.user_a = least(auth.uid(), p_target) and x.user_b = greatest(auth.uid(), p_target));
$$;

-- 8. Chat-Liste mit allen gemeinsamen Modi ---------------------------------
drop function if exists public.get_chats();
create function public.get_chats()
returns table (match_id uuid, mode text, modes text[], event_id uuid, event_title text, created_at timestamptz, last_message_at timestamptz,
               other_id uuid, other_name text, other_photo text, other_color text,
               last_body text, last_kind text, last_sender uuid, unread int, here boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.modes[1], m.modes, m.event_id, e.title, m.created_at, m.last_message_at,
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
revoke all on function public.get_chats() from public, anon;
grant execute on function public.get_chats() to authenticated;

commit;

-- Kontrolle: darf keine Zeilen liefern (keine Paare mehr mit mehreren Matches)
select user_a, user_b, count(*) from public.matches group by 1, 2 having count(*) > 1;
