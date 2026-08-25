import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

const ADMIN = ["super_admin", "factory_owner", "general_manager"] as const;
const PURCH = [...ADMIN, "purchasing_manager"] as const;
const WAREHOUSE = [...ADMIN, "warehouse_manager", "purchasing_manager"] as const;
const QUALITY = [...ADMIN, "production_manager", "technician", "warehouse_manager"] as const;
const ACCOUNTING = [...ADMIN, "accountant"] as const;
const REQUESTERS = [...PURCH, "production_manager", "warehouse_manager"] as const;

/** Approval authority ceilings in SAR (null = unlimited). */
const APPROVAL_LIMITS: Record<string, number | null> = {
  super_admin: null,
  factory_owner: null,
  general_manager: 250_000,
  purchasing_manager: 50_000,
};

async function companyOf(c: Ctx): Promise<string> {
  const { data, error } = await c.supabase.from("profiles").select("company_id").eq("id", c.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("NO_COMPANY");
  return data.company_id as string;
}

async function rolesOf(c: Ctx): Promise<string[]> {
  const { data, error } = await c.supabase.from("user_roles").select("role").eq("user_id", c.userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: string }) => r.role as string);
}

async function requireRole(c: Ctx, allowed: readonly string[]) {
  const roles = await rolesOf(c);
  if (!roles.some((r) => allowed.includes(r))) throw new Error("FORBIDDEN_ROLE");
  return roles;
}

async function requireApprovalAuthority(c: Ctx, amount: number) {
  const roles = await requireRole(c, PURCH);
  const ceilings = roles.filter((r) => r in APPROVAL_LIMITS).map((r) => APPROVAL_LIMITS[r]);
  if (ceilings.length === 0) throw new Error("FORBIDDEN_ROLE");
  if (ceilings.some((v) => v === null)) return;
  const max = Math.max(...(ceilings as number[]));
  if (amount > max) throw new Error(`APPROVAL_LIMIT_EXCEEDED_${max}`);
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

function fail(error: { code?: string; message: string }, map: Record<string, string> = {}): never {
  if (error.code && map[error.code]) throw new Error(map[error.code]);
  throw new Error(error.message);
}

const uuid = z.string().uuid();
const money = z.number().nonnegative().max(100_000_000);
const qty = z.number().positive().max(1_000_000);
const vatNumber = z
  .string()
  .trim()
  .regex(/^[0-9]{15}$/, "VAT_NUMBER_INVALID")
  .optional()
  .nullable()
  .or(z.literal(""));

/* ================= Suppliers ================= */

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("suppliers")
      .select("*, supplier_contacts(id, name, title, email, phone, is_primary)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const supplierInput = z.object({
  code: z.string().trim().min(1).max(20),
  name_ar: z.string().trim().min(2).max(160),
  name_en: z.string().trim().max(160).optional().nullable(),
  vat_number: vatNumber,
  cr_number: z.string().trim().max(30).optional().nullable(),
  iban: z
    .string()
    .trim()
    .regex(/^SA[0-9]{22}$/, "IBAN_INVALID")
    .optional()
    .nullable()
    .or(z.literal("")),
  bank_name: z.string().trim().max(120).optional().nullable(),
  payment_terms_days: z.number().int().min(0).max(365).default(30),
  category: z.string().trim().max(80).optional().nullable(),
  status: z.enum(["active", "on_hold", "blocked"]).default("active"),
  email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const DUP_MAP = { "23505": "SUPPLIER_DUPLICATE" };

function normalizeSupplier(input: z.infer<typeof supplierInput>) {
  const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, blankToNull(v)]));
}

export const createSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => supplierInput.parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, PURCH);
    const company_id = await companyOf(c);
    const { data: row, error } = await c.supabase
      .from("suppliers")
      .insert({ ...normalizeSupplier(data), company_id, created_by: c.userId })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        const detail = String(error.message);
        if (detail.includes("vat")) throw new Error("SUPPLIER_VAT_DUPLICATE");
        if (detail.includes("cr")) throw new Error("SUPPLIER_CR_DUPLICATE");
        throw new Error("SUPPLIER_CODE_DUPLICATE");
      }
      fail(error, DUP_MAP);
    }
    return row;
  });

export const updateSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => supplierInput.partial().extend({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, PURCH);
    const { id, ...patch } = data;
    const { error } = await c.supabase.from("suppliers").update(normalizeSupplier(patch as never)).eq("id", id);
    if (error) {
      if (error.code === "23505") throw new Error("SUPPLIER_VAT_DUPLICATE");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const addSupplierContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        supplier_id: uuid,
        name: z.string().trim().min(2).max(120),
        title: z.string().trim().max(80).optional().nullable(),
        email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
        phone: z.string().trim().max(30).optional().nullable(),
        is_primary: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, PURCH);
    const company_id = await companyOf(c);
    const { error } = await c.supabase
      .from("supplier_contacts")
      .insert({ ...data, email: data.email || null, company_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ================= Purchase requests ================= */

const prItem = z.object({
  item_id: uuid.optional().nullable(),
  description: z.string().trim().min(2).max(300),
  unit: z.string().trim().min(1).max(30),
  quantity: qty,
  specification: z.string().trim().max(500).optional().nullable(),
  estimated_price: money.default(0),
});

export const listPurchaseRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("purchase_requests")
      .select("*, purchase_request_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPurchaseRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        needed_date: z.string().date().optional().nullable(),
        justification: z.string().trim().max(1000).optional().nullable(),
        manufacturing_order_id: uuid.optional().nullable(),
        items: z.array(prItem).min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, REQUESTERS);
    const company_id = await companyOf(c);
    const pr_number = await nextNumber(company_id, "purchase_request", "PR");
    const estimated_total = data.items.reduce((s, i) => s + i.quantity * i.estimated_price, 0);
    const { data: pr, error } = await c.supabase
      .from("purchase_requests")
      .insert({
        company_id,
        pr_number,
        needed_date: data.needed_date ?? null,
        justification: data.justification ?? null,
        manufacturing_order_id: data.manufacturing_order_id ?? null,
        estimated_total: Math.round(estimated_total * 100) / 100,
        requested_by: c.userId,
      })
      .select("id, pr_number")
      .single();
    if (error) throw new Error(error.message);
    const { error: iErr } = await c.supabase.from("purchase_request_items").insert(
      data.items.map((i) => ({
        ...i,
        item_id: i.item_id ?? null,
        specification: i.specification ?? null,
        company_id,
        purchase_request_id: pr.id,
      })),
    );
    if (iErr) throw new Error(iErr.message);
    return pr;
  });

/** Builds a purchase request from the shortfall of a manufacturing order's BOM. */
export const createPurchaseRequestFromBom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ manufacturing_order_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, REQUESTERS);
    const company_id = await companyOf(c);
    const { data: lines, error } = await c.supabase
      .from("bom_lines")
      .select("id, item_id, planned_qty, issued_qty, reserved_qty, items(sku, name_ar, unit, standard_cost)")
      .eq("manufacturing_order_id", data.manufacturing_order_id);
    if (error) throw new Error(error.message);
    if (!lines?.length) throw new Error("BOM_EMPTY");

    const { data: balances, error: bErr } = await c.supabase
      .from("stock_balances")
      .select("item_id, quantity, reserved_quantity");
    if (bErr) throw new Error(bErr.message);
    const available = new Map<string, number>();
    for (const b of balances ?? [])
      available.set(b.item_id, (available.get(b.item_id) ?? 0) + Number(b.quantity) - Number(b.reserved_quantity));

    const shortfalls = lines
      .map((l: any) => {
        const need = Number(l.planned_qty) - Number(l.issued_qty ?? 0) - Number(l.reserved_qty ?? 0);
        const gap = need - (available.get(l.item_id) ?? 0);
        return { line: l, gap: Math.round(gap * 1000) / 1000 };
      })
      .filter((s: { gap: number }) => s.gap > 0);
    if (shortfalls.length === 0) throw new Error("NO_SHORTFALL");

    const pr_number = await nextNumber(company_id, "purchase_request", "PR");
    const estimated_total = shortfalls.reduce(
      (s: number, x: any) => s + x.gap * Number(x.line.items?.standard_cost ?? 0),
      0,
    );
    const { data: pr, error: pErr } = await c.supabase
      .from("purchase_requests")
      .insert({
        company_id,
        pr_number,
        manufacturing_order_id: data.manufacturing_order_id,
        justification: "نقص مواد وفق قائمة مواد أمر التصنيع",
        estimated_total: Math.round(estimated_total * 100) / 100,
        requested_by: c.userId,
      })
      .select("id, pr_number")
      .single();
    if (pErr) throw new Error(pErr.message);
    const { error: iErr } = await c.supabase.from("purchase_request_items").insert(
      shortfalls.map((s: any) => ({
        company_id,
        purchase_request_id: pr.id,
        item_id: s.line.item_id,
        description: s.line.items?.name_ar ?? s.line.items?.sku ?? "مادة",
        unit: s.line.items?.unit ?? "قطعة",
        quantity: s.gap,
        estimated_price: Number(s.line.items?.standard_cost ?? 0),
      })),
    );
    if (iErr) throw new Error(iErr.message);
    return pr;
  });

export const setPurchaseRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["submitted", "approved", "rejected", "cancelled"]),
        rejection_reason: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: pr, error } = await c.supabase
      .from("purchase_requests")
      .select("id, status, estimated_total, pr_number, company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pr) throw new Error("PR_NOT_FOUND");

    const allowed: Record<string, string[]> = {
      draft: ["submitted", "cancelled"],
      submitted: ["approved", "rejected", "cancelled"],
      approved: ["converted", "cancelled"],
      rejected: [],
      converted: [],
      cancelled: [],
    };
    if (!allowed[pr.status]?.includes(data.status)) throw new Error(`INVALID_PR_TRANSITION_${pr.status}_TO_${data.status}`);

    if (data.status === "submitted") await requireRole(c, REQUESTERS);
    if (data.status === "approved") await requireApprovalAuthority(c, Number(pr.estimated_total));
    if (data.status === "rejected") {
      await requireRole(c, PURCH);
      if (!data.rejection_reason) throw new Error("REJECTION_REASON_REQUIRED");
    }

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "approved") {
      patch.approved_by = c.userId;
      patch.approved_at = new Date().toISOString();
    }
    if (data.status === "rejected") patch.rejection_reason = data.rejection_reason;
    const { error: uErr } = await c.supabase.from("purchase_requests").update(patch).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      company_id: pr.company_id,
      user_id: c.userId,
      action: `purchase_request.${data.status}`,
      entity: "purchase_requests",
      entity_id: pr.id,
      details: { pr_number: pr.pr_number, from: pr.status, to: data.status },
    });
    return { ok: true };
  });

/* ================= RFQ ================= */

export const listRfqs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("rfqs")
      .select("*, purchase_requests(pr_number), rfq_suppliers(*, suppliers(name_ar, code, payment_terms_days))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        purchase_request_id: uuid.optional().nullable(),
        due_date: z.string().date().optional().nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
        supplier_ids: z.array(uuid).min(1).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, PURCH);
    const company_id = await companyOf(c);
    const rfq_number = await nextNumber(company_id, "rfq", "RFQ");
    const { data: rfq, error } = await c.supabase
      .from("rfqs")
      .insert({
        company_id,
        rfq_number,
        purchase_request_id: data.purchase_request_id ?? null,
        due_date: data.due_date ?? null,
        notes: data.notes ?? null,
        created_by: c.userId,
      })
      .select("id, rfq_number")
      .single();
    if (error) throw new Error(error.message);
    const { error: sErr } = await c.supabase
      .from("rfq_suppliers")
      .insert(data.supplier_ids.map((supplier_id) => ({ company_id, rfq_id: rfq.id, supplier_id })));
    if (sErr) throw new Error(sErr.message);
    return rfq;
  });

export const saveRfqQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        rfq_supplier_id: uuid,
        subtotal: money,
        vat_rate: z.number().min(0).max(100).default(15),
        lead_time_days: z.number().int().min(0).max(365).optional().nullable(),
        payment_terms_days: z.number().int().min(0).max(365).optional().nullable(),
        quality_score: z.number().min(0).max(10).optional().nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, PURCH);
    const vat_amount = Math.round(((data.subtotal * data.vat_rate) / 100) * 100) / 100;
    const { error } = await c.supabase
      .from("rfq_suppliers")
      .update({
        subtotal: data.subtotal,
        vat_amount,
        total: Math.round((data.subtotal + vat_amount) * 100) / 100,
        lead_time_days: data.lead_time_days ?? null,
        payment_terms_days: data.payment_terms_days ?? null,
        quality_score: data.quality_score ?? null,
        notes: data.notes ?? null,
      })
      .eq("id", data.rfq_supplier_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const awardRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ rfq_supplier_id: uuid, award_reason: z.string().trim().min(5).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: quote, error } = await c.supabase
      .from("rfq_suppliers")
      .select("id, rfq_id, supplier_id, total, company_id, rfqs(status, rfq_number)")
      .eq("id", data.rfq_supplier_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("QUOTE_NOT_FOUND");
    if (quote.rfqs?.status === "awarded") throw new Error("RFQ_ALREADY_AWARDED");
    await requireApprovalAuthority(c, Number(quote.total));

    const { error: qErr } = await c.supabase.from("rfq_suppliers").update({ is_awarded: true }).eq("id", quote.id);
    if (qErr) throw new Error(qErr.message);
    const { error: rErr } = await c.supabase
      .from("rfqs")
      .update({
        status: "awarded",
        awarded_supplier_id: quote.supplier_id,
        award_reason: data.award_reason,
        awarded_by: c.userId,
        awarded_at: new Date().toISOString(),
      })
      .eq("id", quote.rfq_id);
    if (rErr) throw new Error(rErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      company_id: quote.company_id,
      user_id: c.userId,
      action: "rfq.awarded",
      entity: "rfqs",
      entity_id: quote.rfq_id,
      details: { supplier_id: quote.supplier_id, total: quote.total, reason: data.award_reason },
    });
    return { ok: true };
  });

/* ================= Purchase orders ================= */

const poItem = z.object({
  item_id: uuid.optional().nullable(),
  purchase_request_item_id: uuid.optional().nullable(),
  description: z.string().trim().min(2).max(300),
  unit: z.string().trim().min(1).max(30),
  quantity: qty,
  unit_price: money,
  discount_percent: z.number().min(0).max(100).default(0),
  vat_rate: z.number().min(0).max(100).default(15),
});

export const listPurchaseOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("purchase_orders")
      .select("*, suppliers(name_ar, code), purchase_order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        supplier_id: uuid,
        purchase_request_id: uuid.optional().nullable(),
        rfq_id: uuid.optional().nullable(),
        expected_date: z.string().date().optional().nullable(),
        tax_treatment: z.enum(["standard", "exempt", "out_of_scope"]).default("standard"),
        tax_exemption_reason: z.string().trim().max(300).optional().nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
        items: z.array(poItem).min(1).max(200),
      })
      .refine((v) => v.tax_treatment === "standard" || !!v.tax_exemption_reason?.trim(), {
        message: "TAX_EXEMPTION_REASON_REQUIRED",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, PURCH);
    const company_id = await companyOf(c);
    const po_number = await nextNumber(company_id, "purchase_order", "PO");
    const { data: po, error } = await c.supabase
      .from("purchase_orders")
      .insert({
        company_id,
        po_number,
        supplier_id: data.supplier_id,
        purchase_request_id: data.purchase_request_id ?? null,
        rfq_id: data.rfq_id ?? null,
        expected_date: data.expected_date ?? null,
        tax_treatment: data.tax_treatment,
        tax_exemption_reason: data.tax_treatment === "standard" ? null : data.tax_exemption_reason,
        notes: data.notes ?? null,
        created_by: c.userId,
      })
      .select("id, po_number")
      .single();
    if (error) throw new Error(error.message);

    // Totals and per-line tax are computed by database triggers, never by the client.
    const { error: iErr } = await c.supabase.from("purchase_order_items").insert(
      data.items.map((i) => ({
        company_id,
        purchase_order_id: po.id,
        item_id: i.item_id ?? null,
        purchase_request_item_id: i.purchase_request_item_id ?? null,
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent,
        vat_rate: data.tax_treatment === "standard" ? i.vat_rate : 0,
      })),
    );
    if (iErr) throw new Error(iErr.message);

    if (data.purchase_request_id) {
      await c.supabase.from("purchase_requests").update({ status: "converted" }).eq("id", data.purchase_request_id).eq("status", "approved");
    }
    return po;
  });

export const setPurchaseOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["approved", "cancelled", "closed"]),
        reason: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: po, error } = await c.supabase
      .from("purchase_orders")
      .select("id, total, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!po) throw new Error("PO_NOT_FOUND");
    if (data.status === "approved") await requireApprovalAuthority(c, Number(po.total));
    else await requireRole(c, PURCH);
    if (data.status === "cancelled" && !data.reason) throw new Error("CANCEL_REASON_REQUIRED");

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "approved") {
      patch.approved_by = c.userId;
      patch.approved_at = new Date().toISOString();
    }
    if (data.status === "cancelled") patch.cancelled_reason = data.reason;
    const { error: uErr } = await c.supabase.from("purchase_orders").update(patch).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

/* ================= Goods receipts ================= */

export const listGoodsReceipts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("goods_receipts")
      .select("*, suppliers(name_ar), purchase_orders(po_number), warehouses(name_ar), goods_receipt_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createGoodsReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        purchase_order_id: uuid,
        warehouse_id: uuid,
        location_id: uuid.optional().nullable(),
        receipt_date: z.string().date().optional().nullable(),
        delivery_note_ref: z.string().trim().max(60).optional().nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
        over_receipt_reason: z.string().trim().max(300).optional().nullable(),
        lines: z
          .array(
            z.object({
              purchase_order_item_id: uuid,
              item_id: uuid.optional().nullable(),
              quantity_received: qty,
              quantity_rejected: z.number().min(0).max(1_000_000).default(0),
              rejection_reason: z.string().trim().max(300).optional().nullable(),
              qc_note: z.string().trim().max(500).optional().nullable(),
            }),
          )
          .min(1)
          .max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const roles = await requireRole(c, WAREHOUSE);
    const company_id = await companyOf(c);
    for (const l of data.lines) if (l.quantity_rejected > l.quantity_received) throw new Error("REJECTED_EXCEEDS_RECEIVED");

    const { data: po, error: poErr } = await c.supabase
      .from("purchase_orders")
      .select("id, supplier_id, status")
      .eq("id", data.purchase_order_id)
      .maybeSingle();
    if (poErr) throw new Error(poErr.message);
    if (!po) throw new Error("PO_NOT_FOUND");

    const canApproveOver = roles.some((r) => (ADMIN as readonly string[]).includes(r) || r === "warehouse_manager");
    const grn_number = await nextNumber(company_id, "goods_receipt", "GRN");
    const { data: grn, error } = await c.supabase
      .from("goods_receipts")
      .insert({
        company_id,
        grn_number,
        purchase_order_id: po.id,
        supplier_id: po.supplier_id,
        warehouse_id: data.warehouse_id,
        location_id: data.location_id ?? null,
        receipt_date: data.receipt_date ?? new Date().toISOString().slice(0, 10),
        delivery_note_ref: data.delivery_note_ref ?? null,
        notes: data.notes ?? null,
        inspected_by: c.userId,
        over_receipt_approved_by: data.over_receipt_reason && canApproveOver ? c.userId : null,
        over_receipt_reason: data.over_receipt_reason ?? null,
        created_by: c.userId,
      })
      .select("id, grn_number")
      .single();
    if (error) throw new Error(error.message);

    const { error: lErr } = await c.supabase.from("goods_receipt_items").insert(
      data.lines.map((l) => ({
        company_id,
        goods_receipt_id: grn.id,
        purchase_order_item_id: l.purchase_order_item_id,
        item_id: l.item_id ?? null,
        quantity_received: l.quantity_received,
        quantity_accepted: Math.round((l.quantity_received - l.quantity_rejected) * 1000) / 1000,
        quantity_rejected: l.quantity_rejected,
        rejection_reason: l.rejection_reason ?? null,
        qc_note: l.qc_note ?? null,
      })),
    );
    if (lErr) {
      await c.supabase.from("goods_receipts").delete().eq("id", grn.id);
      throw new Error(lErr.message);
    }
    return grn;
  });

/** Posts a draft receipt: accepted quantities become idempotent stock receipts. */
export const postGoodsReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ goods_receipt_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, WAREHOUSE);
    const company_id = await companyOf(c);
    const { data: grn, error } = await c.supabase
      .from("goods_receipts")
      .select("*, goods_receipt_items(*, purchase_order_items(id, item_id, quantity, unit_price, received_quantity))")
      .eq("id", data.goods_receipt_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!grn) throw new Error("GRN_NOT_FOUND");
    if (grn.status !== "draft") throw new Error("GRN_ALREADY_POSTED");

    for (const line of grn.goods_receipt_items ?? []) {
      const itemId = line.item_id ?? line.purchase_order_items?.item_id;
      if (Number(line.quantity_accepted) <= 0) continue;
      if (!itemId) throw new Error("GRN_LINE_WITHOUT_ITEM");
      const { error: mErr } = await c.supabase.from("stock_movements").insert({
        company_id,
        item_id: itemId,
        movement_type: "receipt",
        quantity: line.quantity_accepted,
        unit_cost: line.purchase_order_items?.unit_price ?? 0,
        warehouse_id: grn.warehouse_id,
        location_id: grn.location_id,
        reference_type: "goods_receipt",
        reference_id: grn.id,
        idempotency_key: `grn:${grn.id}:${line.id}`,
        note: grn.grn_number,
        created_by: c.userId,
      });
      if (mErr && mErr.code !== "23505") throw new Error(mErr.message);

      const poItemRow = line.purchase_order_items;
      if (poItemRow) {
        const newReceived = Number(poItemRow.received_quantity) + Number(line.quantity_accepted);
        const { error: uErr } = await c.supabase
          .from("purchase_order_items")
          .update({ received_quantity: newReceived })
          .eq("id", poItemRow.id);
        if (uErr) throw new Error(uErr.message);
      }
    }

    const { error: sErr } = await c.supabase
      .from("goods_receipts")
      .update({ status: "posted", posted_at: new Date().toISOString() })
      .eq("id", grn.id)
      .eq("status", "draft");
    if (sErr) throw new Error(sErr.message);

    // Recompute PO fulfilment state from persisted quantities.
    const { data: items } = await c.supabase
      .from("purchase_order_items")
      .select("quantity, received_quantity")
      .eq("purchase_order_id", grn.purchase_order_id);
    const complete = (items ?? []).every((i: any) => Number(i.received_quantity) >= Number(i.quantity));
    const any = (items ?? []).some((i: any) => Number(i.received_quantity) > 0);
    if (any) {
      const { data: po } = await c.supabase
        .from("purchase_orders")
        .select("status")
        .eq("id", grn.purchase_order_id)
        .maybeSingle();
      const target = complete ? "received" : "partially_received";
      if (po && po.status !== target && ["approved", "partially_received"].includes(po.status)) {
        await c.supabase.from("purchase_orders").update({ status: target }).eq("id", grn.purchase_order_id);
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      company_id,
      user_id: c.userId,
      action: "goods_receipt.posted",
      entity: "goods_receipts",
      entity_id: grn.id,
      details: { grn_number: grn.grn_number, po: grn.purchase_order_id },
    });
    return { ok: true };
  });

/* ================= Supplier invoices ================= */

export const listSupplierInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("supplier_invoices")
      .select("*, suppliers(name_ar), purchase_orders(po_number, total), payment_requests(id, amount, status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSupplierInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        supplier_id: uuid,
        purchase_order_id: uuid.optional().nullable(),
        supplier_invoice_number: z.string().trim().min(1).max(60),
        invoice_date: z.string().date(),
        due_date: z.string().date().optional().nullable(),
        tax_treatment: z.enum(["standard", "exempt", "out_of_scope"]).default("standard"),
        subtotal: money.default(0),
        vat_amount: money.default(0),
        lines: z
          .array(
            z.object({
              purchase_order_item_id: uuid.optional().nullable(),
              item_id: uuid.optional().nullable(),
              description: z.string().trim().min(1).max(300),
              unit: z.string().trim().min(1).max(20).default("pcs"),
              quantity: qty,
              unit_price: money,
              discount_percent: z.number().min(0).max(100).default(0),
              vat_rate: z.number().min(0).max(100).default(15),
            }),
          )
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...ACCOUNTING, "purchasing_manager"]);
    const company_id = await companyOf(c);
    const vat = data.tax_treatment === "standard" ? data.vat_amount : 0;
    const { data: row, error } = await c.supabase
      .from("supplier_invoices")
      .insert({
        company_id,
        supplier_id: data.supplier_id,
        purchase_order_id: data.purchase_order_id ?? null,
        supplier_invoice_number: data.supplier_invoice_number,
        invoice_date: data.invoice_date,
        due_date: data.due_date ?? null,
        tax_treatment: data.tax_treatment,
        subtotal: data.subtotal,
        vat_amount: vat,
        total: Math.round((data.subtotal + vat) * 100) / 100,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("DUPLICATE_SUPPLIER_INVOICE");
      throw new Error(error.message);
    }
    if (data.lines?.length) {
      const { error: lineErr } = await c.supabase.from("supplier_invoice_items").insert(
        data.lines.map((l) => ({
          company_id,
          supplier_invoice_id: row.id,
          purchase_order_item_id: l.purchase_order_item_id ?? null,
          item_id: l.item_id ?? null,
          description: l.description,
          unit: l.unit,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          vat_rate: data.tax_treatment === "standard" ? l.vat_rate : 0,
        })),
      );
      if (lineErr) {
        await c.supabase.from("supplier_invoices").delete().eq("id", row.id);
        throw new Error(lineErr.message);
      }
    }
    return row;
  });

export const listSupplierInvoiceItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ supplier_invoice_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: rows, error } = await c.supabase
      .from("supplier_invoice_items")
      .select("*")
      .eq("supplier_invoice_id", data.supplier_invoice_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteSupplierInvoiceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...ACCOUNTING, "purchasing_manager"]);
    const { error } = await c.supabase.from("supplier_invoice_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** PO ↔ GRN ↔ Invoice three-way match; never posts an accounting entry. */
export const matchSupplierInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ supplier_invoice_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...ACCOUNTING, "purchasing_manager"]);
    const { data: inv, error } = await c.supabase
      .from("supplier_invoices")
      .select("id, purchase_order_id, subtotal, total, status")
      .eq("id", data.supplier_invoice_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("SUPPLIER_INVOICE_NOT_FOUND");
    if (!inv.purchase_order_id) throw new Error("INVOICE_NOT_LINKED_TO_PO");

    const { data: poItems } = await c.supabase
      .from("purchase_order_items")
      .select("id, quantity, received_quantity, unit_price, taxable_amount")
      .eq("purchase_order_id", inv.purchase_order_id);
    const { data: grns } = await c.supabase
      .from("goods_receipts")
      .select("id, status")
      .eq("purchase_order_id", inv.purchase_order_id)
      .eq("status", "posted");

    let match_status: string;
    let note: string | null = null;
    const receivedValue = (poItems ?? []).reduce(
      (s: number, i: any) => s + Number(i.received_quantity) * Number(i.unit_price),
      0,
    );
    if (!grns?.length) {
      match_status = "no_receipt";
      note = "لا يوجد محضر استلام مرحّل لأمر الشراء";
    } else if ((poItems ?? []).some((i: any) => Number(i.received_quantity) < Number(i.quantity))) {
      match_status = "qty_variance";
      note = "الكميات المستلمة أقل من المطلوبة في أمر الشراء";
    } else if (Math.abs(receivedValue - Number(inv.subtotal)) > 1) {
      match_status = "price_variance";
      note = `قيمة الفاتورة ${inv.subtotal} تختلف عن قيمة المستلم ${Math.round(receivedValue * 100) / 100}`;
    } else {
      match_status = "matched";
    }
    const status = match_status === "matched" ? "matched" : "discrepancy";
    const { error: uErr } = await c.supabase
      .from("supplier_invoices")
      .update({ match_status, discrepancy_note: note, status })
      .eq("id", inv.id);
    if (uErr) throw new Error(uErr.message);
    return { match_status, note };
  });

export const approveSupplierInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ supplier_invoice_id: uuid, override_reason: z.string().trim().max(500).optional().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: inv, error } = await c.supabase
      .from("supplier_invoices")
      .select("id, total, match_status, status, company_id, supplier_invoice_number")
      .eq("id", data.supplier_invoice_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("SUPPLIER_INVOICE_NOT_FOUND");
    if (inv.status === "void") throw new Error("INVOICE_VOID");
    if (inv.match_status !== "matched") {
      // Discrepancies stay blocked unless an authorised approver documents an override.
      await requireRole(c, ADMIN);
      if (!data.override_reason) throw new Error("OVERRIDE_REASON_REQUIRED");
    } else {
      await requireApprovalAuthority(c, Number(inv.total));
    }
    const { error: uErr } = await c.supabase
      .from("supplier_invoices")
      .update({
        status: "approved",
        approved_by: c.userId,
        approved_at: new Date().toISOString(),
        discrepancy_note: data.override_reason ?? null,
      })
      .eq("id", inv.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

/* ================= Payment requests ================= */

export const listPaymentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("payment_requests")
      .select("*, suppliers(name_ar), supplier_invoices(supplier_invoice_number, total, status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        supplier_invoice_id: uuid,
        amount: z.number().positive().max(100_000_000),
        due_date: z.string().date().optional().nullable(),
        method: z.enum(["bank_transfer", "cheque", "cash"]).default("bank_transfer"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...ACCOUNTING, "purchasing_manager"]);
    const company_id = await companyOf(c);
    const { data: inv, error } = await c.supabase
      .from("supplier_invoices")
      .select("id, supplier_id")
      .eq("id", data.supplier_invoice_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) throw new Error("SUPPLIER_INVOICE_NOT_FOUND");
    const pay_number = await nextNumber(company_id, "payment_request", "PAY");
    const { data: row, error: iErr } = await c.supabase
      .from("payment_requests")
      .insert({
        company_id,
        pay_number,
        supplier_id: inv.supplier_id,
        supplier_invoice_id: inv.id,
        amount: data.amount,
        due_date: data.due_date ?? null,
        method: data.method,
        requested_by: c.userId,
      })
      .select("id, pay_number")
      .single();
    if (iErr) throw new Error(iErr.message);
    return row;
  });

export const setPaymentRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["submitted", "approved", "rejected", "cancelled"]),
        rejection_reason: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: pay, error } = await c.supabase
      .from("payment_requests")
      .select("id, status, amount")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pay) throw new Error("PAYMENT_REQUEST_NOT_FOUND");
    const allowed: Record<string, string[]> = {
      draft: ["submitted", "cancelled"],
      submitted: ["approved", "rejected", "cancelled"],
      approved: ["cancelled"],
      rejected: [],
      executed: [],
      cancelled: [],
    };
    if (!allowed[pay.status]?.includes(data.status)) throw new Error(`INVALID_PAY_TRANSITION_${pay.status}_TO_${data.status}`);
    if (data.status === "approved") await requireApprovalAuthority(c, Number(pay.amount));
    else await requireRole(c, [...ACCOUNTING, "purchasing_manager"]);
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "approved") {
      patch.approved_by = c.userId;
      patch.approved_at = new Date().toISOString();
    }
    if (data.status === "rejected") {
      if (!data.rejection_reason) throw new Error("REJECTION_REASON_REQUIRED");
      patch.rejection_reason = data.rejection_reason;
    }
    const { error: uErr } = await c.supabase.from("payment_requests").update(patch).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

/**
 * Marks a payment as executed. Requires approval, a bank reference and an explicit
 * confirmation that the accounting entry was posted — enforced again by a DB constraint.
 */
export const executePaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        bank_reference: z.string().trim().min(3).max(80),
        accounting_posted: z.literal(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, ACCOUNTING);
    const { data: pay, error } = await c.supabase
      .from("payment_requests")
      .select("id, status, approved_by, supplier_invoice_id, amount")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pay) throw new Error("PAYMENT_REQUEST_NOT_FOUND");
    if (pay.status !== "approved" || !pay.approved_by) throw new Error("PAYMENT_EXECUTION_REQUIREMENTS");

    const { error: uErr } = await c.supabase
      .from("payment_requests")
      .update({
        status: "executed",
        bank_reference: data.bank_reference,
        accounting_posted: true,
        executed_at: new Date().toISOString(),
      })
      .eq("id", pay.id)
      .eq("status", "approved");
    if (uErr) {
      if (uErr.code === "23505") throw new Error("BANK_REFERENCE_DUPLICATE");
      throw new Error(uErr.message);
    }

    const { data: inv } = await c.supabase
      .from("supplier_invoices")
      .select("total")
      .eq("id", pay.supplier_invoice_id)
      .maybeSingle();
    const { data: paid } = await c.supabase
      .from("payment_requests")
      .select("amount")
      .eq("supplier_invoice_id", pay.supplier_invoice_id)
      .eq("status", "executed");
    const sum = (paid ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
    if (inv && sum >= Number(inv.total) - 0.01) {
      await c.supabase.from("supplier_invoices").update({ status: "paid" }).eq("id", pay.supplier_invoice_id);
    }
    return { ok: true };
  });

/* ================= Supplier returns & debit notes ================= */

export const listSupplierReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("supplier_returns")
      .select("*, suppliers(name_ar), supplier_return_items(*, items(sku, name_ar, unit))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSupplierReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        supplier_id: uuid,
        purchase_order_id: uuid.optional().nullable(),
        goods_receipt_id: uuid.optional().nullable(),
        supplier_invoice_id: uuid.optional().nullable(),
        warehouse_id: uuid,
        reason: z.string().trim().min(3).max(500),
        lines: z
          .array(z.object({ item_id: uuid, quantity: qty, unit_price: money.default(0), note: z.string().trim().max(300).optional().nullable() }))
          .min(1)
          .max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, WAREHOUSE);
    const company_id = await companyOf(c);
    const return_number = await nextNumber(company_id, "supplier_return", "SRT");
    const { data: ret, error } = await c.supabase
      .from("supplier_returns")
      .insert({
        company_id,
        return_number,
        supplier_id: data.supplier_id,
        purchase_order_id: data.purchase_order_id ?? null,
        goods_receipt_id: data.goods_receipt_id ?? null,
        supplier_invoice_id: data.supplier_invoice_id ?? null,
        reason: data.reason,
        created_by: c.userId,
      })
      .select("id, return_number")
      .single();
    if (error) throw new Error(error.message);
    const { error: lErr } = await c.supabase.from("supplier_return_items").insert(
      data.lines.map((l) => ({
        company_id,
        supplier_return_id: ret.id,
        item_id: l.item_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        note: l.note ?? null,
      })),
    );
    if (lErr) throw new Error(lErr.message);
    return { ...ret, warehouse_id: data.warehouse_id };
  });

export const postSupplierReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ supplier_return_id: uuid, warehouse_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, WAREHOUSE);
    const company_id = await companyOf(c);
    const { data: ret, error } = await c.supabase
      .from("supplier_returns")
      .select("*, supplier_return_items(*)")
      .eq("id", data.supplier_return_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ret) throw new Error("RETURN_NOT_FOUND");
    if (ret.status !== "draft") throw new Error("RETURN_ALREADY_POSTED");

    for (const line of ret.supplier_return_items ?? []) {
      const { error: mErr } = await c.supabase.from("stock_movements").insert({
        company_id,
        item_id: line.item_id,
        movement_type: "return_to_supplier",
        quantity: line.quantity,
        unit_cost: line.unit_price,
        warehouse_id: data.warehouse_id,
        reference_type: "supplier_return",
        reference_id: ret.id,
        idempotency_key: `srt:${ret.id}:${line.id}`,
        note: ret.return_number,
        created_by: c.userId,
      });
      if (mErr && mErr.code !== "23505") throw new Error(mErr.message);
    }
    const { error: uErr } = await c.supabase
      .from("supplier_returns")
      .update({ status: "posted", posted_at: new Date().toISOString() })
      .eq("id", ret.id)
      .eq("status", "draft");
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

export const createDebitNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        supplier_id: uuid,
        supplier_return_id: uuid.optional().nullable(),
        supplier_invoice_id: uuid.optional().nullable(),
        subtotal: money,
        vat_rate: z.number().min(0).max(100).default(15),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...ACCOUNTING, "purchasing_manager"]);
    const company_id = await companyOf(c);
    const dn_number = await nextNumber(company_id, "debit_note", "DBN");
    const vat_amount = Math.round(((data.subtotal * data.vat_rate) / 100) * 100) / 100;
    const { data: row, error } = await c.supabase
      .from("debit_notes")
      .insert({
        company_id,
        dn_number,
        supplier_id: data.supplier_id,
        supplier_return_id: data.supplier_return_id ?? null,
        supplier_invoice_id: data.supplier_invoice_id ?? null,
        subtotal: data.subtotal,
        vat_amount,
        total: Math.round((data.subtotal + vat_amount) * 100) / 100,
        reason: data.reason,
        created_by: c.userId,
      })
      .select("id, dn_number")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listDebitNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("debit_notes")
      .select("*, suppliers(name_ar)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Supplier account statement: invoiced vs. paid vs. debit notes, computed server-side. */
export const getSupplierAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const [suppliersRes, invoicesRes, paymentsRes, debitsRes] = await Promise.all([
      c.supabase.from("suppliers").select("id, code, name_ar, name_en, payment_terms_days, status").order("name_ar"),
      c.supabase.from("supplier_invoices").select("id, supplier_id, total, status, due_date"),
      c.supabase.from("payment_requests").select("id, supplier_id, amount, status"),
      c.supabase.from("debit_notes").select("id, supplier_id, total"),
    ]);
    for (const r of [suppliersRes, invoicesRes, paymentsRes, debitsRes]) {
      if (r.error) throw new Error(r.error.message);
    }
    const round = (v: number) => Math.round(v * 100) / 100;
    const today = new Date().toISOString().slice(0, 10);

    return (suppliersRes.data ?? []).map((s: any) => {
      const invoices = (invoicesRes.data ?? []).filter(
        (i: any) => i.supplier_id === s.id && i.status !== "draft" && i.status !== "void",
      );
      const payments = (paymentsRes.data ?? []).filter((p: any) => p.supplier_id === s.id);
      const debits = (debitsRes.data ?? []).filter((d: any) => d.supplier_id === s.id);

      const invoiced = round(invoices.reduce((a: number, i: any) => a + Number(i.total ?? 0), 0));
      const paid = round(
        payments.filter((p: any) => p.status === "executed").reduce((a: number, p: any) => a + Number(p.amount ?? 0), 0),
      );
      const committed = round(
        payments
          .filter((p: any) => p.status === "submitted" || p.status === "approved")
          .reduce((a: number, p: any) => a + Number(p.amount ?? 0), 0),
      );
      const debited = round(debits.reduce((a: number, d: any) => a + Number(d.total ?? 0), 0));
      const overdue = round(
        invoices
          .filter((i: any) => i.status !== "paid" && i.due_date && i.due_date < today)
          .reduce((a: number, i: any) => a + Number(i.total ?? 0), 0),
      );
      return {
        supplier_id: s.id,
        code: s.code,
        name_ar: s.name_ar,
        name_en: s.name_en,
        status: s.status,
        payment_terms_days: s.payment_terms_days,
        invoices_count: invoices.length,
        invoiced,
        paid,
        committed,
        debited,
        overdue,
        balance: round(invoiced - paid - debited),
      };
    });
  });

