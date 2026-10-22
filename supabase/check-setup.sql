-- Read-only Go-live-Prüfung. Im Supabase-Dashboard unter SQL Editor einfügen und ausführen.
-- Ändert nichts. Jede Zeile mit ok = false zeigt, was noch fehlt.
with expected_tables(name) as (
  values ('profiles'),('businesses'),('parts_items'),('parts_trades'),('parts_messages'),
    ('parts_wanted'),('parts_wanted_matches'),('parts_reports'),('parts_moderation_log'),
    ('parts_ratings'),('parts_purchases'),('platform_settings'),('access_tokens'),
    ('email_outbox'),('notifications'),('webhook_events'),('rate_limits'),
    ('commercial_requests'),('commercial_request_log'),('crm_contacts'),('crm_activity')
), expected_functions(name) as (
  values ('create_listing'),('confirm_listing'),('search_public_items'),('create_inquiry'),
    ('claim_outbox'),('consume_rate_limit'),('create_management_token'),('transition_trade'),
    ('release_twint'),('create_wanted'),('enqueue_wanted_matches'),('moderate_entry'),
    ('admin_manage_entry'),('decide_commercial_request'),('crm_save_contact')
)
select 1 as nr, 'Tabellen vorhanden' as pruefung,
  not exists (select 1 from expected_tables e where to_regclass('public.' || e.name) is null) as ok,
  coalesce((select string_agg(e.name, ', ') from expected_tables e
    where to_regclass('public.' || e.name) is null), '') as details
union all
select 2, 'Funktionen vorhanden (alle 16 Migrationen)',
  not exists (select 1 from expected_functions f where not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f.name)),
  coalesce((select string_agg(f.name, ', ') from expected_functions f where not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f.name)), '')
union all
select 3, 'RLS auf allen Tabellen aktiv',
  not exists (select 1 from pg_tables where schemaname = 'public' and not rowsecurity),
  coalesce((select string_agg(tablename, ', ') from pg_tables
    where schemaname = 'public' and not rowsecurity), '')
union all
select 4, 'Browser hat keinen direkten Tabellenzugriff',
  not exists (select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')),
  coalesce((select string_agg(distinct table_name, ', ') from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')), '')
union all
select 5, 'Foto-Bucket parts-photos öffentlich lesbar',
  exists (select 1 from storage.buckets where id = 'parts-photos' and public),
  ''
union all
select 6, 'Keine Storage-Policies, die Browser-Uploads erlauben',
  not exists (select 1 from pg_policies where schemaname = 'storage'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')),
  coalesce((select string_agg(policyname, ', ') from pg_policies where schemaname = 'storage'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')), '')
union all
select 7, 'Plattform-Einstellungen angelegt',
  exists (select 1 from public.platform_settings),
  coalesce((select 'Gast-Inserate: ' || (value ->> 'guestListingsEnabled')
    from public.platform_settings limit 1), '')
union all
select 8, 'Admin-Konto gesetzt',
  exists (select 1 from public.profiles where role = 'admin'),
  'Erst unter /admin anmelden, dann: update public.profiles set role = ''admin'' where id = ''<user-id>'';'
union all
select 9, 'E-Mail-Warteschlange ohne Fehler',
  not exists (select 1 from public.email_outbox where sent_at is null and last_error is not null),
  (select count(*) filter (where sent_at is null) || ' offen, '
    || count(*) filter (where sent_at is not null) || ' versendet'
    from public.email_outbox)
order by nr;
