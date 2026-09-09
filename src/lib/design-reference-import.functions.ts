import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "design-references-private";
const EDITORS = ["super_admin", "factory_owner", "general_manager", "designer"] as const;
const uuid = z.string().uuid();
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const refCode = z.string().regex(/^AM-REF-\d{4}$/);

type Ctx = { supabase: any; userId: string };

async function companyOf(c: Ctx): Promise<string> {
  const { data, error } = await c.supabase.from("profiles").select("company_id").eq("id", c.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("NO_COMPANY");
  return data.company_id as string;
}

async function requireEditor(c: Ctx) {
  const { data, error } = await c.supabase.from("user_roles").select("role").eq("user_id", c.userId);
  if (error) throw new Error(error.message);
  const roles: string[] = (data ?? []).map((row: { role: string }) => row.role);
  if (!roles.some((role: string) => EDITORS.includes(role as (typeof EDITORS)[number]))) throw new Error("FORBIDDEN_ROLE");
}

async function ownedJob(c: Ctx, jobId: string) {
  const company_id = await companyOf(c);
  const { data, error } = await c.supabase
    .from("design_reference_import_jobs")
    .select("id,company_id,status,total_items,processed_items,imported_items,duplicate_items,failed_items")
    .eq("id", jobId)
    .eq("company_id", company_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("IMPORT_JOB_NOT_FOUND");
  return { company_id, job: data };
}

export const createDesignReferenceImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ file_name: z.string().trim().min(1).max(240), total_items: z.number().int().min(1).max(5000) }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireEditor(c);
    const company_id = await companyOf(c);
    const { data: created, error } = await c.supabase.from("design_reference_import_jobs").insert({
      company_id,
      file_name: data.file_name,
      total_items: data.total_items,
      status: "validating",
      created_by: c.userId,
      updated_at: new Date().toISOString(),
    }).select("id,status,total_items,processed_items,imported_items,duplicate_items,failed_items").single();
    if (error) throw new Error(error.message);
    return created;
  });

const ticketInput = z.object({
  job_id: uuid,
  reference_code: refCode,
  image_sha256: sha256,
  extension: z.enum(["jpg", "jpeg", "png", "webp"]),
  content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(20 * 1024 * 1024),
});

export const prepareDesignReferenceUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ticketInput.parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireEditor(c);
    const { company_id } = await ownedJob(c, data.job_id);

    const { data: byHash, error: hashError } = await c.supabase
      .from("design_references")
      .select("id,reference_code,image_object_path")
      .eq("company_id", company_id)
      .eq("image_sha256", data.image_sha256)
      .is("archived_at", null)
      .maybeSingle();
    if (hashError) throw new Error(hashError.message);
    if (byHash) return { action: "duplicate" as const, existing_id: byHash.id, existing_code: byHash.reference_code };

    const { data: byCode, error: codeError } = await c.supabase
      .from("design_references")
      .select("id,image_sha256")
      .eq("company_id", company_id)
      .eq("reference_code", data.reference_code)
      .is("archived_at", null)
      .maybeSingle();
    if (codeError) throw new Error(codeError.message);
    if (byCode?.image_sha256 && byCode.image_sha256 !== data.image_sha256) throw new Error("REFERENCE_CODE_HASH_CONFLICT");

    const ext = data.extension === "jpeg" ? "jpg" : data.extension;
    const path = `${company_id}/${data.reference_code}/${data.image_sha256}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
    if (error) throw new Error(error.message);
    await c.supabase.from("design_reference_import_jobs").update({ status: "uploading", updated_at: new Date().toISOString() }).eq("id", data.job_id).eq("company_id", company_id);
    return { action: "upload" as const, path, token: signed.token };
  });

const registerInput = ticketInput.extend({
  object_path: z.string().min(20).max(500),
  title_ar: z.string().trim().min(2).max(180),
  collection_ar: z.string().trim().max(120).optional().nullable(),
  source_file: z.string().trim().max(180).optional().nullable(),
  image_width: z.number().int().positive().max(20000).optional().nullable(),
  image_height: z.number().int().positive().max(20000).optional().nullable(),
  copyright_note_ar: z.string().trim().max(1200).optional().nullable(),
  three_d_template: z.string().trim().max(120).optional().nullable(),
  design_instruction_ar: z.string().trim().max(1600).optional().nullable(),
});

export const registerUploadedDesignReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registerInput.parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireEditor(c);
    const { company_id } = await ownedJob(c, data.job_id);
    const expectedPrefix = `${company_id}/${data.reference_code}/`;
    if (!data.object_path.startsWith(expectedPrefix) || !data.object_path.includes(data.image_sha256)) throw new Error("INVALID_OBJECT_PATH");

    const slash = data.object_path.lastIndexOf("/");
    const folder = data.object_path.slice(0, slash);
    const fileName = data.object_path.slice(slash + 1);
    const { data: objects, error: listError } = await supabaseAdmin.storage.from(BUCKET).list(folder, { search: fileName, limit: 10 });
    if (listError) throw new Error(listError.message);
    if (!(objects ?? []).some((o) => o.name === fileName)) throw new Error("UPLOADED_OBJECT_NOT_FOUND");

    const now = new Date().toISOString();
    const record = {
      company_id,
      reference_code: data.reference_code,
      title_ar: data.title_ar,
      provisional_collection_ar: data.collection_ar ?? null,
      image_object_path: data.object_path,
      image_sha256: data.image_sha256,
      source_file: data.source_file ?? null,
      image_width: data.image_width ?? null,
      image_height: data.image_height ?? null,
      store_status: "private_design_reference",
      copyright_note_ar: data.copyright_note_ar ?? null,
      three_d_mode: "parametric_original_design",
      three_d_template: data.three_d_template ?? null,
      design_instruction_ar: data.design_instruction_ar ?? null,
      detected_category: null,
      style_tags: [],
      material_tags: [],
      color_tags: [],
      quality_score: null,
      classification_confidence: null,
      ai_review_status: "pending",
      human_review_status: "pending",
      classification_source: "legacy_import_unverified",
      copyright_risk_level: "unknown",
      publish_allowed: false,
      created_by: c.userId,
      updated_by: c.userId,
      updated_at: now,
    };
    const { data: saved, error } = await c.supabase.from("design_references")
      .upsert(record, { onConflict: "company_id,reference_code" })
      .select("id,reference_code")
      .single();
    if (error) throw new Error(error.message);

    await c.supabase.rpc("increment_design_reference_import_job", {
      p_job_id: data.job_id,
      p_imported: 1,
      p_duplicates: 0,
      p_failed: 0,
    });
    return saved;
  });

export const recordDesignReferenceImportDuplicate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ job_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireEditor(c);
    await ownedJob(c, data.job_id);
    const { error } = await c.supabase.rpc("increment_design_reference_import_job", { p_job_id: data.job_id, p_imported: 0, p_duplicates: 1, p_failed: 0 });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordDesignReferenceImportFailure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ job_id: uuid, message: z.string().max(500).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireEditor(c);
    const { company_id } = await ownedJob(c, data.job_id);
    const { error } = await c.supabase.rpc("increment_design_reference_import_job", { p_job_id: data.job_id, p_imported: 0, p_duplicates: 0, p_failed: 1 });
    if (error) throw new Error(error.message);
    if (data.message) await c.supabase.from("design_reference_import_jobs").update({ error_message: data.message.slice(0, 500) }).eq("id", data.job_id).eq("company_id", company_id);
    return { ok: true };
  });

export const finalizeDesignReferenceImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ job_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireEditor(c);
    const { company_id, job } = await ownedJob(c, data.job_id);
    const completed = job.processed_items >= job.total_items;
    const status = completed ? (job.failed_items === job.total_items ? "failed" : "completed") : "failed";
    const { data: updated, error } = await c.supabase.from("design_reference_import_jobs").update({
      status,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: completed ? null : "IMPORT_INCOMPLETE",
    }).eq("id", data.job_id).eq("company_id", company_id).select("id,status,total_items,processed_items,imported_items,duplicate_items,failed_items,error_message").single();
    if (error) throw new Error(error.message);
    return updated;
  });
