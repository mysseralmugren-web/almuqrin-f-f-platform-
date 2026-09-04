-- Prevent future application-owned functions in the exposed public schema
-- from automatically becoming callable Data API RPCs.
--
-- Existing platform functions are unchanged by ALTER DEFAULT PRIVILEGES.
-- The platform's application functions are owned by postgres; system-owned
-- supabase_admin defaults are managed by Supabase and are not modified here.

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

-- Reserve an unexposed schema for privileged RLS/authorization helpers.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
