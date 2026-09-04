begin;

-- Move low-dependency RLS helpers out of the exposed public API schema.
-- ALTER FUNCTION preserves function OIDs, ACLs, and dependent policy bindings.
alter function public.my_customer_ids() set schema private;
alter function public.is_project_staff() set schema private;

-- Keep authenticated access only for RLS evaluation; anon remains denied.
grant usage on schema private to authenticated;
revoke usage on schema private from anon;

grant execute on function private.my_customer_ids() to authenticated;
grant execute on function private.is_project_staff() to authenticated;
revoke execute on function private.my_customer_ids() from public, anon;
revoke execute on function private.is_project_staff() from public, anon;

commit;
