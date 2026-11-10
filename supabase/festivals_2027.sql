-- MOSHCHAT – die fünf größten Musikfestivals Österreichs 2027 als Events
--
-- Ersetzt die erfundenen Test-Events durch echte Festivals.
-- Termine und bestätigte Acts: Stand November 2026, laut Ankündigungen der Veranstalter
-- und Medienberichten. Bitte vor dem Launch noch einmal prüfen.
-- Ersteller ist das Admin-Konto. "official" bleibt aus (kein verifizierter Veranstalter).
-- Wiederholbar: vorhandene Festivals werden nicht doppelt angelegt.

begin;

-- 1. Erfundene Test-Events entfernen ------------------------------------------
-- Likes und Matches bleiben erhalten (deren Event-Bezug wird nur geleert).
delete from public.events where title like '[TEST]%' or title like '[Test]%';
delete from public.events
 where creator_id in (select id from auth.users where email like '%@test.moshchat.invalid');

-- 2. Festivals anlegen ---------------------------------------------------------
with admin as (
  select p.id from public.profiles p join auth.users u on u.id = p.id
   where p.is_admin and u.email not like '%@test.moshchat.invalid'
   order by p.created_at limit 1
), f (title, category, color, starts_on, ends_on, venue, city, description, ticket_url) as (values
  ('Donauinselfest 2027', 'festival', '#62CFCB', date '2027-06-25', date '2027-06-27',
   'Donauinsel', 'Wien',
   'Eines der größten Gratis-Open-Airs Europas: drei Tage Musik auf mehreren Bühnen entlang der Donauinsel, von Pop und Austropop bis Rock, Hip-Hop und Elektro. Der Eintritt ist frei. Das Programm wird im Frühling bekanntgegeben. Zuletzt kamen rund 2,5 Millionen Besuche.',
   null),
  ('Nova Rock 2027', 'festival', '#FF7A9C', date '2027-06-09', date '2027-06-12',
   'Pannonia Fields', 'Nickelsdorf',
   'Österreichs größtes Rockfestival, 2027 erstmals mit vier Tagen. Bestätigt sind unter anderem Die Ärzte, Die Toten Hosen, Faith No More, The Smashing Pumpkins, Evanescence und Billy Talent (Stand November 2026). Camping direkt neben dem Gelände.',
   'https://www.novarock.at'),
  ('Woodstock der Blasmusik 2027', 'festival', '#FFBE4D', date '2027-07-01', date '2027-07-04',
   'Festivalgelände', 'Ort im Innkreis',
   'Das internationale Blasmusik-Festival im Innviertel: vier Tage Brass, Polka und Party mit Kapellen aus vielen Ländern, mit Eröffnung am Donnerstag und Familiensonntag. 2027 zum 15. Mal, zuletzt mit rund 110.000 Besuchen.',
   null),
  ('Electric Love Festival 2027', 'festival', '#9F7FEA', date '2027-07-08', date '2027-07-10',
   'Salzburgring', 'Plainfeld bei Salzburg',
   'Eines der größten Elektro-Festivals Europas, auf der Rennstrecke Salzburgring rund 25 km östlich von Salzburg. Drei Tage EDM, Techno und House auf mehreren Bühnen, mit Camping und Shuttlebussen aus der Stadt. Das Line-up folgt.',
   'https://www.electriclove.at'),
  ('FM4 Frequency Festival 2027', 'festival', '#A8E05F', date '2027-08-19', date '2027-08-21',
   'Green Park', 'St. Pölten',
   'Drei Tage Pop, Hip-Hop, Indie und Elektro im Green Park St. Pölten. Bestätigt sind unter anderem Tokio Hotel, Cro, AnnenMayKantereit und Bibiza (Stand November 2026). Camping am Gelände, zuletzt rund 140.000 Besuche.',
   'https://www.frequency.at')
)
insert into public.events (creator_id, title, category, color, starts_on, ends_on, venue, city, description, ticket_url)
select (select id from admin), f.title, f.category, f.color, f.starts_on, f.ends_on, f.venue, f.city, f.description, f.ticket_url
  from f
 where not exists (select 1 from public.events e where e.title = f.title and e.starts_on = f.starts_on);

-- 3. Testpersonen auf die Festivals verteilen (jede ist bei 3 bis 5 dabei) -------
insert into public.event_members (event_id, user_id)
select e.id, p.id
  from (select id, row_number() over (order by starts_on) as k from public.events
         where title in ('Donauinselfest 2027','Nova Rock 2027','Woodstock der Blasmusik 2027','Electric Love Festival 2027','FM4 Frequency Festival 2027')) e
 cross join (select p.id, row_number() over (order by substring(u.email from 'test(\d+)@')::int) as n from public.profiles p join auth.users u on u.id = p.id
              where u.email like '%@test.moshchat.invalid') p
 where (p.n + e.k) % 4 <> 0 or p.n <= 6
on conflict do nothing;

commit;

-- Kontrolle
select e.title, e.starts_on, e.ends_on, e.city, count(m.user_id) as leute
  from public.events e left join public.event_members m on m.event_id = e.id
 group by e.id order by e.starts_on;
