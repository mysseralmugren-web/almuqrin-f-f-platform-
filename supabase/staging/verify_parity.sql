-- Isolated Staging parity checks. Read-only.
-- Expected baseline recorded 2026-09-03.

select jsonb_build_object(
  'enums', (select count(distinct t.oid) from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typtype='e'),
  'tables', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
  'functions', (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'),
  'triggers', (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal),
  'indexes', (select count(*) from pg_indexes where schemaname='public'),
  'policies', (select count(*) from pg_policies where schemaname='public'),
  'rls_tables', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity),
  'rls_without_policy', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname)),
  'views', (select count(*) from pg_views where schemaname='public'),
  'matviews', (select count(*) from pg_matviews where schemaname='public'),
  'storage_buckets', (select count(*) from storage.buckets),
  'storage_policies', (select count(*) from pg_policies where schemaname='storage'),
  'realtime_tables', (select count(*) from pg_publication_tables where pubname='supabase_realtime'),
  'production_ref_in_functions', (
    select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'
      and pg_get_functiondef(p.oid) ilike '%vmswbmkkgvnjhznxbsdz%'
  ),
  'active_automation_cron', (
    select count(*) from cron.job
    where jobname in ('almuqrin-daily-factory-automation','almuqrin-platform-automation-sweep') and active
  )
) as staging_parity;

-- Hard failure checks suitable for CI/psql.
do $$
begin
  if (select count(*) from pg_policies where schemaname='public') <> 441 then
    raise exception 'STAGING_PARITY: expected 441 public policies';
  end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity) <> 211 then
    raise exception 'STAGING_PARITY: expected RLS on 211 public tables';
  end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity
      and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
  ) then
    raise exception 'STAGING_PARITY: RLS table without policy';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and pg_get_functiondef(p.oid) ilike '%vmswbmkkgvnjhznxbsdz%'
  ) then
    raise exception 'STAGING_ISOLATION: Production Supabase ref found in public function';
  end if;
  if exists (
    select 1 from cron.job
    where jobname in ('almuqrin-daily-factory-automation','almuqrin-platform-automation-sweep') and active
  ) then
    raise exception 'STAGING_ISOLATION: automation cron must remain disabled before activation approval';
  end if;
end $$;
