import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

const ADMIN = ["super_admin", "factory_owner", "general_manager"] as const;
const FINANCE = [...ADMIN, "accountant"] as const;
/** العكس وإقفال/فتح الفترات: مقصورة على الإدارة فقط (المحاسب ينشئ ويرحّل) */
const APPROVERS = [...ADMIN] as const;

const uuid = z.string().uuid();
const money = z.number().nonnegative().max(1_000_000_000);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function companyOf(c: Ctx): Promise<string> {
  const { data, error } = await c.supabase.from("profiles").select("company_id").eq("id", c.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("NO_COMPANY");
  return data.company_id as string;
}

async function requireFinance(c: Ctx, level: "write" | "approve" = "write") {
  const { data, error } = await c.supabase.from("user_roles").select("role").eq("user_id", c.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  const allowed: readonly string[] = level === "approve" ? APPROVERS : FINANCE;
  if (!roles.some((r: string) => allowed.includes(r))) {
    throw new Error(level === "approve" ? "FORBIDDEN_APPROVAL" : "FORBIDDEN_ROLE");
  }
  return roles as string[];
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

const r2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* ===================== Chart of accounts ===================== */

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase.from("chart_of_accounts").select("*").order("code");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const accountInput = z.object({
  code: z.string().trim().min(1).max(20),
  name_ar: z.string().trim().min(2).max(160),
  name_en: z.string().trim().max(160).optional().nullable(),
  account_type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  parent_id: uuid.optional().nullable(),
  is_postable: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => accountInput.parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase
      .from("chart_of_accounts")
      .insert({ ...data, parent_id: data.parent_id || null, company_id });
    if (error) throw new Error(error.code === "23505" ? "ACCOUNT_CODE_DUPLICATE" : error.message);
    return { ok: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => accountInput.partial().extend({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const { id, ...patch } = data;
    const { error } = await c.supabase.from("chart_of_accounts").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Standard Saudi manufacturing chart of accounts skeleton (configuration, not transactions). */
const COA_TEMPLATE: Array<{ code: string; ar: string; en: string; type: string; parent?: string }> = [
  { code: "1", ar: "الأصول", en: "Assets", type: "asset" },
  { code: "11", ar: "الأصول المتداولة", en: "Current assets", type: "asset", parent: "1" },
  { code: "1101", ar: "الصندوق والنقدية", en: "Cash on hand", type: "asset", parent: "11" },
  { code: "1102", ar: "البنوك", en: "Banks", type: "asset", parent: "11" },
  { code: "1201", ar: "ذمم العملاء", en: "Accounts receivable", type: "asset", parent: "11" },
  { code: "1301", ar: "المخزون - مواد خام", en: "Inventory - raw materials", type: "asset", parent: "11" },
  { code: "1302", ar: "إنتاج تحت التشغيل", en: "Work in progress", type: "asset", parent: "11" },
  { code: "1303", ar: "المخزون - تام الصنع", en: "Inventory - finished goods", type: "asset", parent: "11" },
  { code: "1401", ar: "ضريبة القيمة المضافة - مدخلات", en: "Input VAT", type: "asset", parent: "11" },
  { code: "15", ar: "الأصول غير المتداولة", en: "Non-current assets", type: "asset", parent: "1" },
  { code: "1501", ar: "الآلات والمعدات", en: "Machinery & equipment", type: "asset", parent: "15" },
  { code: "2", ar: "الالتزامات", en: "Liabilities", type: "liability" },
  { code: "21", ar: "الالتزامات المتداولة", en: "Current liabilities", type: "liability", parent: "2" },
  { code: "2101", ar: "ذمم الموردين", en: "Accounts payable", type: "liability", parent: "21" },
  { code: "2201", ar: "ضريبة القيمة المضافة - مخرجات", en: "Output VAT", type: "liability", parent: "21" },
  { code: "2301", ar: "مصروفات مستحقة", en: "Accrued expenses", type: "liability", parent: "21" },
  { code: "3", ar: "حقوق الملكية", en: "Equity", type: "equity" },
  { code: "3101", ar: "رأس المال", en: "Capital", type: "equity", parent: "3" },
  { code: "3201", ar: "الأرباح المبقاة", en: "Retained earnings", type: "equity", parent: "3" },
  { code: "4", ar: "الإيرادات", en: "Revenue", type: "revenue" },
  { code: "4101", ar: "إيرادات المبيعات", en: "Sales revenue", type: "revenue", parent: "4" },
  { code: "4201", ar: "إيرادات أخرى", en: "Other income", type: "revenue", parent: "4" },
  { code: "5", ar: "المصروفات", en: "Expenses", type: "expense" },
  { code: "5101", ar: "تكلفة المبيعات", en: "Cost of sales", type: "expense", parent: "5" },
  { code: "5102", ar: "المشتريات والمصروفات التشغيلية", en: "Purchases & operating expenses", type: "expense", parent: "5" },
  { code: "5103", ar: "الهالك والفاقد", en: "Scrap & waste", type: "expense", parent: "5" },
  { code: "5201", ar: "الرواتب والأجور", en: "Salaries & wages", type: "expense", parent: "5" },
  { code: "5301", ar: "مصروفات إدارية وعمومية", en: "General & administrative", type: "expense", parent: "5" },
];

export const seedChartOfAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const { data: existing } = await c.supabase.from("chart_of_accounts").select("code");
    const have = new Set((existing ?? []).map((a: { code: string }) => a.code));
    const ids = new Map<string, string>();
    for (const a of existing ?? []) ids.set((a as any).code, "");
    let created = 0;
    for (const node of COA_TEMPLATE) {
      if (have.has(node.code)) {
        const { data: row } = await c.supabase.from("chart_of_accounts").select("id").eq("code", node.code).maybeSingle();
        if (row) ids.set(node.code, row.id);
        continue;
      }
      const parent_id = node.parent ? ids.get(node.parent) || null : null;
      const { data: row, error } = await c.supabase
        .from("chart_of_accounts")
        .insert({
          company_id,
          code: node.code,
          name_ar: node.ar,
          name_en: node.en,
          account_type: node.type,
          parent_id,
          is_postable: !COA_TEMPLATE.some((x) => x.parent === node.code),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      ids.set(node.code, row.id);
      created += 1;
    }
    // default mapping if not configured yet
    const byCode = async (code: string) => {
      const { data } = await c.supabase.from("chart_of_accounts").select("id").eq("code", code).maybeSingle();
      return data?.id ?? null;
    };
    const { data: settings } = await c.supabase.from("accounting_settings").select("company_id").maybeSingle();
    if (!settings) {
      await c.supabase.from("accounting_settings").insert({
        company_id,
        ar_account_id: await byCode("1201"),
        ap_account_id: await byCode("2101"),
        output_vat_account_id: await byCode("2201"),
        input_vat_account_id: await byCode("1401"),
        sales_revenue_account_id: await byCode("4101"),
        inventory_account_id: await byCode("1301"),
        cogs_account_id: await byCode("5101"),
        wip_account_id: await byCode("1302"),
        scrap_account_id: await byCode("5103"),
        cash_account_id: await byCode("1102"),
        purchase_expense_account_id: await byCode("5102"),
      });
    }
    return { created };
  });

/* ===================== Fiscal periods & cost centers ===================== */

export const listPeriods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase.from("fiscal_periods").select("*").order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ code: z.string().trim().min(2).max(30), start_date: dateStr, end_date: dateStr }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase.from("fiscal_periods").insert({ ...data, company_id });
    if (error) throw new Error(error.code === "23505" ? "PERIOD_CODE_DUPLICATE" : error.message);
    return { ok: true };
  });

/** Create the 12 monthly periods of a Gregorian year (configuration only). */
export const createYearPeriods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ year: z.number().int().min(2000).max(2100) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    let created = 0;
    for (let m = 1; m <= 12; m++) {
      const code = `${data.year}-${String(m).padStart(2, "0")}`;
      const start = `${code}-01`;
      const endDate = new Date(Date.UTC(data.year, m, 0));
      const end = endDate.toISOString().slice(0, 10);
      const { error } = await c.supabase.from("fiscal_periods").insert({ company_id, code, start_date: start, end_date: end });
      if (!error) created += 1;
      else if (error.code !== "23505" && !String(error.message).includes("PERIOD_OVERLAP")) throw new Error(error.message);
    }
    return { created };
  });

export const setPeriodStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, status: z.enum(["open", "closed"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c, "approve");
    const { error } = await c.supabase
      .from("fiscal_periods")
      .update({
        status: data.status,
        closed_at: data.status === "closed" ? new Date().toISOString() : null,
        closed_by: data.status === "closed" ? c.userId : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCostCenters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase.from("cost_centers").select("*").order("code");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCostCenter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        code: z.string().trim().min(1).max(20),
        name_ar: z.string().trim().min(2).max(160),
        name_en: z.string().trim().max(160).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase.from("cost_centers").insert({ ...data, company_id });
    if (error) throw new Error(error.code === "23505" ? "COST_CENTER_DUPLICATE" : error.message);
    return { ok: true };
  });

/* ===================== Settings ===================== */

export const getAccountingSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase.from("accounting_settings").select("*").maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

const settingsInput = z.object({
  ar_account_id: uuid.nullable().optional(),
  ap_account_id: uuid.nullable().optional(),
  output_vat_account_id: uuid.nullable().optional(),
  input_vat_account_id: uuid.nullable().optional(),
  sales_revenue_account_id: uuid.nullable().optional(),
  inventory_account_id: uuid.nullable().optional(),
  cogs_account_id: uuid.nullable().optional(),
  wip_account_id: uuid.nullable().optional(),
  scrap_account_id: uuid.nullable().optional(),
  cash_account_id: uuid.nullable().optional(),
  purchase_expense_account_id: uuid.nullable().optional(),
});

export const saveAccountingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => settingsInput.parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase.from("accounting_settings").upsert({ ...data, company_id }, { onConflict: "company_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function mapping(c: Ctx, keys: string[]) {
  const { data, error } = await c.supabase.from("accounting_settings").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("MAPPING_INCOMPLETE");
  for (const k of keys) if (!data[k]) throw new Error("MAPPING_INCOMPLETE");
  return data as Record<string, string>;
}

/* ===================== Journal entries ===================== */

type LineDraft = {
  account_id: string;
  debit?: number;
  credit?: number;
  description?: string | null;
  cost_center_id?: string | null;
  customer_id?: string | null;
  supplier_id?: string | null;
};

async function createEntry(
  c: Ctx,
  company_id: string,
  args: { entry_date: string; memo: string; source_type?: string | null; source_id?: string | null; lines: LineDraft[] },
  post = false,
) {
  const debit = r2(args.lines.reduce((a, l) => a + Number(l.debit ?? 0), 0));
  const credit = r2(args.lines.reduce((a, l) => a + Number(l.credit ?? 0), 0));
  if (debit !== credit) throw new Error("ENTRY_NOT_BALANCED");
  if (debit <= 0) throw new Error("ENTRY_AMOUNT_ZERO");
  if (args.lines.length < 2) throw new Error("ENTRY_NEEDS_LINES");

  const entry_number = await nextNumber(company_id, `journal_entry`, "JV");
  const { data: entry, error } = await c.supabase
    .from("journal_entries")
    .insert({
      company_id,
      entry_number,
      entry_date: args.entry_date,
      memo: args.memo,
      source_type: args.source_type ?? null,
      source_id: args.source_id ?? null,
      created_by: c.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.code === "23505" ? "POSTING_DUPLICATE" : error.message);

  const rows = args.lines.map((l, idx) => ({
    journal_entry_id: entry.id,
    line_no: idx + 1,
    account_id: l.account_id,
    cost_center_id: l.cost_center_id ?? null,
    customer_id: l.customer_id ?? null,
    supplier_id: l.supplier_id ?? null,
    debit: r2(l.debit ?? 0),
    credit: r2(l.credit ?? 0),
    description: l.description ?? null,
  }));
  const { error: lerr } = await c.supabase.from("journal_entry_lines").insert(rows);
  if (lerr) {
    await c.supabase.from("journal_entries").delete().eq("id", entry.id);
    throw new Error(lerr.message);
  }

  if (post) {
    const { error: perr } = await c.supabase
      .from("journal_entries")
      .update({ status: "posted", approved_by: c.userId, approved_at: new Date().toISOString(), posted_by: c.userId })
      .eq("id", entry.id);
    if (perr) {
      await c.supabase.from("journal_entries").delete().eq("id", entry.id);
      throw new Error(perr.message);
    }
  }
  return entry.id as string;
}

export const listJournalEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ from: dateStr.optional(), to: dateStr.optional(), status: z.string().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("journal_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("entry_number", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("entry_date", data.from);
    if (data.to) q = q.lte("entry_date", data.to);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getJournalEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: entry, error } = await c.supabase
      .from("journal_entries")
      .select("*, journal_entry_lines(*, chart_of_accounts(code, name_ar, name_en))")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return entry;
  });

export const createJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        entry_date: dateStr,
        memo: z.string().trim().min(2).max(400),
        post: z.boolean().default(false),
        lines: z
          .array(
            z.object({
              account_id: uuid,
              debit: money.default(0),
              credit: money.default(0),
              description: z.string().trim().max(300).optional().nullable(),
              cost_center_id: uuid.nullable().optional(),
              customer_id: uuid.nullable().optional(),
              supplier_id: uuid.nullable().optional(),
            }),
          )
          .min(2)
          .max(60),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    for (const l of data.lines) {
      if ((l.debit > 0 && l.credit > 0) || (l.debit === 0 && l.credit === 0)) throw new Error("LINE_DEBIT_OR_CREDIT");
    }
    const id = await createEntry(
      c,
      company_id,
      { entry_date: data.entry_date, memo: data.memo, source_type: "manual", source_id: null, lines: data.lines },
      data.post,
    );
    return { id };
  });

export const postJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const { error } = await c.supabase
      .from("journal_entries")
      .update({ status: "posted", approved_by: c.userId, approved_at: new Date().toISOString(), posted_by: c.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDraftEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const { error } = await c.supabase.from("journal_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reverseJournalEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: uuid, entry_date: dateStr.optional(), reason: z.string().trim().min(3).max(300) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c, "approve");
    const company_id = await companyOf(c);
    const { data: src, error } = await c.supabase
      .from("journal_entries")
      .select("*, journal_entry_lines(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!src) throw new Error("ENTRY_NOT_FOUND");
    if (src.status !== "posted") throw new Error("ONLY_POSTED_CAN_BE_REVERSED");

    const entry_number = await nextNumber(company_id, "journal_entry", "JV");
    const { data: rev, error: rerr } = await c.supabase
      .from("journal_entries")
      .insert({
        company_id,
        entry_number,
        entry_date: data.entry_date ?? new Date().toISOString().slice(0, 10),
        memo: `عكس القيد ${src.entry_number} — ${data.reason}`,
        source_type: null,
        source_id: null,
        reversal_of: src.id,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (rerr) throw new Error(rerr.message);

    const lines = (src.journal_entry_lines ?? []).map((l: any, idx: number) => ({
      journal_entry_id: rev.id,
      line_no: idx + 1,
      account_id: l.account_id,
      cost_center_id: l.cost_center_id,
      customer_id: l.customer_id,
      supplier_id: l.supplier_id,
      debit: Number(l.credit),
      credit: Number(l.debit),
      description: l.description,
    }));
    const { error: lerr } = await c.supabase.from("journal_entry_lines").insert(lines);
    if (lerr) {
      await c.supabase.from("journal_entries").delete().eq("id", rev.id);
      throw new Error(lerr.message);
    }
    const { error: perr } = await c.supabase
      .from("journal_entries")
      .update({ status: "posted", approved_by: c.userId, approved_at: new Date().toISOString(), posted_by: c.userId })
      .eq("id", rev.id);
    if (perr) {
      await c.supabase.from("journal_entries").delete().eq("id", rev.id);
      throw new Error(perr.message);
    }
    const { error: uerr } = await c.supabase.from("journal_entries").update({ status: "reversed", reversed_by: rev.id }).eq("id", src.id);
    if (uerr) throw new Error(uerr.message);
    return { id: rev.id };
  });

/* ===================== Idempotent auto-posting ===================== */

async function postedKeys(c: Ctx, sourceType: string) {
  const { data, error } = await c.supabase.from("journal_entries").select("source_id").eq("source_type", sourceType);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r: { source_id: string }) => r.source_id));
}

async function collectPostable(c: Ctx) {
    const out: Array<{ source_type: string; source_id: string; label: string; date: string; amount: number }> = [];

    const [inv, pay, sinv, preq, dn, moves] = await Promise.all([
      c.supabase.from("invoices").select("id, invoice_number, issue_date, total, status").in("status", ["issued", "paid"]),
      c.supabase.from("payments").select("id, amount, paid_at, reference"),
      c.supabase.from("supplier_invoices").select("id, supplier_invoice_number, invoice_date, total, status").in("status", ["approved", "paid"]),
      c.supabase.from("payment_requests").select("id, pay_number, amount, executed_at, status").eq("status", "executed"),
      c.supabase.from("debit_notes").select("id, dn_number, issue_date, total"),
      c.supabase
        .from("stock_movements")
        .select("id, movement_type, quantity, unit_cost, created_at")
        .in("movement_type", ["issue_to_mfg", "return_from_mfg"])
        .gt("unit_cost", 0),
    ]);

    const push = async (sourceType: string, rows: any[], map: (r: any) => { label: string; date: string; amount: number }) => {
      const done = await postedKeys(c, sourceType);
      for (const r of rows ?? []) {
        if (done.has(r.id)) continue;
        const m = map(r);
        if (!m.amount || m.amount <= 0) continue;
        out.push({ source_type: sourceType, source_id: r.id, ...m });
      }
    };

    await push("invoice", inv.data ?? [], (r) => ({ label: r.invoice_number, date: r.issue_date, amount: Number(r.total) }));
    await push("customer_payment", pay.data ?? [], (r) => ({ label: r.reference || "تحصيل", date: r.paid_at, amount: Number(r.amount) }));
    await push("supplier_invoice", sinv.data ?? [], (r) => ({
      label: r.supplier_invoice_number,
      date: r.invoice_date,
      amount: Number(r.total),
    }));
    await push("supplier_payment", preq.data ?? [], (r) => ({
      label: r.pay_number,
      date: String(r.executed_at ?? "").slice(0, 10),
      amount: Number(r.amount),
    }));
    await push("debit_note", dn.data ?? [], (r) => ({ label: r.dn_number, date: r.issue_date, amount: Number(r.total) }));
    await push("stock_movement", moves.data ?? [], (r) => ({
      label: r.movement_type,
      date: String(r.created_at).slice(0, 10),
      amount: r2(Number(r.quantity) * Number(r.unit_cost)),
    }));

    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Documents that are ready to be posted but have no journal entry yet. */
export const listPostableDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => collectPostable(context as Ctx));

async function buildEntryFor(c: Ctx, company_id: string, sourceType: string, sourceId: string) {
  if (sourceType === "invoice") {
    const m = await mapping(c, ["ar_account_id", "sales_revenue_account_id", "output_vat_account_id"]);
    const { data: r } = await c.supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, subtotal, vat_amount, total, status, customer_id")
      .eq("id", sourceId)
      .maybeSingle();
    if (!r || !["issued", "paid"].includes(r.status)) throw new Error("SOURCE_NOT_POSTABLE");
    const lines: LineDraft[] = [
      { account_id: m["ar_account_id"]!, debit: Number(r.total), customer_id: r.customer_id, description: r.invoice_number },
      { account_id: m["sales_revenue_account_id"]!, credit: Number(r.subtotal), description: r.invoice_number },
    ];
    if (Number(r.vat_amount) > 0) lines.push({ account_id: m["output_vat_account_id"]!, credit: Number(r.vat_amount), description: "ضريبة مخرجات" });
    return { entry_date: r.issue_date, memo: `فاتورة مبيعات ${r.invoice_number}`, lines };
  }

  if (sourceType === "customer_payment") {
    const m = await mapping(c, ["ar_account_id", "cash_account_id"]);
    const { data: r } = await c.supabase
      .from("payments")
      .select("id, amount, paid_at, reference, sales_order_id, sales_orders(customer_id)")
      .eq("id", sourceId)
      .maybeSingle();
    if (!r) throw new Error("SOURCE_NOT_POSTABLE");
    const customer_id = (r as any).sales_orders?.customer_id ?? null;
    return {
      entry_date: r.paid_at,
      memo: `تحصيل من عميل ${r.reference ?? ""}`.trim(),
      lines: [
        { account_id: m["cash_account_id"]!, debit: Number(r.amount), description: r.reference },
        { account_id: m["ar_account_id"]!, credit: Number(r.amount), customer_id, description: r.reference },
      ] as LineDraft[],
    };
  }

  if (sourceType === "supplier_invoice") {
    const m = await mapping(c, ["ap_account_id", "input_vat_account_id", "purchase_expense_account_id"]);
    const { data: r } = await c.supabase
      .from("supplier_invoices")
      .select("id, supplier_invoice_number, invoice_date, subtotal, vat_amount, total, status, supplier_id")
      .eq("id", sourceId)
      .maybeSingle();
    if (!r || !["approved", "paid"].includes(r.status)) throw new Error("SOURCE_NOT_POSTABLE");
    const lines: LineDraft[] = [
      { account_id: m["purchase_expense_account_id"]!, debit: Number(r.subtotal), description: r.supplier_invoice_number },
    ];
    if (Number(r.vat_amount) > 0) lines.push({ account_id: m["input_vat_account_id"]!, debit: Number(r.vat_amount), description: "ضريبة مدخلات" });
    lines.push({ account_id: m["ap_account_id"]!, credit: Number(r.total), supplier_id: r.supplier_id, description: r.supplier_invoice_number });
    return { entry_date: r.invoice_date, memo: `فاتورة مورد ${r.supplier_invoice_number}`, lines };
  }

  if (sourceType === "supplier_payment") {
    const m = await mapping(c, ["ap_account_id", "cash_account_id"]);
    const { data: r } = await c.supabase
      .from("payment_requests")
      .select("id, pay_number, amount, executed_at, status, supplier_id")
      .eq("id", sourceId)
      .maybeSingle();
    if (!r || r.status !== "executed") throw new Error("SOURCE_NOT_POSTABLE");
    return {
      entry_date: String(r.executed_at ?? new Date().toISOString()).slice(0, 10),
      memo: `دفعة لمورد ${r.pay_number}`,
      lines: [
        { account_id: m["ap_account_id"]!, debit: Number(r.amount), supplier_id: r.supplier_id, description: r.pay_number },
        { account_id: m["cash_account_id"]!, credit: Number(r.amount), description: r.pay_number },
      ] as LineDraft[],
    };
  }

  if (sourceType === "debit_note") {
    const m = await mapping(c, ["ap_account_id", "input_vat_account_id", "purchase_expense_account_id"]);
    const { data: r } = await c.supabase
      .from("debit_notes")
      .select("id, dn_number, issue_date, subtotal, vat_amount, total, supplier_id")
      .eq("id", sourceId)
      .maybeSingle();
    if (!r) throw new Error("SOURCE_NOT_POSTABLE");
    const lines: LineDraft[] = [
      { account_id: m["ap_account_id"]!, debit: Number(r.total), supplier_id: r.supplier_id, description: r.dn_number },
      { account_id: m["purchase_expense_account_id"]!, credit: Number(r.subtotal), description: r.dn_number },
    ];
    if (Number(r.vat_amount) > 0) lines.push({ account_id: m["input_vat_account_id"]!, credit: Number(r.vat_amount), description: "عكس ضريبة مدخلات" });
    return { entry_date: r.issue_date, memo: `إشعار خصم ${r.dn_number}`, lines };
  }

  if (sourceType === "stock_movement") {
    const m = await mapping(c, ["inventory_account_id", "wip_account_id"]);
    const { data: r } = await c.supabase
      .from("stock_movements")
      .select("id, movement_type, quantity, unit_cost, created_at")
      .eq("id", sourceId)
      .maybeSingle();
    if (!r || !["issue_to_mfg", "return_from_mfg"].includes(r.movement_type)) throw new Error("SOURCE_NOT_POSTABLE");
    const value = r2(Number(r.quantity) * Number(r.unit_cost));
    if (value <= 0) throw new Error("SOURCE_NOT_POSTABLE");
    const toWip = r.movement_type === "issue_to_mfg";
    return {
      entry_date: String(r.created_at).slice(0, 10),
      memo: toWip ? "صرف مواد للإنتاج" : "إرجاع مواد من الإنتاج",
      lines: [
        { account_id: toWip ? m["wip_account_id"]! : m["inventory_account_id"]!, debit: value },
        { account_id: toWip ? m["inventory_account_id"]! : m["wip_account_id"]!, credit: value },
      ] as LineDraft[],
    };
  }

  throw new Error("SOURCE_NOT_POSTABLE");
}

export const postDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        source_type: z.enum(["invoice", "customer_payment", "supplier_invoice", "supplier_payment", "debit_note", "stock_movement"]),
        source_id: uuid,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const built = await buildEntryFor(c, company_id, data.source_type, data.source_id);
    const id = await createEntry(
      c,
      company_id,
      { ...built, source_type: data.source_type, source_id: data.source_id },
      true,
    );
    return { id };
  });

export const postAllPending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const pending = await collectPostable(c);
    let posted = 0;
    const failures: Array<{ source_id: string; error: string }> = [];
    for (const p of pending) {
      try {
        const built = await buildEntryFor(c, company_id, p.source_type, p.source_id);
        await createEntry(c, company_id, { ...built, source_type: p.source_type, source_id: p.source_id }, true);
        posted += 1;
      } catch (e) {
        failures.push({ source_id: p.source_id, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { posted, failures };
  });

/* ===================== Treasury ===================== */

export const listBankAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase.from("bank_accounts").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        bank_name: z.string().trim().max(120).optional().nullable(),
        iban: z.string().trim().regex(/^SA[0-9]{22}$/, "IBAN_INVALID").optional().nullable().or(z.literal("")),
        gl_account_id: uuid.nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase.from("bank_accounts").insert({ ...data, iban: data.iban || null, company_id });
    if (error) throw new Error(error.code === "23505" ? "BANK_ACCOUNT_DUPLICATE" : error.message);
    return { ok: true };
  });

export const listVouchers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("cash_vouchers")
      .select("*, bank_accounts!cash_vouchers_bank_account_id_fkey(name), customers(name_ar), suppliers(name_ar)")
      .order("voucher_date", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        voucher_type: z.enum(["receipt", "payment", "transfer"]),
        voucher_date: dateStr,
        amount: z.number().positive().max(1_000_000_000),
        bank_account_id: uuid,
        to_bank_account_id: uuid.nullable().optional(),
        party_type: z.enum(["customer", "supplier", "other"]).default("other"),
        customer_id: uuid.nullable().optional(),
        supplier_id: uuid.nullable().optional(),
        bank_reference: z.string().trim().max(120).optional().nullable(),
        memo: z.string().trim().max(300).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const voucher_number = await nextNumber(
      company_id,
      `voucher_${data.voucher_type}`,
      data.voucher_type === "receipt" ? "RV" : data.voucher_type === "payment" ? "PV" : "TV",
    );
    const { data: row, error } = await c.supabase
      .from("cash_vouchers")
      .insert({
        ...data,
        to_bank_account_id: data.to_bank_account_id || null,
        customer_id: data.customer_id || null,
        supplier_id: data.supplier_id || null,
        company_id,
        voucher_number,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const confirmVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, bank_reference: z.string().trim().min(2).max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const { data: v, error } = await c.supabase.from("cash_vouchers").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!v) throw new Error("VOUCHER_NOT_FOUND");
    if (v.status === "confirmed") throw new Error("VOUCHER_CONFIRMED_IMMUTABLE");

    const m = await mapping(c, ["cash_account_id", "ar_account_id", "ap_account_id"]);
    const amount = Number(v.amount);
    let lines: LineDraft[];
    if (v.voucher_type === "receipt") {
      lines = [
        { account_id: m["cash_account_id"]!, debit: amount, description: data.bank_reference },
        { account_id: m["ar_account_id"]!, credit: amount, customer_id: v.customer_id, description: v.memo },
      ];
    } else if (v.voucher_type === "payment") {
      lines = [
        { account_id: m["ap_account_id"]!, debit: amount, supplier_id: v.supplier_id, description: v.memo },
        { account_id: m["cash_account_id"]!, credit: amount, description: data.bank_reference },
      ];
    } else {
      const banks = await c.supabase.from("bank_accounts").select("id, gl_account_id").in("id", [v.bank_account_id, v.to_bank_account_id]);
      const gl = new Map((banks.data ?? []).map((b: any) => [b.id, b.gl_account_id ?? m["cash_account_id"]]));
      const from = gl.get(v.bank_account_id) ?? m["cash_account_id"]!;
      const to = gl.get(v.to_bank_account_id) ?? m["cash_account_id"]!;
      if (from === to) throw new Error("TRANSFER_SAME_ACCOUNT");
      lines = [
        { account_id: to as string, debit: amount, description: data.bank_reference },
        { account_id: from as string, credit: amount, description: data.bank_reference },
      ];
    }

    const jeId = await createEntry(
      c,
      company_id,
      { entry_date: v.voucher_date, memo: `${v.voucher_number} — ${v.memo ?? ""}`.trim(), source_type: "voucher", source_id: v.id, lines },
      true,
    );
    const { error: uerr } = await c.supabase
      .from("cash_vouchers")
      .update({ status: "confirmed", bank_reference: data.bank_reference, journal_entry_id: jeId, confirmed_by: c.userId })
      .eq("id", v.id);
    if (uerr) throw new Error(uerr.message);
    return { ok: true, journal_entry_id: jeId };
  });

export const listStatementLines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ bank_account_id: uuid.optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase.from("bank_statement_lines").select("*").order("txn_date", { ascending: false }).limit(300);
    if (data.bank_account_id) q = q.eq("bank_account_id", data.bank_account_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addStatementLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        bank_account_id: uuid,
        txn_date: dateStr,
        amount: z.number().refine((v) => v !== 0, "AMOUNT_REQUIRED"),
        description: z.string().trim().max(300).optional().nullable(),
        reference: z.string().trim().max(120).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    const company_id = await companyOf(c);
    const { error } = await c.supabase.from("bank_statement_lines").insert({ ...data, company_id, created_by: c.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reconcileStatementLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: uuid, voucher_id: uuid.nullable().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireFinance(c);
    if (data.voucher_id) {
      const { data: v } = await c.supabase.from("cash_vouchers").select("status").eq("id", data.voucher_id).maybeSingle();
      if (!v || v.status !== "confirmed") throw new Error("VOUCHER_NOT_CONFIRMED");
    }
    const { error } = await c.supabase
      .from("bank_statement_lines")
      .update({
        matched_voucher_id: data.voucher_id ?? null,
        reconciled: Boolean(data.voucher_id),
        reconciled_at: data.voucher_id ? new Date().toISOString() : null,
        reconciled_by: data.voucher_id ? c.userId : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ===================== Reports ===================== */

async function postedLines(c: Ctx, from?: string, to?: string) {
  let q = c.supabase
    .from("journal_entry_lines")
    .select(
      "debit, credit, account_id, customer_id, supplier_id, description, journal_entries!inner(id, entry_number, entry_date, status, memo, source_type, source_id)",
    )
    .eq("journal_entries.status", "posted")
    .limit(20000);
  if (from) q = q.gte("journal_entries.entry_date", from);
  if (to) q = q.lte("journal_entries.entry_date", to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

const rangeInput = z.object({ from: dateStr.optional(), to: dateStr.optional() });

export const trialBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => rangeInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const [{ data: accounts }, lines] = await Promise.all([
      c.supabase.from("chart_of_accounts").select("id, code, name_ar, name_en, account_type").order("code"),
      postedLines(c, data.from, data.to),
    ]);
    const agg = new Map<string, { debit: number; credit: number }>();
    for (const l of lines) {
      const a = agg.get(l.account_id) ?? { debit: 0, credit: 0 };
      a.debit += Number(l.debit);
      a.credit += Number(l.credit);
      agg.set(l.account_id, a);
    }
    return (accounts ?? [])
      .map((a: any) => {
        const v = agg.get(a.id) ?? { debit: 0, credit: 0 };
        const net = r2(v.debit - v.credit);
        return { ...a, debit: r2(v.debit), credit: r2(v.credit), balance_debit: net > 0 ? net : 0, balance_credit: net < 0 ? -net : 0 };
      })
      .filter((a: any) => a.debit !== 0 || a.credit !== 0);
  });

export const generalLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => rangeInput.extend({ account_id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const lines = (await postedLines(c, data.from, data.to)).filter((l) => l.account_id === data.account_id);
    lines.sort((a, b) => (a.journal_entries.entry_date < b.journal_entries.entry_date ? -1 : 1));
    let running = 0;
    return lines.map((l) => {
      running = r2(running + Number(l.debit) - Number(l.credit));
      return {
        entry_id: l.journal_entries.id,
        entry_number: l.journal_entries.entry_number,
        entry_date: l.journal_entries.entry_date,
        memo: l.journal_entries.memo,
        source_type: l.journal_entries.source_type,
        description: l.description,
        debit: Number(l.debit),
        credit: Number(l.credit),
        balance: running,
      };
    });
  });

export const incomeStatement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => rangeInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const [{ data: accounts }, lines] = await Promise.all([
      c.supabase.from("chart_of_accounts").select("id, code, name_ar, name_en, account_type").order("code"),
      postedLines(c, data.from, data.to),
    ]);
    const map = new Map((accounts ?? []).map((a: any) => [a.id, a]));
    const rows = new Map<string, { code: string; name_ar: string; name_en: string; type: string; amount: number }>();
    for (const l of lines) {
      const a: any = map.get(l.account_id);
      if (!a || !["revenue", "expense"].includes(a.account_type)) continue;
      const cur = rows.get(a.id) ?? { code: a.code, name_ar: a.name_ar, name_en: a.name_en, type: a.account_type, amount: 0 };
      cur.amount += a.account_type === "revenue" ? Number(l.credit) - Number(l.debit) : Number(l.debit) - Number(l.credit);
      rows.set(a.id, cur);
    }
    const list = [...rows.values()].map((r) => ({ ...r, amount: r2(r.amount) })).filter((r) => r.amount !== 0);
    const revenue = r2(list.filter((r) => r.type === "revenue").reduce((a, r) => a + r.amount, 0));
    const expenses = r2(list.filter((r) => r.type === "expense").reduce((a, r) => a + r.amount, 0));
    return { rows: list, revenue, expenses, net: r2(revenue - expenses) };
  });

export const balanceSheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ to: dateStr.optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const [{ data: accounts }, lines] = await Promise.all([
      c.supabase.from("chart_of_accounts").select("id, code, name_ar, name_en, account_type").order("code"),
      postedLines(c, undefined, data.to),
    ]);
    const map = new Map((accounts ?? []).map((a: any) => [a.id, a]));
    const rows = new Map<string, { code: string; name_ar: string; name_en: string; type: string; amount: number }>();
    let net = 0;
    for (const l of lines) {
      const a: any = map.get(l.account_id);
      if (!a) continue;
      const d = Number(l.debit) - Number(l.credit);
      if (["revenue", "expense"].includes(a.account_type)) {
        net += a.account_type === "revenue" ? -d : -d;
        continue;
      }
      const cur = rows.get(a.id) ?? { code: a.code, name_ar: a.name_ar, name_en: a.name_en, type: a.account_type, amount: 0 };
      cur.amount += a.account_type === "asset" ? d : -d;
      rows.set(a.id, cur);
    }
    const list = [...rows.values()].map((r) => ({ ...r, amount: r2(r.amount) })).filter((r) => r.amount !== 0);
    const assets = r2(list.filter((r) => r.type === "asset").reduce((a, r) => a + r.amount, 0));
    const liabilities = r2(list.filter((r) => r.type === "liability").reduce((a, r) => a + r.amount, 0));
    const equity = r2(list.filter((r) => r.type === "equity").reduce((a, r) => a + r.amount, 0));
    return { rows: list, assets, liabilities, equity, retained: r2(net), balanced: r2(assets - (liabilities + equity + r2(net))) === 0 };
  });

export const cashFlowDirect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => rangeInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const m = await c.supabase.from("accounting_settings").select("cash_account_id").maybeSingle();
    const cashId = m.data?.cash_account_id;
    if (!cashId) return { inflows: [], outflows: [], totalIn: 0, totalOut: 0, net: 0 };
    const lines = (await postedLines(c, data.from, data.to)).filter((l) => l.account_id === cashId);
    const inflows = lines
      .filter((l) => Number(l.debit) > 0)
      .map((l) => ({
        date: l.journal_entries.entry_date,
        memo: l.journal_entries.memo,
        source_type: l.journal_entries.source_type,
        amount: Number(l.debit),
      }));
    const outflows = lines
      .filter((l) => Number(l.credit) > 0)
      .map((l) => ({
        date: l.journal_entries.entry_date,
        memo: l.journal_entries.memo,
        source_type: l.journal_entries.source_type,
        amount: Number(l.credit),
      }));
    const totalIn = r2(inflows.reduce((a, r) => a + r.amount, 0));
    const totalOut = r2(outflows.reduce((a, r) => a + r.amount, 0));
    return { inflows, outflows, totalIn, totalOut, net: r2(totalIn - totalOut) };
  });

function bucketOf(days: number) {
  if (days <= 30) return "d0_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
}

export const arAging = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const [{ data: invoices }, { data: customers }, { data: payments }] = await Promise.all([
      c.supabase.from("invoices").select("id, invoice_number, customer_id, issue_date, total, status").in("status", ["issued", "paid"]),
      c.supabase.from("customers").select("id, name_ar"),
      c.supabase.from("payments").select("amount, sales_order_id, sales_orders(customer_id)"),
    ]);
    const names = new Map((customers ?? []).map((x: any) => [x.id, x.name_ar]));
    const paid = new Map<string, number>();
    for (const p of payments ?? []) {
      const cid = (p as any).sales_orders?.customer_id;
      if (!cid) continue;
      paid.set(cid, (paid.get(cid) ?? 0) + Number(p.amount));
    }
    const today = new Date();
    const acc = new Map<string, any>();
    for (const inv of invoices ?? []) {
      const key = inv.customer_id;
      const row = acc.get(key) ?? {
        customer_id: key,
        name_ar: names.get(key) ?? "—",
        invoiced: 0,
        d0_30: 0,
        d31_60: 0,
        d61_90: 0,
        d90_plus: 0,
      };
      const days = Math.floor((today.getTime() - new Date(inv.issue_date).getTime()) / 86400000);
      row.invoiced += Number(inv.total);
      row[bucketOf(days)] += Number(inv.total);
      acc.set(key, row);
    }
    return [...acc.values()].map((r) => ({
      ...r,
      invoiced: r2(r.invoiced),
      paid: r2(paid.get(r.customer_id) ?? 0),
      balance: r2(r.invoiced - (paid.get(r.customer_id) ?? 0)),
      d0_30: r2(r.d0_30),
      d31_60: r2(r.d31_60),
      d61_90: r2(r.d61_90),
      d90_plus: r2(r.d90_plus),
    }));
  });

export const apAging = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const [{ data: invoices }, { data: suppliers }, { data: pays }] = await Promise.all([
      c.supabase
        .from("supplier_invoices")
        .select("id, supplier_invoice_number, supplier_id, invoice_date, due_date, total, status")
        .in("status", ["approved", "paid", "matched", "discrepancy"]),
      c.supabase.from("suppliers").select("id, name_ar"),
      c.supabase.from("payment_requests").select("supplier_id, amount, status").eq("status", "executed"),
    ]);
    const names = new Map((suppliers ?? []).map((x: any) => [x.id, x.name_ar]));
    const paid = new Map<string, number>();
    for (const p of pays ?? []) paid.set(p.supplier_id, (paid.get(p.supplier_id) ?? 0) + Number(p.amount));
    const today = new Date();
    const acc = new Map<string, any>();
    for (const inv of invoices ?? []) {
      const key = inv.supplier_id;
      const row = acc.get(key) ?? { supplier_id: key, name_ar: names.get(key) ?? "—", invoiced: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
      const base = inv.due_date ?? inv.invoice_date;
      const days = Math.floor((today.getTime() - new Date(base).getTime()) / 86400000);
      row.invoiced += Number(inv.total);
      row[bucketOf(Math.max(days, 0))] += Number(inv.total);
      acc.set(key, row);
    }
    return [...acc.values()].map((r) => ({
      ...r,
      invoiced: r2(r.invoiced),
      paid: r2(paid.get(r.supplier_id) ?? 0),
      balance: r2(r.invoiced - (paid.get(r.supplier_id) ?? 0)),
      d0_30: r2(r.d0_30),
      d31_60: r2(r.d31_60),
      d61_90: r2(r.d61_90),
      d90_plus: r2(r.d90_plus),
    }));
  });

export const partyLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ party: z.enum(["customer", "supplier"]), id: uuid }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const lines = (await postedLines(c)).filter((l) => (data.party === "customer" ? l.customer_id === data.id : l.supplier_id === data.id));
    lines.sort((a, b) => (a.journal_entries.entry_date < b.journal_entries.entry_date ? -1 : 1));
    let running = 0;
    return lines.map((l) => {
      running = r2(running + Number(l.debit) - Number(l.credit));
      return {
        entry_number: l.journal_entries.entry_number,
        entry_date: l.journal_entries.entry_date,
        memo: l.journal_entries.memo,
        source_type: l.journal_entries.source_type,
        source_id: l.journal_entries.source_id,
        debit: Number(l.debit),
        credit: Number(l.credit),
        balance: running,
      };
    });
  });

/** Saudi VAT return for a period, with drill-down document lists. */
export const vatReturn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ from: dateStr, to: dateStr }).parse(i))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const [{ data: sales }, { data: purchases }, { data: notes }] = await Promise.all([
      c.supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, subtotal, vat_amount, total, tax_treatment, exemption_reason, status")
        .in("status", ["issued", "paid"])
        .gte("issue_date", data.from)
        .lte("issue_date", data.to),
      c.supabase
        .from("supplier_invoices")
        .select("id, supplier_invoice_number, invoice_date, subtotal, vat_amount, total, tax_treatment, status")
        .in("status", ["approved", "paid"])
        .gte("invoice_date", data.from)
        .lte("invoice_date", data.to),
      c.supabase
        .from("debit_notes")
        .select("id, dn_number, issue_date, subtotal, vat_amount, total")
        .gte("issue_date", data.from)
        .lte("issue_date", data.to),
    ]);

    const salesRows = sales ?? [];
    const purchaseRows = purchases ?? [];
    const noteRows = notes ?? [];

    const standardSales = salesRows.filter((r: any) => r.tax_treatment === "standard");
    const exemptSales = salesRows.filter((r: any) => r.tax_treatment !== "standard");

    const outputVat = r2(salesRows.reduce((a: number, r: any) => a + Number(r.vat_amount), 0));
    const inputVatRaw = r2(purchaseRows.reduce((a: number, r: any) => a + Number(r.vat_amount), 0));
    const notesVat = r2(noteRows.reduce((a: number, r: any) => a + Number(r.vat_amount), 0));
    const deductibleInput = r2(inputVatRaw - notesVat);

    return {
      period: { from: data.from, to: data.to },
      sales: {
        standard_base: r2(standardSales.reduce((a: number, r: any) => a + Number(r.subtotal), 0)),
        exempt_base: r2(exemptSales.reduce((a: number, r: any) => a + Number(r.subtotal), 0)),
        output_vat: outputVat,
        documents: salesRows.map((r: any) => ({
          id: r.id,
          number: r.invoice_number,
          date: r.issue_date,
          base: Number(r.subtotal),
          vat: Number(r.vat_amount),
          treatment: r.tax_treatment,
          exemption_reason: r.exemption_reason,
        })),
      },
      purchases: {
        base: r2(purchaseRows.reduce((a: number, r: any) => a + Number(r.subtotal), 0)),
        input_vat: inputVatRaw,
        credit_notes_vat: notesVat,
        deductible_input_vat: deductibleInput,
        documents: purchaseRows.map((r: any) => ({
          id: r.id,
          number: r.supplier_invoice_number,
          date: r.invoice_date,
          base: Number(r.subtotal),
          vat: Number(r.vat_amount),
          treatment: r.tax_treatment,
        })),
        notes: noteRows.map((r: any) => ({ id: r.id, number: r.dn_number, date: r.issue_date, base: Number(r.subtotal), vat: Number(r.vat_amount) })),
      },
      net_due: r2(outputVat - deductibleInput),
    };
  });

export const financeOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const [accounts, periods, entries, vouchers, settings] = await Promise.all([
      c.supabase.from("chart_of_accounts").select("id", { count: "exact", head: true }),
      c.supabase.from("fiscal_periods").select("id", { count: "exact", head: true }).eq("status", "open"),
      c.supabase.from("journal_entries").select("status, total_debit"),
      c.supabase.from("cash_vouchers").select("id", { count: "exact", head: true }).eq("status", "draft"),
      c.supabase.from("accounting_settings").select("*").maybeSingle(),
    ]);
    const list = entries.data ?? [];
    const mappingKeys = [
      "ar_account_id",
      "ap_account_id",
      "output_vat_account_id",
      "input_vat_account_id",
      "sales_revenue_account_id",
      "cash_account_id",
      "purchase_expense_account_id",
    ];
    return {
      accounts: accounts.count ?? 0,
      open_periods: periods.count ?? 0,
      draft_entries: list.filter((e: any) => e.status === "draft").length,
      posted_entries: list.filter((e: any) => e.status === "posted").length,
      posted_value: r2(list.filter((e: any) => e.status === "posted").reduce((a: number, e: any) => a + Number(e.total_debit), 0)),
      draft_vouchers: vouchers.count ?? 0,
      mapping_complete: Boolean(settings.data) && mappingKeys.every((k) => Boolean((settings.data as any)?.[k])),
    };
  });

