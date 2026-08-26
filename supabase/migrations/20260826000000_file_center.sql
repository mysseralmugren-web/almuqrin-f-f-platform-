-- File centre. Safe for databases where the generic attachments module was not installed yet.
create extension if not exists pgcrypto;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  object_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.attachments enable row level security;

drop policy if exists "attachments_company_read" on public.attachments;
create policy "attachments_company_read" on public.attachments for select to authenticated
  using (company_id = public.current_company_id());
drop policy if exists "attachments_company_insert" on public.attachments;
create policy "attachments_company_insert" on public.attachments for insert to authenticated
  with check (company_id = public.current_company_id() and created_by = auth.uid());
drop policy if exists "attachments_company_update" on public.attachments;
create policy "attachments_company_update" on public.attachments for update to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

insert into storage.buckets (id,name,public,file_size_limit)
values ('mfg-attachments','mfg-attachments',false,52428800)
on conflict (id) do update set public=false,file_size_limit=52428800;

drop policy if exists "file_center_storage_read" on storage.objects;
create policy "file_center_storage_read" on storage.objects for select to authenticated
  using (bucket_id='mfg-attachments' and (storage.foldername(name))[1]=public.current_company_id()::text);
drop policy if exists "file_center_storage_insert" on storage.objects;
create policy "file_center_storage_insert" on storage.objects for insert to authenticated
  with check (bucket_id='mfg-attachments' and (storage.foldername(name))[1]=public.current_company_id()::text and coalesce((storage.foldername(name))[2],'')<>'hr');

alter table public.attachments add column if not exists title text;
alter table public.attachments add column if not exists description text;
alter table public.attachments add column if not exists category text not null default 'other'
  check (category in ('plans','contracts','invoices','site_photos','designs','other'));
alter table public.attachments add column if not exists checksum text;
alter table public.attachments add column if not exists version integer not null default 1;
alter table public.attachments add column if not exists is_primary boolean not null default false;
alter table public.attachments add column if not exists sort_order integer not null default 0;
alter table public.attachments add column if not exists deleted_at timestamptz;
alter table public.attachments add column if not exists updated_at timestamptz not null default now();
create unique index if not exists attachments_company_checksum_active
  on public.attachments(company_id, checksum) where checksum is not null and deleted_at is null;
create index if not exists attachments_company_category on public.attachments(company_id, category, created_at desc);

create table if not exists public.attachment_comments (
  id uuid primary key default gen_random_uuid(), attachment_id uuid not null references public.attachments(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade, user_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 2000), marker_x numeric(5,2), marker_y numeric(5,2), created_at timestamptz not null default now()
);
alter table public.attachment_comments enable row level security;
drop policy if exists "attachment_comments_company_read" on public.attachment_comments;
create policy "attachment_comments_company_read" on public.attachment_comments for select to authenticated using (company_id=public.current_company_id());
drop policy if exists "attachment_comments_company_insert" on public.attachment_comments;
create policy "attachment_comments_company_insert" on public.attachment_comments for insert to authenticated with check (company_id=public.current_company_id() and user_id=auth.uid());

create table if not exists public.attachment_shares (
  id uuid primary key default gen_random_uuid(), token uuid not null unique default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade, created_by uuid not null references auth.users(id),
  category text not null default 'other', can_upload boolean not null default true, can_download boolean not null default false,
  expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now()
);
alter table public.attachment_shares enable row level security;
drop policy if exists "attachment_shares_owner" on public.attachment_shares;
create policy "attachment_shares_owner" on public.attachment_shares for all to authenticated
  using (company_id=public.current_company_id() and (created_by=auth.uid() or public.is_company_admin()))
  with check (company_id=public.current_company_id() and created_by=auth.uid());
