import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5-mini";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function liveTwinContext(sb: ReturnType<typeof createClient>) {
  const [mo, po, stages, qc, projects, sales, quotes, purchases, prices] = await Promise.all([
    sb.from("manufacturing_orders").select("mo_number,status,description,quantity,planned_start,planned_end,actual_start,actual_end,planned_labor_cost,overhead_cost,predicted_end,delay_risk,delay_reason").order("created_at", { ascending: false }).limit(40),
    sb.from("production_orders").select("po_number,status,start_date,due_date").order("created_at", { ascending: false }).limit(40),
    sb.from("production_stages").select("production_order_id,sequence,name_ar,status,qc_notes,inspected_at").order("created_at", { ascending: false }).limit(120),
    sb.from("quality_inspections").select("manufacturing_order_id,stage_id,result,defects,corrective_action,inspected_at,approved_at").order("created_at", { ascending: false }).limit(60),
    sb.from("projects").select("project_number,name_ar,status,priority,budget_amount,start_date,target_end_date,actual_end_date,city").order("created_at", { ascending: false }).limit(40),
    sb.from("sales_orders").select("order_number,status,order_date,delivery_date,subtotal,vat_amount,total").order("created_at", { ascending: false }).limit(40),
    sb.from("quotations").select("quote_number,status,issue_date,valid_until,subtotal,discount_total,vat_amount,total").order("created_at", { ascending: false }).limit(40),
    sb.from("purchase_orders").select("po_number,status,order_date,expected_date,subtotal,vat_amount,total").order("created_at", { ascending: false }).limit(40),
    sb.from("material_price_history").select("material_key,description,unit,unit_price,observed_on,currency").order("observed_on", { ascending: false }).limit(80),
  ]);
  return {
    manufacturing_orders: mo.data ?? [], production_orders: po.data ?? [], production_stages: stages.data ?? [],
    quality: qc.data ?? [], projects: projects.data ?? [], sales_orders: sales.data ?? [], quotations: quotes.data ?? [],
    purchase_orders: purchases.data ?? [], material_prices: prices.data ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);
    const { data: profile } = await sb.from("profiles").select("company_id,is_active").eq("id", user.id).single();
    if (!profile?.company_id || !profile.is_active) return json({ error: "Active company profile required" }, 403);

    const body = await req.json();
    const skillKey = String(body.skillKey ?? "").trim();
    if (!skillKey) return json({ error: "skillKey is required" }, 400);
    const { data: skill, error: skillError } = await sb.from("ai_twin_skills_effective").select("*").eq("company_id", profile.company_id).eq("skill_key", skillKey).maybeSingle();
    if (skillError || !skill || !skill.enabled) return json({ error: "Skill unavailable or disabled" }, 403);

    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const { count } = await sb.from("ai_capability_runs").select("id", { count: "exact", head: true }).eq("company_id", profile.company_id).eq("skill_key", skillKey).gte("created_at", today.toISOString());
    if ((count ?? 0) >= Number(skill.max_daily_runs ?? 100)) return json({ error: "Daily skill run limit reached" }, 429);

    const context = await liveTwinContext(sb);
    const inputData = body.inputData ?? {};
    const prompt = String(body.prompt ?? "").slice(0, 12000);
    const approvalRequired = Boolean(skill.requires_human_approval) || skill.autonomy_level !== "execute";
    const { data: run, error: runError } = await sb.from("ai_capability_runs").insert({
      company_id: profile.company_id, feature: skillKey, skill_key: skillKey, title: String(body.title ?? skill.name_ar).slice(0, 120), status: "running",
      input_data: inputData, created_by: user.id, model_version: OPENAI_MODEL, autonomy_level: skill.autonomy_level,
      approval_required: approvalRequired, approval_status: approvalRequired ? "pending" : "not_required", twin_snapshot: context,
    }).select("id").single();
    if (runError) return json({ error: "Cannot create skill run", detail: runError.code }, 403);

    const system = `You are the AlMuqrin Factory Digital Twin AI. Skill: ${skill.name_en} (${skill.skill_key}).\nArabic description: ${skill.description_ar}\nRisk: ${skill.risk_level}. Autonomy: ${skill.autonomy_level}.\nExecution contract: ${JSON.stringify(skill.execution_contract)}\nUse only supplied ERP facts. Never invent prices, dimensions, inventory, dates, statuses or customer facts. Distinguish observations from assumptions. Never mutate live ERP data. If approval is required, produce a recommendation/draft only. Return one valid JSON object with keys: summary_ar, confidence, observations, recommendations, risks, assumptions, proposed_actions.`;
    const userPayload = `USER REQUEST:\n${prompt || "نفذ المهارة على حالة المصنع الحالية"}\n\nINPUT DATA:\n${JSON.stringify(inputData)}\n\nLIVE DIGITAL TWIN SNAPSHOT:\n${JSON.stringify(context)}`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: OPENAI_MODEL, messages: [{ role: "system", content: system }, { role: "user", content: userPayload }], temperature: 0.1, max_completion_tokens: 1800 }),
    });
    if (!response.ok) {
      await sb.from("ai_capability_runs").update({ status: "failed", hold_reason: `provider_${response.status}` }).eq("id", run.id);
      return json({ error: "AI provider failed" }, 502);
    }
    const payload = await response.json();
    const raw = String(payload.choices?.[0]?.message?.content ?? "");
    let result: any;
    try { result = JSON.parse(raw); } catch {
      const a = raw.indexOf("{"); const b = raw.lastIndexOf("}");
      result = a >= 0 && b > a ? JSON.parse(raw.slice(a, b + 1)) : { summary_ar: raw, confidence: 0.5, observations: [], recommendations: [], risks: [], assumptions: ["تعذر تحويل الاستجابة إلى JSON كامل"], proposed_actions: [] };
    }
    const confidence = Math.max(0, Math.min(1, Number(result.confidence ?? 0)));
    const needsReview = approvalRequired || confidence < Number(skill.confidence_threshold ?? 0.8);
    await sb.from("ai_capability_runs").update({ status: needsReview ? "needs_review" : "completed", result_data: result, confidence, approval_required: needsReview, approval_status: needsReview ? "pending" : "not_required", model_version: OPENAI_MODEL }).eq("id", run.id);
    return json({ runId: run.id, skillKey, result, confidence, needsReview, autonomy: skill.autonomy_level });
  } catch (error) {
    console.error("ai-digital-twin", error);
    return json({ error: "Digital twin skill failed" }, 500);
  }
});
