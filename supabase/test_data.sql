-- MOSHCHAT – Testdaten (NUR zum Testen, nicht für den echten Betrieb)
--
-- Legt 12 Testpersonen an und setzt sie in die kommenden Events der App
-- (zuerst supabase/festivals_2027.sql ausführen). Die Testpersonen sind
-- schon bei den Events dabei, die Hälfte von ihnen hat dich (das Admin-Konto)
-- bereits geliked: Wenn du sie beim Swipen zurück-likest, entsteht ein Match.
-- Deine eigenen Event-Teilnahmen und Swipes werden zurückgesetzt, damit du
-- ganz neu beitreten kannst.
--
-- Wiederholbar: Alte Testdaten werden zuerst gelöscht.
-- Alles wieder entfernen: nur den Abschnitt "1. Aufräumen" ausführen.
-- Testkonten erkennt man an der E-Mail-Endung @test.moshchat.invalid
-- (man kann sich mit ihnen nicht anmelden).

begin;

-- 1. Aufräumen ---------------------------------------------------------------
delete from public.events
 where creator_id in (select id from auth.users where email like '%@test.moshchat.invalid');
delete from auth.users where email like '%@test.moshchat.invalid';

-- 2. Dich (Admin-Konto) zurücksetzen: keine Teilnahmen, keine Swipes, keine Matches
create temp table _me on commit drop as
  select p.id from public.profiles p join auth.users u on u.id = p.id
   where p.is_admin and u.email not like '%@test.moshchat.invalid'
   order by p.created_at limit 1;

delete from public.event_members where user_id in (select id from _me);
delete from public.swipes  where swiper_id in (select id from _me) or target_id in (select id from _me);
delete from public.matches where user_a in (select id from _me) or user_b in (select id from _me);

-- 3. Testpersonen --------------------------------------------------------------
create temp table _people (n int, id uuid, name text, birth date, gender text, job text, city text,
                           bio text, modes text[], lines jsonb, tags text[], color text, likes_me boolean)
  on commit drop;

insert into _people values
 (1,  gen_random_uuid(), 'Lena',    '1997-04-12', 'w',  'Grafikdesignerin', 'Salzburg', 'Immer in der ersten Reihe. Danach noch auf ein Bier?',             '{friends,date}',          '{"friends":"Suche Leute für die erste Reihe!","date":"Erstes Date auf einem Konzert?"}', '{Indie,Techno,Festivals}', '#F2A65E', true),
 (2,  gen_random_uuid(), 'Jonas',   '1994-09-03', 'm',  'Software-Entwickler','Wien',     'Baue gerade mein eigenes Startup. Tanze schlecht, aber gern.',     '{friends,business}',      '{"friends":"Wer kommt mit zur Afterparty?","business":"Suche Co-Founder mit Design-Skills"}', '{Startups,Elektro}', '#8EC5F2', true),
 (3,  gen_random_uuid(), 'Mira',    '1999-01-21', 'w',  'Studentin',        'Salzburg', 'Kunstgeschichte, Vinyl und viel zu viele Konzerttickets.',          '{friends,date,business}', '{"friends":"Neu in Salzburg, suche Konzert-Crew","date":"Lieber Bar als App","business":"Suche Praktikum im Kulturbereich"}', '{Vinyl,Jazz,Kunst}', '#B9A2F2', true),
 (4,  gen_random_uuid(), 'David',   '1992-06-30', 'm',  'Koch',             'Salzburg', 'Koche tagsüber, tanze nachts.',                                     '{friends,date}',          '{"friends":"Wer geht mit mir zum Christkindlmarkt?","date":"Ich koche, du suchst den Wein aus"}', '{Kochen,House}', '#3ED08B', true),
 (5,  gen_random_uuid(), 'Sophie',  '1996-11-08', 'w',  'Marketing-Managerin','Wien',    'Netzwerken mit Sekt in der Hand ist meine Superkraft.',             '{business,friends}',      '{"business":"Gerne Austausch zu Marketing & Events","friends":"Suche Begleitung für Konferenzen"}', '{Marketing,Events}', '#F28BA8', true),
 (6,  gen_random_uuid(), 'Alex',    '1998-02-17', 'nb', 'Fotograf*in',      'Salzburg', 'Fotografiere Konzerte. Rede gern über Licht und Musik.',            '{friends,date,business}', '{"friends":"Fotowalk vor dem Konzert?","date":"Kaffee und Konzert?","business":"Suche Bands für Fotoprojekte"}', '{Fotografie,Rock}', '#F2D25E', true),
 (7,  gen_random_uuid(), 'Tobias',  '1995-08-25', 'm',  'Physiotherapeut',  'Salzburg', 'Laufe Halbmarathons und gehe trotzdem jedes Wochenende fort.',     '{friends,date}',          '{"friends":"Suche Leute für Silvester","date":"Spontan und gut gelaunt"}', '{Sport,Party}', '#9FD8C4', false),
 (8,  gen_random_uuid(), 'Hannah',  '2000-05-14', 'w',  'Studentin',        'Salzburg', 'Erstes Jahr in Salzburg, kenne noch kaum jemanden.',                '{friends}',               '{"friends":"Neu hier, wer zeigt mir die besten Clubs?"}', '{Pop,Indie}', '#E0A3F0', false),
 (9,  gen_random_uuid(), 'Felix',   '1991-12-02', 'm',  'Produktmanager',   'Wien',     'Mag gute Gespräche, schlechte Wortwitze und lange Nächte.',         '{business,date}',         '{"business":"Austausch zu Produkt & Tech","date":"Erst reden, dann tanzen"}', '{Tech,Jazz}', '#6F96F0', false),
 (10, gen_random_uuid(), 'Clara',   '1997-03-29', 'w',  'Lehrerin',         'Salzburg', 'Singe laut mit, besonders bei Liedern, deren Text ich nicht kann.', '{friends,date}',          '{"friends":"Karaoke danach?","date":"Ehrlich und neugierig"}', '{Pop,Theater}', '#FFBE4D', false),
 (11, gen_random_uuid(), 'Elias',   '1993-07-07', 'm',  'Architekt',        'Salzburg', 'Mag Räume, in denen gute Musik läuft.',                             '{business,friends}',      '{"business":"Suche Kontakte in der Eventbranche","friends":"Wer kommt mit zum Konzert?"}', '{Design,Elektro}', '#B5C99A', false),
 (12, gen_random_uuid(), 'Nora',    '1998-10-19', 'w',  'Krankenpflegerin', 'Salzburg', 'Nach dem Nachtdienst brauche ich Musik und gute Leute.',            '{friends,date,business}', '{"friends":"Suche Festival-Crew für nächsten Sommer","date":"Lass uns an der Bar treffen","business":"Austausch Gesundheitsbereich"}', '{Festivals,Techno}', '#FF7A9C', false);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated',
       'test' || n || '@test.moshchat.invalid', '', now(), '', '', '', '',
       '{"provider":"email","providers":["email"]}', '{}', now(), now()
  from _people;

update public.profiles p
   set name = x.name, birthdate = x.birth, gender = x.gender, job = x.job, city = x.city, bio = x.bio,
       modes = x.modes, lines = x.lines, tags = x.tags, color = x.color, onboarded = true, open_all = true
  from _people x where p.id = x.id;

-- 4. Events: die kommenden Events in der App (z. B. aus festivals_2027.sql) --------
-- Hier werden keine eigenen Events mehr erfunden.
create temp table _events on commit drop as
  select id, starts_on as starts, row_number() over (order by starts_on, title) as k
    from public.events where coalesce(ends_on, starts_on) >= current_date
   order by starts_on limit 8;

-- Wer geht wohin (jede Testperson ist bei 3 bis 5 Events dabei)
insert into public.event_members (event_id, user_id)
select e.id, p.id from _events e cross join _people p
 where (p.n + e.k) % 4 <> 0 or p.likes_me
on conflict do nothing;

-- 5. Likes an dich: in jedem Modus, den ihr beide habt -------------------------
insert into public.swipes (swiper_id, target_id, mode, event_id, liked)
select p.id, me.id, m.mode,
       (select e.id from _events e join public.event_members em on em.event_id = e.id and em.user_id = p.id order by e.starts limit 1),
       true
  from _people p
  cross join _me me
  join public.profiles mp on mp.id = me.id
  cross join lateral unnest(p.modes) as m(mode)
 where p.likes_me and m.mode = any(mp.modes);

commit;

-- Kontrolle
select (select count(*) from public.profiles p join auth.users u on u.id = p.id where u.email like '%@test.moshchat.invalid') as testpersonen,
       (select count(distinct m.event_id) from public.event_members m join auth.users u on u.id = m.user_id where u.email like '%@test.moshchat.invalid') as events_mit_testpersonen,
       (select count(*) from public.swipes s join auth.users u on u.id = s.swiper_id where u.email like '%@test.moshchat.invalid') as likes_an_dich,
       (select string_agg(m, ', ') from public.profiles p, unnest(p.modes) m where p.is_admin) as deine_modi;
