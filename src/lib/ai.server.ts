import { AI_DEFAULT_MODEL, AI_IMAGE_MODEL, AI_TEXT_MODELS, type AiJobKind } from "./ai-constants";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export interface AiFileInput { mime_type: string; file_name: string; base64: string }

export interface GatewayResult {
  text: string;
  images: string[]; // data URLs
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  duration_ms: number;
  model: string;
}

export function pickModel(model?: string | null) {
  return model && (AI_TEXT_MODELS as readonly string[]).includes(model) ? model : AI_DEFAULT_MODEL;
}

function contentBlocks(prompt: string, files: AiFileInput[]) {
  const blocks: any[] = [{ type: "text", text: prompt }];
  for (const f of files) {
    if (f.mime_type === "application/pdf") {
      blocks.push({ type: "file", file: { filename: f.file_name, file_data: `data:${f.mime_type};base64,${f.base64}` } });
    } else {
      blocks.push({ type: "image_url", image_url: { url: `data:${f.mime_type};base64,${f.base64}` } });
    }
  }
  return blocks;
}

async function callLovableGateway(body: Record<string, unknown>): Promise<GatewayResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI_PROVIDER_FAILED:missing_lovable_key");
  const started = Date.now();
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify(body),
  });
  const duration = Date.now() - started;
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 429) throw new Error("AI_PROVIDER_RATE_LIMIT");
    if (res.status === 402) throw new Error("AI_PROVIDER_NO_CREDITS");
    throw new Error(`AI_PROVIDER_FAILED:${res.status}:${detail}`);
  }
  const json: any = await res.json();
  const msg = json?.choices?.[0]?.message ?? {};
  const images: string[] = (msg.images ?? [])
    .map((i: any) => i?.image_url?.url)
    .filter((u: unknown): u is string => typeof u === "string");
  const usage = json?.usage ?? {};
  return {
    text: typeof msg.content === "string" ? msg.content : "",
    images,
    prompt_tokens: Number(usage.prompt_tokens ?? 0),
    completion_tokens: Number(usage.completion_tokens ?? 0),
    cost_usd: Number(usage.cost_details?.upstream_inference_cost ?? usage.cost ?? 0),
    duration_ms: duration,
    model: String(json?.model ?? body["model"]),
  };
}

/**
 * Uses the official OpenAI Responses API when an OpenAI server secret is
 * configured. This keeps API keys on the server and supports PDF/image input.
 */
async function callOpenAIResponses(opts: {
  prompt: string;
  files?: AiFileInput[];
}): Promise<GatewayResult> {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("AI_PROVIDER_FAILED:missing_openai_key");

  const input: Array<Record<string, unknown>> = [{ type: "input_text", text: opts.prompt }];
  for (const file of opts.files ?? []) {
    const dataUrl = `data:${file.mime_type};base64,${file.base64}`;
    input.push(
      file.mime_type === "application/pdf"
        ? { type: "input_file", filename: file.file_name, file_data: dataUrl }
        : { type: "input_image", image_url: dataUrl, detail: "auto" },
    );
  }

  const started = Date.now();
  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env["OPENAI_MODEL"] ?? "gpt-5-mini",
      instructions: "أجب بالعربية عند الإمكان. أعد JSON صالحًا فقط وفق العقد المطلوب، بلا markdown أو سلسلة تفكير.",
      input: [{ role: "user", content: input }],
      text: { format: { type: "json_object" } },
      max_output_tokens: 2200,
    }),
  });
  const duration = Date.now() - started;
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 429) throw new Error("AI_PROVIDER_RATE_LIMIT");
    if (res.status === 402) throw new Error("AI_PROVIDER_NO_CREDITS");
    throw new Error(`AI_PROVIDER_FAILED:${res.status}:${detail}`);
  }
  const json: any = await res.json();
  const usage = json?.usage ?? {};
  return {
    text: String(json?.output_text ?? ""),
    images: [],
    prompt_tokens: Number(usage.input_tokens ?? 0),
    completion_tokens: Number(usage.output_tokens ?? 0),
    cost_usd: 0,
    duration_ms: duration,
    model: String(json?.model ?? process.env["OPENAI_MODEL"] ?? "gpt-5-mini"),
  };
}

async function callAiProvider(body: Record<string, unknown>, prompt: string, files: AiFileInput[] = []): Promise<GatewayResult> {
  // Keep the existing Lovable provider as the first choice when configured.
  // OpenAI is a server-only fallback and is never exposed to the browser.
  if (process.env["LOVABLE_API_KEY"]) return callLovableGateway(body);
  return callOpenAIResponses({ prompt, files });
}

function parseJson(text: string): any {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { /* fallthrough */ }
    }
    throw new Error("AI_BAD_OUTPUT");
  }
}

const OUTPUT_CONTRACT = `أعد JSON فقط دون أي شرح أو خطوات تفكير، بالشكل التالي:
{
 "confidence": number (0..1),
 "summary_ar": string,
 "fields": [ { "group_key": "header"|"line"|"totals"|"analysis", "line_no": number|null,
   "field_path": string, "label_ar": string, "label_en": string,
   "value_text": string|null, "value_number": number|null,
   "value_kind": "fact"|"assumption"|"estimate", "confidence": number,
   "evidence": { "page": number|null, "snippet": string|null, "location": string|null } } ],
 "recommendations": [ { "rec_type": string, "title_ar": string, "title_en": string,
   "severity": "info"|"warning"|"critical", "confidence": number, "rationale": string,
   "payload": object } ]
}
قواعد إلزامية: لا تخترع قيمًا؛ اترك null عند عدم التأكد. صنّف كل حقل: fact إذا مقروء من المستند، assumption إذا مبني على افتراض، estimate إذا تقدير حسابي. لا تُدرج أي سلسلة تفكير.`;

const KIND_PROMPT: Record<AiJobKind, string> = {
  supplier_invoice: `حلّل فاتورة المورد واستخرج: اسم المورد، الرقم الضريبي، رقم الفاتورة، التاريخ، العملة، البنود (الوصف، الكمية، سعر الوحدة، الخصم، الإجمالي)، الخصم الكلي، الوعاء الضريبي، ضريبة القيمة المضافة 15% أو "بدون ضريبة"، والإجمالي النهائي. تحقق حسابيًا: مجموع البنود، الضريبة = الوعاء × 15%، الإجمالي = الوعاء + الضريبة، وأدرج توصية severity=critical لكل تناقض حسابي، وتوصية بالحساب المحاسبي المقترح وتصنيف المصروف، وتوصية بالتحقق من التكرار عند وجود رقم فاتورة وتاريخ متطابقين.`,
  expense: `حلّل مستند المصروف واستخرج: الجهة، رقم المستند، التاريخ، العملة، البنود، الضريبة 15% إن وجدت، الإجمالي، وطريقة الدفع. اقترح تصنيف المصروف والحساب المحاسبي، وأدرج تنبيهات لأي تناقض حسابي أو نقص في الرقم الضريبي.`,
  quotation: `حلّل عرض السعر واستخرج: الأطراف (المورد/العميل)، رقم العرض، التاريخ وتاريخ الصلاحية، البنود (الوصف، المقاسات، الخامة، اللون، الكمية، السعر)، الخصومات، الضريبة، الإجمالي، جدول الدفعات، مدة التنفيذ والشروط. أضف تنبيهات للشروط الجزائية أو المواعيد الحرجة أو الشروط غير المعتادة.`,
  sales_order: `حلّل أمر البيع واستخرج: العميل، رقم الأمر، التاريخ، البنود والمقاسات والخامات، الكميات والأسعار، الضريبة، الإجمالي، الدفعات (نسبها ومواعيدها)، تاريخ التسليم والشروط. أضف تنبيهات للمواعيد الحرجة والالتزامات.`,
  employee_contract: `حلّل عقد الموظف واستخرج: اسم الموظف والهوية/الإقامة، الوظيفة، نوع العقد ومدته، تاريخ البدء والانتهاء، الراتب الأساسي والبدلات، فترة التجربة، أيام الإجازة، مدة الإشعار، وشروط الإنهاء. أضف تنبيهات لأي بند مخالف لنظام العمل السعودي أو مواعيد انتهاء قريبة.`,
  furniture_design: `حلّل صورة/تصميم الأثاث واستخرج: نوع المنتج، الأبعاد المعروفة والأبعاد الناقصة، الخامات والإكسسوارات والتشطيبات، BOM تقديري بالكميات، مراحل التنفيذ، ساعات العمل المقدرة، نسبة الهالك، تكلفة المصنع التقديرية وسعر البيع المقترح ومدة التنفيذ. إلزامي: لا تدّعِ أي قياس من الصورة بلا مرجع قياس واضح — عند غياب المرجع اجعل value_kind = "assumption" واذكر الافتراض صراحة، وضع الأبعاد الناقصة كحقول بقيمة null.`,
  drawing_measurements: `حلّل المخطط واستخرج: مقياس الرسم إن وُجد، الأبعاد المكتوبة على المخطط (fact) فقط، المساحات، عدد القطع، الملاحظات الفنية. أي بعد غير مكتوب صراحة يجب أن يكون null أو assumption مع ذكر السبب.`,
  general_document: `حلّل المستند واستخرج نوعه، أطرافه، التواريخ، الأرقام المرجعية، المبالغ إن وجدت، وأهم البنود، مع تنبيهات لأي التزام أو موعد حرج.`,
  seating_capacity: `احسب سعة الجلسات بناءً على المقاسات المعطاة ومسافة الجلوس المختارة. اذكر المعادلة والافتراضات صراحة.`,
  design_skill: `أنت مصمم أثاث ومساحات داخلية. اقترح ثلاثة اتجاهات تصميم قابلة للمراجعة بناءً على الـ brief وهوية المنشأة، مع الخامات والألوان والأبعاد المقترحة (كتقديرات) وملاحظات التنفيذ.`,
};

export async function runAnalysis(opts: {
  kind: AiJobKind;
  model?: string | null;
  files: AiFileInput[];
  context?: string;
  promptVersion: string;
}) {
  const model = pickModel(opts.model);
  const prompt = [
    "أنت محلل مستندات في مصنع أثاث سعودي. اللغة العربية أساسية.",
    KIND_PROMPT[opts.kind],
    opts.context ? `سياق إضافي من المستخدم:\n${opts.context}` : "",
    OUTPUT_CONTRACT,
  ].filter(Boolean).join("\n\n");

  const result = await callAiProvider({
    model,
    messages: [{ role: "user", content: contentBlocks(prompt, opts.files) }],
    temperature: 0.1,
  }, prompt, opts.files);
  const parsed = parseJson(result.text);
  return { parsed, usage: result };
}

export async function runDesignConcept(opts: {
  brief: string;
  style?: string | null;
  palette: string[];
  background?: string | null;
  withImage: boolean;
}) {
  const identity = `هوية المنشأة: مصنع المقرن للأثاث والديكور. الألوان: ${opts.palette.join("، ") || "الكحلي والفضي"}.${opts.background ? ` الخلفية المطلوبة: ${opts.background}.` : ""}`;
  const designPrompt = `${KIND_PROMPT.design_skill}\n\n${identity}\n\nالـ brief:\n${opts.brief}\n${opts.style ? `الطراز: ${opts.style}` : ""}\n\n${OUTPUT_CONTRACT}`;
  const text = await callAiProvider({
    model: AI_DEFAULT_MODEL,
    messages: [{ role: "user", content: designPrompt }],
    temperature: 0.4,
  }, designPrompt);
  const parsed = parseJson(text.text);

  let image: GatewayResult | null = null;
  if (opts.withImage && process.env["LOVABLE_API_KEY"]) {
    // Image generation remains on the existing image-capable gateway. The
    // OpenAI fallback is deliberately used for document analysis only.
    image = await callLovableGateway({
      model: AI_IMAGE_MODEL,
      messages: [{ role: "user", content: `${opts.brief}\n${opts.style ?? ""}\n${identity}\nصورة تصوّر مقترح تصميم أثاث احترافي، إضاءة استوديو، بدون نصوص.` }],
      modalities: ["image", "text"],
    });
  }
  return { parsed, usage: text, image };
}
