-- AI employee + factory digital twin skills registry.
create table if not exists public.ai_skill_catalog (
  id uuid primary key default gen_random_uuid(), skill_key text not null unique,
  name_ar text not null, name_en text not null,
  category text not null check (category in ('core_ai','design','manufacturing','commercial','finance','digital_twin')),
  description_ar text not null, description_en text not null,
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high','critical')),
  requires_human_approval boolean not null default true,
  default_autonomy text not null default 'recommend' check (default_autonomy in ('assist','recommend','execute_with_approval','execute')),
  input_types text[] not null default '{}', output_types text[] not null default '{}',
  execution_contract jsonb not null default '{}'::jsonb, active boolean not null default true,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ai_twin_skill_settings (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  skill_id uuid not null references public.ai_skill_catalog(id) on delete cascade, enabled boolean not null default true,
  autonomy_level text not null default 'recommend' check (autonomy_level in ('assist','recommend','execute_with_approval','execute')),
  confidence_threshold numeric(4,3) not null default .800 check (confidence_threshold between 0 and 1),
  max_daily_runs integer not null default 100 check (max_daily_runs > 0),
  approval_roles text[] not null default array['super_admin','factory_owner','general_manager']::text[],
  settings jsonb not null default '{}'::jsonb, updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,skill_id)
);
alter table public.ai_capability_runs add column if not exists skill_key text;
alter table public.ai_capability_runs add column if not exists autonomy_level text;
alter table public.ai_capability_runs add column if not exists approval_required boolean not null default true;
alter table public.ai_capability_runs add column if not exists approval_status text not null default 'pending';
alter table public.ai_capability_runs add column if not exists twin_snapshot jsonb not null default '{}'::jsonb;

with seed(skill_key,name_ar,name_en,category,description_ar,description_en,risk_level,approval,autonomy,input_types,output_types) as (values
('document_intelligence','فهم المستندات','Document Intelligence','core_ai','تصنيف واستخراج بيانات المستندات والصور وPDF.','Document classification and structured extraction.','medium',true,'recommend',array['pdf','image','text'],array['extractions','summary']),
('supplier_invoice_analysis','تحليل فاتورة المورد','Supplier Invoice Analysis','finance','تحليل الفاتورة والضريبة والتكرار والشذوذ قبل القيد.','Invoice, VAT, duplicate and anomaly review.','high',true,'recommend',array['pdf','image'],array['invoice_draft','anomalies']),
('quotation_analysis','تحليل عروض الأسعار','Quotation Analysis','commercial','تحليل البنود والكميات والأسعار والضريبة.','Quotation lines, quantities, price and VAT analysis.','high',true,'recommend',array['pdf','quotation'],array['analysis','recommendations']),
('furniture_cost_estimation','تقدير تكلفة الأثاث','Furniture Cost Estimation','manufacturing','حساب الخامات والعمالة والهدر والتشغيل.','Estimate materials, labor, waste and overhead.','high',true,'recommend',array['design','dimensions','bom'],array['cost_breakdown','selling_price_recommendation']),
('material_price_intelligence','ذكاء أسعار الخامات','Material Price Intelligence','manufacturing','تحليل تاريخ أسعار الخامات واتجاهاتها.','Analyze material-price history and trends.','medium',false,'execute',array['material_history'],array['trend','alerts']),
('design_analysis','تحليل التصميم','Design Analysis','design','تحليل صور ومخططات الأثاث والمكونات والمقاسات الناقصة.','Analyze furniture designs and missing dimensions.','medium',true,'recommend',array['image','drawing','dimensions'],array['design_findings','bom_draft']),
('design_generation_brief','تصميم ديزاين','Design Generation Brief','design','تحويل الطلب والمقاسات إلى موجز تصميم.','Turn requirements into a design brief.','medium',true,'recommend',array['text','image','room_dimensions'],array['design_brief']),
('shop_drawing_planner','مخطط الرسومات التنفيذية','Shop Drawing Planner','design','تحديد الواجهات والقطاعات والتجميع للرسم التنفيذي.','Plan shop drawing views, sections and joinery.','high',true,'recommend',array['design','dimensions','bom'],array['shop_drawing_spec']),
('bom_generation','توليد قائمة المواد BOM','BOM Generation','manufacturing','توليد قائمة قطع وخامات أولية.','Generate a draft bill of materials.','high',true,'recommend',array['design','dimensions'],array['bom']),
('cutting_nesting_optimizer','تحسين القص والتعشيق','Cutting & Nesting Optimizer','manufacturing','تحسين قص الألواح والهدر والعروق وسماكة المنشار.','Optimize cutting, kerf, grain and waste.','medium',true,'execute_with_approval',array['bom','sheet_spec'],array['nesting_plan','waste']),
('production_planning','تخطيط الإنتاج','Production Planning','manufacturing','تحويل أمر التصنيع إلى مراحل ومدد واعتماديات.','Plan stages, durations and dependencies.','high',true,'recommend',array['manufacturing_order','bom','capacity'],array['production_plan']),
('manufacturing_method','طريقة التصنيع','Manufacturing Method','manufacturing','اقتراح خطوات التصنيع والتجميع والتشطيب.','Recommend manufacturing and assembly steps.','medium',true,'recommend',array['design','bom','materials'],array['work_instructions']),
('seating_capacity','حساب سعة الجلسات','Seating Capacity','design','حساب السعة على أساس 55 أو 60 أو 65 سم.','Calculate seating capacity at 55/60/65 cm.','low',false,'execute',array['lengths','seat_width_policy'],array['capacity']),
('catalog_pdf_ingestion','استخراج المنتجات من PDF','PDF Catalog Ingestion','commercial','استخراج مرشحات المتجر مع حماية بيانات العميل.','Extract store candidates while protecting PII.','high',true,'execute_with_approval',array['pdf'],array['store_candidates']),
('store_product_enrichment','إثراء منتج المتجر','Store Product Enrichment','commercial','توحيد الاسم والمواصفات والتصنيف والوصف.','Enrich store content from factory data.','medium',true,'recommend',array['product','design','manufacturing'],array['product_content']),
('smart_quote_draft','مسودة عرض سعر ذكية','Smart Quote Draft','commercial','إنشاء مسودة عرض سعر دون اعتماد نهائي.','Create a non-binding quotation draft.','critical',true,'execute_with_approval',array['requirements','costing'],array['quotation_draft']),
('quality_review_assistant','مساعد فحص الجودة','Quality Review Assistant','manufacturing','مقارنة الفحص بالمواصفات وتحديد الانحرافات.','Flag QC deviations for human review.','critical',true,'recommend',array['qc_images','specifications'],array['qc_findings']),
('procurement_recommendation','توصيات المشتريات','Procurement Recommendation','manufacturing','اقتراح الاحتياج والكميات من المخزون والإنتاج والأسعار.','Recommend purchasing needs from stock and production.','high',true,'recommend',array['inventory','production_plan','supplier_prices'],array['purchase_recommendations']),
('twin_factory_state','حالة المصنع الرقمية','Digital Twin Factory State','digital_twin','لقطة موحدة للطلبات والإنتاج والجودة والمشاريع.','Unified live factory state snapshot.','low',false,'execute',array['erp_live_data'],array['factory_snapshot']),
('twin_capacity_simulation','محاكاة الطاقة الإنتاجية','Capacity Simulation','digital_twin','محاكاة الطاقة مقابل الحمل والمواعيد.','Simulate capacity against load and deadlines.','medium',true,'recommend',array['factory_snapshot','orders'],array['capacity_scenarios']),
('twin_bottleneck_detection','كشف اختناقات الإنتاج','Bottleneck Detection','digital_twin','كشف المراحل والموارد المسببة للتأخير.','Detect production bottlenecks.','medium',false,'execute',array['factory_snapshot','production_history'],array['bottlenecks','alerts']),
('twin_material_demand_forecast','توقع احتياج الخامات','Material Demand Forecast','digital_twin','توقع احتياج الخامات من أوامر الإنتاج.','Forecast material demand.','high',true,'recommend',array['bom','orders','inventory'],array['material_forecast']),
('twin_delivery_risk','توقع مخاطر التسليم','Delivery Risk Prediction','digital_twin','توقع التأخير من المراحل والمواد والمواعيد.','Predict delivery-delay risk.','medium',false,'execute',array['factory_snapshot','due_dates'],array['risk_scores','alerts']),
('twin_what_if_scheduler','محاكاة ماذا لو','What-if Scheduler','digital_twin','مقارنة سيناريوهات الأولويات والموارد دون تعديل السجلات.','Compare scheduling scenarios without live mutation.','high',true,'recommend',array['factory_snapshot','scenario_changes'],array['scenario_comparison'])
)
insert into public.ai_skill_catalog(skill_key,name_ar,name_en,category,description_ar,description_en,risk_level,requires_human_approval,default_autonomy,input_types,output_types,execution_contract)
select skill_key,name_ar,name_en,category,description_ar,description_en,risk_level,approval,autonomy,input_types,output_types,
 jsonb_build_object('mode','draft_or_simulation','no_live_mutation',true,'human_approval_when_required',approval)
from seed
on conflict(skill_key) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,category=excluded.category,description_ar=excluded.description_ar,description_en=excluded.description_en,risk_level=excluded.risk_level,requires_human_approval=excluded.requires_human_approval,default_autonomy=excluded.default_autonomy,input_types=excluded.input_types,output_types=excluded.output_types,execution_contract=excluded.execution_contract,active=true,updated_at=now();

insert into public.ai_twin_skill_settings(company_id,skill_id,enabled,autonomy_level,confidence_threshold,approval_roles)
select c.id,s.id,true,s.default_autonomy,case when s.risk_level in ('high','critical') then .90 when s.risk_level='medium' then .80 else .70 end,array['super_admin','factory_owner','general_manager']::text[]
from public.companies c cross join public.ai_skill_catalog s on conflict(company_id,skill_id) do nothing;

alter table public.ai_skill_catalog enable row level security;
alter table public.ai_twin_skill_settings enable row level security;
drop policy if exists ai_skill_catalog_read on public.ai_skill_catalog;
create policy ai_skill_catalog_read on public.ai_skill_catalog for select to authenticated using(active=true);
drop policy if exists ai_twin_skill_settings_read on public.ai_twin_skill_settings;
create policy ai_twin_skill_settings_read on public.ai_twin_skill_settings for select to authenticated using(company_id=public.current_company_id());
drop policy if exists ai_twin_skill_settings_admin_update on public.ai_twin_skill_settings;
create policy ai_twin_skill_settings_admin_update on public.ai_twin_skill_settings for update to authenticated using(company_id=public.current_company_id() and public.is_company_admin()) with check(company_id=public.current_company_id() and public.is_company_admin());
grant select on public.ai_skill_catalog to authenticated;
grant select,update on public.ai_twin_skill_settings to authenticated;
create or replace view public.ai_twin_skills_effective with (security_invoker=true) as
select st.id setting_id,st.company_id,s.id skill_id,s.skill_key,s.name_ar,s.name_en,s.category,s.description_ar,s.description_en,s.risk_level,s.requires_human_approval,st.enabled,st.autonomy_level,st.confidence_threshold,st.max_daily_runs,st.approval_roles,s.input_types,s.output_types,s.execution_contract,s.version
from public.ai_twin_skill_settings st join public.ai_skill_catalog s on s.id=st.skill_id where s.active=true;
grant select on public.ai_twin_skills_effective to authenticated;
create or replace function public.can_run_ai_skill(p_skill_key text) returns boolean language sql stable security invoker set search_path='' as $$select exists(select 1 from public.ai_twin_skill_settings st join public.ai_skill_catalog s on s.id=st.skill_id where st.company_id=public.current_company_id() and s.skill_key=p_skill_key and s.active and st.enabled);$$;
revoke all on function public.can_run_ai_skill(text) from public,anon; grant execute on function public.can_run_ai_skill(text) to authenticated;
create or replace function public.sync_ai_twin_skills_for_company(p_company_id uuid) returns void language sql security definer set search_path='' as $$insert into public.ai_twin_skill_settings(company_id,skill_id,enabled,autonomy_level,confidence_threshold,approval_roles) select p_company_id,s.id,true,s.default_autonomy,case when s.risk_level in ('high','critical') then .90 when s.risk_level='medium' then .80 else .70 end,array['super_admin','factory_owner','general_manager']::text[] from public.ai_skill_catalog s where s.active on conflict(company_id,skill_id) do nothing;$$;
revoke all on function public.sync_ai_twin_skills_for_company(uuid) from public,anon,authenticated; grant execute on function public.sync_ai_twin_skills_for_company(uuid) to service_role;
