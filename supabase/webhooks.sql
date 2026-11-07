-- Push-Mitteilungen einschalten (einmalig im Supabase SQL Editor ausführen).
--
-- Vorher ersetzen:
--   <PROJECT_REF>      z. B. abcdefghijklmno (aus der Projekt-URL)
--   <WEBHOOK_SECRET>   derselbe Wert wie bei: supabase secrets set WEBHOOK_SECRET=...
--
-- Das entspricht "Database → Webhooks" im Dashboard, nur schneller.
-- Die Funktion supabase_functions.http_request gibt es in jedem Supabase-Projekt
-- (Database → Webhooks einmal öffnen und "Enable webhooks" klicken, falls nicht).

create or replace trigger notify_messages after insert on public.messages
  for each row execute function supabase_functions.http_request(
    'https://<PROJECT_REF>.supabase.co/functions/v1/notify', 'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}', '{}', '5000');

create or replace trigger notify_matches after insert on public.matches
  for each row execute function supabase_functions.http_request(
    'https://<PROJECT_REF>.supabase.co/functions/v1/notify', 'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}', '{}', '5000');

create or replace trigger notify_swipes after insert on public.swipes
  for each row execute function supabase_functions.http_request(
    'https://<PROJECT_REF>.supabase.co/functions/v1/notify', 'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}', '{}', '5000');

create or replace trigger notify_posts after insert on public.posts
  for each row execute function supabase_functions.http_request(
    'https://<PROJECT_REF>.supabase.co/functions/v1/notify', 'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}', '{}', '5000');
