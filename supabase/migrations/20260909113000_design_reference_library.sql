-- Private design reference library for internal inspiration and original-design workflows.
-- References are never publishable as store products. A separate derivative must be created and human-approved.

create table if not exists public.design_references (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reference_code text not null,
  title_ar text not null,
  provisional_collection_ar text,
  image_object_path text,
  source_file text,
  image_width integer check (image_width is null or image_width > 0),
  image_height integer check (image_height is null or image_height > 0),
  store_status text not null default 'private_design_reference'
    check (store_status = 'private_design_reference'),
  copyright_note_ar text,
  three_d_mode text not null default 'parametric_original_design'
    check (three_d_mode = 'parametric_original_design'),
  three_d_template text,
  design_instruction_ar text,
  detected_category text,
  style_tags text[] not null default '{}',
  material_tags text[] not null default '{}',
  color_tags text[] not null default '{}',
  quality_score numeric(5,4) check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),
  classification_confidence numeric(5,4) check (classification_confidence is null or (classification_confidence >= 0 and classification_confidence <= 1)),
  ai_review_status text not null default 'pending'
    check (ai_review_status in ('pending','reviewed','needs_review','rejected')),
  human_review_status text not null default 'pending'
    check (human_review_status in ('pending','approved','rejected')),
  classification_source text not null default 'legacy_import_unverified'
    check (classification_source in ('legacy_import_unverified','ai_vision','human_review')),
  copyright_risk_level text not null default 'unknown'
    check (copyright_risk_level in ('unknown','low','medium','high')),
  visual_embedding_id text,
  publish_allowed boolean not null default false check (publish_allowed = false),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, reference_code)
);

create index if not exists design_references_company_idx
  on public.design_references(company_id, created_at desc);
create index if not exists design_references_review_idx
  on public.design_references(company_id, human_review_status, ai_review_status);
create index if not exists design_references_detected_category_idx
  on public.design_references(company_id, detected_category);

create table if not exists public.design_reference_derivatives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reference_id uuid not null references public.design_references(id) on delete restrict,
  title_ar text not null,
  status text not null default 'draft' check (status in ('draft','review','approved','rejected')),
  change_summary text not null,
  dimensions jsonb not null default '{}'::jsonb,
  materials jsonb not null default '{}'::jsonb,
  colors jsonb not null default '{}'::jsonb,
  manufacturing_notes text,
  bom jsonb not null default '[]'::jsonb,
  estimated_cost_sar numeric(14,2) check (estimated_cost_sar is null or estimated_cost_sar >= 0),
  estimated_days integer check (estimated_days is null or estimated_days > 0),
  render_scene_spec jsonb not null default '{}'::jsonb,
  publish_allowed boolean not null default false,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (publish_allowed = false or (status = 'approved' and approved_by is not null and approved_at is not null))
);

create index if not exists design_reference_derivatives_company_idx
  on public.design_reference_derivatives(company_id, created_at desc);
create index if not exists design_reference_derivatives_reference_idx
  on public.design_reference_derivatives(reference_id, created_at desc);

alter table public.design_references enable row level security;
alter table public.design_reference_derivatives enable row level security;

-- References are intentionally restricted to management, designers and production management.
drop policy if exists "design references read" on public.design_references;
create policy "design references read" on public.design_references
for select to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_references.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer','production_manager'])
  )
);

drop policy if exists "design references insert" on public.design_references;
create policy "design references insert" on public.design_references
for insert to authenticated
with check (
  company_id = public.current_company_id()
  and publish_allowed = false
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_references.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer'])
  )
);

drop policy if exists "design references update" on public.design_references;
create policy "design references update" on public.design_references
for update to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_references.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer'])
  )
)
with check (
  company_id = public.current_company_id()
  and publish_allowed = false
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_references.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer'])
  )
);

-- No DELETE policy: references are archived, preserving auditability and derivative provenance.

drop policy if exists "design derivatives read" on public.design_reference_derivatives;
create policy "design derivatives read" on public.design_reference_derivatives
for select to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_reference_derivatives.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer','production_manager'])
  )
);

drop policy if exists "design derivatives insert" on public.design_reference_derivatives;
create policy "design derivatives insert" on public.design_reference_derivatives
for insert to authenticated
with check (
  company_id = public.current_company_id()
  and publish_allowed = false
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_reference_derivatives.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer'])
  )
);

drop policy if exists "design derivatives update" on public.design_reference_derivatives;
create policy "design derivatives update" on public.design_reference_derivatives
for update to authenticated
using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_reference_derivatives.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer'])
  )
)
with check (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.company_id = design_reference_derivatives.company_id
      and ur.role::text = any(array['super_admin','factory_owner','general_manager','designer'])
  )
);
