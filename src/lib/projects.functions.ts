import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

const ADMIN = ["super_admin", "factory_owner", "general_manager"] as const;
const STAFF = [
  ...ADMIN,
  "project_manager",
  "sales_manager",
  "production_manager",
  "warehouse_manager",
  "quality_manager",
] as const;

const uuid = z.string().uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const txt = (max = 300) => z.string().trim().min(1).max(max);
const opt = (max = 2000) => z.string().trim().max(max).optional().nullable();

export const PROJECT_BUCKET = "mfg-attachments";

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

async function requireStaff(c: Ctx) {
  const roles = await rolesOf(c);
  if (!roles.some((r) => (STAFF as readonly string[]).includes(r))) throw new Error("FORBIDDEN_ROLE");
  return roles;
}

async function nextNumber(companyId: string, docType: string, prefix: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("next_document_number", {
    _company_id: companyId,
    _doc_type: docType,
    _prefix: prefix,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

function ok(res: any): any {
  if (res?.error) throw new Error(res.error.message);
  return res?.data;
}

/* ===================== access ===================== */

export const getProjectsAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const roles = await rolesOf(c);
    const { data: portal } = await c.supabase.from("customer_users").select("customer_id").eq("user_id", c.userId);
    return {
      roles,
      isAdmin: roles.some((r) => (ADMIN as readonly string[]).includes(r)),
      isStaff: roles.some((r) => (STAFF as readonly string[]).includes(r)),
      isInstaller: roles.includes("installer"),
      isPortalCustomer: (portal ?? []).length > 0,
    };
  });

/* ===================== projects ===================== */

export const listProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        search: z.string().trim().max(120).optional(),
        status: z.string().max(30).optional(),
        priority: z.string().max(20).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("projects")
      .select("*, customers(name_ar, name_en, phone, city)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status) q = q.eq("status", data.status);
    if (data.priority) q = q.eq("priority", data.priority);
    if (data.search) q = q.or(`name_ar.ilike.%${data.search}%,project_number.ilike.%${data.search}%`);
    return ok(await q) ?? [];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        name_ar: txt(200),
        name_en: opt(200),
        customer_id: uuid,
        quotation_id: uuid.optional().nullable(),
        sales_order_id: uuid.optional().nullable(),
        priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
        budget_amount: z.number().min(0).max(1_000_000_000).default(0),
        start_date: dateStr.optional().nullable(),
        target_end_date: dateStr.optional().nullable(),
        site_address: opt(400),
        city: opt(80),
        manager_id: uuid.optional().nullable(),
        description: opt(2000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireStaff(c);
    const company_id = await companyOf(c);
    const project_number = await nextNumber(company_id, "project", "PRJ");
    return ok(
      await c.supabase
        .from("projects")
        .insert({ ...data, company_id, project_number, created_by: c.userId, manager_id: data.manager_id ?? c.userId })
        .select("*")
        .single(),
    );
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        patch: z
          .object({
            name_ar: txt(200).optional(),
            name_en: opt(200),
            priority: z.enum(["low", "normal", "high", "critical"]).optional(),
            budget_amount: z.number().min(0).max(1_000_000_000).optional(),
            start_date: dateStr.optional().nullable(),
            target_end_date: dateStr.optional().nullable(),
            site_address: opt(400),
            city: opt(80),
            manager_id: uuid.optional().nullable(),
            description: opt(2000),
          })
          .strict(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return ok(await c.supabase.from("projects").update(data.patch).eq("id", data.id).select("*").single());
  });

export const setProjectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum([
          "draft", "planning", "survey", "design", "approved",
          "in_production", "installation", "handover", "completed", "on_hold", "cancelled",
        ]),
        closure_exception_note: opt(600),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const patch: Record<string, unknown> = { status: data.status };
    if (data.closure_exception_note) patch['closure_exception_note'] = data.closure_exception_note;
    return ok(await c.supabase.from("projects").update(patch).eq("id", data.id).select("*").single());
  });

export const getProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const project = ok(
      await c.supabase
        .from("projects")
        .select("*, customers(name_ar, name_en, phone, email, city, address), sales_orders(order_number, total), quotations(quote_number)")
        .eq("id", data.id)
        .maybeSingle(),
    );
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const [milestones, members, mos] = await Promise.all([
      c.supabase.from("project_milestones").select("*").eq("project_id", data.id).order("sort_order"),
      c.supabase.from("project_members").select("*").eq("project_id", data.id),
      c.supabase
        .from("project_manufacturing_orders")
        .select("*, manufacturing_orders(mo_number, status, quantity, description)")
        .eq("project_id", data.id),
    ]);
    const { data: company } = await c.supabase.from("companies").select("*").eq("id", project.company_id).maybeSingle();
    return {
      project,
      company: company ?? null,
      milestones: milestones.data ?? [],
      members: members.data ?? [],
      manufacturing_orders: mos.data ?? [],
    };
  });

export const upsertMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid.optional(),
        project_id: uuid,
        title_ar: txt(200),
        planned_date: dateStr.optional().nullable(),
        actual_date: dateStr.optional().nullable(),
        progress_percent: z.number().min(0).max(100).default(0),
        sort_order: z.number().int().min(0).max(999).default(0),
        notes: opt(600),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const { id, ...rest } = data;
    if (id) return ok(await c.supabase.from("project_milestones").update(rest).eq("id", id).select("*").single());
    return ok(await c.supabase.from("project_milestones").insert({ ...rest, company_id }).select("*").single());
  });

export const addProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ project_id: uuid, user_id: uuid, member_role: txt(60), can_edit: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return ok(await c.supabase.from("project_members").insert({ ...data, company_id }).select("*").single());
  });

export const removeProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    ok(await c.supabase.from("project_members").delete().eq("id", data.id));
    return { ok: true };
  });

export const linkManufacturingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid, manufacturing_order_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return ok(
      await c.supabase
        .from("project_manufacturing_orders")
        .upsert({ ...data, company_id }, { onConflict: "project_id,manufacturing_order_id" })
        .select("*")
        .single(),
    );
  });

/* ===================== private storage ===================== */

const safeName = (n: string) => n.replace(/[^\w.\-\u0600-\u06FF]/g, "_").slice(-80);

export const createProjectUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ project_id: uuid, kind: txt(40), file_name: txt(160) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const path = `${company_id}/projects/${data.project_id}/${data.kind}/${crypto.randomUUID()}-${safeName(data.file_name)}`;
    const { data: signed, error } = await c.supabase.storage.from(PROJECT_BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signed_url: signed.signedUrl };
  });

export const getProjectFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ object_path: z.string().min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: signed, error } = await c.supabase.storage.from(PROJECT_BUCKET).createSignedUrl(data.object_path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl, expires_in: 300 };
  });

/* ===================== site surveys ===================== */

export const listSurveys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return (
      ok(
        await c.supabase
          .from("site_surveys")
          .select("*, site_measurements(*)")
          .eq("project_id", data.project_id)
          .order("created_at", { ascending: false }),
      ) ?? []
    );
  });

export const createSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        visit_date: dateStr,
        site_conditions: opt(1500),
        risks: opt(1500),
        notes: opt(1500),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const survey_number = await nextNumber(company_id, "site_survey", "SRV");
    return ok(
      await c.supabase
        .from("site_surveys")
        .insert({ ...data, company_id, survey_number, revision: 1, surveyor_id: c.userId, created_by: c.userId })
        .select("*")
        .single(),
    );
  });

export const updateSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        visit_date: dateStr.optional(),
        site_conditions: opt(1500),
        risks: opt(1500),
        notes: opt(1500),
        status: z.enum(["draft", "submitted", "cancelled"]).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { id, ...patch } = data;
    return ok(await c.supabase.from("site_surveys").update(patch).eq("id", id).select("*").single());
  });

export const approveSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, customer_approved_by: txt(140) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return ok(
      await c.supabase
        .from("site_surveys")
        .update({ status: "customer_approved", customer_approved_by: data.customer_approved_by })
        .eq("id", data.id)
        .select("*")
        .single(),
    );
  });

/** Creates a new revision from an approved survey and marks the old one superseded. */
export const reviseSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, visit_date: dateStr, reason: opt(600) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const prev = ok(await c.supabase.from("site_surveys").select("*, site_measurements(*)").eq("id", data.id).maybeSingle());
    if (!prev) throw new Error("SURVEY_NOT_FOUND");
    const created = ok(
      await c.supabase
        .from("site_surveys")
        .insert({
          company_id: prev.company_id,
          project_id: prev.project_id,
          survey_number: prev.survey_number,
          revision: (prev.revision ?? 1) + 1,
          supersedes_id: prev.id,
          visit_date: data.visit_date,
          surveyor_id: c.userId,
          site_conditions: prev.site_conditions,
          risks: prev.risks,
          notes: data.reason ?? prev.notes,
          status: "draft",
          created_by: c.userId,
        })
        .select("*")
        .single(),
    );
    const rows = (prev.site_measurements ?? []).map((m: any) => ({
      company_id: prev.company_id,
      site_survey_id: created.id,
      area_name: m.area_name,
      item_description: m.item_description,
      length_value: m.length_value,
      width_value: m.width_value,
      height_value: m.height_value,
      unit: m.unit,
      quantity: m.quantity,
      notes: m.notes,
    }));
    if (rows.length) ok(await c.supabase.from("site_measurements").insert(rows));
    ok(await c.supabase.from("site_surveys").update({ status: "superseded" }).eq("id", prev.id));
    return created;
  });

export const addMeasurement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        site_survey_id: uuid,
        area_name: txt(120),
        item_description: txt(300),
        length_value: z.number().min(0).max(1_000_000).optional().nullable(),
        width_value: z.number().min(0).max(1_000_000).optional().nullable(),
        height_value: z.number().min(0).max(1_000_000).optional().nullable(),
        unit: txt(20).default("mm"),
        quantity: z.number().positive().max(100000).default(1),
        notes: opt(400),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return ok(await c.supabase.from("site_measurements").insert({ ...data, company_id }).select("*").single());
  });

export const deleteMeasurement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    ok(await c.supabase.from("site_measurements").delete().eq("id", data.id));
    return { ok: true };
  });

/* ===================== drawings & approvals ===================== */

export const listDrawings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return (
      ok(
        await c.supabase
          .from("project_drawings")
          .select("*, drawing_revisions(*)")
          .eq("project_id", data.project_id)
          .order("created_at", { ascending: false }),
      ) ?? []
    );
  });

export const createDrawing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ project_id: uuid, title_ar: txt(200), discipline: opt(80) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const drawing_number = await nextNumber(company_id, "project_drawing", "DWG");
    return ok(
      await c.supabase
        .from("project_drawings")
        .insert({ ...data, company_id, drawing_number, created_by: c.userId })
        .select("*")
        .single(),
    );
  });

export const addDrawingRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ project_drawing_id: uuid, object_path: opt(500), change_note: opt(600) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const d = ok(await c.supabase.from("project_drawings").select("current_revision").eq("id", data.project_drawing_id).maybeSingle());
    return ok(
      await c.supabase
        .from("drawing_revisions")
        .insert({ ...data, company_id, revision: (d?.current_revision ?? 0) + 1, status: "submitted", created_by: c.userId })
        .select("*")
        .single(),
    );
  });

export const decideDrawingRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["approved", "rejected"]),
        decided_by: txt(140),
        customer_comment: opt(800),
        rejection_reason: opt(600),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { id, ...patch } = data;
    return ok(await c.supabase.from("drawing_revisions").update(patch).eq("id", id).select("*").single());
  });

const approvalTables = { material: "material_approvals", color: "color_sample_approvals" } as const;

export const listApprovals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid, kind: z.enum(["material", "color"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return (
      ok(
        await c.supabase
          .from(approvalTables[data.kind])
          .select("*")
          .eq("project_id", data.project_id)
          .order("created_at", { ascending: false }),
      ) ?? []
    );
  });

export const createMaterialApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        material_name: txt(200),
        specification: opt(600),
        supplier_name: opt(160),
        object_path: opt(500),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return ok(
      await c.supabase.from("material_approvals").insert({ ...data, company_id, created_by: c.userId }).select("*").single(),
    );
  });

export const createColorApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        color_name: txt(160),
        color_code: opt(60),
        finish_type: opt(80),
        object_path: opt(500),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return ok(
      await c.supabase.from("color_sample_approvals").insert({ ...data, company_id, created_by: c.userId }).select("*").single(),
    );
  });

export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        kind: z.enum(["material", "color"]),
        status: z.enum(["approved", "rejected"]),
        decided_by: txt(140),
        customer_comment: opt(800),
        rejection_reason: opt(600),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { id, kind, ...patch } = data;
    return ok(await c.supabase.from(approvalTables[kind]).update(patch).eq("id", id).select("*").single());
  });

/* ===================== tasks & time ===================== */

export const listTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const [tasks, deps] = await Promise.all([
      c.supabase.from("project_tasks").select("*").eq("project_id", data.project_id).order("planned_start", { nullsFirst: false }),
      c.supabase.from("task_dependencies").select("*"),
    ]);
    if (tasks.error) throw new Error(tasks.error.message);
    const ids = new Set((tasks.data ?? []).map((t: any) => t.id));
    return {
      tasks: tasks.data ?? [],
      dependencies: (deps.data ?? []).filter((d: any) => ids.has(d.task_id)),
    };
  });

export const upsertTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid.optional(),
        project_id: uuid,
        milestone_id: uuid.optional().nullable(),
        title_ar: txt(200),
        description: opt(1500),
        status: z.enum(["todo", "in_progress", "blocked", "done", "cancelled"]).default("todo"),
        priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
        is_critical: z.boolean().default(false),
        planned_start: dateStr.optional().nullable(),
        planned_end: dateStr.optional().nullable(),
        planned_hours: z.number().min(0).max(10000).default(0),
        progress_percent: z.number().min(0).max(100).default(0),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if (rest.status === "done") patch['actual_end'] = new Date().toISOString().slice(0, 10);
    if (id) return ok(await c.supabase.from("project_tasks").update(patch).eq("id", id).select("*").single());
    return ok(await c.supabase.from("project_tasks").insert({ ...patch, company_id, created_by: c.userId }).select("*").single());
  });

export const addTaskDependency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ task_id: uuid, depends_on_task_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return ok(await c.supabase.from("task_dependencies").insert({ ...data, company_id }).select("*").single());
  });

export const removeTaskDependency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    ok(await c.supabase.from("task_dependencies").delete().eq("id", data.id));
    return { ok: true };
  });

export const logTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        task_id: uuid.optional().nullable(),
        work_date: dateStr,
        hours: z.number().positive().max(24),
        hourly_cost: z.number().min(0).max(100000).default(0),
        notes: opt(400),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const { data: emp } = await c.supabase.from("employees").select("id").eq("user_id", c.userId).maybeSingle();
    return ok(
      await c.supabase
        .from("time_entries")
        .insert({ ...data, company_id, user_id: c.userId, employee_id: emp?.id ?? null })
        .select("*")
        .single(),
    );
  });

export const listTimeEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return (
      ok(
        await c.supabase
          .from("time_entries")
          .select("*, project_tasks(title_ar)")
          .eq("project_id", data.project_id)
          .order("work_date", { ascending: false })
          .limit(300),
      ) ?? []
    );
  });

/* ===================== installation ===================== */

export const listInstallationTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    return (
      ok(
        await c.supabase
          .from("installation_teams")
          .select("*, installation_team_members(*, employees(full_name_ar, employee_number))")
          .order("name_ar"),
      ) ?? []
    );
  });

export const createInstallationTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        name_ar: txt(140),
        leader_employee_id: uuid.optional().nullable(),
        vehicle_plate: opt(40),
        tools_note: opt(600),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireStaff(c);
    const company_id = await companyOf(c);
    return ok(await c.supabase.from("installation_teams").insert({ ...data, company_id }).select("*").single());
  });

export const addTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ team_id: uuid, employee_id: uuid, user_id: uuid.optional().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return ok(await c.supabase.from("installation_team_members").insert({ ...data, company_id }).select("*").single());
  });

export const listInstallationOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid.optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("installation_orders")
      .select("*, installation_teams(name_ar, vehicle_plate), projects(project_number, name_ar), installation_visits(*)")
      .order("scheduled_date", { ascending: false, nullsFirst: false })
      .limit(300);
    if (data.project_id) q = q.eq("project_id", data.project_id);
    return ok(await q) ?? [];
  });

export const createInstallationOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        team_id: uuid.optional().nullable(),
        scheduled_date: dateStr.optional().nullable(),
        scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
        site_address: opt(400),
        contact_name: opt(140),
        contact_phone: opt(40),
        notes: opt(1000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const io_number = await nextNumber(company_id, "installation_order", "IO");
    return ok(
      await c.supabase
        .from("installation_orders")
        .insert({ ...data, company_id, io_number, created_by: c.userId })
        .select("*")
        .single(),
    );
  });

export const setInstallationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["draft", "scheduled", "dispatched", "in_progress", "paused", "completed", "cancelled"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return ok(await c.supabase.from("installation_orders").update({ status: data.status }).eq("id", data.id).select("*").single());
  });

export const recordInstallationVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        installation_order_id: uuid,
        visit_date: dateStr,
        event: z.enum(["arrived", "started", "paused", "completed"]),
        pause_reason: opt(400),
        site_notes: opt(1500),
        photo_paths: z.array(z.string().max(500)).max(20).default([]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const stamp = new Date().toISOString();
    const field = { arrived: "arrived_at", started: "started_at", paused: "paused_at", completed: "completed_at" }[data.event];
    const existing = ok(
      await c.supabase
        .from("installation_visits")
        .select("*")
        .eq("installation_order_id", data.installation_order_id)
        .eq("visit_date", data.visit_date)
        .maybeSingle(),
    );
    const patch: Record<string, unknown> = {
      [field]: stamp,
      pause_reason: data.pause_reason ?? existing?.pause_reason ?? null,
      site_notes: data.site_notes ?? existing?.site_notes ?? null,
    };
    if (data.photo_paths.length) {
      patch['photo_paths'] = [...(existing?.photo_paths ?? []), ...data.photo_paths];
    }
    if (existing) return ok(await c.supabase.from("installation_visits").update(patch).eq("id", existing.id).select("*").single());
    return ok(
      await c.supabase
        .from("installation_visits")
        .insert({
          ...patch,
          company_id,
          installation_order_id: data.installation_order_id,
          visit_date: data.visit_date,
          photo_paths: data.photo_paths,
          created_by: c.userId,
        })
        .select("*")
        .single(),
    );
  });

/** Issues installation materials from stock (atomic; DB trigger blocks negative balances). */
export const issueInstallationMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        item_id: uuid,
        warehouse_id: uuid,
        quantity: z.number().positive().max(1_000_000),
        direction: z.enum(["issue", "return"]),
        notes: opt(400),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return ok(
      await c.supabase
        .from("stock_movements")
        .insert({
          company_id,
          item_id: data.item_id,
          warehouse_id: data.warehouse_id,
          quantity: data.quantity,
          movement_type: data.direction === "issue" ? "issue_to_mfg" : "return_from_mfg",
          notes: `[project:${data.project_id}] ${data.notes ?? ""}`.trim(),
          created_by: c.userId,
        })
        .select("id")
        .single(),
    );
  });

/* ===================== delivery notes ===================== */

export const listProjectDeliveryNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid.optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("delivery_notes")
      .select("*, customers(name_ar), sales_orders(order_number), delivery_note_items(*), projects(project_number, name_ar)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.project_id) q = q.eq("project_id", data.project_id);
    return ok(await q) ?? [];
  });

export const createProjectDeliveryNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        delivery_date: dateStr,
        received_by: opt(140),
        received_id_number: opt(40),
        notes: opt(1000),
        items: z
          .array(
            z.object({
              description: txt(300),
              unit: txt(30).default("قطعة"),
              quantity: z.number().positive().max(1_000_000),
              sales_order_item_id: uuid.optional().nullable(),
              manufacturing_order_id: uuid.optional().nullable(),
            }),
          )
          .min(1)
          .max(100),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const project = ok(await c.supabase.from("projects").select("id, customer_id, sales_order_id").eq("id", data.project_id).maybeSingle());
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const dn_number = await nextNumber(company_id, "delivery_note", "DN");
    const note = ok(
      await c.supabase
        .from("delivery_notes")
        .insert({
          company_id,
          project_id: data.project_id,
          customer_id: project.customer_id,
          sales_order_id: project.sales_order_id,
          dn_number,
          status: "draft",
          delivery_date: data.delivery_date,
          received_by: data.received_by,
          received_id_number: data.received_id_number,
          notes: data.notes,
          created_by: c.userId,
        })
        .select("*")
        .single(),
    );
    try {
      ok(
        await c.supabase
          .from("delivery_note_items")
          .insert(data.items.map((it) => ({ ...it, delivery_note_id: note.id, company_id }))),
      );
    } catch (e) {
      await c.supabase.from("delivery_notes").delete().eq("id", note.id);
      throw e;
    }
    return note;
  });

export const setDeliveryNoteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, status: z.enum(["draft", "delivered", "acknowledged"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return ok(await c.supabase.from("delivery_notes").update({ status: data.status }).eq("id", data.id).select("*").single());
  });

/* ===================== handover & snags ===================== */

export const listHandovers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return (
      ok(
        await c.supabase
          .from("handover_records")
          .select("*, snag_items(*)")
          .eq("project_id", data.project_id)
          .order("handover_date", { ascending: false }),
      ) ?? []
    );
  });

export const createHandover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        handover_type: z.enum(["preliminary", "final"]),
        handover_date: dateStr,
        customer_representative: opt(140),
        representative_id_number: opt(40),
        notes: opt(1500),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const handover_number = await nextNumber(company_id, "handover", "HO");
    return ok(
      await c.supabase
        .from("handover_records")
        .insert({ ...data, company_id, handover_number, created_by: c.userId })
        .select("*")
        .single(),
    );
  });

export const approveHandover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, signature_path: opt(500) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return ok(
      await c.supabase
        .from("handover_records")
        .update({ customer_approved: true, signature_path: data.signature_path ?? null })
        .eq("id", data.id)
        .select("*")
        .single(),
    );
  });

export const listSnags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return (
      ok(
        await c.supabase.from("snag_items").select("*").eq("project_id", data.project_id).order("created_at", { ascending: false }),
      ) ?? []
    );
  });

export const upsertSnag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid.optional(),
        project_id: uuid,
        handover_record_id: uuid.optional().nullable(),
        title_ar: txt(200),
        description: opt(1200),
        location_note: opt(200),
        is_critical: z.boolean().default(false),
        status: z.enum(["open", "in_progress", "fixed", "verified", "waived"]).default("open"),
        assignee_user_id: uuid.optional().nullable(),
        due_date: dateStr.optional().nullable(),
        before_photo_path: opt(500),
        after_photo_path: opt(500),
        waiver_note: opt(600),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const { id, ...rest } = data;
    if (id) return ok(await c.supabase.from("snag_items").update(rest).eq("id", id).select("*").single());
    return ok(await c.supabase.from("snag_items").insert({ ...rest, company_id, created_by: c.userId }).select("*").single());
  });

/* ===================== warranty & service ===================== */

export const listWarranties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid.optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("warranties")
      .select("*, projects(project_number, name_ar, customer_id, customers(name_ar)), warranty_claims(*)")
      .order("end_date", { ascending: true })
      .limit(300);
    if (data.project_id) q = q.eq("project_id", data.project_id);
    return ok(await q) ?? [];
  });

export const createWarranty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        handover_record_id: uuid.optional().nullable(),
        start_date: dateStr,
        months: z.number().int().min(1).max(240).optional(),
        end_date: dateStr.optional(),
        scope_ar: txt(400).optional(),
        terms_ar: opt(3000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const { data: settings } = await c.supabase
      .from("project_settings")
      .select("default_warranty_months, warranty_scope_ar, warranty_terms_ar")
      .eq("company_id", company_id)
      .maybeSingle();
    const months = data.months ?? settings?.default_warranty_months ?? 12;
    let end = data.end_date;
    if (!end) {
      const d = new Date(`${data.start_date}T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + months);
      end = d.toISOString().slice(0, 10);
    }
    const warranty_number = await nextNumber(company_id, "warranty", "WR");
    return ok(
      await c.supabase
        .from("warranties")
        .insert({
          company_id,
          project_id: data.project_id,
          handover_record_id: data.handover_record_id ?? null,
          warranty_number,
          start_date: data.start_date,
          end_date: end,
          scope_ar: data.scope_ar ?? settings?.warranty_scope_ar ?? "عيوب التصنيع فقط",
          terms_ar: data.terms_ar ?? settings?.warranty_terms_ar ?? null,
          created_by: c.userId,
        })
        .select("*")
        .single(),
    );
  });

export const listClaims = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid.optional(), status: z.string().max(20).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("warranty_claims")
      .select("*, warranties(warranty_number, end_date), projects(project_number, name_ar), service_visits(*)")
      .order("reported_at", { ascending: false })
      .limit(300);
    if (data.project_id) q = q.eq("project_id", data.project_id);
    if (data.status) q = q.eq("status", data.status);
    return ok(await q) ?? [];
  });

export const createClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        warranty_id: uuid,
        project_id: uuid,
        category: opt(80),
        priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
        description: txt(2000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: w } = await c.supabase.from("warranties").select("company_id").eq("id", data.warranty_id).maybeSingle();
    if (!w) throw new Error("WARRANTY_NOT_FOUND");
    const claim_number = await nextNumber(w.company_id, "warranty_claim", "CLM");
    return ok(
      await c.supabase
        .from("warranty_claims")
        .insert({ ...data, company_id: w.company_id, claim_number, created_by: c.userId })
        .select("*")
        .single(),
    );
  });

export const updateClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["new", "triaged", "scheduled", "in_progress", "resolved", "rejected", "closed"]).optional(),
        priority: z.enum(["low", "normal", "high", "critical"]).optional(),
        category: opt(80),
        resolution: opt(2000),
        is_covered: z.boolean().optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { id, ...patch } = data;
    return ok(await c.supabase.from("warranty_claims").update(patch).eq("id", id).select("*").single());
  });

export const addServiceVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        warranty_claim_id: uuid,
        scheduled_at: z.string().max(40).optional().nullable(),
        performed_at: z.string().max(40).optional().nullable(),
        technician_employee_id: uuid.optional().nullable(),
        parts_used: opt(1200),
        internal_cost: z.number().min(0).max(10_000_000).default(0),
        outcome: opt(1500),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const visit_number = await nextNumber(company_id, "service_visit", "SV");
    return ok(
      await c.supabase
        .from("service_visits")
        .insert({ ...data, company_id, visit_number, technician_user_id: c.userId, created_by: c.userId })
        .select("*")
        .single(),
    );
  });

/* ===================== communications ===================== */

export const listCommunications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    return (
      ok(
        await c.supabase
          .from("customer_communications")
          .select("*")
          .eq("project_id", data.project_id)
          .order("occurred_at", { ascending: false })
          .limit(200),
      ) ?? []
    );
  });

export const createCommunication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        project_id: uuid,
        channel: z.enum(["call", "whatsapp", "email", "meeting", "site_visit", "other"]),
        subject: txt(200),
        summary: opt(2000),
        outcome: opt(1000),
        next_follow_up: dateStr.optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const { data: p } = await c.supabase.from("projects").select("customer_id").eq("id", data.project_id).maybeSingle();
    return ok(
      await c.supabase
        .from("customer_communications")
        .insert({ ...data, company_id, customer_id: p?.customer_id ?? null, created_by: c.userId })
        .select("*")
        .single(),
    );
  });

/* ===================== settings & notifications ===================== */

export const getProjectSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const { data } = await c.supabase.from("project_settings").select("*").eq("company_id", company_id).maybeSingle();
    return data ?? null;
  });

export const saveProjectSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        default_warranty_months: z.number().int().min(1).max(240),
        warranty_scope_ar: txt(400),
        warranty_terms_ar: opt(4000),
        claim_response_hours: z.number().int().min(1).max(2000),
        notify_overdue_tasks: z.boolean(),
        notify_pending_approvals: z.boolean(),
        notify_upcoming_installations: z.boolean(),
        notify_upcoming_deliveries: z.boolean(),
        notify_critical_snags: z.boolean(),
        notify_warranty_expiry: z.boolean(),
        warranty_expiry_notice_days: z.number().int().min(1).max(365),
        upcoming_window_days: z.number().int().min(1).max(90),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    return ok(
      await c.supabase
        .from("project_settings")
        .upsert({ ...data, company_id }, { onConflict: "company_id" })
        .select("*")
        .single(),
    );
  });

export const getProjectAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    const { data: s } = await c.supabase.from("project_settings").select("*").eq("company_id", company_id).maybeSingle();
    const cfg = {
      overdue: s?.notify_overdue_tasks ?? true,
      approvals: s?.notify_pending_approvals ?? true,
      installs: s?.notify_upcoming_installations ?? true,
      deliveries: s?.notify_upcoming_deliveries ?? true,
      snags: s?.notify_critical_snags ?? true,
      warranty: s?.notify_warranty_expiry ?? true,
      window: s?.upcoming_window_days ?? 7,
      expiryDays: s?.warranty_expiry_notice_days ?? 30,
    };
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + cfg.window * 86400000).toISOString().slice(0, 10);
    const expirySoon = new Date(Date.now() + cfg.expiryDays * 86400000).toISOString().slice(0, 10);

    const alerts: { kind: string; ar: string; en: string; count: number }[] = [];
    const count = async (table: string, build: (q: any) => any) => {
      const q = build(c.supabase.from(table).select("id", { count: "exact", head: true }));
      const { count: n } = await q;
      return n ?? 0;
    };

    if (cfg.overdue) {
      const n = await count("project_tasks", (q: any) => q.lt("planned_end", today).not("status", "in", '("done","cancelled")'));
      if (n) alerts.push({ kind: "overdue_tasks", ar: "مهام متأخرة عن موعدها", en: "Overdue tasks", count: n });
    }
    if (cfg.approvals) {
      const a = await count("material_approvals", (q: any) => q.eq("status", "submitted"));
      const b = await count("color_sample_approvals", (q: any) => q.eq("status", "submitted"));
      const d = await count("drawing_revisions", (q: any) => q.eq("status", "submitted"));
      if (a + b + d) alerts.push({ kind: "pending_approvals", ar: "اعتمادات معلقة لدى العميل", en: "Approvals awaiting decision", count: a + b + d });
    }
    if (cfg.installs) {
      const n = await count("installation_orders", (q: any) =>
        q.gte("scheduled_date", today).lte("scheduled_date", soon).in("status", ["scheduled", "dispatched"]),
      );
      if (n) alerts.push({ kind: "upcoming_installations", ar: "عمليات تركيب قادمة", en: "Upcoming installations", count: n });
    }
    if (cfg.deliveries) {
      const n = await count("delivery_notes", (q: any) => q.gte("delivery_date", today).lte("delivery_date", soon).eq("status", "draft"));
      if (n) alerts.push({ kind: "upcoming_deliveries", ar: "عمليات تسليم قادمة", en: "Upcoming deliveries", count: n });
    }
    if (cfg.snags) {
      const n = await count("snag_items", (q: any) => q.eq("is_critical", true).not("status", "in", '("verified","waived")'));
      if (n) alerts.push({ kind: "critical_snags", ar: "ملاحظات استلام حرجة مفتوحة", en: "Open critical snags", count: n });
    }
    if (cfg.warranty) {
      const n = await count("warranties", (q: any) => q.eq("status", "active").gte("end_date", today).lte("end_date", expirySoon));
      if (n) alerts.push({ kind: "warranty_expiry", ar: "ضمانات قاربت على الانتهاء", en: "Warranties expiring soon", count: n });
    }
    return alerts;
  });

/** Internal cost reference only — never exposed to portal customers (RLS blocks the source tables). */
export const getProjectCostSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ project_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireStaff(c);
    const [time, visits, project] = await Promise.all([
      c.supabase.from("time_entries").select("hours, total_cost").eq("project_id", data.project_id),
      c.supabase
        .from("service_visits")
        .select("internal_cost, warranty_claims!inner(project_id)")
        .eq("warranty_claims.project_id", data.project_id),
      c.supabase.from("projects").select("budget_amount").eq("id", data.project_id).maybeSingle(),
    ]);
    const labourHours = (time.data ?? []).reduce((s: number, r: any) => s + Number(r.hours ?? 0), 0);
    const labourCost = (time.data ?? []).reduce((s: number, r: any) => s + Number(r.total_cost ?? 0), 0);
    const serviceCost = (visits.data ?? []).reduce((s: number, r: any) => s + Number(r.internal_cost ?? 0), 0);
    return {
      labour_hours: Math.round(labourHours * 100) / 100,
      labour_cost: Math.round(labourCost * 100) / 100,
      service_cost: Math.round(serviceCost * 100) / 100,
      total_cost: Math.round((labourCost + serviceCost) * 100) / 100,
      budget_amount: Number(project.data?.budget_amount ?? 0),
    };
  });

/* ===================== printable documents ===================== */

async function companyRow(c: Ctx) {
  const company_id = await companyOf(c);
  const { data } = await c.supabase.from("companies").select("*").eq("id", company_id).maybeSingle();
  return data ?? null;
}

export const getPrintDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        kind: z.enum(["survey", "installation", "delivery", "handover", "warranty", "service", "approval"]),
        id: uuid,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company = await companyRow(c);
    const sel: Record<string, [string, string]> = {
      survey: ["site_surveys", "*, site_measurements(*), projects(project_number, name_ar, site_address, customers(name_ar, phone, city))"],
      installation: ["installation_orders", "*, installation_teams(name_ar, vehicle_plate), installation_visits(*), projects(project_number, name_ar, customers(name_ar, phone))"],
      delivery: ["delivery_notes", "*, delivery_note_items(*), customers(name_ar, phone), projects(project_number, name_ar), sales_orders(order_number)"],
      handover: ["handover_records", "*, snag_items(*), projects(project_number, name_ar, site_address, customers(name_ar, phone))"],
      warranty: ["warranties", "*, projects(project_number, name_ar, customers(name_ar, phone))"],
      service: ["service_visits", "*, warranty_claims(claim_number, description, projects(project_number, name_ar, customers(name_ar, phone)))"],
      approval: ["material_approvals", "*, projects(project_number, name_ar, customers(name_ar))"],
    };
    const [table, select] = sel[data.kind]!;
    const row = ok(await c.supabase.from(table).select(select).eq("id", data.id).maybeSingle());
    if (!row) throw new Error("DOCUMENT_NOT_FOUND");
    return { company, row };
  });

