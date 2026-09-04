-- Owner-only protection for factory watermark / document branding.
-- Reads remain governed by existing RLS. This trigger protects writes even if
-- a client attempts to bypass the UI and call Supabase directly.

create or replace function public.enforce_watermark_owner_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  v_is_owner boolean := false;
begin
  if v_uid is null then
    raise exception 'FORBIDDEN_WATERMARK_OWNER_ONLY';
  end if;

  select p.company_id
    into v_company
    from public.profiles p
   where p.id = v_uid;

  select exists (
    select 1
      from public.user_roles ur
     where ur.user_id = v_uid
       and ur.role::text = 'factory_owner'
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'FORBIDDEN_WATERMARK_OWNER_ONLY';
  end if;

  if tg_op = 'DELETE' then
    if old.company_id is distinct from v_company then
      raise exception 'FORBIDDEN_WATERMARK_COMPANY_SCOPE';
    end if;
    return old;
  end if;

  if new.company_id is distinct from v_company then
    raise exception 'FORBIDDEN_WATERMARK_COMPANY_SCOPE';
  end if;

  -- Factory watermark is mandatory on generated documents.
  new.enabled := true;
  new.apply_generated_documents := true;
  return new;
end;
$$;

revoke all on function public.enforce_watermark_owner_only() from public;
grant execute on function public.enforce_watermark_owner_only() to authenticated;

do $$
begin
  if to_regclass('public.watermark_settings') is not null then
    execute 'drop trigger if exists watermark_owner_only_guard on public.watermark_settings';
    execute 'create trigger watermark_owner_only_guard before insert or update or delete on public.watermark_settings for each row execute function public.enforce_watermark_owner_only()';
  end if;
end
$$;
