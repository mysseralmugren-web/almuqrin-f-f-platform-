import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

const ADMIN = ["super_admin", "factory_owner", "general_manager"] as const;
const HR = [...ADMIN, "hr"] as const;
const PAYROLL = [...ADMIN, "hr", "accountant"] as const;

const uuid = z.string().uuid();
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().nonnegative().max(100_000_000);
const r2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

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

async function requireHr(c: Ctx) {
  const roles = await rolesOf(c);
  if (!roles.some((r) => (HR as readonly string[]).includes(r))) throw new Error("FORBIDDEN_HR");
  return roles;
}

async function requirePayroll(c: Ctx) {
  const roles = await rolesOf(c);
  if (!roles.some((r) => (PAYROLL as readonly string[]).includes(r))) throw new Error("FORBIDDEN_PAYROLL");
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

/* ===================== Access snapshot ===================== */

export const getHrAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const roles = await rolesOf(c);
    const { data: me } = await c.supabase
      .from("employees")
      .select("id, employee_number, full_name_ar, department_id, job_title_id, status")
      .eq("user_id", c.userId)
      .maybeSingle();
    const { count } = await c.supabase.from("employees").select("id", { count: "exact", head: true }).eq("manager_id", me?.id ?? "00000000-0000-0000-0000-000000000000");
    return {
      roles,
      isHr: roles.some((r) => (HR as readonly string[]).includes(r)),
      isPayroll: roles.some((r) => (PAYROLL as readonly string[]).includes(r)),
      isAdmin: roles.some((r) => (ADMIN as readonly string[]).includes(r)),
      employee: me ?? null,
      directReports: count ?? 0,
    };
  });

/* ===================== Org structure ===================== */

export const listOrg = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const [dep, jt, wl] = await Promise.all([
      c.supabase.from("departments").select("*").order("code"),
      c.supabase.from("job_titles").select("*").order("code"),
      c.supabase.from("work_locations").select("*").order("code"),
    ]);
    if (dep.error) throw new Error(dep.error.message);
    return { departments: dep.data ?? [], job_titles: jt.data ?? [], work_locations: wl.data ?? [] };
  });

const orgInput = z.object({
  id: uuid.optional(),
  code: z.string().trim().min(1).max(30),
  name_ar: z.string().trim().min(2).max(160),
  name_en: z.string().trim().max(160).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const saveDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    orgInput.extend({ parent_id: uuid.optional().nullable(), manager_employee_id: uuid.optional().nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { id, ...patch } = data;
    const row = { ...patch, parent_id: patch.parent_id || null, manager_employee_id: patch.manager_employee_id || null, company_id };
    const { error } = id
      ? await c.supabase.from("departments").update(row).eq("id", id)
      : await c.supabase.from("departments").insert(row);
    if (error) throw new Error(error.code === "23505" ? "CODE_DUPLICATE" : error.message);
    return { ok: true };
  });

export const saveJobTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => orgInput.extend({ grade: z.string().max(40).optional().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { id, ...patch } = data;
    const { error } = id
      ? await c.supabase.from("job_titles").update({ ...patch, company_id }).eq("id", id)
      : await c.supabase.from("job_titles").insert({ ...patch, company_id });
    if (error) throw new Error(error.code === "23505" ? "CODE_DUPLICATE" : error.message);
    return { ok: true };
  });

export const saveWorkLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => orgInput.extend({ address: z.string().max(300).optional().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { id, ...patch } = data;
    const { error } = id
      ? await c.supabase.from("work_locations").update({ ...patch, company_id }).eq("id", id)
      : await c.supabase.from("work_locations").insert({ ...patch, company_id, timezone: "Asia/Riyadh" });
    if (error) throw new Error(error.code === "23505" ? "CODE_DUPLICATE" : error.message);
    return { ok: true };
  });

/* ===================== Employees ===================== */

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        q: z.string().max(120).optional(),
        status: z.string().max(30).optional(),
        department_id: uuid.optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("employees")
      .select(
        "id, employee_number, full_name_ar, full_name_en, nationality, phone, email, status, join_date, end_date, id_expiry_date, department_id, job_title_id, manager_id, work_location_id",
      )
      .order("employee_number");
    if (data.status) q = q.eq("status", data.status);
    if (data.department_id) q = q.eq("department_id", data.department_id);
    if (data.q) q = q.or(`full_name_ar.ilike.%${data.q}%,full_name_en.ilike.%${data.q}%,employee_number.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: emp, error } = await c.supabase.from("employees").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!emp) throw new Error("EMPLOYEE_NOT_FOUND");
    const [{ data: sensitive }, { data: contracts }, { data: docs }, { data: gosi }] = await Promise.all([
      c.supabase.from("employee_sensitive").select("*").eq("employee_id", data.id).maybeSingle(),
      c.supabase.from("employee_contracts").select("*").eq("employee_id", data.id).order("start_date", { ascending: false }),
      c.supabase.from("employee_documents").select("*").eq("employee_id", data.id).order("expiry_date"),
      c.supabase.from("gosi_profiles").select("*").eq("employee_id", data.id).maybeSingle(),
    ]);
    return { employee: emp, sensitive: sensitive ?? null, contracts: contracts ?? [], documents: docs ?? [], gosi: gosi ?? null };
  });

const employeeInput = z.object({
  full_name_ar: z.string().trim().min(3).max(160),
  full_name_en: z.string().trim().max(160).optional().nullable(),
  nationality: z.string().trim().max(60).optional().nullable(),
  id_type: z.enum(["national_id", "iqama", "passport", "visa", "other"]).optional().nullable(),
  id_issue_date: dateStr.optional().nullable(),
  id_expiry_date: dateStr.optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  birth_date: dateStr.optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  department_id: uuid.optional().nullable(),
  job_title_id: uuid.optional().nullable(),
  work_location_id: uuid.optional().nullable(),
  manager_id: uuid.optional().nullable(),
  join_date: dateStr,
  end_date: dateStr.optional().nullable(),
  status: z.enum(["active", "probation", "on_leave", "suspended", "terminated", "resigned"]).default("active"),
  notes: z.string().max(1000).optional().nullable(),
  national_id: z.string().trim().max(30).optional().nullable(),
  bank_name: z.string().trim().max(120).optional().nullable(),
  iban: z.string().trim().max(40).optional().nullable(),
});

function splitEmployee(input: z.infer<typeof employeeInput>) {
  const { national_id, bank_name, iban, ...rest } = input;
  const clean: Record<string, unknown> = { ...rest };
  for (const k of Object.keys(clean)) if (clean[k] === "") clean[k] = null;
  return { core: clean, sensitive: { national_id: national_id || null, bank_name: bank_name || null, iban: iban || null } };
}

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => employeeInput.parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { core, sensitive } = splitEmployee(data);
    const employee_number = await nextNumber(company_id, "employee", "EMP");
    const { data: row, error } = await c.supabase
      .from("employees")
      .insert({ ...core, company_id, employee_number, created_by: c.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (sensitive.national_id || sensitive.iban || sensitive.bank_name) {
      const { error: sErr } = await c.supabase
        .from("employee_sensitive")
        .insert({ employee_id: row.id, company_id, ...sensitive });
      if (sErr) throw new Error(sErr.message);
    }
    return { id: row.id as string, employee_number };
  });

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => employeeInput.partial().extend({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { id, ...rest } = data;
    const { core, sensitive } = splitEmployee(rest as z.infer<typeof employeeInput>);
    const { error } = await c.supabase.from("employees").update(core).eq("id", id);
    if (error) throw new Error(error.message);
    const hasSensitive = "national_id" in rest || "iban" in rest || "bank_name" in rest;
    if (hasSensitive) {
      const { error: sErr } = await c.supabase
        .from("employee_sensitive")
        .upsert({ employee_id: id, company_id, ...sensitive }, { onConflict: "employee_id" });
      if (sErr) throw new Error(sErr.message);
    }
    return { ok: true };
  });

export const linkEmployeeUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ employee_id: uuid, user_id: uuid.nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const { error } = await c.supabase.from("employees").update({ user_id: data.user_id }).eq("id", data.employee_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===================== Contracts ===================== */

export const listContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ employee_id: uuid.optional(), status: z.string().optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("employee_contracts")
      .select("*, employees!inner(id, employee_number, full_name_ar)")
      .order("start_date", { ascending: false });
    if (data.employee_id) q = q.eq("employee_id", data.employee_id);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const contractInput = z.object({
  employee_id: uuid,
  contract_type: z.enum(["permanent", "fixed_term", "part_time", "temporary", "trainee"]).default("permanent"),
  start_date: dateStr,
  end_date: dateStr.optional().nullable(),
  probation_days: z.number().int().min(0).max(365).default(90),
  basic_salary: money,
  housing_allowance: money.default(0),
  transport_allowance: money.default(0),
  other_allowance: money.default(0),
  working_hours_per_day: z.number().min(1).max(16).default(8),
  working_days_per_week: z.number().int().min(1).max(7).default(6),
  annual_leave_days: z.number().int().min(0).max(90).default(21),
  clauses_override: z.string().max(8000).optional().nullable(),
});

export const createContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => contractInput.parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const contract_number = await nextNumber(company_id, "employee_contract", "CON");
    const { data: row, error } = await c.supabase
      .from("employee_contracts")
      .insert({ ...data, end_date: data.end_date || null, company_id, contract_number, created_by: c.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, contract_number };
  });

export const setContractStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: uuid, status: z.enum(["draft", "active", "expired", "terminated", "cancelled"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const { error } = await c.supabase.from("employee_contracts").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getContractForPrint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: contract, error } = await c.supabase
      .from("employee_contracts")
      .select("*, employees!inner(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!contract) throw new Error("NOT_FOUND");
    const [{ data: company }, { data: settings }, { data: jt }] = await Promise.all([
      c.supabase.from("companies").select("*").maybeSingle(),
      c.supabase.from("hr_settings").select("contract_clauses_ar").maybeSingle(),
      c.supabase.from("job_titles").select("name_ar").eq("id", contract.employees.job_title_id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
    ]);
    return { contract, company: company ?? null, clauses: settings?.contract_clauses_ar ?? null, job_title: jt?.name_ar ?? null };
  });

/* ===================== Shifts & attendance ===================== */

export const listShifts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const [{ data: shifts }, { data: assignments }] = await Promise.all([
      c.supabase.from("shifts").select("*").order("code"),
      c.supabase.from("employee_shift_assignments").select("*, employees!inner(employee_number, full_name_ar)").order("start_date", { ascending: false }),
    ]);
    return { shifts: shifts ?? [], assignments: assignments ?? [] };
  });

export const saveShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid.optional(),
        code: z.string().trim().min(1).max(30),
        name_ar: z.string().trim().min(2).max(120),
        name_en: z.string().trim().max(120).optional().nullable(),
        start_time: z.string().regex(/^\d{2}:\d{2}$/),
        end_time: z.string().regex(/^\d{2}:\d{2}$/),
        break_minutes: z.number().int().min(0).max(480).default(60),
        grace_minutes: z.number().int().min(0).max(120).default(10),
        crosses_midnight: z.boolean().default(false),
        is_active: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { id, ...patch } = data;
    const { error } = id
      ? await c.supabase.from("shifts").update(patch).eq("id", id)
      : await c.supabase.from("shifts").insert({ ...patch, company_id });
    if (error) throw new Error(error.code === "23505" ? "CODE_DUPLICATE" : error.message);
    return { ok: true };
  });

export const assignShift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ employee_id: uuid, shift_id: uuid, start_date: dateStr, end_date: dateStr.optional().nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase
      .from("employee_shift_assignments")
      .insert({ ...data, end_date: data.end_date || null, company_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ from: dateStr, to: dateStr, employee_id: uuid.optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("attendance_records")
      .select("*, employees!inner(employee_number, full_name_ar)")
      .gte("work_date", data.from)
      .lte("work_date", data.to)
      .order("work_date", { ascending: false });
    if (data.employee_id) q = q.eq("employee_id", data.employee_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        employee_id: uuid,
        work_date: dateStr,
        check_in: z.string().datetime().optional().nullable(),
        check_out: z.string().datetime().optional().nullable(),
        status: z.enum(["present", "absent", "late", "on_leave", "holiday", "weekend"]).default("present"),
        is_manual: z.boolean().default(true),
        manual_reason: z.string().max(300).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase.from("attendance_records").upsert(
      {
        ...data,
        check_in: data.check_in || null,
        check_out: data.check_out || null,
        company_id,
        created_by: c.userId,
        approved_by: data.is_manual ? c.userId : null,
        approved_at: data.is_manual ? new Date().toISOString() : null,
      },
      { onConflict: "employee_id,work_date" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===================== Leaves ===================== */

export const listLeaveData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ year: z.number().int().min(2000).max(2200).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const year = data.year ?? new Date().getUTCFullYear();
    const [{ data: types }, { data: balances }, { data: requests }] = await Promise.all([
      c.supabase.from("leave_types").select("*").order("code"),
      c.supabase.from("leave_balances").select("*, employees!inner(employee_number, full_name_ar)").eq("year", year),
      c.supabase
        .from("leave_requests")
        .select("*, employees!inner(employee_number, full_name_ar), leave_types!inner(name_ar, name_en)")
        .order("start_date", { ascending: false }),
    ]);
    return { year, types: types ?? [], balances: balances ?? [], requests: requests ?? [] };
  });

export const saveLeaveType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid.optional(),
        code: z.string().trim().min(1).max(30),
        name_ar: z.string().trim().min(2).max(120),
        name_en: z.string().trim().max(120).optional().nullable(),
        default_days_per_year: z.number().min(0).max(365).default(0),
        is_paid: z.boolean().default(true),
        requires_attachment: z.boolean().default(false),
        allow_carry_over: z.boolean().default(false),
        max_carry_over_days: z.number().min(0).max(365).default(0),
        is_active: z.boolean().default(true),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { id, ...patch } = data;
    const { error } = id
      ? await c.supabase.from("leave_types").update(patch).eq("id", id)
      : await c.supabase.from("leave_types").insert({ ...patch, company_id });
    if (error) throw new Error(error.code === "23505" ? "CODE_DUPLICATE" : error.message);
    return { ok: true };
  });

export const saveLeaveBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        employee_id: uuid,
        leave_type_id: uuid,
        year: z.number().int().min(2000).max(2200),
        entitled_days: z.number().min(0).max(365),
        carried_days: z.number().min(0).max(365).default(0),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase
      .from("leave_balances")
      .upsert({ ...data, company_id }, { onConflict: "employee_id,leave_type_id,year" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createLeaveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        employee_id: uuid.optional(),
        leave_type_id: uuid,
        start_date: dateStr,
        end_date: dateStr,
        reason: z.string().max(500).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const company_id = await companyOf(c);
    let employee_id = data.employee_id;
    if (!employee_id) {
      const { data: me } = await c.supabase.from("employees").select("id").eq("user_id", c.userId).maybeSingle();
      if (!me) throw new Error("EMPLOYEE_NOT_FOUND");
      employee_id = me.id;
    }
    const days =
      Math.floor((Date.parse(data.end_date) - Date.parse(data.start_date)) / 86400000) + 1;
    const request_number = await nextNumber(company_id, "leave_request", "LV");
    const { error } = await c.supabase.from("leave_requests").insert({
      company_id,
      employee_id,
      leave_type_id: data.leave_type_id,
      request_number,
      start_date: data.start_date,
      end_date: data.end_date,
      days,
      reason: data.reason ?? null,
      status: "submitted",
      created_by: c.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true, request_number, days };
  });

export const setLeaveStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["approved", "rejected", "cancelled"]),
        rejection_reason: z.string().max(300).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { error } = await c.supabase
      .from("leave_requests")
      .update({ status: data.status, rejection_reason: data.rejection_reason ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===================== Custodies ===================== */

export const listCustodies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ employee_id: uuid.optional(), status: z.string().optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("employee_custodies")
      .select("*, employees!inner(employee_number, full_name_ar)")
      .order("issued_date", { ascending: false });
    if (data.employee_id) q = q.eq("employee_id", data.employee_id);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createCustody = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        employee_id: uuid,
        category: z.enum(["tool", "device", "sim", "vehicle", "uniform", "other"]).default("tool"),
        item_name: z.string().trim().min(2).max(160),
        serial_number: z.string().trim().max(80).optional().nullable(),
        quantity: z.number().positive().max(100000).default(1),
        estimated_value: money.default(0),
        issued_date: dateStr,
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const custody_number = await nextNumber(company_id, "employee_custody", "CUS");
    const { error } = await c.supabase
      .from("employee_custodies")
      .insert({ ...data, company_id, custody_number, created_by: c.userId });
    if (error) throw new Error(error.message);
    return { ok: true, custody_number };
  });

export const setCustodyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["issued", "returned", "lost", "damaged"]),
        returned_date: dateStr.optional().nullable(),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const { id, ...patch } = data;
    const { error } = await c.supabase
      .from("employee_custodies")
      .update({ ...patch, returned_date: patch.returned_date || null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===================== Documents (private storage) ===================== */

const BUCKET = "mfg-attachments";
const safeName = (n: string) => n.replace(/[^\w.\-\u0600-\u06FF]/g, "_").slice(-80);

export const createEmployeeDocUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ employee_id: uuid, file_name: z.string().trim().min(1).max(160) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const path = `${company_id}/hr/${data.employee_id}/${crypto.randomUUID()}-${safeName(data.file_name)}`;
    const { data: signed, error } = await c.supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signed_url: signed.signedUrl };
  });

export const registerEmployeeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        employee_id: uuid,
        document_type: z.enum([
          "national_id", "iqama", "passport", "visa", "contract", "certificate", "medical", "license", "other",
        ]),
        title: z.string().trim().min(1).max(160),
        object_path: z.string().min(1).max(400),
        file_name: z.string().min(1).max(160),
        content_type: z.string().max(120).optional().nullable(),
        size_bytes: z.number().int().nonnegative().max(50 * 1024 * 1024).optional().nullable(),
        issue_date: dateStr.optional().nullable(),
        expiry_date: dateStr.optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    if (!data.object_path.startsWith(`${company_id}/`)) throw new Error("PATH_OUTSIDE_COMPANY");
    const { error } = await c.supabase
      .from("employee_documents")
      .insert({ ...data, issue_date: data.issue_date || null, expiry_date: data.expiry_date || null, company_id, created_by: c.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getEmployeeDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ document_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: doc, error } = await c.supabase
      .from("employee_documents")
      .select("object_path")
      .eq("id", data.document_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("NOT_FOUND");
    const { data: signed, error: sErr } = await c.supabase.storage.from(BUCKET).createSignedUrl(doc.object_path, 300);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, expires_in: 300 };
  });

export const listExpiringDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ days: z.number().int().min(1).max(365).default(60) }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const limit = new Date(Date.now() + data.days * 86400000).toISOString().slice(0, 10);
    const [{ data: docs }, { data: emps }, { data: contracts }] = await Promise.all([
      c.supabase
        .from("employee_documents")
        .select("id, title, document_type, expiry_date, employee_id, employees!inner(employee_number, full_name_ar)")
        .not("expiry_date", "is", null)
        .lte("expiry_date", limit)
        .order("expiry_date"),
      c.supabase
        .from("employees")
        .select("id, employee_number, full_name_ar, id_type, id_expiry_date")
        .not("id_expiry_date", "is", null)
        .lte("id_expiry_date", limit)
        .order("id_expiry_date"),
      c.supabase
        .from("employee_contracts")
        .select("id, contract_number, end_date, employees!inner(employee_number, full_name_ar)")
        .eq("status", "active")
        .not("end_date", "is", null)
        .lte("end_date", limit)
        .order("end_date"),
    ]);
    return { documents: docs ?? [], identities: emps ?? [], contracts: contracts ?? [] };
  });

/* ===================== HR / GOSI settings ===================== */

export const getHrSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const [{ data: settings }, { data: gosi }, { data: accounts }] = await Promise.all([
      c.supabase.from("hr_settings").select("*").maybeSingle(),
      c.supabase.from("gosi_settings").select("*").order("effective_from", { ascending: false }),
      c.supabase.from("chart_of_accounts").select("id, code, name_ar, is_postable, is_active").eq("is_postable", true).eq("is_active", true).order("code"),
    ]);
    return { settings: settings ?? null, gosi: gosi ?? [], accounts: accounts ?? [] };
  });

export const saveHrSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        salary_expense_account_id: uuid.optional().nullable(),
        allowances_expense_account_id: uuid.optional().nullable(),
        gosi_expense_account_id: uuid.optional().nullable(),
        gosi_payable_account_id: uuid.optional().nullable(),
        payroll_payable_account_id: uuid.optional().nullable(),
        advances_account_id: uuid.optional().nullable(),
        default_probation_days: z.number().int().min(0).max(365).default(90),
        overtime_rate_multiplier: z.number().min(1).max(5).default(1.5),
        working_days_per_month: z.number().int().min(20).max(31).default(30),
        contract_clauses_ar: z.string().max(20000).optional().nullable(),
        wps_bank_code: z.string().max(40).optional().nullable(),
        wps_establishment_id: z.string().max(40).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const patch: Record<string, unknown> = { ...data, company_id };
    for (const k of Object.keys(patch)) if (patch[k] === "") patch[k] = null;
    const { error } = await c.supabase.from("hr_settings").upsert(patch, { onConflict: "company_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveGosiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        effective_from: dateStr,
        saudi_employee_rate: z.number().min(0).max(100),
        saudi_employer_rate: z.number().min(0).max(100),
        expat_employee_rate: z.number().min(0).max(100),
        expat_employer_rate: z.number().min(0).max(100),
        ceiling_amount: money.default(0),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase
      .from("gosi_settings")
      .upsert({ ...data, company_id }, { onConflict: "company_id,effective_from" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveGosiProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        employee_id: uuid,
        is_registered: z.boolean().default(false),
        is_saudi: z.boolean().default(false),
        gosi_number: z.string().max(40).optional().nullable(),
        contribution_base: money.optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireHr(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase
      .from("gosi_profiles")
      .upsert({ ...data, company_id }, { onConflict: "employee_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===================== Payroll ===================== */

export const listPayroll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const [{ data: periods }, { data: runs }, { data: adjustments }] = await Promise.all([
      c.supabase.from("payroll_periods").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
      c.supabase.from("payroll_runs").select("*").order("created_at", { ascending: false }),
      c.supabase
        .from("payroll_adjustments")
        .select("*, employees!inner(employee_number, full_name_ar)")
        .is("applied_run_id", null)
        .order("created_at", { ascending: false }),
    ]);
    return { periods: periods ?? [], runs: runs ?? [], adjustments: adjustments ?? [] };
  });

export const createPayrollPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ year: z.number().int().min(2000).max(2200), month: z.number().int().min(1).max(12), pay_date: dateStr.optional().nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requirePayroll(c);
    const company_id = await companyOf(c);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = new Date(Date.UTC(data.year, data.month - 1, 1));
    const end = new Date(Date.UTC(data.year, data.month, 0));
    const { error } = await c.supabase.from("payroll_periods").insert({
      company_id,
      year: data.year,
      month: data.month,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      pay_date: data.pay_date || end.toISOString().slice(0, 10),
    });
    if (error) throw new Error(error.code === "23505" ? "PERIOD_EXISTS" : error.message);
    return { ok: true };
  });

export const createPayrollAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        employee_id: uuid,
        kind: z.enum(["allowance", "deduction", "advance"]),
        label: z.string().trim().min(2).max(160),
        amount: z.number().positive().max(10_000_000),
        period_id: uuid.optional().nullable(),
        notes: z.string().max(400).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requirePayroll(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase
      .from("payroll_adjustments")
      .insert({ ...data, period_id: data.period_id || null, company_id, created_by: c.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generatePayrollRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ period_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requirePayroll(c);
    const company_id = await companyOf(c);

    const { data: period } = await c.supabase.from("payroll_periods").select("*").eq("id", data.period_id).maybeSingle();
    if (!period) throw new Error("PERIOD_NOT_FOUND");
    if (period.is_closed) throw new Error("PERIOD_CLOSED");

    const { data: existing } = await c.supabase
      .from("payroll_runs")
      .select("id, status")
      .eq("period_id", data.period_id)
      .in("status", ["draft", "calculated", "approved", "paid"])
      .maybeSingle();
    if (existing) throw new Error("PAYROLL_RUN_EXISTS");

    const [{ data: settings }, { data: gosiRates }, { data: contracts }] = await Promise.all([
      c.supabase.from("hr_settings").select("*").maybeSingle(),
      c.supabase
        .from("gosi_settings")
        .select("*")
        .lte("effective_from", period.end_date)
        .order("effective_from", { ascending: false })
        .limit(1),
      c.supabase
        .from("employee_contracts")
        .select("*, employees!inner(id, employee_number, status)")
        .eq("status", "active")
        .lte("start_date", period.end_date),
    ]);

    const eligible = (contracts ?? []).filter(
      (ct: any) =>
        (!ct.end_date || ct.end_date >= period.start_date) &&
        ["active", "probation", "on_leave"].includes(ct.employees.status),
    );
    if (eligible.length === 0) throw new Error("NO_ELIGIBLE_EMPLOYEES");

    const rates = (gosiRates ?? [])[0] ?? null;
    const wdm = settings?.working_days_per_month ?? 30;
    const otMul = Number(settings?.overtime_rate_multiplier ?? 1.5);

    const empIds = eligible.map((ct: any) => ct.employee_id);
    const [{ data: attendance }, { data: adjustments }, { data: gosiProfiles }, { data: sensitive }] = await Promise.all([
      c.supabase
        .from("attendance_records")
        .select("employee_id, status, overtime_minutes")
        .gte("work_date", period.start_date)
        .lte("work_date", period.end_date)
        .in("employee_id", empIds),
      c.supabase
        .from("payroll_adjustments")
        .select("*")
        .is("applied_run_id", null)
        .in("employee_id", empIds),
      c.supabase.from("gosi_profiles").select("*").in("employee_id", empIds),
      c.supabase.from("employee_sensitive").select("employee_id, iban").in("employee_id", empIds),
    ]);

    const run_number = await nextNumber(company_id, "payroll_run", "PAY");
    const { data: run, error: runErr } = await c.supabase
      .from("payroll_runs")
      .insert({
        company_id,
        period_id: data.period_id,
        run_number,
        status: "draft",
        gosi_snapshot: rates ?? null,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (runErr) throw new Error(runErr.code === "23505" ? "PAYROLL_RUN_EXISTS" : runErr.message);

    const items = eligible.map((ct: any) => {
      const eid = ct.employee_id as string;
      const att = (attendance ?? []).filter((a: any) => a.employee_id === eid);
      const otMinutes = att.reduce((s: number, a: any) => s + Number(a.overtime_minutes ?? 0), 0);
      const absentDays = att.filter((a: any) => a.status === "absent").length;
      const basic = Number(ct.basic_salary ?? 0);
      const dayRate = wdm > 0 ? basic / wdm : 0;
      const hourRate = Number(ct.working_hours_per_day ?? 8) > 0 ? dayRate / Number(ct.working_hours_per_day ?? 8) : 0;
      const overtime_amount = r2((otMinutes / 60) * hourRate * otMul);
      const absence_deduction = r2(absentDays * dayRate);

      const adj = (adjustments ?? []).filter(
        (a: any) => a.employee_id === eid && (!a.period_id || a.period_id === data.period_id),
      );
      const extraAllowance = r2(adj.filter((a: any) => a.kind === "allowance").reduce((s: number, a: any) => s + Number(a.amount), 0));
      const extraDeduction = r2(adj.filter((a: any) => a.kind === "deduction").reduce((s: number, a: any) => s + Number(a.amount), 0));
      const advances = r2(adj.filter((a: any) => a.kind === "advance").reduce((s: number, a: any) => s + Number(a.amount), 0));

      const gp = (gosiProfiles ?? []).find((g: any) => g.employee_id === eid);
      let gosi_employee = 0;
      let gosi_employer = 0;
      if (rates && gp?.is_registered) {
        let base = Number(gp.contribution_base ?? basic + Number(ct.housing_allowance ?? 0));
        if (Number(rates.ceiling_amount) > 0) base = Math.min(base, Number(rates.ceiling_amount));
        const er = gp.is_saudi ? Number(rates.saudi_employee_rate) : Number(rates.expat_employee_rate);
        const cr = gp.is_saudi ? Number(rates.saudi_employer_rate) : Number(rates.expat_employer_rate);
        gosi_employee = r2((base * er) / 100);
        gosi_employer = r2((base * cr) / 100);
      }

      return {
        company_id,
        payroll_run_id: run.id,
        employee_id: eid,
        contract_id: ct.id,
        basic_salary: basic,
        housing_allowance: Number(ct.housing_allowance ?? 0),
        transport_allowance: Number(ct.transport_allowance ?? 0),
        other_allowance: r2(Number(ct.other_allowance ?? 0) + extraAllowance),
        overtime_amount,
        overtime_minutes: otMinutes,
        absence_deduction,
        late_deduction: 0,
        other_deductions: extraDeduction,
        advances,
        gosi_employee,
        gosi_employer,
        iban_snapshot: (sensitive ?? []).find((s: any) => s.employee_id === eid)?.iban ?? null,
      };
    });

    const { error: itemsErr } = await c.supabase.from("payroll_items").insert(items);
    if (itemsErr) {
      await c.supabase.from("payroll_runs").delete().eq("id", run.id);
      throw new Error(itemsErr.message);
    }

    const usedAdjIds = (adjustments ?? [])
      .filter((a: any) => !a.period_id || a.period_id === data.period_id)
      .map((a: any) => a.id);
    if (usedAdjIds.length > 0) {
      await c.supabase.from("payroll_adjustments").update({ applied_run_id: run.id }).in("id", usedAdjIds);
    }

    await c.supabase.from("payroll_runs").update({ status: "calculated" }).eq("id", run.id);
    return { id: run.id as string, run_number, employees: items.length };
  });

export const getPayrollRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const [{ data: run }, { data: items }] = await Promise.all([
      c.supabase.from("payroll_runs").select("*, payroll_periods!inner(year, month, start_date, end_date, pay_date)").eq("id", data.id).maybeSingle(),
      c.supabase
        .from("payroll_items")
        .select("*, employees!inner(employee_number, full_name_ar, full_name_en)")
        .eq("payroll_run_id", data.id)
        .order("created_at"),
    ]);
    if (!run) throw new Error("NOT_FOUND");
    return { run, items: items ?? [] };
  });

export const approvePayrollRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requirePayroll(c);
    const { error } = await c.supabase.from("payroll_runs").update({ status: "approved" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelPayrollRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requirePayroll(c);
    const { error } = await c.supabase.from("payroll_runs").update({ status: "cancelled" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Idempotent payroll journal entry through Module 06 linkage (source_type = payroll_run). */
export const postPayrollRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requirePayroll(c);
    const company_id = await companyOf(c);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: run } = await c.supabase
      .from("payroll_runs")
      .select("*, payroll_periods!inner(pay_date, end_date, year, month)")
      .eq("id", data.id)
      .maybeSingle();
    if (!run) throw new Error("NOT_FOUND");
    if (!["approved", "paid"].includes(run.status)) throw new Error("PAYROLL_NOT_APPROVED");
    if (run.journal_entry_id) throw new Error("PAYROLL_ALREADY_POSTED");

    const { data: existing } = await supabaseAdmin
      .from("journal_entries")
      .select("id")
      .eq("company_id", company_id)
      .eq("source_type", "payroll_run")
      .eq("source_id", run.id)
      .neq("status", "reversed")
      .maybeSingle();
    if (existing) {
      await c.supabase.from("payroll_runs").update({ journal_entry_id: existing.id }).eq("id", run.id);
      throw new Error("PAYROLL_ALREADY_POSTED");
    }

    const { data: s } = await c.supabase.from("hr_settings").select("*").maybeSingle();
    if (!s?.salary_expense_account_id || !s?.payroll_payable_account_id) {
      throw new Error("PAYROLL_ACCOUNTS_NOT_CONFIGURED");
    }
    const gosiEmployer = Number(run.total_gosi_employer ?? 0);
    const gosiEmployee = Number(run.total_gosi_employee ?? 0);
    if ((gosiEmployer > 0 || gosiEmployee > 0) && (!s.gosi_expense_account_id || !s.gosi_payable_account_id)) {
      throw new Error("PAYROLL_ACCOUNTS_NOT_CONFIGURED");
    }

    const gross = r2(Number(run.total_gross ?? 0));
    const net = r2(Number(run.total_net ?? 0));
    const otherDeductions = r2(gross - net - gosiEmployee);

    const lines: Array<{ account_id: string; debit: number; credit: number; description: string }> = [
      { account_id: s.salary_expense_account_id, debit: gross, credit: 0, description: "رواتب وأجور" },
    ];
    if (gosiEmployer > 0) {
      lines.push({ account_id: s.gosi_expense_account_id, debit: gosiEmployer, credit: 0, description: "حصة المنشأة في التأمينات" });
    }
    lines.push({ account_id: s.payroll_payable_account_id, debit: 0, credit: net, description: "رواتب مستحقة الدفع" });
    if (gosiEmployee + gosiEmployer > 0) {
      lines.push({
        account_id: s.gosi_payable_account_id,
        debit: 0,
        credit: r2(gosiEmployee + gosiEmployer),
        description: "التأمينات الاجتماعية المستحقة",
      });
    }
    if (otherDeductions > 0.004) {
      const acct = s.advances_account_id ?? s.payroll_payable_account_id;
      lines.push({ account_id: acct, debit: 0, credit: otherDeductions, description: "خصومات وسلف" });
    }

    const debit = r2(lines.reduce((a, l) => a + l.debit, 0));
    const credit = r2(lines.reduce((a, l) => a + l.credit, 0));
    if (debit !== credit) throw new Error("ENTRY_NOT_BALANCED");
    if (debit <= 0) throw new Error("ENTRY_AMOUNT_ZERO");

    const entry_number = await nextNumber(company_id, "journal_entry", "JV");
    const { data: entry, error: eErr } = await supabaseAdmin
      .from("journal_entries")
      .insert({
        company_id,
        entry_number,
        entry_date: run.payroll_periods.pay_date ?? run.payroll_periods.end_date,
        memo: `مسير رواتب ${run.run_number} — ${run.payroll_periods.month}/${run.payroll_periods.year}`,
        source_type: "payroll_run",
        source_id: run.id,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (eErr) throw new Error(eErr.code === "23505" ? "POSTING_DUPLICATE" : eErr.message);

    const { error: lErr } = await supabaseAdmin.from("journal_entry_lines").insert(
      lines.map((l, idx) => ({
        journal_entry_id: entry.id,
        line_no: idx + 1,
        account_id: l.account_id,
        debit: l.debit,
        credit: l.credit,
        description: l.description,
      })),
    );
    if (lErr) {
      await supabaseAdmin.from("journal_entries").delete().eq("id", entry.id).eq("company_id", company_id);
      throw new Error(lErr.message);
    }

    const { error: pErr } = await supabaseAdmin
      .from("journal_entries")
      .update({ status: "posted", approved_by: c.userId, approved_at: new Date().toISOString(), posted_by: c.userId })
      .eq("id", entry.id)
      .eq("company_id", company_id);
    if (pErr) {
      await supabaseAdmin.from("journal_entries").delete().eq("id", entry.id).eq("company_id", company_id);
      throw new Error(pErr.message);
    }

    await c.supabase.from("payroll_runs").update({ journal_entry_id: entry.id, status: "paid" }).eq("id", run.id);
    return { ok: true, entry_number };
  });

/** Preparatory WPS file rows — not transmitted to any authority. */
export const buildWpsExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ run_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requirePayroll(c);
    const [{ data: run }, { data: items }, { data: settings }] = await Promise.all([
      c.supabase.from("payroll_runs").select("*, payroll_periods!inner(year, month, pay_date)").eq("id", data.run_id).maybeSingle(),
      c.supabase
        .from("payroll_items")
        .select("net_pay, basic_salary, housing_allowance, transport_allowance, other_allowance, total_deductions, iban_snapshot, employees!inner(employee_number, full_name_ar)")
        .eq("payroll_run_id", data.run_id),
      c.supabase.from("hr_settings").select("wps_bank_code, wps_establishment_id").maybeSingle(),
    ]);
    if (!run) throw new Error("NOT_FOUND");
    return {
      disclaimer: "ملف تحضيري لحماية الأجور — لم يُرسل إلى أي جهة رسمية.",
      establishment_id: settings?.wps_establishment_id ?? null,
      bank_code: settings?.wps_bank_code ?? null,
      period: `${run.payroll_periods.year}-${String(run.payroll_periods.month).padStart(2, "0")}`,
      rows: (items ?? []).map((it: any) => ({
        employee_number: it.employees.employee_number,
        employee_name: it.employees.full_name_ar,
        iban: it.iban_snapshot ?? "",
        basic_salary: it.basic_salary,
        housing_allowance: it.housing_allowance,
        other_earnings: r2(Number(it.transport_allowance) + Number(it.other_allowance)),
        deductions: it.total_deductions,
        net_pay: it.net_pay,
      })),
    };
  });

/* ===================== Employee self-service ===================== */

export const getMySelfService = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data: me } = await c.supabase
      .from("employees")
      .select("*")
      .eq("user_id", c.userId)
      .maybeSingle();
    if (!me) return { employee: null, contracts: [], leaves: [], custodies: [], payslips: [], attendance: [] };
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [{ data: contracts }, { data: leaves }, { data: custodies }, { data: payslips }, { data: attendance }] = await Promise.all([
      c.supabase.from("employee_contracts").select("*").eq("employee_id", me.id).order("start_date", { ascending: false }),
      c.supabase.from("leave_requests").select("*, leave_types!inner(name_ar)").eq("employee_id", me.id).order("start_date", { ascending: false }),
      c.supabase.from("employee_custodies").select("*").eq("employee_id", me.id).order("issued_date", { ascending: false }),
      c.supabase
        .from("payroll_items")
        .select("*, payroll_runs!inner(run_number, status, period_id, payroll_periods!inner(year, month))")
        .eq("employee_id", me.id)
        .order("created_at", { ascending: false }),
      c.supabase.from("attendance_records").select("*").eq("employee_id", me.id).gte("work_date", since).order("work_date", { ascending: false }),
    ]);
    return {
      employee: me,
      contracts: contracts ?? [],
      leaves: leaves ?? [],
      custodies: custodies ?? [],
      payslips: (payslips ?? []).filter((p: any) => ["approved", "paid"].includes(p.payroll_runs.status)),
      attendance: attendance ?? [],
    };
  });

export const getHrDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const today = new Date().toISOString().slice(0, 10);
    const [emps, pending, onLeave, custodies] = await Promise.all([
      c.supabase.from("employees").select("status"),
      c.supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      c.supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "approved").lte("start_date", today).gte("end_date", today),
      c.supabase.from("employee_custodies").select("id", { count: "exact", head: true }).eq("status", "issued"),
    ]);
    const rows = emps.data ?? [];
    return {
      total: rows.length,
      active: rows.filter((r: any) => r.status === "active").length,
      pendingLeaves: pending.count ?? 0,
      onLeaveToday: onLeave.count ?? 0,
      openCustodies: custodies.count ?? 0,
    };
  });

/** Single payslip for printing; RLS limits employees to their own items. */
export const getPayslip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ item_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: item, error } = await c.supabase
      .from("payroll_items")
      .select(
        "*, employees!inner(employee_number, full_name_ar, full_name_en, job_title_id), payroll_runs!inner(run_number, status, payroll_periods!inner(year, month, pay_date))",
      )
      .eq("id", data.item_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) throw new Error("NOT_FOUND");
    const { data: company } = await c.supabase.from("companies").select("*").maybeSingle();
    return { item, company: company ?? null };
  });
