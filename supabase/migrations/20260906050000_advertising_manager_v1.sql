-- Advertising Manager for Meta, TikTok and X. Idempotent so it can safely
-- reconcile environments where the migration was applied through Supabase first.
create table if not exists public.advertising_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  platform text not null check (platform in ('META','TIKTOK','X')),
  account_id text not null,
  account_name text,
  currency text not null default 'SAR',
  is_active boolean not null default true,
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, platform, account_id)
);

create table if not exists public.advertising_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  advertising_account_id uuid not null references public.advertising_accounts(id) on delete cascade,
  external_campaign_id text not null,
  name text not null,
  objective text,
  status text not null default 'DRAFT',
  daily_budget numeric(14,2),
  lifetime_budget numeric(14,2),
  start_at timestamptz,
  end_at timestamptz,
  customer_id uuid references public.customers(id) on delete set null,
  quotation_id uuid references public.quotations(id) on delete set null,
  sales_order_id uuid references public.sales_orders(id) on delete set null,
  creative_payload jsonb not null default '{}'::jsonb,
  approval_status text not null default 'DRAFT' check (approval_status in ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, advertising_account_id, external_campaign_id)
);

create table if not exists public.advertising_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  campaign_id uuid not null references public.advertising_campaigns(id) on delete cascade,
  metric_date date not null,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  leads bigint not null default 0,
  conversions bigint not null default 0,
  spend numeric(14,2) not null default 0,
  attributed_revenue numeric(14,2) not null default 0,
  ctr numeric(12,6) generated always as (case when impressions > 0 then clicks::numeric / impressions * 100 else 0 end) stored,
  cpc numeric(14,4) generated always as (case when clicks > 0 then spend / clicks else 0 end) stored,
  cpm numeric(14,4) generated always as (case when impressions > 0 then spend / impressions * 1000 else 0 end) stored,
  cpl numeric(14,4) generated always as (case when leads > 0 then spend / leads else 0 end) stored,
  conversion_rate numeric(12,6) generated always as (case when clicks > 0 then conversions::numeric / clicks * 100 else 0 end) stored,
  roas numeric(14,4) generated always as (case when spend > 0 then attributed_revenue / spend else 0 end) stored,
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique(company_id, campaign_id, metric_date)
);

create table if not exists public.advertising_recommendations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  campaign_id uuid not null references public.advertising_campaigns(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in ('CONTINUE','SCALE','PAUSE','CHANGE_CREATIVE','CHANGE_AUDIENCE','CHANGE_OFFER','REVIEW_TRACKING')),
  priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')),
  title text not null,
  rationale text not null,
  expected_impact text,
  based_on jsonb not null default '{}'::jsonb,
  status text not null default 'OPEN' check (status in ('OPEN','APPROVED','DISMISSED','APPLIED')),
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  applied_by uuid references auth.users(id)
);

alter table public.advertising_accounts enable row level security;
alter table public.advertising_campaigns enable row level security;
alter table public.advertising_daily_metrics enable row level security;
alter table public.advertising_recommendations enable row level security;

grant select on public.advertising_accounts, public.advertising_campaigns, public.advertising_daily_metrics, public.advertising_recommendations to authenticated;
grant insert, update, delete on public.advertising_accounts, public.advertising_campaigns, public.advertising_recommendations to authenticated;

drop policy if exists advertising_accounts_company_select on public.advertising_accounts;
create policy advertising_accounts_company_select on public.advertising_accounts for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.company_id=advertising_accounts.company_id and p.is_active=true));

drop policy if exists advertising_campaigns_company_select on public.advertising_campaigns;
create policy advertising_campaigns_company_select on public.advertising_campaigns for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.company_id=advertising_campaigns.company_id and p.is_active=true));

drop policy if exists advertising_metrics_company_select on public.advertising_daily_metrics;
create policy advertising_metrics_company_select on public.advertising_daily_metrics for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.company_id=advertising_daily_metrics.company_id and p.is_active=true));

drop policy if exists advertising_recommendations_company_select on public.advertising_recommendations;
create policy advertising_recommendations_company_select on public.advertising_recommendations for select to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.company_id=advertising_recommendations.company_id and p.is_active=true));

drop policy if exists advertising_accounts_manage on public.advertising_accounts;
create policy advertising_accounts_manage on public.advertising_accounts for all to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.company_id=advertising_accounts.company_id and r.role::text in ('factory_owner','general_manager','sales')))
with check (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.company_id=advertising_accounts.company_id and r.role::text in ('factory_owner','general_manager','sales')));

drop policy if exists advertising_campaigns_manage on public.advertising_campaigns;
create policy advertising_campaigns_manage on public.advertising_campaigns for all to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.company_id=advertising_campaigns.company_id and r.role::text in ('factory_owner','general_manager','sales')))
with check (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.company_id=advertising_campaigns.company_id and r.role::text in ('factory_owner','general_manager','sales')));

drop policy if exists advertising_recommendations_manage on public.advertising_recommendations;
create policy advertising_recommendations_manage on public.advertising_recommendations for all to authenticated
using (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.company_id=advertising_recommendations.company_id and r.role::text in ('factory_owner','general_manager','sales')))
with check (exists (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.company_id=advertising_recommendations.company_id and r.role::text in ('factory_owner','general_manager','sales')));

create index if not exists idx_ad_accounts_company on public.advertising_accounts(company_id,platform);
create index if not exists idx_ad_campaign_account on public.advertising_campaigns(company_id,advertising_account_id);
create index if not exists idx_ad_metrics_campaign_date on public.advertising_daily_metrics(company_id,campaign_id,metric_date desc);
create index if not exists idx_ad_recommendations_campaign on public.advertising_recommendations(company_id,campaign_id,status);

insert into public.role_module_permissions(company_id,role,module_key,can_view,can_create,can_edit,can_approve,can_delete,can_export)
select distinct r.company_id,r.role,'marketing',true,true,true,
  (r.role::text in ('factory_owner','general_manager')),
  (r.role::text='factory_owner'),true
from public.user_roles r
where r.role::text in ('factory_owner','general_manager','sales')
on conflict(company_id,role,module_key) do update set
  can_view=excluded.can_view,
  can_create=excluded.can_create,
  can_edit=excluded.can_edit,
  can_approve=excluded.can_approve,
  can_delete=excluded.can_delete,
  can_export=excluded.can_export,
  updated_at=now();
