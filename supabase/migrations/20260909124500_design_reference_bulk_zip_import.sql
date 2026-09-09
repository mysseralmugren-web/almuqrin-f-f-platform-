-- Bulk ZIP import for private design references.
-- Images remain private and are never directly publishable.

alter table public.design_references
  add column if not exists image_sha256 text;

alter table public.design_references
  drop constraint if exists design_references_image_sha256_format;
alter table public.design_references
  add constraint design_references_image_sha256_format
  check (image_sha256 is null or image_sha256 ~ '^[a-f0-9]{64}$');

create unique index if not exists design_references_company_sha256_uidx
  on public.design_references(company_id, image_sha256)
  where image_sha256 is not null and archived_at is null;

create table if not exists public.design_reference_import_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  file_name text not null,
  total_items integer not null default 0 check (total_items >= 0 and total_items <= 5000),
  processed_items integer not null default 0 check (processed_items >= 0),
  imported_items integer not null default 0 check (imported_items >= 0),
  duplicate_items integer not null default 0 check (duplicate_items >= 0),
  failed_items integer not null default 0 check (failed_items >= 0),
  status text not null default 'queued'
    check (status in ('queued','validating','uploading','importing','completed','failed','cancelled')),
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (processed_items <= total_items or total_items = 0),
  check (imported_items + duplicate_items + failed_items <= processed_items)
);

create index if not exists design_reference_import_jobs_company_idx
  on public.design_reference_import_jobs(company_id, created_at desc);

alter table public.design_reference_import_jobs enable row level security;

drop policy if exists "design reference import jobs read" on public.design_reference_import_jobs;
create policy "design reference import jobs read" on public.design_reference_import_jobs
for select to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_reference_import_jobs.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer','production_manager'])
  )
);

drop policy if exists "design reference import jobs insert" on public.design_reference_import_jobs;
create policy "design reference import jobs insert" on public.design_reference_import_jobs
for insert to authenticated
with check (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_reference_import_jobs.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer'])
  )
);

drop policy if exists "design reference import jobs update" on public.design_reference_import_jobs;
create policy "design reference import jobs update" on public.design_reference_import_jobs
for update to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_reference_import_jobs.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer'])
  )
)
with check (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_reference_import_jobs.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer'])
  )
);

-- No DELETE policy: import history is part of the audit trail.

create or replace function public.increment_design_reference_import_job(
  p_job_id uuid,
  p_imported integer,
  p_duplicates integer,
  p_failed integer
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.design_reference_import_jobs
  set processed_items = processed_items + 1,
      imported_items = imported_items + greatest(p_imported, 0),
      duplicate_items = duplicate_items + greatest(p_duplicates, 0),
      failed_items = failed_items + greatest(p_failed, 0),
      status = 'importing',
      updated_at = now()
  where id = p_job_id
    and company_id = public.current_company_id();
$$;

revoke all on function public.increment_design_reference_import_job(uuid, integer, integer, integer) from public;
grant execute on function public.increment_design_reference_import_job(uuid, integer, integer, integer) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'design-references-private',
  'design-references-private',
  false,
  20971520,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
