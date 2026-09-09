import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN = ["super_admin", "factory_owner", "general_manager"] as const;
const EDITORS = [...ADMIN, "designer"] as const;
const READERS = [...EDITORS, "production_manager"] as const;
const uuid = z.string().uuid();

type Ctx = { supabase: any; userId: string };

async function companyOf(c: Ctx): Promise<string> {
  const { data, error } = await c.supabase
    .from("profiles")
    .select("company_id")
    .eq("id", c.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("NO_COMPANY");
  return data.company_id as string;
}

async function rolesOf(c: Ctx): Promise<string[]> {
  const { data, error } = await c.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", c.userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: string }) => r.role);
}

function requireRole(roles: string[], allowed: readonly string[]) {
  if (!roles.some((r) => allowed.includes(r))) throw new Error("FORBIDDEN_ROLE");
}

const importRow = z.object({
  reference_code: z.string().trim().regex(/^AM-REF-\d{4}$/),
  title_ar: z.string().trim().min(2).max(180),
  collection_ar: z.string().trim().max(120).optional().nullable(),
  image_file: z.string().trim().max(300).optional().nullable(),
  source_file: z.string().trim().max(180).optional().nullable(),
  image_width: z.number().int().positive().max(20000).optional().nullable(),
  image_height: z.number().int().positive().max(20000).optional().nullable(),
  store_status: z.literal("private_design_reference"),
  copyright_note_ar: z.string().trim().max(1200).optional().nullable(),
  three_d_mode: z.literal("parametric_original_design"),
  three_d_template: z.string().trim().max(120).optional().nullable(),
  design_instruction_ar: z.string().trim().max(1600).optional().nullable(),
});

export const listDesignReferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().trim().max(80).optional().nullable(),
        review: z.enum(["pending", "approved", "rejected"]).optional().nullable(),
        category: z.string().trim().max(120).optional().nullable(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    requireRole(await rolesOf(c), READERS);
    const company_id = await companyOf(c);
    let q = c.supabase
      .from("design_references")
      .select(
        "id,reference_code,title_ar,provisional_collection_ar,image_object_path,source_file,image_width,image_height,detected_category,style_tags,material_tags,color_tags,quality_score,classification_confidence,ai_review_status,human_review_status,classification_source,copyright_risk_level,three_d_template,design_instruction_ar,created_at",
      )
      .eq("company_id", company_id)
      .is("archived_at", null)
      .order("reference_code", { ascending: true })
      .limit(data.limit);

    if (data.review) q = q.eq("human_review_status", data.review);
    if (data.category) q = q.eq("detected_category", data.category);
    if (data.search) {
      const s = data.search.replaceAll(",", " ");
      q = q.or(`reference_code.ilike.%${s}%,title_ar.ilike.%${s}%,detected_category.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getDesignReferenceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    requireRole(await rolesOf(c), READERS);
    const company_id = await companyOf(c);
    const { data, error } = await c.supabase
      .from("design_references")
      .select("human_review_status,ai_review_status,copyright_risk_level")
      .eq("company_id", company_id)
      .is("archived_at", null);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    return {
      total: rows.length,
      pendingHuman: rows.filter((r: any) => r.human_review_status === "pending").length,
      pendingAi: rows.filter((r: any) => r.ai_review_status === "pending").length,
      approved: rows.filter((r: any) => r.human_review_status === "approved").length,
      highCopyrightRisk: rows.filter((r: any) => r.copyright_risk_level === "high").length,
    };
  });

export const importDesignReferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ rows: z.array(importRow).min(1).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    requireRole(await rolesOf(c), EDITORS);
    const company_id = await companyOf(c);

    const rows = data.rows.map((r) => ({
      company_id,
      reference_code: r.reference_code,
      title_ar: r.title_ar,
      provisional_collection_ar: r.collection_ar ?? null,
      image_object_path: r.image_file ?? null,
      source_file: r.source_file ?? null,
      image_width: r.image_width ?? null,
      image_height: r.image_height ?? null,
      store_status: "private_design_reference",
      copyright_note_ar: r.copyright_note_ar ?? null,
      three_d_mode: "parametric_original_design",
      three_d_template: r.three_d_template ?? null,
      design_instruction_ar: r.design_instruction_ar ?? null,
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
      updated_at: new Date().toISOString(),
    }));

    const { data: saved, error } = await c.supabase
      .from("design_references")
      .upsert(rows, { onConflict: "company_id,reference_code" })
      .select("id,reference_code");
    if (error) throw new Error(error.message);
    return { imported: saved?.length ?? 0 };
  });

export const reviewDesignReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        detected_category: z.string().trim().min(2).max(120),
        style_tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
        material_tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
        color_tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
        quality_score: z.number().min(0).max(1).optional().nullable(),
        classification_confidence: z.number().min(0).max(1).optional().nullable(),
        copyright_risk_level: z.enum(["unknown", "low", "medium", "high"]),
        human_review_status: z.enum(["pending", "approved", "rejected"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    requireRole(await rolesOf(c), EDITORS);
    const company_id = await companyOf(c);
    const { error } = await c.supabase
      .from("design_references")
      .update({
        detected_category: data.detected_category,
        style_tags: data.style_tags,
        material_tags: data.material_tags,
        color_tags: data.color_tags,
        quality_score: data.quality_score ?? null,
        classification_confidence: data.classification_confidence ?? null,
        copyright_risk_level: data.copyright_risk_level,
        human_review_status: data.human_review_status,
        classification_source: "human_review",
        updated_by: c.userId,
        updated_at: new Date().toISOString(),
        publish_allowed: false,
      })
      .eq("id", data.id)
      .eq("company_id", company_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createOriginalDesignFromReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reference_id: uuid,
        title_ar: z.string().trim().min(3).max(180),
        change_summary: z.string().trim().min(20).max(2400),
        dimensions: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
        materials: z.record(z.string(), z.any()).default({}),
        colors: z.record(z.string(), z.any()).default({}),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    requireRole(await rolesOf(c), EDITORS);
    const company_id = await companyOf(c);
    const { data: ref, error: refError } = await c.supabase
      .from("design_references")
      .select("id,human_review_status,copyright_risk_level")
      .eq("id", data.reference_id)
      .eq("company_id", company_id)
      .maybeSingle();
    if (refError) throw new Error(refError.message);
    if (!ref) throw new Error("REFERENCE_NOT_FOUND");
    if (ref.copyright_risk_level === "high") throw new Error("REFERENCE_COPYRIGHT_HIGH_RISK");

    const { data: created, error } = await c.supabase
      .from("design_reference_derivatives")
      .insert({
        company_id,
        reference_id: data.reference_id,
        title_ar: data.title_ar,
        change_summary: data.change_summary,
        dimensions: data.dimensions,
        materials: data.materials,
        colors: data.colors,
        status: "draft",
        publish_allowed: false,
        created_by: c.userId,
        updated_by: c.userId,
      })
      .select("id,status")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const listOriginalDesigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    requireRole(await rolesOf(c), READERS);
    const company_id = await companyOf(c);
    const { data, error } = await c.supabase
      .from("design_reference_derivatives")
      .select("id,reference_id,title_ar,status,change_summary,dimensions,materials,colors,estimated_cost_sar,estimated_days,publish_allowed,created_at")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
