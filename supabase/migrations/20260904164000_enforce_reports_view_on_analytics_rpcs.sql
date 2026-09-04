-- Require explicit reports:view permission inside client-facing analytics SECURITY DEFINER RPCs.
-- This preserves the existing RPC contracts and tenant scoping while preventing a signed-in
-- account without report access from invoking analytics endpoints directly through PostgREST.
--
-- We intentionally do not revoke authenticated EXECUTE from RLS helper functions here because
-- those helpers are called by row-level security policies and revoking them can break policy evaluation.

do $migration$
declare
  r record;
  def text;
  needle text := 'BEGIN' || chr(10);
  replacement text := 'BEGIN' || chr(10)
    || '  IF NOT public.user_can_module(''reports'', ''view'') THEN RAISE EXCEPTION ''FORBIDDEN_REPORT_VIEW''; END IF;'
    || chr(10);
begin
  for r in
    select p.oid, p.proname
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'analytics_executive',
        'analytics_finance',
        'analytics_hr',
        'analytics_inventory',
        'analytics_manufacturing',
        'analytics_projects',
        'analytics_purchasing',
        'analytics_sales'
      )
      and p.prosecdef
  loop
    def := pg_catalog.pg_get_functiondef(r.oid);

    if position('FORBIDDEN_REPORT_VIEW' in def) = 0 then
      def := replace(def, needle, replacement);
      execute def;
    end if;
  end loop;
end
$migration$;
