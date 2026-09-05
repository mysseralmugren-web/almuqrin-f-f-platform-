alter table public.interior_render_jobs
  add column if not exists idempotency_key text,
  add column if not exists request_fingerprint text,
  add column if not exists preset text not null default 'studio_three_point',
  add column if not exists subject_size_m numeric not null default 1;

alter table public.interior_render_jobs
  drop constraint if exists interior_render_jobs_idempotency_key_check,
  add constraint interior_render_jobs_idempotency_key_check
    check (idempotency_key is null or char_length(idempotency_key) between 8 and 120),
  drop constraint if exists interior_render_jobs_request_fingerprint_check,
  add constraint interior_render_jobs_request_fingerprint_check
    check (request_fingerprint is null or char_length(request_fingerprint) = 64),
  drop constraint if exists interior_render_jobs_preset_check,
  add constraint interior_render_jobs_preset_check
    check (preset in ('studio_three_point','softbox_product')),
  drop constraint if exists interior_render_jobs_subject_size_check,
  add constraint interior_render_jobs_subject_size_check
    check (subject_size_m between 0.1 and 20);

create unique index if not exists interior_render_jobs_company_idempotency_idx
  on public.interior_render_jobs(company_id, idempotency_key)
  where idempotency_key is not null;

alter table public.interior_render_jobs enable row level security;

drop policy if exists interior_render_jobs_select on public.interior_render_jobs;
create policy interior_render_jobs_select on public.interior_render_jobs
  for select to authenticated
  using (company_id = current_company_id() and user_can_module('ai-assistant','view'));

drop policy if exists interior_render_jobs_insert on public.interior_render_jobs;
create policy interior_render_jobs_insert on public.interior_render_jobs
  for insert to authenticated
  with check (
    company_id = current_company_id()
    and requested_by = auth.uid()
    and user_can_module('ai-assistant','edit')
  );

revoke all on public.interior_render_jobs from public, anon;
grant select on public.interior_render_jobs to authenticated;

comment on column public.interior_render_jobs.idempotency_key is 'Client-generated key preventing duplicate render submissions.';
comment on column public.interior_render_jobs.request_fingerprint is 'SHA-256 of normalized scene and render settings.';
