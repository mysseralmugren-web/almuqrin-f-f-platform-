do $$
begin
  if to_regclass('public.aps_automation_jobs') is not null then
    execute 'drop policy if exists "internal_service_only" on public.aps_automation_jobs';
    execute 'create policy "internal_service_only" on public.aps_automation_jobs for all to authenticated using (false) with check (false)';
  end if;
  if to_regclass('public.employee_mobile_access_requests') is not null then
    execute 'drop policy if exists "internal_service_only" on public.employee_mobile_access_requests';
    execute 'create policy "internal_service_only" on public.employee_mobile_access_requests for all to authenticated using (false) with check (false)';
  end if;
  if to_regclass('public.mobile_attendance_challenges') is not null then
    execute 'drop policy if exists "internal_service_only" on public.mobile_attendance_challenges';
    execute 'create policy "internal_service_only" on public.mobile_attendance_challenges for all to authenticated using (false) with check (false)';
  end if;
  if to_regclass('public.platform_bootstrap_claims') is not null then
    execute 'drop policy if exists "internal_service_only" on public.platform_bootstrap_claims';
    execute 'create policy "internal_service_only" on public.platform_bootstrap_claims for all to authenticated using (false) with check (false)';
  end if;
end $$;
