-- Optional: Beispiel-Events zum Testen (im SQL Editor ausführen).
-- Voraussetzung: Du hast dich einmal in der App angemeldet und dich zum Admin gemacht:
--   update public.profiles set is_admin = true where id = (select id from auth.users where email = 'DEINE@EMAIL.AT');
-- Die Events gehören dann dir. Vor dem Launch wieder löschen:
--   delete from public.events where title like '[Test]%';

insert into public.events (creator_id, title, category, color, starts_on, ends_on, start_time, venue, city, description, official)
select p.id, e.title, e.category, e.color, current_date + e.d0, case when e.d1 is null then null else current_date + e.d1 end, e.t::time, e.venue, e.city, e.descr, true
from (select id from public.profiles where is_admin order by created_at limit 1) p
cross join (values
  ('[Test] Heute Abend Live', 'konzert', '#F2A65E', 0, null::int, '19:30', 'Testhalle', 'Wien', 'Läuft heute: zum Testen von Check-in und „gerade hier“.'),
  ('[Test] Wochenend-Festival', 'festival', '#3ED08B', 5, 8, '14:00', 'Testgelände', 'Wien', 'Mehrtägiges Test-Event.'),
  ('[Test] Startup-Messe', 'messe', '#8DB8EA', 12, 13, '09:00', 'Testmesse', 'Wien', 'Für den Business-Modus.'),
  ('[Test] Vergangene Party', 'party', '#B9A0F2', -10, null, '22:00', 'Testclub', 'Wien', 'Schon vorbei: Leute kann man trotzdem noch kennenlernen.')
) as e(title, category, color, d0, d1, t, venue, city, descr);
