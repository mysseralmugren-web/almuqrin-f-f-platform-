-- Interior Digital Twin Suite v1
-- Applied to Supabase project vmswbmkkgvnjhznxbsdz on 2026-09-03.

create table if not exists public.interior_twin_projects (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, customer_id uuid, project_id uuid, quotation_id uuid, name text not null,
  status text not null default 'capture' check (status in ('capture','design','materials','manufacturability','costing','immersive','approval','shop_drawings','nesting','production','qc','completed','on_hold')),
  source_capture jsonb not null default '{}'::jsonb, room_model jsonb not null default '{}'::jsonb, design_model jsonb not null default '{}'::jsonb,
  material_plan jsonb not null default '{}'::jsonb, bom_snapshot jsonb not null default '{}'::jsonb, costing_snapshot jsonb not null default '{}'::jsonb,
  immersive_snapshot jsonb not null default '{}'::jsonb, manufacturing_snapshot jsonb not null default '{}'::jsonb, qc_snapshot jsonb not null default '{}'::jsonb,
  current_confidence numeric(5,4), approved_by uuid, approved_at timestamptz, created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.interior_twin_stage_runs (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, twin_project_id uuid not null references public.interior_twin_projects(id) on delete cascade,
  skill_key text not null, stage text not null, status text not null default 'queued' check (status in ('queued','running','needs_review','approved','completed','failed','cancelled')),
  tool_adapter text, input_data jsonb not null default '{}'::jsonb, output_data jsonb not null default '{}'::jsonb, confidence numeric(5,4), warnings jsonb not null default '[]'::jsonb,
  error_text text, ai_capability_run_id uuid, requested_by uuid, reviewed_by uuid, reviewed_at timestamptz, started_at timestamptz, finished_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.customer_design_dna (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, customer_id uuid not null, style_scores jsonb not null default '{}'::jsonb,
  color_preferences jsonb not null default '[]'::jsonb, material_preferences jsonb not null default '[]'::jsonb, disliked_features jsonb not null default '[]'::jsonb,
  space_preferences jsonb not null default '{}'::jsonb, evidence jsonb not null default '[]'::jsonb, confidence numeric(5,4), learning_version integer not null default 1,
  last_learned_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,customer_id)
);
create table if not exists public.material_finish_intelligence (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, material_key text not null, finish_key text not null default '', name_ar text not null, name_en text,
  usage_tags text[] not null default '{}', durability_score numeric(5,2), aesthetics_score numeric(5,2), moisture_score numeric(5,2), heat_score numeric(5,2), scratch_score numeric(5,2),
  maintenance_score numeric(5,2), sustainability_score numeric(5,2), current_unit_cost numeric(14,4), unit text, lead_time_days integer,
  supplier_context jsonb not null default '{}'::jsonb, technical_context jsonb not null default '{}'::jsonb, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,material_key,finish_key)
);
create table if not exists public.design_manufacturability_checks (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, twin_project_id uuid not null references public.interior_twin_projects(id) on delete cascade,
  design_version text, score numeric(5,2) not null default 0, status text not null default 'needs_review' check (status in ('pass','pass_with_warnings','needs_review','blocked')),
  checks jsonb not null default '[]'::jsonb, blockers jsonb not null default '[]'::jsonb, warnings jsonb not null default '[]'::jsonb,
  cnc_ready boolean not null default false, site_fit_ready boolean not null default false, assembly_ready boolean not null default false, material_ready boolean not null default false,
  approved_by uuid, approved_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.immersive_design_assets (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, twin_project_id uuid not null references public.interior_twin_projects(id) on delete cascade,
  asset_type text not null check (asset_type in ('glb','gltf','usdz','webxr_scene','vr_tour','panorama_360','thumbnail')), storage_path text, public_url text,
  source_adapter text, dimensions_mm jsonb not null default '{}'::jsonb, materials jsonb not null default '[]'::jsonb, approved_for_customer boolean not null default false,
  created_by uuid, created_at timestamptz not null default now()
);
create table if not exists public.sustainable_design_scores (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, twin_project_id uuid not null references public.interior_twin_projects(id) on delete cascade,
  total_score numeric(5,2) not null, material_score numeric(5,2), waste_score numeric(5,2), repairability_score numeric(5,2), recycled_content_score numeric(5,2),
  local_supply_score numeric(5,2), expected_life_score numeric(5,2), evidence jsonb not null default '{}'::jsonb, recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.prototype_jobs (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, twin_project_id uuid not null references public.interior_twin_projects(id) on delete cascade,
  prototype_type text not null default '3d_print' check (prototype_type in ('3d_print','cnc_sample','material_sample','scale_model')),
  source_asset_id uuid references public.immersive_design_assets(id) on delete set null, output_format text not null default 'stl', storage_path text,
  adapter text not null default 'autodesk_aps', print_settings jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','queued','generated','validated','approved','failed')), validation jsonb not null default '{}'::jsonb,
  approved_by uuid, approved_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.design_configurator_sessions (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, twin_project_id uuid references public.interior_twin_projects(id) on delete cascade,
  customer_id uuid, product_id uuid, session_token uuid not null default gen_random_uuid(), configuration jsonb not null default '{}'::jsonb,
  price_preview jsonb not null default '{}'::jsonb, render_preview jsonb not null default '{}'::jsonb, validation jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','submitted','approved','expired')), created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(session_token)
);
create table if not exists public.twin_qc_comparisons (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, twin_project_id uuid not null references public.interior_twin_projects(id) on delete cascade,
  manufacturing_order_id uuid, reference_snapshot jsonb not null default '{}'::jsonb, observed_snapshot jsonb not null default '{}'::jsonb,
  dimensional_score numeric(5,2), visual_score numeric(5,2), material_match_score numeric(5,2), total_score numeric(5,2), deviations jsonb not null default '[]'::jsonb,
  status text not null default 'needs_review' check (status in ('pass','pass_with_warnings','needs_review','fail')), reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_interior_twin_projects_company on public.interior_twin_projects(company_id,updated_at desc);
create index if not exists idx_interior_twin_stage_runs_project on public.interior_twin_stage_runs(twin_project_id,created_at desc);
create index if not exists idx_material_finish_company on public.material_finish_intelligence(company_id,material_key);
create index if not exists idx_manufacturability_project on public.design_manufacturability_checks(twin_project_id,created_at desc);
create index if not exists idx_immersive_project on public.immersive_design_assets(twin_project_id,created_at desc);
create index if not exists idx_qc_comparison_project on public.twin_qc_comparisons(twin_project_id,created_at desc);
alter table public.interior_twin_projects enable row level security;
alter table public.interior_twin_stage_runs enable row level security;
alter table public.customer_design_dna enable row level security;
alter table public.material_finish_intelligence enable row level security;
alter table public.design_manufacturability_checks enable row level security;
alter table public.immersive_design_assets enable row level security;
alter table public.sustainable_design_scores enable row level security;
alter table public.prototype_jobs enable row level security;
alter table public.design_configurator_sessions enable row level security;
alter table public.twin_qc_comparisons enable row level security;
create policy "interior_twin_company_access" on public.interior_twin_projects for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));
create policy "interior_twin_runs_company_access" on public.interior_twin_stage_runs for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));
create policy "design_dna_company_access" on public.customer_design_dna for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));
create policy "material_finish_company_access" on public.material_finish_intelligence for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));
create policy "manufacturability_company_access" on public.design_manufacturability_checks for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));
create policy "immersive_assets_company_access" on public.immersive_design_assets for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));
create policy "sustainability_company_access" on public.sustainable_design_scores for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));
create policy "prototype_jobs_company_access" on public.prototype_jobs for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));
create policy "configurator_company_access" on public.design_configurator_sessions for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));
create policy "twin_qc_company_access" on public.twin_qc_comparisons for all to authenticated using (company_id=public.current_company_id() and public.user_can_module('ai-assistant','view')) with check (company_id=public.current_company_id() and public.user_can_module('ai-assistant','edit'));

insert into public.ai_skill_catalog (skill_key,name_ar,name_en,category,description_ar,description_en,risk_level,requires_human_approval,default_autonomy,input_types,output_types,execution_contract,active,version)
values
('room_digital_twin','توأم الغرفة الرقمي','Room Digital Twin','digital_twin','تحويل صور وفيديو ومخطط الغرفة إلى نموذج رقمي قابل للقياس والتخطيط.','Convert room images, video and plans into a measurable digital twin.','medium',true,'recommend',array['image','video','pdf','dimensions'],array['room_model','glb','measurements'],jsonb_build_object('adapter','openai_vision+render_engine','workflow','interior_digital_twin'),true,1),
('design_manufacturability_check','فحص قابلية التصنيع','Design Manufacturability Check','digital_twin','فحص التصميم قبل التصنيع للتعارضات والخامات والقص والتجميع والتركيب.','Check design feasibility for materials, CNC, assembly and site installation.','high',true,'recommend',array['design','bom','room_model'],array['score','blockers','warnings'],jsonb_build_object('adapter','rules+autodesk_aps+ai','workflow','interior_digital_twin'),true,1),
('material_finish_intelligence','ذكاء الخامات والتشطيبات','Material & Finish Intelligence','digital_twin','اختيار الخامة والتشطيب حسب الجمال والتحمل والسعر والمخزون والتوريد.','Select materials and finishes using aesthetics, durability, price, stock and lead time.','medium',true,'recommend',array['design','usage','budget'],array['material_plan','alternatives'],jsonb_build_object('adapter','material_price_intelligence+ai','workflow','interior_digital_twin'),true,1),
('customer_design_dna','بصمة ذوق العميل','Customer Design DNA','digital_twin','تعلم تفضيلات العميل من الصور والاختيارات والتعديلات السابقة.','Learn customer style, color and material preferences from evidence.','medium',true,'recommend',array['images','choices','history'],array['style_scores','preferences'],jsonb_build_object('adapter','openai_vision+crm','workflow','interior_digital_twin'),true,1),
('ar_furniture_placement','معاينة الأثاث بالواقع المعزز','AR Furniture Placement','digital_twin','إنشاء أصل GLB/USDZ قابل للوضع بالحجم الحقيقي داخل مساحة العميل.','Generate GLB/USDZ assets for true-scale AR placement.','medium',true,'recommend',array['3d_model','dimensions'],array['glb','usdz','ar_preview'],jsonb_build_object('adapter','render_engine+web_ar','workflow','interior_digital_twin'),true,1),
('vr_project_walkthrough','جولة واقع افتراضي للمشروع','VR Project Walkthrough','digital_twin','إنشاء مشهد WebXR أو جولة 360 للمشروع قبل التصنيع.','Create a WebXR or 360 virtual walkthrough before manufacturing.','medium',true,'recommend',array['room_model','design_model'],array['webxr_scene','vr_tour'],jsonb_build_object('adapter','render_engine+webxr','workflow','interior_digital_twin'),true,1),
('sustainable_design_score','تقييم استدامة التصميم','Sustainable Design Score','digital_twin','حساب الهدر والاستدامة وقابلية الإصلاح والعمر المتوقع والتوريد المحلي.','Score waste, sustainability, repairability, expected life and local sourcing.','low',false,'execute',array['bom','materials','nesting'],array['score','recommendations'],jsonb_build_object('adapter','deterministic_rules+ai','workflow','interior_digital_twin'),true,1),
('3d_print_prototype','نموذج أولي للطباعة ثلاثية الأبعاد','3D Print Prototype','digital_twin','إنتاج ملف نموذج أولي للطباعة ثلاثية الأبعاد أو عينة CNC مع فحص هندسي.','Produce validated 3D-print/CNC prototype files.','high',true,'recommend',array['3d_model','part_geometry'],array['stl','3mf','validation'],jsonb_build_object('adapter','autodesk_aps','workflow','interior_digital_twin'),true,1),
('smart_material_advisor','مستشار المواد الذكية','Smart Material Advisor','digital_twin','اقتراح خامات حسب الحرارة والرطوبة والخدش والصيانة والاستخدام.','Recommend materials for heat, moisture, scratch, maintenance and usage conditions.','medium',true,'recommend',array['environment','usage','design'],array['recommendations','tradeoffs'],jsonb_build_object('adapter','material_finish_intelligence+ai','workflow','interior_digital_twin'),true,1),
('real_time_design_configurator','مهيئ التصميم اللحظي','Real-time Design Configurator','digital_twin','تغيير المقاس واللون والخامة وتحديث الرندر والتكلفة والتحقق مباشرة.','Change size, color and material with live render, cost and validation updates.','high',true,'recommend',array['product','room_model','options'],array['configuration','price_preview','render_preview','validation'],jsonb_build_object('adapter','parametric_configurator+render_engine+smart_costing','workflow','interior_digital_twin'),true,1),
('twin_final_qc_compare','مقارنة QC مع التوأم الرقمي','Digital Twin Final QC Compare','digital_twin','مقارنة صور وقياسات المنتج المنفذ مع التصميم الرقمي المعتمد.','Compare final product photos and measurements with the approved digital twin.','high',true,'recommend',array['approved_twin','photos','measurements'],array['deviations','scores','qc_status'],jsonb_build_object('adapter','openai_vision+measurement_rules','workflow','interior_digital_twin'),true,1)
on conflict (skill_key) do update set execution_contract=excluded.execution_contract,active=true,updated_at=now();

insert into public.ai_twin_skill_settings(company_id,skill_id,enabled,autonomy_level,confidence_threshold,max_daily_runs,approval_roles,settings)
select c.id,s.id,true,s.default_autonomy,case when s.risk_level='high' then 0.90 when s.risk_level='medium' then 0.80 else 0.70 end,50,array['super_admin','factory_owner','general_manager'],jsonb_build_object('workflow','interior_digital_twin')
from public.companies c cross join public.ai_skill_catalog s where s.execution_contract->>'workflow'='interior_digital_twin'
on conflict (company_id,skill_id) do nothing;
