import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  AI_ALLOWED_EXT, AI_ALLOWED_MIME, AI_DEFAULT_MODEL, AI_KIND_ROLES, AI_TEXT_MODELS,
  seatingCapacity, type AiJobKind,
} from "@/lib/ai-constants";

type Ctx = { supabase: any; userId: string };

export const AI_BUCKET = "mfg-attachments";

const ADMIN = ["super_admin", "factory_owner", "general_manager"] as const;
const uuid = z.string().uuid();
const round = (n: number) => Math.round(n * 100) / 100;

const KINDS = [
  "supplier_invoice", "expense", "quotation", "sales_order", "employee_contract",
  "furniture_design", "drawing_measurements", "general_document", "seating_capacity", "design_skill",
] as const;

async function companyOf(c: Ctx): Promise<string> {
  const { data, error } = await c.supabase.from("profiles").select("company_id").eq("id", c.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("NO_COMPANY");
  return data.company_id as string;
}

async function rolesOf(c: Ctx): Promise<string[]> {
  const { data, error } = await c.supabase.from("user_roles").select("role").eq("user_id", c.userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: string }) => r.role);
}

function allowsKind(roles: string[], kind: AiJobKind, adminKindsOnly = false) {
  const admin = roles.some((r) => (ADMIN as readonly string[]).includes(r));
  if (admin) return true;
  if (adminKindsOnly) return false;
  if (kind === "general_document") return roles.length > 0;
  return roles.some((r) => AI_KIND_ROLES[kind].includes(r));
}

async function requireKind(c: Ctx, kind: AiJobKind) {
  const company_id = await companyOf(c);
  const [roles, settings] = await Promise.all([rolesOf(c), settingsOf(c, company_id)]);
  if (!allowsKind(roles, kind, Boolean(settings.admin_kinds_only))) throw new Error("FORBIDDEN_KIND");
  return roles;
}

async function settingsOf(c: Ctx, company_id: string) {
  const { data } = await c.supabase.from("ai_provider_settings").select("*").eq("company_id", company_id).maybeSingle();
  return (
    data ?? {
      company_id, enabled: true, default_model: AI_DEFAULT_MODEL, retention_days: 365, max_file_mb: 20,
      allowed_mime_types: [...AI_ALLOWED_MIME], max_attempts: 3, seat_pitch_cm: 60,
      brand_primary: "#1E3A5F", brand_secondary: "#C0C0C0", watermark_text: null, admin_kinds_only: false,
    }
  );
}

async function jobOf(c: Ctx, id: string) {
  const { data, error } = await c.supabase.from("ai_jobs").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("AI_JOB_NOT_FOUND");
  return data;
}

const ok = (res: any) => {
  if (res?.error) throw new Error(res.error.message);
  return res?.data;
};

/* ===================== access & settings ===================== */

export const getAiAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const [roles, settings] = await Promise.all([rolesOf(c), settingsOf(c, company_id)]);
    const kinds = Object.fromEntries(
      KINDS.map((k) => [k, allowsKind(roles, k, Boolean(settings.admin_kinds_only))]),
    ) as Record<AiJobKind, boolean>;
    return { roles, isAdmin: roles.some((r) => (ADMIN as readonly string[]).includes(r)), kinds };
  });

export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    return settingsOf(c, await companyOf(c));
  });

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      enabled: z.boolean(),
      default_model: z.enum(AI_TEXT_MODELS),
      retention_days: z.number().int().min(1).max(3650),
      max_file_mb: z.number().int().min(1).max(50),
      max_attempts: z.number().int().min(1).max(5),
      seat_pitch_cm: z.union([z.literal(55), z.literal(60), z.literal(65)]),
      brand_primary: z.string().trim().max(20),
      brand_secondary: z.string().trim().max(20),
      watermark_text: z.string().trim().max(80).optional().nullable(),
      admin_kinds_only: z.boolean(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const roles = await rolesOf(c);
    if (!roles.some((r) => (ADMIN as readonly string[]).includes(r))) throw new Error("FORBIDDEN_ROLE");
    const company_id = await companyOf(c);
    ok(await c.supabase.from("ai_provider_settings").upsert({ company_id, ...data }, { onConflict: "company_id" }));
    return { ok: true };
  });

/* ===================== jobs ===================== */

export const listAiJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      kind: z.enum(KINDS).optional().nullable(),
      status: z.enum(["queued", "running", "completed", "failed", "cancelled"]).optional().nullable(),
      search: z.string().trim().max(80).optional().nullable(),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase.from("ai_jobs").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(200);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.or(`job_number.ilike.%${data.search}%,title.ilike.%${data.search}%`);
    return ok(await q) ?? [];
  });

export const getAiJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const job = await jobOf(c, data.id);
    const [files, extractions, recommendations, reviews] = await Promise.all([
      c.supabase.from("ai_job_files").select("*").eq("job_id", job.id).is("deleted_at", null).order("created_at"),
      c.supabase.from("ai_extractions").select("*").eq("job_id", job.id).order("group_key").order("line_no", { nullsFirst: true }).order("field_path"),
      c.supabase.from("ai_recommendations").select("*").eq("job_id", job.id).order("created_at"),
      c.supabase.from("ai_reviews").select("*").eq("job_id", job.id).order("created_at", { ascending: false }),
    ]);
    return {
      job,
      files: ok(files) ?? [],
      extractions: ok(extractions) ?? [],
      recommendations: ok(recommendations) ?? [],
      reviews: ok(reviews) ?? [],
    };
  });

export const createAiJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      kind: z.enum(KINDS),
      title: z.string().trim().max(160).optional().nullable(),
      idempotency_key: z.string().trim().min(8).max(120),
      target_entity: z.enum([
        "supplier_invoice", "purchase", "expense", "quotation", "sales_order",
        "employee_contract", "project", "manufacturing_order",
      ]).optional().nullable(),
      target_id: uuid.optional().nullable(),
      input_params: z.record(z.string(), z.any()).optional(),
      model: z.enum(AI_TEXT_MODELS).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireKind(c, data.kind);
    const company_id = await companyOf(c);
    const s = await settingsOf(c, company_id);
    if (!s.enabled) throw new Error("AI_DISABLED");

    const existing = ok(
      await c.supabase.from("ai_jobs").select("id, job_number").eq("company_id", company_id)
        .eq("idempotency_key", data.idempotency_key).maybeSingle(),
    );
    if (existing) return existing;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: num, error: numErr } = await supabaseAdmin.rpc("next_document_number", {
      _company_id: company_id, _doc_type: "ai_job", _prefix: "AI",
    });
    if (numErr) throw new Error(numErr.message);

    return ok(
      await c.supabase.from("ai_jobs").insert({
        company_id,
        job_number: num as string,
        kind: data.kind,
        title: data.title ?? null,
        idempotency_key: data.idempotency_key,
        model: data.model ?? s.default_model,
        max_attempts: s.max_attempts,
        target_entity: data.target_entity ?? null,
        target_id: data.target_id ?? null,
        input_params: data.input_params ?? {},
        requested_by: c.userId,
      }).select("id, job_number").single(),
    );
  });

export const cancelAiJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const job = await jobOf(c, data.id);
    if (job.status === "running") throw new Error("AI_JOB_BUSY");
    ok(await c.supabase.from("ai_jobs").update({ status: "cancelled" }).eq("id", job.id));
    return { ok: true };
  });

/** Soft delete: removes files from storage and marks job deleted; audit keeps the event, never the content. */
export const deleteAiJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const job = await jobOf(c, data.id);
    const roles = await rolesOf(c);
    if (!roles.some((r) => (ADMIN as readonly string[]).includes(r)) && job.requested_by !== c.userId) {
      throw new Error("FORBIDDEN_ROLE");
    }
    const files = ok(await c.supabase.from("ai_job_files").select("id, object_path").eq("job_id", job.id).is("deleted_at", null)) ?? [];
    if (files.length) {
      await c.supabase.storage.from(AI_BUCKET).remove(files.map((f: any) => f.object_path));
      ok(await c.supabase.from("ai_job_files").update({ deleted_at: new Date().toISOString() }).eq("job_id", job.id));
    }
    ok(await c.supabase.from("ai_jobs").update({ deleted_at: new Date().toISOString() }).eq("id", job.id));
    return { ok: true, files_removed: files.length };
  });

/* ===================== files ===================== */

const extOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase();
const safeName = (n: string) => n.replace(/[^\w.\-\u0600-\u06FF]/g, "_").slice(-80);

export const createAiUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      job_id: uuid,
      file_name: z.string().trim().min(1).max(160),
      mime_type: z.enum(AI_ALLOWED_MIME),
      size_bytes: z.number().int().positive(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const job = await jobOf(c, data.job_id);
    await requireKind(c, job.kind);
    const company_id = await companyOf(c);
    const s = await settingsOf(c, company_id);
    if (!(AI_ALLOWED_EXT as readonly string[]).includes(extOf(data.file_name))) throw new Error("AI_MIME_NOT_ALLOWED");
    if (!s.allowed_mime_types.includes(data.mime_type)) throw new Error("AI_MIME_NOT_ALLOWED");
    if (data.size_bytes > s.max_file_mb * 1024 * 1024) throw new Error("AI_FILE_TOO_LARGE");

    const path = `${company_id}/ai/${job.id}/${crypto.randomUUID()}-${safeName(data.file_name)}`;
    const { data: signed, error } = await c.supabase.storage.from(AI_BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signed_url: signed.signedUrl };
  });

export const registerAiFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      job_id: uuid,
      object_path: z.string().min(1).max(400),
      file_name: z.string().trim().min(1).max(160),
      mime_type: z.enum(AI_ALLOWED_MIME),
      size_bytes: z.number().int().positive(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const job = await jobOf(c, data.job_id);
    await requireKind(c, job.kind);
    const company_id = await companyOf(c);
    if (!data.object_path.startsWith(`${company_id}/ai/${job.id}/`)) throw new Error("AI_PATH_OUTSIDE_COMPANY");
    const s = await settingsOf(c, company_id);
    if (!(AI_ALLOWED_EXT as readonly string[]).includes(extOf(data.file_name))) throw new Error("AI_MIME_NOT_ALLOWED");
    if (!s.allowed_mime_types.includes(data.mime_type)) throw new Error("AI_MIME_NOT_ALLOWED");

    const { data: actual, error: infoError } = await c.supabase.storage.from(AI_BUCKET).info(data.object_path);
    if (infoError || !actual) throw new Error("AI_FILE_NOT_FOUND");
    const actualMime = String(actual.contentType ?? "").split(";", 1)[0]!.trim().toLowerCase();
    if (!actualMime || actualMime !== data.mime_type.toLowerCase()) throw new Error("AI_MIME_MISMATCH");
    const actualSize = Number(actual.size);
    if (!Number.isSafeInteger(actualSize) || actualSize <= 0) throw new Error("AI_FILE_SIZE_INVALID");
    if (actualSize !== data.size_bytes) throw new Error("AI_FILE_SIZE_MISMATCH");
    if (actualSize > s.max_file_mb * 1024 * 1024) throw new Error("AI_FILE_TOO_LARGE");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return ok(
      await supabaseAdmin.from("ai_job_files").insert({
        ...data,
        size_bytes: actualSize,
        mime_type: actualMime,
        company_id,
        created_by: c.userId,
      }).select("id").single(),
    );
  });

export const getAiFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ file_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const f = ok(await c.supabase.from("ai_job_files").select("object_path, job_id").eq("id", data.file_id).is("deleted_at", null).maybeSingle());
    if (!f) throw new Error("AI_JOB_NOT_FOUND");
    const job = await jobOf(c, f.job_id);
    await requireKind(c, job.kind);
    const { data: signed, error } = await c.supabase.storage.from(AI_BUCKET).createSignedUrl(f.object_path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl, expires_in: 300 };
  });

/* ===================== analysis ===================== */

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

async function persistResult(c: Ctx, job: any, company_id: string, parsed: any) {
  const fields: any[] = Array.isArray(parsed?.fields) ? parsed.fields.slice(0, 400) : [];
  const recs: any[] = Array.isArray(parsed?.recommendations) ? parsed.recommendations.slice(0, 60) : [];

  await c.supabase.from("ai_extractions").delete().eq("job_id", job.id).eq("is_reviewed", false);
  if (fields.length) {
    ok(await c.supabase.from("ai_extractions").insert(fields.map((f) => ({
      company_id, job_id: job.id,
      group_key: String(f.group_key ?? "root").slice(0, 40),
      line_no: Number.isFinite(f.line_no) ? Number(f.line_no) : null,
      field_path: String(f.field_path ?? "unknown").slice(0, 120),
      label_ar: f.label_ar ? String(f.label_ar).slice(0, 160) : null,
      label_en: f.label_en ? String(f.label_en).slice(0, 160) : null,
      value_text: f.value_text == null ? null : String(f.value_text).slice(0, 2000),
      value_number: Number.isFinite(Number(f.value_number)) && f.value_number !== null ? Number(f.value_number) : null,
      value_kind: ["fact", "assumption", "estimate"].includes(f.value_kind) ? f.value_kind : "fact",
      confidence: Number.isFinite(Number(f.confidence)) ? Math.min(1, Math.max(0, Number(f.confidence))) : null,
      evidence: typeof f.evidence === "object" && f.evidence ? f.evidence : {},
    }))));
  }
  if (recs.length) {
    ok(await c.supabase.from("ai_recommendations").insert(recs.map((r) => ({
      company_id, job_id: job.id,
      rec_type: String(r.rec_type ?? "note").slice(0, 60),
      title_ar: String(r.title_ar ?? r.title_en ?? "توصية").slice(0, 200),
      title_en: r.title_en ? String(r.title_en).slice(0, 200) : null,
      payload: typeof r.payload === "object" && r.payload ? r.payload : {},
      rationale: r.rationale ? String(r.rationale).slice(0, 2000) : null,
      severity: ["info", "warning", "critical"].includes(r.severity) ? r.severity : "info",
      confidence: Number.isFinite(Number(r.confidence)) ? Math.min(1, Math.max(0, Number(r.confidence))) : null,
    }))));
  }
}

export const runAiJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, context_note: z.string().trim().max(2000).optional().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const job = await jobOf(c, data.id);
    await requireKind(c, job.kind);
    const company_id = await companyOf(c);
    const s = await settingsOf(c, company_id);
    if (!s.enabled) throw new Error("AI_DISABLED");
    if (job.status === "running") throw new Error("AI_JOB_BUSY");
    if (job.attempts >= job.max_attempts) throw new Error("AI_MAX_ATTEMPTS");

    const files = ok(await c.supabase.from("ai_job_files").select("*").eq("job_id", job.id).is("deleted_at", null)) ?? [];
    if (files.length === 0 && job.kind !== "seating_capacity") throw new Error("AI_NO_FILES");

    const attempt = job.attempts + 1;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claimed = ok(await supabaseAdmin.from("ai_jobs").update({
      status: "running", attempts: attempt, started_at: new Date().toISOString(), error_code: null, error_message: null,
    }).eq("id", job.id).eq("status", job.status).eq("attempts", job.attempts).select("id").maybeSingle());
    if (!claimed) throw new Error("AI_JOB_BUSY");

    const { runAnalysis } = await import("@/lib/ai.server");
    try {
      const payloads = [] as Array<{ mime_type: string; file_name: string; base64: string }>;
      const verified = [] as Array<{
        file: { object_path: string; mime_type: string; size_bytes: number; file_name: string };
        size: number;
        mime: string;
      }>;
      let aggregateBytes = 0;
      const aggregateLimit = Math.min(s.max_file_mb * 5 * 1024 * 1024, 50 * 1024 * 1024);
      for (const f of files.slice(0, 5)) {
        const { data: actual, error: infoError } = await c.supabase.storage.from(AI_BUCKET).info(f.object_path);
        if (infoError || !actual) throw new Error("AI_FILE_NOT_FOUND");
        const mime = String(actual.contentType ?? "").split(";", 1)[0]!.trim().toLowerCase();
        if (!s.allowed_mime_types.includes(mime) || mime !== String(f.mime_type).toLowerCase()) {
          throw new Error("AI_MIME_MISMATCH");
        }
        const actualSize = Number(actual.size);
        if (!Number.isSafeInteger(actualSize) || actualSize <= 0 || actualSize !== Number(f.size_bytes)) {
          throw new Error("AI_FILE_SIZE_MISMATCH");
        }
        if (actualSize > s.max_file_mb * 1024 * 1024) throw new Error("AI_FILE_TOO_LARGE");
        aggregateBytes += actualSize;
        if (aggregateBytes > aggregateLimit) throw new Error("AI_JOB_FILES_TOO_LARGE");
        verified.push({ file: f, size: actualSize, mime });
      }
      for (const { file: f, size, mime } of verified) {
        const { data: blob, error } = await c.supabase.storage.from(AI_BUCKET).download(f.object_path);
        if (error) throw new Error(error.message);
        if (blob.size !== size) throw new Error("AI_FILE_SIZE_CHANGED");
        const blobMime = String(blob.type ?? "").split(";", 1)[0]!.trim().toLowerCase();
        if (blobMime && blobMime !== mime) throw new Error("AI_MIME_CHANGED");
        payloads.push({ mime_type: mime, file_name: f.file_name, base64: toBase64(await blob.arrayBuffer()) });
      }
      const { parsed, usage } = await runAnalysis({
        kind: job.kind as AiJobKind,
        model: job.model,
        files: payloads,
        context: data.context_note ?? (job.input_params?.context as string | undefined),
        promptVersion: job.prompt_version,
      });
      await persistResult(c, job, company_id, parsed);

      const confidence = Number.isFinite(Number(parsed?.confidence)) ? Math.min(1, Math.max(0, Number(parsed.confidence))) : null;
      const finished = ok(await supabaseAdmin.from("ai_jobs").update({
        status: "completed", confidence, model: usage.model,
        duration_ms: usage.duration_ms, cost_usd: round((Number(job.cost_usd) || 0) + usage.cost_usd * 1000000) / 1000000,
        finished_at: new Date().toISOString(),
      }).eq("id", job.id).eq("status", "running").eq("attempts", attempt).select("id").maybeSingle());
      if (!finished) throw new Error("AI_JOB_STATE_CHANGED");

      ok(await c.supabase.from("ai_usage_logs").insert({
        company_id, job_id: job.id, kind: job.kind, model: usage.model, status: "completed", attempt,
        prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens,
        cost_usd: usage.cost_usd, duration_ms: usage.duration_ms, created_by: c.userId,
      }));
      return { status: "completed", confidence, summary_ar: parsed?.summary_ar ?? null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = msg.split(":")[0] ?? "AI_PROVIDER_FAILED";
      ok(await supabaseAdmin.from("ai_jobs").update({
        status: "failed", error_code: code, error_message: msg.slice(0, 300), finished_at: new Date().toISOString(),
      }).eq("id", job.id).eq("status", "running").eq("attempts", attempt));
      await c.supabase.from("ai_usage_logs").insert({
        company_id, job_id: job.id, kind: job.kind, model: job.model, status: "failed",
        attempt, error_code: code, created_by: c.userId,
      });
      throw new Error(msg);
    }
  });

/* ===================== review ===================== */

export const reviewAiField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: uuid,
      reviewed_value_text: z.string().trim().max(2000).optional().nullable(),
      reviewed_value_number: z.number().optional().nullable(),
      is_accepted: z.boolean(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const row = ok(await c.supabase.from("ai_extractions").select("job_id").eq("id", data.id).maybeSingle());
    if (!row) throw new Error("AI_JOB_NOT_FOUND");
    const job = await jobOf(c, row.job_id);
    await requireKind(c, job.kind);
    ok(await c.supabase.from("ai_extractions").update({
      reviewed_value_text: data.reviewed_value_text ?? null,
      reviewed_value_number: data.reviewed_value_number ?? null,
      is_accepted: data.is_accepted,
      is_reviewed: true,
      reviewed_by: c.userId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", data.id));
    return { ok: true };
  });

export const reviewAiJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      job_id: uuid,
      recommendation_id: uuid.optional().nullable(),
      action: z.enum(["approve", "reject", "request_changes", "reanalyze"]),
      notes: z.string().trim().max(1000).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const job = await jobOf(c, data.job_id);
    await requireKind(c, job.kind);
    const company_id = await companyOf(c);
    ok(await c.supabase.from("ai_reviews").insert({
      company_id, job_id: job.id, recommendation_id: data.recommendation_id ?? null,
      action: data.action, notes: data.notes ?? null, reviewer_id: c.userId,
    }));
    if (data.recommendation_id && (data.action === "approve" || data.action === "reject")) {
      ok(await c.supabase.from("ai_recommendations")
        .update({ status: data.action === "approve" ? "approved" : "rejected" })
        .eq("id", data.recommendation_id).neq("status", "applied"));
    }
    return { ok: true };
  });

/* ===================== apply (draft creation only, after approval) ===================== */

const invoiceLine = z.object({
  description: z.string().trim().min(1).max(300),
  unit: z.string().trim().min(1).max(20).default("pcs"),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  discount_percent: z.number().min(0).max(100).default(0),
  vat_rate: z.number().min(0).max(100).default(15),
});

const applySchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("supplier_invoice"),
    supplier_id: uuid,
    supplier_invoice_number: z.string().trim().min(1).max(60),
    invoice_date: z.string().date(),
    due_date: z.string().date().optional().nullable(),
    tax_treatment: z.enum(["standard", "exempt", "out_of_scope"]).default("standard"),
    lines: z.array(invoiceLine).min(1).max(200),
  }),
  z.object({
    target: z.literal("quotation"),
    customer_id: uuid,
    valid_until: z.string().date().optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    lines: z.array(invoiceLine).min(1).max(200),
  }),
]);

/** Creates a DRAFT record from an APPROVED recommendation. Never posts to the ledger. */
export const applyAiRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ recommendation_id: uuid, draft: applySchema }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const rec = ok(await c.supabase.from("ai_recommendations").select("*").eq("id", data.recommendation_id).maybeSingle());
    if (!rec) throw new Error("AI_JOB_NOT_FOUND");
    if (rec.status === "applied") throw new Error("AI_REC_ALREADY_APPLIED");
    if (rec.status !== "approved") throw new Error("AI_REC_NOT_APPROVED");
    const job = await jobOf(c, rec.job_id);
    await requireKind(c, job.kind);
    const roles = await rolesOf(c);
    const company_id = await companyOf(c);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const d = data.draft;

    let entity = "";
    let id = "";

    if (d.target === "supplier_invoice") {
      if (!roles.some((r) => [...ADMIN, "accountant", "purchasing_manager"].includes(r))) throw new Error("FORBIDDEN_ROLE");
      const supplier = ok(
        await c.supabase
          .from("suppliers")
          .select("id")
          .eq("id", d.supplier_id)
          .eq("company_id", company_id)
          .maybeSingle(),
      );
      if (!supplier) throw new Error("SUPPLIER_NOT_IN_COMPANY");
      const standard = d.tax_treatment === "standard";
      let subtotal = 0;
      let vat = 0;
      for (const l of d.lines) {
        const taxable = l.quantity * l.unit_price * (1 - l.discount_percent / 100);
        subtotal += taxable;
        vat += standard ? (taxable * l.vat_rate) / 100 : 0;
      }
      const inv = ok(await c.supabase.from("supplier_invoices").insert({
        company_id, supplier_id: d.supplier_id, supplier_invoice_number: d.supplier_invoice_number,
        invoice_date: d.invoice_date, due_date: d.due_date ?? null, tax_treatment: d.tax_treatment,
        subtotal: round(subtotal), vat_amount: round(vat), total: round(subtotal + vat), created_by: c.userId,
      }).select("id").single());
      ok(await c.supabase.from("supplier_invoice_items").insert(d.lines.map((l) => ({
        company_id, supplier_invoice_id: inv.id, description: l.description, unit: l.unit,
        quantity: l.quantity, unit_price: l.unit_price, discount_percent: l.discount_percent,
        vat_rate: standard ? l.vat_rate : 0,
      }))));
      entity = "supplier_invoice";
      id = inv.id;
    } else {
      if (!roles.some((r) => [...ADMIN, "sales_manager", "sales_employee"].includes(r))) throw new Error("FORBIDDEN_ROLE");
      const customer = ok(
        await c.supabase
          .from("customers")
          .select("id")
          .eq("id", d.customer_id)
          .eq("company_id", company_id)
          .maybeSingle(),
      );
      if (!customer) throw new Error("CUSTOMER_NOT_IN_COMPANY");
      const { data: num, error: numErr } = await supabaseAdmin.rpc("next_document_number", {
        _company_id: company_id, _doc_type: "quotation", _prefix: "QT",
      });
      if (numErr) throw new Error(numErr.message);
      let subtotal = 0;
      let discountTotal = 0;
      let vat = 0;
      const rows = d.lines.map((l) => {
        const gross = l.quantity * l.unit_price;
        const discount = (gross * l.discount_percent) / 100;
        const taxable = gross - discount;
        const lineVat = (taxable * l.vat_rate) / 100;
        subtotal += gross; discountTotal += discount; vat += lineVat;
        return {
          description: l.description, unit: l.unit, quantity: l.quantity, unit_price: l.unit_price,
          discount_percent: l.discount_percent, discount_amount: round(discount), taxable_amount: round(taxable),
          vat_rate: l.vat_rate, vat_amount: round(lineVat), line_total: round(taxable + lineVat),
        };
      });
      const q = ok(await c.supabase.from("quotations").insert({
        company_id, customer_id: d.customer_id, quote_number: num as string,
        valid_until: d.valid_until ?? null, notes: d.notes ?? null,
        subtotal: round(subtotal), discount_total: round(discountTotal), vat_amount: round(vat),
        total: round(subtotal - discountTotal + vat), created_by: c.userId,
      }).select("id").single());
      ok(await c.supabase.from("quotation_items").insert(rows.map((r) => ({ ...r, quotation_id: q.id }))));
      entity = "quotation";
      id = q.id;
    }

    const upd = ok(await c.supabase.from("ai_recommendations").update({
      status: "applied", applied_entity: entity, applied_id: id, applied_by: c.userId, applied_at: new Date().toISOString(),
    }).eq("id", rec.id).eq("status", "approved").select("id"));
    if (!upd || upd.length === 0) throw new Error("AI_REC_ALREADY_APPLIED");

    ok(await supabaseAdmin.from("ai_jobs").update({ target_entity: entity, target_id: id }).eq("id", job.id));
    return { entity, id };
  });

/* ===================== seating capacity ===================== */

export const computeSeatingCapacity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      job_id: uuid.optional().nullable(),
      pitch_cm: z.union([z.literal(55), z.literal(60), z.literal(65)]),
      corner_loss_cm: z.number().min(0).max(200).default(0),
      armrest_loss_cm: z.number().min(0).max(200).default(0),
      segments: z.array(z.object({ label: z.string().trim().max(60).optional(), length_cm: z.number().positive().max(10000) })).min(1).max(20),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireKind(c, "seating_capacity");
    const result = seatingCapacity(data);
    if (data.job_id) {
      const job = await jobOf(c, data.job_id);
      const company_id = await companyOf(c);
      ok(await c.supabase.from("ai_extractions").insert([
        ...result.rows.map((r, idx) => ({
          company_id, job_id: job.id, group_key: "analysis", line_no: idx + 1,
          field_path: "segment.seats", label_ar: r.label || `قطعة ${idx + 1}`, label_en: `Segment ${idx + 1}`,
          value_number: r.seats, value_text: `${r.length_cm} سم → ${r.usable_cm} سم صالحة`,
          value_kind: "estimate", confidence: 1, evidence: { location: "manual_input" },
        })),
        {
          company_id, job_id: job.id, group_key: "totals", line_no: null,
          field_path: "total_seats", label_ar: "إجمالي عدد الأشخاص", label_en: "Total seats",
          value_number: result.total_seats, value_text: result.formula, value_kind: "estimate",
          confidence: 1, evidence: { location: "formula" },
        },
      ]));
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const claimed = ok(await supabaseAdmin.from("ai_jobs").update({
        status: "running", attempts: job.attempts + 1, started_at: new Date().toISOString(),
      }).eq("id", job.id).eq("status", job.status).eq("attempts", job.attempts).select("id").maybeSingle());
      if (!claimed) throw new Error("AI_JOB_BUSY");
      ok(await supabaseAdmin.from("ai_jobs").update({
        status: "completed", confidence: 1, finished_at: new Date().toISOString(),
      }).eq("id", job.id).eq("status", "running").eq("attempts", job.attempts + 1));
    }
    return result;
  });

/* ===================== design skill ===================== */

export const listDesignBriefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    return ok(await c.supabase.from("ai_design_briefs").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(100)) ?? [];
  });

export const createDesignBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      title: z.string().trim().min(2).max(160),
      brief: z.string().trim().min(10).max(4000),
      style: z.string().trim().max(80).optional().nullable(),
      palette: z.array(z.string().trim().max(20)).max(8).default([]),
      background: z.string().trim().max(120).optional().nullable(),
      project_id: uuid.optional().nullable(),
      customer_id: uuid.optional().nullable(),
      quotation_id: uuid.optional().nullable(),
      with_image: z.boolean().default(true),
      idempotency_key: z.string().trim().min(8).max(120),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireKind(c, "design_skill");
    const company_id = await companyOf(c);
    const s = await settingsOf(c, company_id);
    if (!s.enabled) throw new Error("AI_DISABLED");

    const dupe = ok(await c.supabase.from("ai_jobs").select("id").eq("company_id", company_id).eq("idempotency_key", data.idempotency_key).maybeSingle());
    if (dupe) throw new Error("AI_ALREADY_LINKED");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: num, error: numErr } = await supabaseAdmin.rpc("next_document_number", {
      _company_id: company_id, _doc_type: "ai_job", _prefix: "AI",
    });
    if (numErr) throw new Error(numErr.message);

    const job = ok(await c.supabase.from("ai_jobs").insert({
      company_id, job_number: num as string, kind: "design_skill", title: data.title,
      idempotency_key: data.idempotency_key, model: s.default_model, max_attempts: s.max_attempts,
      input_params: { style: data.style ?? null, palette: data.palette }, requested_by: c.userId,
    }).select("id").single());

    const claimed = ok(await supabaseAdmin.from("ai_jobs").update({
      status: "running", attempts: 1, started_at: new Date().toISOString(),
    }).eq("id", job.id).eq("status", "queued").eq("attempts", 0).select("id").maybeSingle());
    if (!claimed) throw new Error("AI_JOB_BUSY");

    const palette = data.palette.length ? data.palette : [s.brand_primary, s.brand_secondary];
    const brief = ok(await c.supabase.from("ai_design_briefs").insert({
      company_id, job_id: job.id, title: data.title, brief: data.brief, style: data.style ?? null,
      palette, background: data.background ?? null, project_id: data.project_id ?? null,
      customer_id: data.customer_id ?? null, quotation_id: data.quotation_id ?? null, created_by: c.userId,
    }).select("id").single());

    const { runDesignConcept } = await import("@/lib/ai.server");
    try {
      const { parsed, usage, image } = await runDesignConcept({
        brief: data.brief, style: data.style ?? null, palette, background: data.background ?? null,
        withImage: data.with_image,
      });
      await persistResult(c, { id: job.id, kind: "design_skill" }, company_id, parsed);

      if (image?.images.length) {
        let idx = 0;
        for (const dataUrl of image.images.slice(0, 3)) {
          idx += 1;
          const base64 = dataUrl.split(",")[1] ?? "";
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
          const path = `${company_id}/ai/${job.id}/concept-${idx}.png`;
          const up = await c.supabase.storage.from(AI_BUCKET).upload(path, bytes, { contentType: "image/png", upsert: false });
          if (!up.error) {
            await supabaseAdmin.from("ai_job_files").insert({
              company_id, job_id: job.id, object_path: path, file_name: `concept-${idx}.png`,
              mime_type: "image/png", size_bytes: bytes.byteLength, created_by: c.userId,
            });
          }
        }
      }

      const cost = usage.cost_usd + (image?.cost_usd ?? 0);
      ok(await supabaseAdmin.from("ai_jobs").update({
        status: "completed", confidence: Number.isFinite(Number(parsed?.confidence)) ? Number(parsed.confidence) : null,
        duration_ms: usage.duration_ms + (image?.duration_ms ?? 0), cost_usd: cost, finished_at: new Date().toISOString(),
      }).eq("id", job.id).eq("status", "running").eq("attempts", 1));
      ok(await c.supabase.from("ai_usage_logs").insert({
        company_id, job_id: job.id, kind: "design_skill", model: usage.model, status: "completed", attempt: 1,
        prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens,
        cost_usd: cost, duration_ms: usage.duration_ms, created_by: c.userId,
      }));
      return { job_id: job.id, brief_id: brief.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ok(await supabaseAdmin.from("ai_jobs").update({
        status: "failed", error_code: msg.split(":")[0] ?? "AI_PROVIDER_FAILED",
        error_message: msg.slice(0, 300), finished_at: new Date().toISOString(),
      }).eq("id", job.id).eq("status", "running").eq("attempts", 1));
      throw new Error(msg);
    }
  });

export const setDesignBriefStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, status: z.enum(["draft", "approved", "rejected"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireKind(c, "design_skill");
    ok(await c.supabase.from("ai_design_briefs").update({
      status: data.status,
      approved_by: data.status === "approved" ? c.userId : null,
      approved_at: data.status === "approved" ? new Date().toISOString() : null,
    }).eq("id", data.id));
    return { ok: true };
  });

/* ===================== reports ===================== */

export const getAiUsageReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ from: z.string().date().optional().nullable(), to: z.string().date().optional().nullable() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let usageQ = c.supabase.from("ai_usage_logs").select("*").order("created_at", { ascending: false }).limit(1000);
    if (data.from) usageQ = usageQ.gte("created_at", `${data.from}T00:00:00Z`);
    if (data.to) usageQ = usageQ.lte("created_at", `${data.to}T23:59:59Z`);
    const usage = ok(await usageQ) ?? [];
    const extractions = ok(await c.supabase.from("ai_extractions").select("is_reviewed, is_accepted")) ?? [];

    const completed = usage.filter((u: any) => u.status === "completed");
    const failed = usage.filter((u: any) => u.status === "failed");
    const reviewed = extractions.filter((e: any) => e.is_reviewed);
    const accepted = reviewed.filter((e: any) => e.is_accepted);
    const durations = completed.map((u: any) => Number(u.duration_ms ?? 0)).filter((n: number) => n > 0);

    const byKind = new Map<string, { kind: string; runs: number; failed: number; cost_usd: number }>();
    for (const u of usage) {
      const k = String(u.kind ?? "unknown");
      const row = byKind.get(k) ?? { kind: k, runs: 0, failed: 0, cost_usd: 0 };
      row.runs += 1;
      if (u.status === "failed") row.failed += 1;
      row.cost_usd += Number(u.cost_usd ?? 0);
      byKind.set(k, row);
    }

    return {
      total_runs: usage.length,
      completed: completed.length,
      failed: failed.length,
      success_rate: usage.length ? round((completed.length / usage.length) * 100) : 0,
      avg_duration_ms: durations.length ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0,
      total_cost_usd: round(usage.reduce((a: number, u: any) => a + Number(u.cost_usd ?? 0), 0) * 1000) / 1000,
      fields_reviewed: reviewed.length,
      fields_accepted: accepted.length,
      acceptance_rate: reviewed.length ? round((accepted.length / reviewed.length) * 100) : 0,
      by_kind: [...byKind.values()].map((r) => ({ ...r, cost_usd: round(r.cost_usd * 1000) / 1000 })),
      recent: usage.slice(0, 50),
    };
  });
