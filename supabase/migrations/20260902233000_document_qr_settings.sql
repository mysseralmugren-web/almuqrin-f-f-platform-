create table if not exists public.document_qr_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  enabled boolean not null default true,
  position text not null default 'footer' check (position in ('footer','header')),
  size_px integer not null default 96 check (size_px between 64 and 180),
  label_ar text not null default 'امسح للتحقق من صحة المستند',
  label_en text not null default 'Scan to verify this document',
  show_internal_on_tax_invoice boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.document_qr_settings enable row level security;

create policy "document_qr_settings_select_company"
on public.document_qr_settings for select
to authenticated
using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "document_qr_settings_write_admin"
on public.document_qr_settings for all
to authenticated
using (
  company_id = (select company_id from public.profiles where id = auth.uid())
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('super_admin','factory_owner','general_manager')
  )
)
with check (
  company_id = (select company_id from public.profiles where id = auth.uid())
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('super_admin','factory_owner','general_manager')
  )
);
