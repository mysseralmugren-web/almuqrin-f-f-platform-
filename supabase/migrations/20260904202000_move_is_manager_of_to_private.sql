create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.is_manager_of(_employee_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid;
  cur uuid;
  depth int := 0;
begin
  me := public.current_employee_id();
  if me is null or _employee_id is null then
    return false;
  end if;

  select manager_id into cur
  from public.employees
  where id = _employee_id;

  while cur is not null and depth < 8 loop
    if cur = me then
      return true;
    end if;

    select manager_id into cur
    from public.employees
    where id = cur;

    depth := depth + 1;
  end loop;

  return false;
end;
$$;

revoke all on function private.is_manager_of(uuid) from public, anon;
revoke execute on function private.is_manager_of(uuid) from authenticated;
grant execute on function private.is_manager_of(uuid) to authenticated, service_role;

alter policy lr_update on public.leave_requests
using (
  (company_id = public.current_company_id())
  and (
    public.is_hr_staff()
    or private.is_manager_of(employee_id)
    or (
      employee_id = public.current_employee_id()
      and status = any (array['draft'::public.leave_request_status, 'submitted'::public.leave_request_status])
    )
  )
)
with check (company_id = public.current_company_id());

drop function public.is_manager_of(uuid);
