-- Security hardening for intentionally exposed analytics/store SECURITY DEFINER functions.
-- Internal authorization helpers are not API endpoints and must not be directly callable
-- by anon/authenticated roles. Parent SECURITY DEFINER functions execute as postgres and
-- can continue to call these helpers internally.

revoke execute on function public.analytics_can_view_costs() from public, anon, authenticated;
revoke execute on function public.analytics_can_view_finance() from public, anon, authenticated;
revoke execute on function public.analytics_can_view_hr() from public, anon, authenticated;
revoke execute on function public.store_manager_authorized(uuid) from public, anon, authenticated;

grant execute on function public.analytics_can_view_costs() to service_role;
grant execute on function public.analytics_can_view_finance() to service_role;
grant execute on function public.analytics_can_view_hr() to service_role;
grant execute on function public.store_manager_authorized(uuid) to service_role;

-- Export remains an authenticated RPC, but authentication alone is insufficient.
-- Require the explicit reports:export permission before recording an export operation.
create or replace function public.analytics_log_export(_report text, _format text, _scope jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c uuid := public.current_company_id();
  scope_value jsonb := coalesce(_scope, '{}'::jsonb);
  scope_key text;
begin
  if auth.uid() is null or c is null then
    raise exception 'UNAUTHENTICATED_EXPORT';
  end if;

  if not public.user_can_module('reports', 'export') then
    raise exception 'FORBIDDEN_REPORT_EXPORT';
  end if;

  if _report is null or _report <> all (array[
    'executive', 'sales', 'manufacturing', 'inventory',
    'inventory-shortages', 'purchasing', 'finance', 'hr',
    'hr-departments', 'projects'
  ]) then
    raise exception 'INVALID_EXPORT_REPORT';
  end if;

  if _format is null or _format <> all (array['csv', 'pdf']) then
    raise exception 'INVALID_EXPORT_FORMAT';
  end if;

  if jsonb_typeof(scope_value) <> 'object' or octet_length(scope_value::text) > 2048 then
    raise exception 'INVALID_EXPORT_SCOPE';
  end if;

  for scope_key in select jsonb_object_keys(scope_value)
  loop
    if scope_key <> all (array['from', 'to', 'customerId', 'departmentId', 'projectId']) then
      raise exception 'INVALID_EXPORT_SCOPE_KEY';
    end if;
    if jsonb_typeof(scope_value -> scope_key) not in ('string', 'null') then
      raise exception 'INVALID_EXPORT_SCOPE_VALUE';
    end if;
  end loop;

  if not (scope_value ? 'from') or not (scope_value ? 'to')
     or jsonb_typeof(scope_value -> 'from') <> 'string'
     or jsonb_typeof(scope_value -> 'to') <> 'string'
     or scope_value ->> 'from' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or scope_value ->> 'to' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'INVALID_EXPORT_DATE_RANGE';
  end if;

  if (scope_value ->> 'from')::date > (scope_value ->> 'to')::date then
    raise exception 'INVALID_EXPORT_DATE_RANGE';
  end if;

  if exists (
    select 1
    from jsonb_each_text(scope_value) e(key, value)
    where e.key in ('customerId', 'departmentId', 'projectId')
      and e.value is not null
      and e.value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception 'INVALID_EXPORT_FILTER_ID';
  end if;

  if (_report <> 'sales' and scope_value ? 'customerId')
     or (_report not in ('hr', 'hr-departments') and scope_value ? 'departmentId')
     or (_report <> 'projects' and scope_value ? 'projectId') then
    raise exception 'INVALID_EXPORT_SCOPE_FOR_REPORT';
  end if;

  insert into public.audit_logs(company_id, user_id, action, entity, entity_id, details)
  values (
    c,
    auth.uid(),
    'analytics_export',
    'analytics',
    null,
    jsonb_build_object('report', _report, 'format', _format, 'scope', scope_value)
  );
end;
$$;

revoke execute on function public.analytics_log_export(text,text,jsonb) from public, anon;
grant execute on function public.analytics_log_export(text,text,jsonb) to authenticated, service_role;
