import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { buildZatcaQr } from "@/lib/zatca";

const lineSchema = z.object({
  description: z.string().trim().min(1).max(300),
  unit: z.string().trim().min(1).max(30).default("قطعة"),
  quantity: z.number().positive().max(1_000_000),
  unit_price: z.number().min(0).max(100_000_000),
  discount_percent: z.number().min(0).max(100).default(0),
  vat_rate: z.number().min(0).max(100).default(15),
});
type Line = z.infer<typeof lineSchema>;

const round = (n: number) => Math.round(n * 100) / 100;

function totals(items: Line[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let vat = 0;
  const rows = items.map((i) => {
    const gross = i.quantity * i.unit_price;
    const discount = (gross * i.discount_percent) / 100;
    const taxable = gross - discount;
    const lineVat = (taxable * i.vat_rate) / 100;
    subtotal += gross;
    discountTotal += discount;
    vat += lineVat;
    return {
      description: i.description,
      unit: i.unit,
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount_percent: i.discount_percent,
      discount_amount: round(discount),
      taxable_amount: round(taxable),
      vat_rate: i.vat_rate,
      vat_amount: round(lineVat),
      line_total: round(taxable + lineVat),
    };
  });
  return {
    rows,
    subtotal: round(subtotal),
    discountTotal: round(discountTotal),
    vat: round(vat),
    total: round(subtotal - discountTotal + vat),
  };
}

const MANAGER_ROLES = [
  "super_admin",
  "factory_owner",
  "general_manager",
  "sales_manager",
  "accountant",
] as const;
const SALES_ROLES = [...MANAGER_ROLES, "sales_employee"] as const;

type Ctx = { supabase: any; userId: string };

async function companyOf(context: Ctx): Promise<string> {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("company_id")
    .eq("id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("NO_COMPANY");
  return data.company_id as string;
}

async function rolesOf(context: Ctx): Promise<string[]> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: string }) => r.role);
}

async function requireRole(context: Ctx, allowed: readonly string[]) {
  const roles = await rolesOf(context);
  if (!roles.some((r) => allowed.includes(r))) throw new Error("FORBIDDEN_ROLE");
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

/* ---------------- Company ---------------- */

export const getMyCompany = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await companyOf(context as Ctx);
    const { data, error } = await (context as Ctx).supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const companySchema = z.object({
  name_ar: z.string().trim().min(2).max(160),
  name_en: z.string().trim().max(160).optional().nullable(),
  vat_number: z.string().trim().regex(/^[0-9]{15}$/, "VAT_INVALID"),
  cr_number: z.string().trim().max(30).optional().nullable(),
  address_building_no: z.string().trim().min(1).max(10),
  address_street: z.string().trim().min(1).max(120),
  address_district: z.string().trim().min(1).max(120),
  address_city: z.string().trim().min(1).max(120),
  address_postal_code: z.string().trim().regex(/^[0-9]{5}$/, "POSTAL_INVALID"),
  address_additional_no: z.string().trim().max(10).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
});

export const saveMyCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => companySchema.parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const companyId = await companyOf(c);
    const { error } = await c.supabase.from("companies").update(data).eq("id", companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Customers ---------------- */

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const customerSchema = z.object({
  name_ar: z.string().trim().min(2).max(160),
  name_en: z.string().trim().max(160).optional().nullable(),
  segment: z.string().trim().max(60).optional().nullable(),
  vat_number: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
});

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => customerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const companyId = await companyOf(c);
    const { data: row, error } = await c.supabase
      .from("customers")
      .insert({ ...data, company_id: companyId, created_by: c.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ---------------- Quotations ---------------- */

export const listQuotations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("quotations")
      .select("*, customers(name_ar), quotation_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        customer_id: z.string().uuid(),
        valid_until: z.string().optional().nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
        items: z.array(lineSchema).min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, SALES_ROLES);
    const companyId = await companyOf(c);
    const { data: customer, error: customerError } = await c.supabase
      .from("customers")
      .select("id")
      .eq("id", data.customer_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (customerError) throw new Error(customerError.message);
    if (!customer) throw new Error("CUSTOMER_NOT_IN_COMPANY");
    const t = totals(data.items);
    const quote_number = await nextNumber(companyId, "quotation", "QT");
    const { data: quote, error } = await c.supabase
      .from("quotations")
      .insert({
        company_id: companyId,
        customer_id: data.customer_id,
        quote_number,
        valid_until: data.valid_until || null,
        notes: data.notes || null,
        subtotal: t.subtotal,
        discount_total: t.discountTotal,
        vat_amount: t.vat,
        total: t.total,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: itemsError } = await c.supabase
      .from("quotation_items")
      .insert(t.rows.map((r) => ({ ...r, quotation_id: quote.id })));
    if (itemsError) throw new Error(itemsError.message);
    return { id: quote.id, quote_number };
  });

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "rejected", "expired"],
  sent: ["accepted", "rejected", "expired"],
  accepted: ["expired"],
  rejected: [],
  expired: [],
};

export const setQuotationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, SALES_ROLES);
    const { data: current, error: readError } = await c.supabase
      .from("quotations")
      .select("id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) throw new Error("QUOTATION_NOT_FOUND");
    if (current.status === data.status) return { ok: true };
    if (!(ALLOWED_TRANSITIONS[current.status] ?? []).includes(data.status)) {
      throw new Error(`INVALID_TRANSITION:${current.status}->${data.status}`);
    }
    const { error } = await c.supabase
      .from("quotations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getQuotation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: quote, error } = await c.supabase
      .from("quotations")
      .select("*, customers(*), quotation_items(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("QUOTATION_NOT_FOUND");
    const companyId = await companyOf(c);
    const { data: company } = await c.supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();
    const { data: audit } = await c.supabase
      .from("audit_logs")
      .select("action, details, created_at")
      .eq("entity", "quotations")
      .eq("entity_id", data.id)
      .order("created_at", { ascending: false });
    return { quote, company, audit: audit ?? [] };
  });

/* ---------------- Sales orders ---------------- */

export const listSalesOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("sales_orders")
      .select("*, customers(name_ar), sales_order_items(*), payments(*), payment_schedules(*), invoices(id, invoice_number, status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const DEFAULT_SCHEDULE = [
  { sequence: 1, label_ar: "دفعة عند التوقيع", label_en: "On signature", percentage: 50, trigger_stage: "on_signature" },
  { sequence: 2, label_ar: "دفعة عند إنجاز 50% من التصنيع", label_en: "At 50% production", percentage: 30, trigger_stage: "production_50" },
  { sequence: 3, label_ar: "دفعة قبل/عند التسليم", label_en: "Before delivery", percentage: 20, trigger_stage: "before_delivery" },
] as const;

export const convertQuotationToOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ quotation_id: z.string().uuid(), delivery_date: z.string().optional().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, SALES_ROLES);
    const companyId = await companyOf(c);
    const { data: quote, error } = await c.supabase
      .from("quotations")
      .select("*, quotation_items(*)")
      .eq("id", data.quotation_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("QUOTATION_NOT_FOUND");
    if (quote.status !== "accepted") throw new Error("QUOTATION_NOT_ACCEPTED");

    const { data: existing } = await c.supabase
      .from("sales_orders")
      .select("id, order_number")
      .eq("quotation_id", quote.id)
      .maybeSingle();
    if (existing) throw new Error("ORDER_ALREADY_EXISTS");

    const order_number = await nextNumber(companyId, "sales_order", "SO");
    const { data: order, error: orderError } = await c.supabase
      .from("sales_orders")
      .insert({
        company_id: companyId,
        customer_id: quote.customer_id,
        quotation_id: quote.id,
        order_number,
        status: "confirmed",
        delivery_date: data.delivery_date || null,
        subtotal: quote.subtotal,
        discount_total: quote.discount_total ?? 0,
        vat_amount: quote.vat_amount,
        total: quote.total,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (orderError) {
      if (orderError.code === "23505") throw new Error("ORDER_ALREADY_EXISTS");
      throw new Error(orderError.message);
    }

    const items = (quote.quotation_items ?? []).map((i: any) => ({
      sales_order_id: order.id,
      description: i.description,
      unit: i.unit ?? "قطعة",
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount_percent: i.discount_percent ?? 0,
      discount_amount: i.discount_amount ?? 0,
      taxable_amount: i.taxable_amount ?? 0,
      vat_rate: i.vat_rate,
      vat_amount: i.vat_amount ?? 0,
      line_total: i.line_total,
    }));
    if (items.length) {
      const { error: itemsError } = await c.supabase.from("sales_order_items").insert(items);
      if (itemsError) throw new Error(itemsError.message);
    }

    const total = Number(quote.total);
    const { error: scheduleError } = await c.supabase.from("payment_schedules").insert(
      DEFAULT_SCHEDULE.map((p) => ({
        company_id: companyId,
        sales_order_id: order.id,
        sequence: p.sequence,
        label_ar: p.label_ar,
        label_en: p.label_en,
        percentage: p.percentage,
        amount: round((total * p.percentage) / 100),
        trigger_stage: p.trigger_stage,
        created_by: c.userId,
      })),
    );
    if (scheduleError) throw new Error(scheduleError.message);

    return { id: order.id, order_number };
  });

export const listPaymentSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sales_order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: rows, error } = await c.supabase
      .from("payment_schedules")
      .select("*")
      .eq("sales_order_id", data.sales_order_id)
      .order("sequence", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const savePaymentSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sales_order_id: z.string().uuid(),
        installments: z
          .array(
            z.object({
              label_ar: z.string().trim().min(2).max(120),
              label_en: z.string().trim().min(2).max(120),
              percentage: z.number().positive().max(100),
              trigger_stage: z.enum(["on_signature", "production_50", "before_delivery", "custom"]),
              due_date: z.string().optional().nullable(),
            }),
          )
          .min(1)
          .max(10),
      })
      .refine(
        (v) => Math.abs(v.installments.reduce((s, i) => s + i.percentage, 0) - 100) < 0.01,
        "SCHEDULE_MUST_TOTAL_100",
      )
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, MANAGER_ROLES);
    const companyId = await companyOf(c);
    const { data: order, error: orderError } = await c.supabase
      .from("sales_orders")
      .select("id, total")
      .eq("id", data.sales_order_id)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) throw new Error("ORDER_NOT_FOUND");

    const { error: delError } = await c.supabase
      .from("payment_schedules")
      .delete()
      .eq("sales_order_id", order.id);
    if (delError) throw new Error(delError.message);

    const total = Number(order.total);
    const { error } = await c.supabase.from("payment_schedules").insert(
      data.installments.map((i, idx) => ({
        company_id: companyId,
        sales_order_id: order.id,
        sequence: idx + 1,
        label_ar: i.label_ar,
        label_en: i.label_en,
        percentage: i.percentage,
        amount: round((total * i.percentage) / 100),
        trigger_stage: i.trigger_stage,
        due_date: i.due_date || null,
        created_by: c.userId,
      })),
    );
    if (error) throw new Error(error.message);

    await c.supabase.from("audit_logs").insert({
      company_id: companyId,
      user_id: c.userId,
      action: "payment_schedule.updated",
      entity: "sales_orders",
      entity_id: order.id,
      details: { installments: data.installments },
    });
    return { ok: true };
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sales_order_id: z.string().uuid(),
        amount: z.number().positive().max(100_000_000),
        method: z.string().trim().max(40).default("bank_transfer"),
        reference: z.string().trim().max(80).optional().nullable(),
        paid_at: z.string().optional().nullable(),
        note: z.string().trim().max(300).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const companyId = await companyOf(c);
    await requireRole(c, MANAGER_ROLES);
    const { error } = await c.supabase.from("payments").insert({
      company_id: companyId,
      sales_order_id: data.sales_order_id,
      amount: data.amount,
      method: data.method,
      reference: data.reference || null,
      paid_at: data.paid_at || new Date().toISOString().slice(0, 10),
      note: data.note || null,
      created_by: c.userId,
    });
    if (error) throw new Error(error.message);

    // allocate the payment across the schedule, oldest unpaid first
    const { data: paidRows } = await c.supabase
      .from("payments")
      .select("amount")
      .eq("sales_order_id", data.sales_order_id);
    let remaining = (paidRows ?? []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
    const { data: schedule } = await c.supabase
      .from("payment_schedules")
      .select("id, amount")
      .eq("sales_order_id", data.sales_order_id)
      .order("sequence", { ascending: true });
    for (const inst of (schedule ?? []) as { id: string; amount: number }[]) {
      const due = Number(inst.amount);
      const status = remaining >= due - 0.01 ? "paid" : remaining > 0 ? "partial" : "pending";
      remaining = Math.max(0, remaining - due);
      await c.supabase.from("payment_schedules").update({ status }).eq("id", inst.id);
    }
    return { ok: true };
  });

/* ---------------- Production & QC ---------------- */

const DEFAULT_STAGES = [
  { name_ar: "التجهيز والقص", name_en: "Cutting & preparation" },
  { name_ar: "التجميع", name_en: "Assembly" },
  { name_ar: "الدهان والتشطيب", name_en: "Finishing" },
  { name_ar: "فحص الجودة النهائي", name_en: "Final quality check" },
];

export const listProductionOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("production_orders")
      .select("*, production_stages(*), sales_orders(order_number, customers(name_ar))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProductionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sales_order_id: z.string().uuid(),
        due_date: z.string().optional().nullable(),
        notes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const companyId = await companyOf(c);
    const po_number = await nextNumber(companyId, "production_order", "PO");
    const { data: po, error } = await c.supabase
      .from("production_orders")
      .insert({
        company_id: companyId,
        sales_order_id: data.sales_order_id,
        po_number,
        status: "planned",
        start_date: new Date().toISOString().slice(0, 10),
        due_date: data.due_date || null,
        notes: data.notes || null,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: stageError } = await c.supabase.from("production_stages").insert(
      DEFAULT_STAGES.map((s, idx) => ({ ...s, production_order_id: po.id, sequence: idx + 1 })),
    );
    if (stageError) throw new Error(stageError.message);
    await c.supabase.from("sales_orders").update({ status: "in_production" }).eq("id", data.sales_order_id);
    return { id: po.id, po_number };
  });

export const updateProductionStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "in_progress", "passed", "failed"]),
        qc_notes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: stage, error } = await c.supabase
      .from("production_stages")
      .update({
        status: data.status,
        qc_notes: data.qc_notes || null,
        inspected_by: c.userId,
        inspected_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("production_order_id")
      .single();
    if (error) throw new Error(error.message);

    const { data: siblings } = await c.supabase
      .from("production_stages")
      .select("status")
      .eq("production_order_id", stage.production_order_id);
    const all = (siblings ?? []) as { status: string }[];
    const nextStatus = all.every((s) => s.status === "passed")
      ? "completed"
      : all.some((s) => s.status === "failed")
        ? "on_hold"
        : all.some((s) => s.status !== "pending")
          ? "in_progress"
          : "planned";
    await c.supabase
      .from("production_orders")
      .update({ status: nextStatus })
      .eq("id", stage.production_order_id);

    if (nextStatus === "completed") {
      const { data: po } = await c.supabase
        .from("production_orders")
        .select("sales_order_id")
        .eq("id", stage.production_order_id)
        .maybeSingle();
      if (po?.sales_order_id) {
        await c.supabase.from("sales_orders").update({ status: "ready" }).eq("id", po.sales_order_id);
      }
    }
    return { ok: true, productionStatus: nextStatus };
  });

/* ---------------- Invoicing (ZATCA QR) ---------------- */

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("invoices")
      .select("*, customers(name_ar, vat_number), invoice_items(*), sales_orders(order_number)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const issueInvoiceForOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sales_order_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const companyId = await companyOf(c);

    const { data: company, error: companyError } = await c.supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) throw new Error(companyError.message);
    if (!company) throw new Error("COMPANY_NOT_FOUND");

    const missing: string[] = [];
    if (!company.name_ar?.trim()) missing.push("name_ar");
    if (!/^[0-9]{15}$/.test((company.vat_number ?? "").trim())) missing.push("vat_number");
    for (const f of [
      "address_building_no",
      "address_street",
      "address_district",
      "address_city",
    ] as const) {
      if (!String(company[f] ?? "").trim()) missing.push(f);
    }
    if (!/^[0-9]{5}$/.test((company.address_postal_code ?? "").trim()))
      missing.push("address_postal_code");
    if (missing.length) {
      throw new Error(`COMPANY_DATA_INCOMPLETE:${missing.join(",")}`);
    }

    const { data: order, error: orderError } = await c.supabase
      .from("sales_orders")
      .select("*, sales_order_items(*)")
      .eq("id", data.sales_order_id)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) throw new Error("ORDER_NOT_FOUND");

    const { data: existing } = await c.supabase
      .from("invoices")
      .select("id")
      .eq("sales_order_id", order.id)
      .maybeSingle();
    if (existing) throw new Error("INVOICE_ALREADY_EXISTS");

    const issuedAt = new Date().toISOString();
    const invoice_number = await nextNumber(companyId, "invoice", "INV");
    const qr = buildZatcaQr({
      sellerName: company.name_ar,
      vatNumber: company.vat_number as string,
      timestamp: issuedAt,
      total: Number(order.total),
      vatAmount: Number(order.vat_amount),
    });

    const { data: invoice, error: invoiceError } = await c.supabase
      .from("invoices")
      .insert({
        company_id: companyId,
        customer_id: order.customer_id,
        sales_order_id: order.id,
        invoice_number,
        status: "issued",
        issued_at: issuedAt,
        subtotal: order.subtotal,
        vat_amount: order.vat_amount,
        total: order.total,
        qr_tlv: qr,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (invoiceError) throw new Error(invoiceError.message);

    const items = (order.sales_order_items ?? []).map((i: any) => ({
      invoice_id: invoice.id,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      vat_rate: i.vat_rate,
      line_total: i.line_total,
    }));
    if (items.length) await c.supabase.from("invoice_items").insert(items);

    await c.supabase.from("audit_logs").insert({
      company_id: companyId,
      user_id: c.userId,
      action: "issue_invoice",
      entity: "invoice",
      entity_id: invoice.id,
    });

    return { id: invoice.id, invoice_number, qr_tlv: qr };
  });

/* ---------------- Delivery notes ---------------- */

export const listDeliveryNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("delivery_notes")
      .select("*, customers(name_ar), sales_orders(order_number), delivery_note_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDeliveryNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sales_order_id: z.string().uuid(),
        received_by: z.string().trim().min(2).max(120),
        received_id_number: z.string().trim().max(30).optional().nullable(),
        notes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const companyId = await companyOf(c);
    const { data: order, error } = await c.supabase
      .from("sales_orders")
      .select("*, sales_order_items(*)")
      .eq("id", data.sales_order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("ORDER_NOT_FOUND");

    const { data: invoice } = await c.supabase
      .from("invoices")
      .select("id, status")
      .eq("sales_order_id", order.id)
      .maybeSingle();
    if (!invoice || invoice.status === "draft") throw new Error("INVOICE_REQUIRED_BEFORE_DELIVERY");

    const { data: mos, error: moError } = await c.supabase
      .from("manufacturing_orders")
      .select("id, status")
      .eq("sales_order_id", order.id)
      .neq("status", "cancelled");
    if (moError) throw new Error(moError.message);
    const openMos = (mos ?? []) as { id: string; status: string }[];
    if (openMos.some((m) => m.status !== "ready_for_delivery" && m.status !== "delivered")) {
      throw new Error("MANUFACTURING_NOT_READY_FOR_DELIVERY");
    }

    const dn_number = await nextNumber(companyId, "delivery_note", "DN");
    const { data: note, error: noteError } = await c.supabase
      .from("delivery_notes")
      .insert({
        company_id: companyId,
        sales_order_id: order.id,
        invoice_id: invoice.id,
        customer_id: order.customer_id,
        dn_number,
        status: "delivered",
        received_by: data.received_by,
        received_id_number: data.received_id_number || null,
        notes: data.notes || null,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (noteError) throw new Error(noteError.message);

    const items = (order.sales_order_items ?? []).map((i: any) => ({
      delivery_note_id: note.id,
      description: i.description,
      quantity: i.quantity,
    }));
    if (items.length) await c.supabase.from("delivery_note_items").insert(items);

    for (const m of openMos) {
      if (m.status === "ready_for_delivery") {
        await c.supabase.from("manufacturing_orders").update({ status: "delivered" }).eq("id", m.id);
      }
    }
    await c.supabase.from("sales_orders").update({ status: "delivered" }).eq("id", order.id);
    return { id: note.id, dn_number };
  });
