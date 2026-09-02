create extension if not exists vector with schema extensions;

create table if not exists public.cloud_runtime_environments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  environment text not null check (environment in ('development','staging','production')),
  is_active boolean not null default true,
  is_default boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, environment)
);

create unique index if not exists cloud_runtime_environments_one_default_idx
  on public.cloud_runtime_environments(company_id) where is_default;

create table if not exists public.ai_gateway_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid,
  skill_key text not null,
  target_entity text,
  target_id uuid,
  environment text not null default 'production' check (environment in ('development','staging','production')),
  status text not null default 'queued' check (status in ('queued','running','needs_review','completed','failed','cancelled')),
  provider text,
  model text,
  trace_id uuid not null default gen_random_uuid(),
  request_fingerprint text,
  input_summary jsonb not null default '{}'::jsonb,
  retrieval_context jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  confidence numeric,
  approval_required boolean not null default true,
  error_code text,
  error_message text,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  latency_ms integer,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ai_gateway_runs_company_created_idx on public.ai_gateway_runs(company_id, created_at desc);
create index if not exists ai_gateway_runs_trace_idx on public.ai_gateway_runs(trace_id);
create index if not exists ai_gateway_runs_skill_idx on public.ai_gateway_runs(company_id, skill_key, created_at desc);

create table if not exists public.ai_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  document_id uuid references public.ai_knowledge_documents(id) on delete cascade,
  source_entity text,
  source_id uuid,
  chunk_index integer not null default 0,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  checksum text,
  embedding extensions.vector(1536),
  embedding_model text,
  approved boolean not null default false,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);
create index if not exists ai_knowledge_chunks_company_idx on public.ai_knowledge_chunks(company_id, approved, active);
create index if not exists ai_knowledge_chunks_document_idx on public.ai_knowledge_chunks(document_id, chunk_index);
create index if not exists ai_knowledge_chunks_embedding_hnsw_idx
  on public.ai_knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null and approved and active;

create table if not exists public.ai_retrieval_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  gateway_run_id uuid references public.ai_gateway_runs(id) on delete set null,
  query_text text,
  query_hash text,
  matched_chunk_ids uuid[] not null default '{}',
  match_scores jsonb not null default '[]'::jsonb,
  top_k integer not null default 0,
  latency_ms integer,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists ai_retrieval_logs_company_created_idx on public.ai_retrieval_logs(company_id, created_at desc);

create table if not exists public.platform_observability_events (
  id bigint generated always as identity primary key,
  company_id uuid,
  trace_id uuid,
  source text not null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('debug','info','warning','error','critical')),
  entity_type text,
  entity_id uuid,
  message text,
  attributes jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists platform_observability_company_created_idx on public.platform_observability_events(company_id, created_at desc);
create index if not exists platform_observability_trace_idx on public.platform_observability_events(trace_id, created_at);
create index if not exists platform_observability_severity_idx on public.platform_observability_events(severity, created_at desc);

alter table public.cloud_runtime_environments enable row level security;
alter table public.ai_gateway_runs enable row level security;
alter table public.ai_knowledge_chunks enable row level security;
alter table public.ai_retrieval_logs enable row level security;
alter table public.platform_observability_events enable row level security;

create policy cloud_runtime_environments_company_policy on public.cloud_runtime_environments
  for all to authenticated
  using (company_id = current_company_id() and user_can_module('settings','view'))
  with check (company_id = current_company_id() and user_can_module('settings','edit'));

create policy ai_gateway_runs_company_policy on public.ai_gateway_runs
  for all to authenticated
  using (company_id = current_company_id() and user_can_module('ai-assistant','view'))
  with check (company_id = current_company_id() and user_can_module('ai-assistant','edit'));

create policy ai_knowledge_chunks_company_policy on public.ai_knowledge_chunks
  for all to authenticated
  using (company_id = current_company_id() and user_can_module('ai-assistant','view'))
  with check (company_id = current_company_id() and user_can_module('ai-assistant','edit'));

create policy ai_retrieval_logs_company_policy on public.ai_retrieval_logs
  for all to authenticated
  using (company_id = current_company_id() and user_can_module('ai-assistant','view'))
  with check (company_id = current_company_id() and user_can_module('ai-assistant','edit'));

create policy platform_observability_events_company_policy on public.platform_observability_events
  for select to authenticated
  using ((company_id is null or company_id = current_company_id()) and user_can_module('settings','view'));

create policy platform_observability_events_insert_policy on public.platform_observability_events
  for insert to authenticated
  with check (company_id = current_company_id());

create or replace function public.match_ai_knowledge(
  p_query_embedding extensions.vector(1536),
  p_match_count integer default 8,
  p_min_similarity double precision default 0.55
)
returns table (
  chunk_id uuid,
  document_id uuid,
  source_entity text,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    k.id,
    k.document_id,
    k.source_entity,
    k.source_id,
    k.content,
    k.metadata,
    (1 - (k.embedding <=> p_query_embedding))::double precision as similarity
  from public.ai_knowledge_chunks k
  where k.company_id = current_company_id()
    and k.approved = true
    and k.active = true
    and k.embedding is not null
    and (1 - (k.embedding <=> p_query_embedding)) >= p_min_similarity
  order by k.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 20));
$$;

revoke all on function public.match_ai_knowledge(extensions.vector, integer, double precision) from public;
grant execute on function public.match_ai_knowledge(extensions.vector, integer, double precision) to authenticated;

grant select,insert,update,delete on public.cloud_runtime_environments to authenticated;
grant select,insert,update,delete on public.ai_gateway_runs to authenticated;
grant select,insert,update,delete on public.ai_knowledge_chunks to authenticated;
grant select,insert,update,delete on public.ai_retrieval_logs to authenticated;
grant select,insert on public.platform_observability_events to authenticated;

insert into public.cloud_runtime_environments(company_id, environment, is_active, is_default, config)
select id, e.environment, true, (e.environment='production'), jsonb_build_object('region','eu-central-1','timezone','Asia/Riyadh')
from public.companies
cross join (values ('development'),('staging'),('production')) as e(environment)
on conflict (company_id, environment) do nothing;
