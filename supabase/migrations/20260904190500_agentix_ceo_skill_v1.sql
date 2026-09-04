-- Agentix CEO: executive decision-support skill for AlMuqrin Factory.
-- Critical/recommend-only by design. No live ERP mutation is permitted.

insert into public.ai_skill_catalog (
  skill_key,
  name_ar,
  name_en,
  category,
  description_ar,
  description_en,
  risk_level,
  requires_human_approval,
  default_autonomy,
  input_types,
  output_types,
  execution_contract,
  active,
  version,
  updated_at
)
values (
  'agentix_ceo',
  'وكيل الرئيس التنفيذي',
  'Agentix CEO',
  'core_ai',
  'تحليل تنفيذي موحد لحالة المصنع وتحويل البيانات الحية إلى أولويات وKPIs ومخاطر وقرارات لمدة 30 يومًا.',
  'Executive factory decision support that turns live operational data into 30-day priorities, KPIs, risks, and decision recommendations.',
  'critical',
  true,
  'recommend',
  array['erp_live_data','executive_prompt']::text[],
  array['executive_diagnosis','priorities_30d','kpis','risk_register','decision_register']::text[],
  jsonb_build_object(
    'mode', 'executive_decision_support',
    'no_live_mutation', true,
    'human_approval_when_required', true,
    'horizon_days', 30,
    'max_priorities', 3,
    'required_sections', jsonb_build_array(
      'executive_diagnosis','priorities_30d','kpis','stop_list','delegation',
      'risks','decision_register','weekly_cadence','observations','assumptions','proposed_actions'
    ),
    'forbidden_actions', jsonb_build_array(
      'approve_payment','post_journal','change_supplier_bank','release_production',
      'release_delivery','approve_qc','change_customer_terms','change_permissions'
    )
  ),
  true,
  1,
  now()
)
on conflict (skill_key) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  category = excluded.category,
  description_ar = excluded.description_ar,
  description_en = excluded.description_en,
  risk_level = excluded.risk_level,
  requires_human_approval = excluded.requires_human_approval,
  default_autonomy = excluded.default_autonomy,
  input_types = excluded.input_types,
  output_types = excluded.output_types,
  execution_contract = excluded.execution_contract,
  active = true,
  version = excluded.version,
  updated_at = now();

insert into public.ai_twin_skill_settings (
  company_id,
  skill_id,
  enabled,
  autonomy_level,
  confidence_threshold,
  max_daily_runs,
  approval_roles
)
select
  c.id,
  s.id,
  true,
  'recommend',
  .920,
  20,
  array['super_admin','factory_owner','general_manager']::text[]
from public.companies c
join public.ai_skill_catalog s on s.skill_key = 'agentix_ceo'
on conflict (company_id, skill_id) do nothing;
