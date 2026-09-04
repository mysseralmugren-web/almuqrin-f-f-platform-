-- Move the low-dependency communications admin helper out of the exposed
-- public Data API schema while preserving authenticated RLS evaluation.

alter function public.is_comms_admin() set schema private;

revoke all on function private.is_comms_admin() from public, anon;
grant execute on function private.is_comms_admin() to authenticated, service_role;

grant usage on schema private to authenticated, service_role;
revoke usage on schema private from anon;
