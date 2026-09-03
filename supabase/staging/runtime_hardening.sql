-- STAGING-ONLY REFERENCE.
-- Do not place this file under supabase/migrations and do not apply it to Production.
-- This records the runtime hardening applied to the isolated Staging project.

-- 1) Prevent anonymous direct execution of SECURITY DEFINER functions.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig,
           p.prorettype = 'pg_catalog.trigger'::regtype as is_trigger
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prosecdef
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke all on function %s from anon', r.sig);
    execute format('revoke all on function %s from authenticated', r.sig);

    if not r.is_trigger then
      execute format('grant execute on function %s to authenticated', r.sig);
      execute format('grant execute on function %s to service_role', r.sig);
    end if;
  end loop;
end $$;

-- 2) Internal-only functions: never expose these as signed-in client RPCs.
revoke execute on function public.increment_wa_unread(uuid) from authenticated;
revoke execute on function public.purge_expired_ai_jobs(uuid) from authenticated;
revoke execute on function public.raise_platform_alert(uuid,text,text,text,text,text,uuid,jsonb) from authenticated;
revoke execute on function public.refresh_store_public_catalog(uuid) from authenticated;
revoke execute on function public.run_daily_factory_automation() from authenticated;
revoke execute on function public.run_platform_automation_sweep() from authenticated;
revoke execute on function public.sync_ai_twin_skills_for_company(uuid) from authenticated;
revoke execute on function public.sync_store_product_candidate(uuid) from authenticated;

-- 3) Staging's PDF dispatcher remains fail-closed until a staging-only worker
-- secret and staging-local ingestion endpoint are configured.
-- Never substitute the source/live endpoint or worker token.
