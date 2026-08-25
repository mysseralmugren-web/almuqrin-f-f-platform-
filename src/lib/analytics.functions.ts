import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuidOpt = z.string().uuid().optional().nullable();

export const ANALYTICS_EXPORT_REPORTS = [
  "executive",
  "sales",
  "manufacturing",
  "inventory",
  "inventory-shortages",
  "purchasing",
  "finance",
  "hr",
  "hr-departments",
  "projects",
] as const;

export const ANALYTICS_PRINT_REPORTS = [
  "executive",
  "sales",
  "manufacturing",
  "inventory",
  "purchasing",
  "finance",
  "hr",
  "projects",
] as const;

export type AnalyticsExportReport = (typeof ANALYTICS_EXPORT_REPORTS)[number];
export type AnalyticsPrintReport = (typeof ANALYTICS_PRINT_REPORTS)[number];
export type AnalyticsScope = {
  from: string;
  to: string;
  customerId?: string | null;
  departmentId?: string | null;
  projectId?: string | null;
};

const exportReportSchema = z.enum(ANALYTICS_EXPORT_REPORTS);
const printReportSchema = z.enum(ANALYTICS_PRINT_REPORTS);
const scopeSchema = z
  .object({
    from: dateStr,
    to: dateStr,
    customerId: uuidOpt,
    departmentId: uuidOpt,
    projectId: uuidOpt,
  })
  .strict()
  .refine((scope) => scope.from <= scope.to, { message: "INVALID_DATE_RANGE" });

const reportFilterKey: Partial<Record<AnalyticsExportReport, keyof AnalyticsScope>> = {
  sales: "customerId",
  hr: "departmentId",
  "hr-departments": "departmentId",
  projects: "projectId",
};

function validateScopeForReport(
  report: AnalyticsExportReport,
  scope: AnalyticsScope,
  ctx: z.RefinementCtx,
) {
  for (const key of ["customerId", "departmentId", "projectId"] as const) {
    if (scope[key] != null && reportFilterKey[report] !== key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "INVALID_SCOPE_FOR_REPORT",
        path: ["scope", key],
      });
    }
  }
}

const exportRequestSchema = z
  .object({ report: exportReportSchema, format: z.enum(["csv", "pdf"]), scope: scopeSchema })
  .strict()
  .superRefine((value, ctx) => validateScopeForReport(value.report, value.scope, ctx));

const printRequestSchema = z
  .object({ report: printReportSchema, scope: scopeSchema })
  .strict()
  .superRefine((value, ctx) => validateScopeForReport(value.report, value.scope, ctx));

const rangeSchema = z.object({ from: dateStr, to: dateStr });
const rangeCustomer = rangeSchema.extend({ customerId: uuidOpt });
const rangeDept = rangeSchema.extend({ departmentId: uuidOpt });
const rangeProject = rangeSchema.extend({ projectId: uuidOpt });

async function rpc(c: Ctx, fn: string, args: Record<string, unknown>) {
  const { data, error } = await c.supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, any>;
}

export const executiveAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(({ data, context }) =>
    rpc(context as Ctx, "analytics_executive", { _from: data.from, _to: data.to }),
  );

export const salesAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeCustomer.parse(d))
  .handler(({ data, context }) =>
    rpc(context as Ctx, "analytics_sales", {
      _from: data.from,
      _to: data.to,
      _customer_id: data.customerId ?? null,
    }),
  );

export const manufacturingAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(({ data, context }) =>
    rpc(context as Ctx, "analytics_manufacturing", { _from: data.from, _to: data.to }),
  );

export const inventoryAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(({ data, context }) =>
    rpc(context as Ctx, "analytics_inventory", { _from: data.from, _to: data.to }),
  );

export const purchasingAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(({ data, context }) =>
    rpc(context as Ctx, "analytics_purchasing", { _from: data.from, _to: data.to }),
  );

export const financeAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(({ data, context }) =>
    rpc(context as Ctx, "analytics_finance", { _from: data.from, _to: data.to }),
  );

export const hrAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeDept.parse(d))
  .handler(({ data, context }) =>
    rpc(context as Ctx, "analytics_hr", {
      _from: data.from,
      _to: data.to,
      _department_id: data.departmentId ?? null,
    }),
  );

export const projectsAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeProject.parse(d))
  .handler(({ data, context }) =>
    rpc(context as Ctx, "analytics_projects", {
      _from: data.from,
      _to: data.to,
      _project_id: data.projectId ?? null,
    }),
  );

/** Filter option lists (company-scoped through RLS) + the viewer's effective analytics permissions. */
export const analyticsContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const [customers, departments, projects, roles, costs, finance, hr] = await Promise.all([
      c.supabase
        .from("customers")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("name_ar")
        .limit(500),
      c.supabase
        .from("departments")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("name_ar")
        .limit(200),
      c.supabase
        .from("projects")
        .select("id, project_number, name_ar")
        .order("created_at", { ascending: false })
        .limit(200),
      c.supabase.from("user_roles").select("role").eq("user_id", c.userId),
      c.supabase.rpc("analytics_can_view_costs"),
      c.supabase.rpc("analytics_can_view_finance"),
      c.supabase.rpc("analytics_can_view_hr"),
    ]);
    return {
      customers: customers.data ?? [],
      departments: departments.data ?? [],
      projects: projects.data ?? [],
      roles: (roles.data ?? []).map((r: { role: string }) => r.role),
      canViewCosts: Boolean(costs.data),
      canViewFinance: Boolean(finance.data),
      canViewHr: Boolean(hr.data),
    };
  });

/** Audit trail for every CSV/PDF export. */
export const logAnalyticsExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => exportRequestSchema.parse(d))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { error } = await c.supabase.rpc("analytics_log_export", {
      _report: data.report,
      _format: data.format,
      _scope: data.scope,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const printRpc: Record<AnalyticsPrintReport, string> = {
  executive: "analytics_executive",
  sales: "analytics_sales",
  manufacturing: "analytics_manufacturing",
  inventory: "analytics_inventory",
  purchasing: "analytics_purchasing",
  finance: "analytics_finance",
  hr: "analytics_hr",
  projects: "analytics_projects",
};

function printRpcArgs(report: AnalyticsPrintReport, scope: AnalyticsScope) {
  const args: Record<string, unknown> = { _from: scope.from, _to: scope.to };
  if (report === "sales") args._customer_id = scope.customerId ?? null;
  if (report === "hr") args._department_id = scope.departmentId ?? null;
  if (report === "projects") args._project_id = scope.projectId ?? null;
  return args;
}

/**
 * Builds a fresh, permission-scoped report snapshot on the server. The audit
 * insert must succeed before any snapshot is returned to the printable route.
 */
export const analyticsPrintSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => printRequestSchema.parse(d))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const snapshot = await rpc(c, printRpc[data.report], printRpcArgs(data.report, data.scope));

    const { data: profile, error: profileError } = await c.supabase
      .from("profiles")
      .select("company_id")
      .eq("id", c.userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile?.company_id) throw new Error("NO_COMPANY");

    const { data: company, error: companyError } = await c.supabase
      .from("companies")
      .select(
        "id, name_ar, name_en, vat_number, cr_number, address_building_no, address_street, address_district, address_city, address_postal_code, phone, email",
      )
      .eq("id", profile.company_id)
      .maybeSingle();
    if (companyError) throw new Error(companyError.message);

    const { error: auditError } = await c.supabase.rpc("analytics_log_export", {
      _report: data.report,
      _format: "pdf",
      _scope: data.scope,
    });
    if (auditError) throw new Error(auditError.message);

    return { report: data.report, scope: data.scope, snapshot, company };
  });
