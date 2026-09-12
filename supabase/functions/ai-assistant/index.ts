import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
const AISA_API_KEY = Deno.env.get("AISA_API_KEY");
const AISA_MODEL = Deno.env.get("AISA_MODEL") ?? "gpt-4.1";
const AISA_BASE_URL = (Deno.env.get("AISA_BASE_URL") ?? "https://api.aisa.one/v1").replace(/\/$/, "");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const SYSTEM_PROMPT = `You are AlMuqrin AI Engine V2 inside a Saudi furniture-manufacturing ERP.
Ground answers in supplied live ERP data. Never invent inventory, prices, dimensions, VAT, order status, or supplier facts.
For manufacturing analysis, distinguish observed facts from assumptions. Measurements are millimetres unless stated otherwise.
For Saudi quotations, VAT is 15% unless live ERP data or the user explicitly says otherwise.
When a capability requests JSON, return one valid JSON object only. Never wrap JSON in markdown fences.`;

const SKILL_KIND: Record<string, string> = {
  "design-analysis": "furniture_design",
  "bom": "drawing_measurements",
  "cut-optimization": "cut_optimization",
  "cost-estimation": "smart_costing",
  "quotation": "quotation",
  "ocr-document": "ocr_document",
  "cad-analysis": "cad_analysis",
  "shop-drawings": "shop_drawings",
  "price-learning": "price_learning",
  "production-planning": "production_planning",
};

const STRUCTURED_INSTRUCTIONS: Record<string, string> = {
  furniture_design: `Return JSON with: summary (Arabic string), confidence (0..1), findings (array), bom (array of {part,material,thickness_mm,length_mm,width_mm,quantity,grain,edge_banding,assumption}), assumptions (array), warnings (array).`,
  drawing_measurements: `Return JSON with: summary, confidence, bom using {part,material,thickness_mm,length_mm,width_mm,quantity,grain,edge_banding,assumption}, assumptions, warnings. Do not guess missing dimensions; use null and describe what is missing.`,
  cut_optimization: `Return JSON with: summary, confidence, bom, sheet_spec {material,thickness_mm,length_mm,width_mm,kerf_mm}, assumptions, warnings. Do not fabricate a visual nesting layout; the server will calculate placements deterministically.`,
  smart_costing: `Return JSON with: summary, confidence, cost_lines (array of {category,description,unit,quantity,unit_cost,waste_percent,total_cost,is_assumption}), subtotal_cost, overhead, profit_margin_percent, selling_price_before_vat, vat_amount, selling_price_with_vat, assumptions, warnings. Prefer live material prices supplied in context.`,
  quotation: `Return JSON with: summary, confidence, items, subtotal, discount, vat_rate, vat_amount, total, assumptions, warnings. Do not create a binding quotation without human review.`,
  ocr_document: `Extract the document into JSON: summary, confidence, document_type, extractions (array of {field_path,label_ar,value_text,value_number,confidence}), line_items, subtotal, vat_amount, total, assumptions, warnings. Preserve invoice numbers and dates exactly when visible.`,
  cad_analysis: `Return JSON with: summary, confidence, units, layers, entity_counts, dimensions, furniture_elements, bom, assumptions, warnings. Use supplied deterministic DXF metadata as ground truth where available.`,
  shop_drawings: `Return JSON with: summary, confidence, views (front/side/plan/section as applicable), dimensions, joinery, hardware, bom, assembly_sequence, assumptions, warnings. Mark missing site dimensions clearly.`,
  price_learning: `Return JSON with: summary, confidence, observations, material_price_changes, alerts, assumptions, warnings. Base conclusions only on supplied historical prices.`,
  production_planning: `Return JSON with: summary, confidence, stages, estimated_hours, dependencies, material_requirements, bottlenecks, risks, assumptions, warnings.`,
};

type Attachment = { name?: string; mimeType?: string; dataUrl?: string; text?: string };
type Provider = { name: string; apiKey: string; model: string; endpoint: string; protocol: "anthropic" | "openai" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function providerList(attachment?: Attachment): Provider[] {
  const result: Provider[] = [];
  const isPdf = attachment?.mimeType === "application/pdf" || attachment?.name?.toLowerCase().endsWith(".pdf");
  if (!isPdf && ANTHROPIC_API_KEY) result.push({ name: "Claude", apiKey: ANTHROPIC_API_KEY, model: ANTHROPIC_MODEL, endpoint: "https://api.anthropic.com/v1/messages", protocol: "anthropic" });
  if (OPENAI_API_KEY) result.push({ name: "OpenAI", apiKey: OPENAI_API_KEY, model: OPENAI_MODEL, endpoint: "https://api.openai.com/v1/chat/completions", protocol: "openai" });
  if (!isPdf && AISA_API_KEY) result.push({ name: "AIsa", apiKey: AISA_API_KEY, model: AISA_MODEL, endpoint: `${AISA_BASE_URL}/chat/completions`, protocol: "openai" });
  return result;
}

function anthropicImageContent(text: string, attachment: Attachment) {
  const match = attachment.dataUrl?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match) return text;
  return [
    { type: "text", text },
    { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } },
  ];
}

function contentForProvider(text: string, attachment: Attachment | undefined, provider: Provider) {
  if (!attachment) return text;
  if (attachment.text) return `${text}\n\nAttached file: ${attachment.name ?? "file"}\n--- file text ---\n${attachment.text.slice(0, 120000)}`;
  if (!attachment.dataUrl) return text;
  if (attachment.mimeType?.startsWith("image/")) {
    if (provider.protocol === "anthropic") return anthropicImageContent(text, attachment);
    return [{ type: "text", text }, { type: "image_url", image_url: { url: attachment.dataUrl } }];
  }
  if ((attachment.mimeType === "application/pdf" || attachment.name?.toLowerCase().endsWith(".pdf")) && provider.name === "OpenAI") {
    return [{ type: "text", text }, { type: "file", file: { filename: attachment.name ?? "document.pdf", file_data: attachment.dataUrl } }];
  }
  return text;
}

function anthropicPayload(messages: Array<Record<string, unknown>>, attachment?: Attachment) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => String(m.content ?? ""))
    .filter(Boolean)
    .join("\n\n");

  const conversation = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m, i, filtered) => {
      const isLastUser = i === filtered.length - 1 && m.role === "user";
      return {
        role: m.role,
        content: isLastUser ? contentForProvider(String(m.content ?? ""), attachment, { name: "Claude", apiKey: "", model: ANTHROPIC_MODEL, endpoint: "", protocol: "anthropic" }) : String(m.content ?? ""),
      };
    });

  return { system, messages: conversation };
}

async function callProviders(messages: Array<Record<string, unknown>>, attachment?: Attachment) {
  const providers = providerList(attachment);
  if (!providers.length) throw Object.assign(new Error("no_provider"), { status: 503 });

  let lastStatus = 502;
  for (const provider of providers) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      let response: Response;
      if (provider.protocol === "anthropic") {
        const payload = anthropicPayload(messages, attachment);
        response = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            "x-api-key": provider.apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: provider.model, max_tokens: 1400, temperature: 0.2, system: payload.system, messages: payload.messages }),
          signal: controller.signal,
        });
      } else {
        const providerMessages = messages.map((m, i) => i === messages.length - 1 && m.role === "user"
          ? { ...m, content: contentForProvider(String(m.content ?? ""), attachment, provider) }
          : m);
        const tokenField = provider.model.startsWith("gpt-5") ? { max_completion_tokens: 1400 } : { max_tokens: 1400 };
        response = await fetch(provider.endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: provider.model, messages: providerMessages, temperature: 0.2, stream: false, ...tokenField }),
          signal: controller.signal,
        });
      }

      const requestId = response.headers.get("request-id") ?? response.headers.get("x-request-id") ?? undefined;
      if (!response.ok) {
        console.error("ai provider request failed", { provider: provider.name, status: response.status, requestId });
        lastStatus = response.status === 408 ? 504 : response.status;
        continue;
      }

      const json = await response.json();
      if (provider.protocol === "anthropic") {
        const reply = Array.isArray(json.content)
          ? json.content.filter((item: { type?: string; text?: string }) => item?.type === "text" && typeof item.text === "string").map((item: { text: string }) => item.text).join("\n")
          : "";
        if (!reply) {
          console.error("invalid provider response", { provider: provider.name, requestId });
          lastStatus = 502;
          continue;
        }
        return {
          reply,
          provider: provider.name,
          model: provider.model,
          usage: { prompt_tokens: Number(json.usage?.input_tokens ?? 0), completion_tokens: Number(json.usage?.output_tokens ?? 0) },
          requestId,
        };
      }

      const reply = json.choices?.[0]?.message?.content;
      if (!reply || typeof reply !== "string") {
        console.error("invalid provider response", { provider: provider.name, requestId });
        lastStatus = 502;
        continue;
      }
      return { reply, provider: provider.name, model: provider.model, usage: json.usage ?? {}, requestId };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error("ai provider timeout", { provider: provider.name });
        lastStatus = 504;
        continue;
      }
      console.error("ai provider network failure", { provider: provider.name, error: (err as Error).message });
      lastStatus = 502;
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw Object.assign(new Error("all_providers_failed"), { status: lastStatus >= 400 && lastStatus < 600 ? lastStatus : 502 });
}

function parseJson(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text); } catch {
    const start = text.indexOf("{"); const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; } }
    return null;
  }
}

function parseDxf(text: string) {
  const lines = text.replace(/\r/g, "").split("\n");
  const counts: Record<string, number> = {}; const layers = new Set<string>();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = lines[i].trim(); const value = lines[i + 1].trim();
    if (code === "0" && /^[A-Z][A-Z0-9_]*$/.test(value)) counts[value] = (counts[value] ?? 0) + 1;
    if (code === "8" && value) layers.add(value);
    if (["10", "11", "12", "13"].includes(code)) { const n = Number(value); if (Number.isFinite(n)) { minX = Math.min(minX, n); maxX = Math.max(maxX, n); } }
    if (["20", "21", "22", "23"].includes(code)) { const n = Number(value); if (Number.isFinite(n)) { minY = Math.min(minY, n); maxY = Math.max(maxY, n); } }
  }
  return { entity_counts: counts, layers: [...layers].slice(0, 200), bounds: Number.isFinite(minX) ? { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY } : null };
}

function nestBom(bom: unknown, spec: Record<string, unknown> | undefined) {
  if (!Array.isArray(bom)) return [];
  const sheetL = Number(spec?.length_mm ?? 2800), sheetW = Number(spec?.width_mm ?? 2070), kerf = Number(spec?.kerf_mm ?? 4);
  const expanded: Array<Record<string, unknown>> = [];
  for (const raw of bom) {
    const p = raw as Record<string, unknown>; const qty = Math.max(0, Math.min(200, Math.floor(Number(p.quantity ?? 0))));
    const l = Number(p.length_mm), w = Number(p.width_mm);
    if (!Number.isFinite(l) || !Number.isFinite(w) || l <= 0 || w <= 0 || l > sheetL || w > sheetW) continue;
    for (let i = 0; i < qty; i++) expanded.push({ ...p, length_mm: l, width_mm: w, copy: i + 1 });
  }
  expanded.sort((a, b) => Number(b.length_mm) * Number(b.width_mm) - Number(a.length_mm) * Number(a.width_mm));
  const sheets: Array<{ placements: unknown[]; x: number; y: number; rowH: number; used: number }> = [];
  for (const part of expanded) {
    const l = Number(part.length_mm), w = Number(part.width_mm); let placed = false;
    for (const s of sheets) {
      if (s.x + l <= sheetL && s.y + w <= sheetW) {
        s.placements.push({ part: part.part, copy: part.copy, x_mm: s.x, y_mm: s.y, length_mm: l, width_mm: w }); s.x += l + kerf; s.rowH = Math.max(s.rowH, w); s.used += l * w; placed = true; break;
      }
      if (s.y + s.rowH + kerf + w <= sheetW) {
        s.y += s.rowH + kerf; s.x = 0; s.rowH = 0;
        if (l <= sheetL) { s.placements.push({ part: part.part, copy: part.copy, x_mm: 0, y_mm: s.y, length_mm: l, width_mm: w }); s.x = l + kerf; s.rowH = w; s.used += l * w; placed = true; break; }
      }
    }
    if (!placed) sheets.push({ placements: [{ part: part.part, copy: part.copy, x_mm: 0, y_mm: 0, length_mm: l, width_mm: w }], x: l + kerf, y: 0, rowH: w, used: l * w });
  }
  return sheets.map((s, i) => ({ scenario: "shelf_v1", sheet_index: i + 1, material: String(spec?.material ?? "board"), thickness_mm: Number(spec?.thickness_mm ?? 18), length_mm: sheetL, width_mm: sheetW, placements: s.placements, remnants: [], used_area_mm2: s.used, waste_area_mm2: Math.max(0, sheetL * sheetW - s.used) }));
}

async function erpContext(supabase: ReturnType<typeof createClient>) {
  const [quotes, production, prices] = await Promise.all([
    supabase.from("quotations").select("quote_number,status,issue_date,subtotal,vat_amount,total").order("created_at", { ascending: false }).limit(5),
    supabase.from("production_orders").select("po_number,status,start_date,due_date,notes").order("created_at", { ascending: false }).limit(5),
    supabase.from("material_price_history").select("material_key,description,unit,unit_price,observed_on,currency").order("observed_on", { ascending: false }).limit(30),
  ]);
  return { quotations: quotes.data ?? [], production_orders: production.data ?? [], material_prices: prices.data ?? [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now(); let jobId: string | null = null; let runId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);
    const { data: profile, error: profileError } = await supabase.from("profiles").select("company_id,is_active").eq("id", user.id).single();
    if (profileError || !profile?.company_id || !profile.is_active) return jsonResponse({ error: "Active company profile required" }, 403);
    const companyId = profile.company_id;

    const body = await req.json();
    const normalizedMessage = String(body.message ?? "").trim();
    if (!normalizedMessage) return jsonResponse({ error: "message is required" }, 400);
    if (normalizedMessage.length > 12000) return jsonResponse({ error: "message is too long" }, 413);
    const attachment = body.attachment as Attachment | undefined;
    if (attachment?.dataUrl && attachment.dataUrl.length > 14_000_000) return jsonResponse({ error: "attachment is too large" }, 413);
    if (attachment?.text && attachment.text.length > 120000) attachment.text = attachment.text.slice(0, 120000);

    let conversationId = body.conversationId as string | undefined;
    if (conversationId) {
      const { data: owned } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
      if (!owned) return jsonResponse({ error: "Conversation not found" }, 404);
    } else {
      const { data, error } = await supabase.from("ai_conversations").insert({ company_id: companyId, user_id: user.id, title: normalizedMessage.slice(0, 80) }).select("id").single();
      if (error) throw error; conversationId = data.id;
    }

    const { error: userMessageError } = await supabase.from("ai_messages").insert({ company_id: companyId, conversation_id: conversationId, user_id: user.id, role: "user", content: normalizedMessage, metadata: attachment ? { attachment: { name: attachment.name, mimeType: attachment.mimeType } } : {} });
    if (userMessageError) throw userMessageError;

    const skill = String(body.skill ?? ""); const kind = SKILL_KIND[skill] ?? "";
    const liveContext = await erpContext(supabase);
    let deterministicCad: unknown = null;
    if (kind === "cad_analysis" && attachment?.text && (attachment.name?.toLowerCase().endsWith(".dxf") || attachment.text.includes("SECTION"))) deterministicCad = parseDxf(attachment.text);

    if (kind) {
      const jobNumber = `AI-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const { data: job, error: jobError } = await supabase.from("ai_jobs").insert({ company_id: companyId, job_number: jobNumber, kind, status: "running", title: normalizedMessage.slice(0, 120), idempotency_key: `${conversationId}:${skill}:${Date.now()}`, model: null, prompt_version: "v2", attempts: 1, input_params: { conversationId, skill, attachment: attachment ? { name: attachment.name, mimeType: attachment.mimeType } : null }, requested_by: user.id, started_at: new Date().toISOString() }).select("id").single();
      if (jobError) return jsonResponse({ error: "You do not have permission to run this AI capability", detail: jobError.code }, 403);
      jobId = job.id;
      const { data: run, error: runError } = await supabase.from("ai_capability_runs").insert({ company_id: companyId, feature: kind, ai_job_id: jobId, title: normalizedMessage.slice(0, 120), status: "running", input_data: { conversationId, skill, deterministicCad }, model_version: "v2", created_by: user.id }).select("id").single();
      if (runError) throw runError; runId = run.id;
    }

    const { data: history, error: historyError } = await supabase.from("ai_messages").select("role,content").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(16);
    if (historyError) throw historyError;
    const structured = kind ? STRUCTURED_INSTRUCTIONS[kind] : "";
    const promptContext = `LIVE ERP CONTEXT:\n${JSON.stringify(liveContext)}${deterministicCad ? `\nDETERMINISTIC DXF METADATA:\n${JSON.stringify(deterministicCad)}` : ""}${structured ? `\nCAPABILITY OUTPUT CONTRACT:\n${structured}` : ""}`;
    const messages: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: promptContext },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    ];

    const result = await callProviders(messages, attachment);
    const parsed = kind ? parseJson(result.reply) : null;
    const confidence = parsed && Number.isFinite(Number(parsed.confidence)) ? Math.max(0, Math.min(1, Number(parsed.confidence))) : null;

    if (runId && parsed) {
      const { error: runUpdateError } = await supabase.from("ai_capability_runs").update({ status: "needs_review", result_data: parsed, confidence, model_version: result.model }).eq("id", runId);
      if (runUpdateError) throw runUpdateError;

      if (Array.isArray(parsed.cost_lines)) {
        const rows = parsed.cost_lines.slice(0, 200).map((x: unknown) => {
          const c = x as Record<string, unknown>; const q = Number(c.quantity ?? 0), u = Number(c.unit_cost ?? 0), w = Number(c.waste_percent ?? 0);
          return { company_id: companyId, run_id: runId, category: String(c.category ?? "material"), description: String(c.description ?? ""), unit: String(c.unit ?? "pcs"), quantity: Number.isFinite(q) ? q : 0, unit_cost: Number.isFinite(u) ? u : 0, waste_percent: Number.isFinite(w) ? w : 0, total_cost: Number.isFinite(Number(c.total_cost)) ? Number(c.total_cost) : q * u * (1 + w / 100), evidence: { source: c.is_assumption ? "ai_assumption" : "live_context_or_document" }, is_assumption: Boolean(c.is_assumption) };
        }).filter((r: Record<string, unknown>) => r.description);
        if (rows.length) { const { error } = await supabase.from("ai_cost_lines").insert(rows); if (error) throw error; }
      }

      if (kind === "cut_optimization") {
        const sheets = nestBom(parsed.bom, parsed.sheet_spec as Record<string, unknown> | undefined);
        if (sheets.length) { const { error } = await supabase.from("ai_nesting_sheets").insert(sheets.map((s) => ({ company_id: companyId, run_id: runId, ...s }))); if (error) throw error; }
        parsed.nesting_sheets = sheets;
      }

      if (Array.isArray(parsed.extractions) && jobId) {
        const rows = parsed.extractions.slice(0, 300).map((x: unknown, i: number) => {
          const e = x as Record<string, unknown>; const vn = e.value_number === null || e.value_number === undefined ? null : Number(e.value_number);
          return { company_id: companyId, job_id: jobId, group_key: "root", line_no: i + 1, field_path: String(e.field_path ?? `field_${i + 1}`), label_ar: e.label_ar ? String(e.label_ar) : null, value_text: e.value_text === null || e.value_text === undefined ? null : String(e.value_text), value_number: Number.isFinite(vn) ? vn : null, value_kind: "fact", confidence: Number.isFinite(Number(e.confidence)) ? Number(e.confidence) : null, evidence: { attachment: attachment?.name ?? null } };
        });
        if (rows.length) { const { error } = await supabase.from("ai_extractions").insert(rows); if (error) throw error; }
      }
    }

    if (jobId) {
      const { error } = await supabase.from("ai_jobs").update({ status: "completed", model: result.model, confidence, duration_ms: Date.now() - started, finished_at: new Date().toISOString() }).eq("id", jobId);
      if (error) throw error;
      await supabase.from("ai_usage_logs").insert({ company_id: companyId, job_id: jobId, kind, model: result.model, status: "completed", attempt: 1, prompt_tokens: Number(result.usage.prompt_tokens ?? 0), completion_tokens: Number(result.usage.completion_tokens ?? 0), cost_usd: 0, duration_ms: Date.now() - started, created_by: user.id });
    }

    const displayReply = parsed ? String(parsed.summary ?? "تم التحليل وحفظ النتيجة للمراجعة.") : result.reply;
    const { error: assistantMessageError } = await supabase.from("ai_messages").insert({ company_id: companyId, conversation_id: conversationId, user_id: user.id, role: "assistant", content: displayReply, metadata: { provider: result.provider, model: result.model, jobId, runId, structured: Boolean(parsed) } });
    if (assistantMessageError) throw assistantMessageError;

    return jsonResponse({ conversationId, reply: displayReply, provider: result.provider, model: result.model, jobId, runId, result: parsed });
  } catch (err) {
    const status = Number((err as { status?: number }).status ?? 500);
    console.error("ai-assistant error", { code: (err as Error).message, status, jobId, runId });
    return jsonResponse({ error: status === 504 ? "AI provider timed out" : status === 503 ? "AI provider is not configured" : status === 400 || status === 401 || status === 403 ? "AI provider configuration or authorization error" : "The assistant is temporarily unavailable." }, status >= 400 && status < 600 ? status : 500);
  }
});