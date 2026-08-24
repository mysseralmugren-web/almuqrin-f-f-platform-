import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { STAGE_CATALOG } from "@/lib/mes-constants";

type Ctx = { supabase: any; userId: string };

const ADMIN = ["super_admin", "factory_owner", "general_manager"] as const;
const PLANNING = [...ADMIN, "production_manager", "designer"] as const;
const PRODUCTION = [...ADMIN, "production_manager", "technician"] as const;
const WAREHOUSE = [...ADMIN, "warehouse_manager", "purchasing_manager"] as const;
const QUALITY = [...ADMIN, "production_manager", "technician"] as const;
const SALES_OR_PLAN = [...ADMIN, "sales_manager", "production_manager"] as const;

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

async function requireRole(c: Ctx, allowed: readonly string[]) {
  const { data, error } = await c.supabase.from("user_roles").select("role").eq("user_id", c.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.some((r: string) => allowed.includes(r))) throw new Error("FORBIDDEN_ROLE");
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

const uuid = z.string().uuid();
const qty = z.number().positive().max(1_000_000);

/* ============ Warehouses & locations ============ */

export const listWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("warehouses")
      .select("*, storage_locations(id, code, name_ar, is_active)")
      .order("code", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().trim().min(1).max(20),
        name_ar: z.string().trim().min(2).max(120),
        name_en: z.string().trim().max(120).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, WAREHOUSE);
    const company_id = await companyOf(c);
    const { data: row, error } = await c.supabase
      .from("warehouses")
      .insert({ ...data, company_id, created_by: c.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.code === "23505" ? "WAREHOUSE_CODE_EXISTS" : error.message);
    return row;
  });

export const createStorageLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        warehouse_id: uuid,
        code: z.string().trim().min(1).max(20),
        name_ar: z.string().trim().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, WAREHOUSE);
    const company_id = await companyOf(c);
    const { data: row, error } = await c.supabase
      .from("storage_locations")
      .insert({ ...data, company_id })
      .select("id")
      .single();
    if (error) throw new Error(error.code === "23505" ? "LOCATION_CODE_EXISTS" : error.message);
    return row;
  });

/* ============ Items & stock ============ */

export const listItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase.from("items").select("*").order("sku", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sku: z.string().trim().min(1).max(40),
        name_ar: z.string().trim().min(2).max(160),
        name_en: z.string().trim().max(160).optional().nullable(),
        category: z.string().trim().max(60).optional().nullable(),
        unit: z.string().trim().min(1).max(30).default("قطعة"),
        standard_cost: z.number().min(0).max(10_000_000).default(0),
        min_qty: z.number().min(0).max(1_000_000).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, WAREHOUSE);
    const company_id = await companyOf(c);
    const { data: row, error } = await c.supabase
      .from("items")
      .insert({ ...data, company_id, created_by: c.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.code === "23505" ? "SKU_EXISTS" : error.message);
    return row;
  });

export const listStockBalances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("stock_balances")
      .select("*, items(sku, name_ar, unit, min_qty), warehouses(code, name_ar), storage_locations(code)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listStockMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ manufacturing_order_id: uuid.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    let q = c.supabase
      .from("stock_movements")
      .select("*, items(sku, name_ar, unit), warehouses!stock_movements_warehouse_id_fkey(code, name_ar)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.manufacturing_order_id) q = q.eq("manufacturing_order_id", data.manufacturing_order_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const movementSchema = z.object({
  item_id: uuid,
  movement_type: z.enum(["receipt", "transfer", "adjustment"]),
  quantity: z.number().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, "QTY_ZERO"),
  unit_cost: z.number().min(0).max(10_000_000).default(0),
  warehouse_id: uuid,
  location_id: uuid.optional().nullable(),
  to_warehouse_id: uuid.optional().nullable(),
  to_location_id: uuid.optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
  idempotency_key: z.string().trim().min(8).max(80),
});

export const recordStockMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => movementSchema.parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const roles = await requireRole(c, WAREHOUSE);
    if (data.movement_type === "adjustment" && !roles.some((r) => (ADMIN as readonly string[]).includes(r) || r === "warehouse_manager")) {
      throw new Error("ADJUSTMENT_REQUIRES_MANAGER");
    }
    if (data.movement_type !== "adjustment" && data.quantity <= 0) throw new Error("QTY_MUST_BE_POSITIVE");
    if (data.movement_type === "transfer" && !data.to_warehouse_id) throw new Error("TRANSFER_TARGET_REQUIRED");
    const company_id = await companyOf(c);

    const { data: existing } = await c.supabase
      .from("stock_movements")
      .select("id")
      .eq("company_id", company_id)
      .eq("idempotency_key", data.idempotency_key)
      .maybeSingle();
    if (existing) return { id: existing.id, duplicate: true };

    const { data: row, error } = await c.supabase
      .from("stock_movements")
      .insert({ ...data, company_id, created_by: c.userId })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { id: null, duplicate: true };
      throw new Error(error.message);
    }
    return { id: row.id, duplicate: false };
  });

/* ============ Manufacturing orders ============ */

export const listManufacturingOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("manufacturing_orders")
      .select(
        "*, manufacturing_stages(*), sales_orders(order_number, customers(name_ar)), bom_lines(id, planned_qty, issued_qty, reserved_qty), quality_inspections(id, result)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getManufacturingOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const { data: mo, error } = await c.supabase
      .from("manufacturing_orders")
      .select(
        "*, manufacturing_stages(*), sales_orders(order_number, customers(name_ar)), " +
          "bom_lines(*, items(sku, name_ar, unit), warehouses(code, name_ar), storage_locations(code)), " +
          "quality_inspections(*), labor_logs(*)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!mo) throw new Error("MO_NOT_FOUND");
    return mo;
  });

export const listConvertibleSalesOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const { data, error } = await c.supabase
      .from("sales_orders")
      .select("id, order_number, status, customers(name_ar), sales_order_items(id, description, quantity, unit), manufacturing_orders(id, sales_order_item_id, status)")
      .in("status", ["confirmed", "in_production", "ready"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createManufacturingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sales_order_id: uuid,
        sales_order_item_id: uuid.optional().nullable(),
        description: z.string().trim().max(300).optional().nullable(),
        quantity: qty.default(1),
        planned_start: z.string().optional().nullable(),
        planned_end: z.string().optional().nullable(),
        stage_codes: z.array(z.string().trim().min(1).max(40)).min(1),
        notes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, SALES_OR_PLAN);
    const company_id = await companyOf(c);

    const { data: order, error: orderErr } = await c.supabase
      .from("sales_orders")
      .select("id, status")
      .eq("id", data.sales_order_id)
      .maybeSingle();
    if (orderErr) throw new Error(orderErr.message);
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.status === "draft" || order.status === "cancelled") throw new Error("ORDER_NOT_CONFIRMED");

    let dupQuery = c.supabase
      .from("manufacturing_orders")
      .select("id")
      .eq("sales_order_id", data.sales_order_id)
      .neq("status", "cancelled");
    dupQuery = data.sales_order_item_id
      ? dupQuery.eq("sales_order_item_id", data.sales_order_item_id)
      : dupQuery.is("sales_order_item_id", null);
    const { data: dup } = await dupQuery.maybeSingle();
    if (dup) throw new Error("MO_ALREADY_EXISTS");

    const mo_number = await nextNumber(company_id, "manufacturing_order", "MO");
    const { data: mo, error } = await c.supabase
      .from("manufacturing_orders")
      .insert({
        company_id,
        sales_order_id: data.sales_order_id,
        sales_order_item_id: data.sales_order_item_id || null,
        mo_number,
        status: "draft",
        description: data.description || null,
        quantity: data.quantity,
        planned_start: data.planned_start || null,
        planned_end: data.planned_end || null,
        notes: data.notes || null,
        created_by: c.userId,
      })
      .select("id, mo_number")
      .single();
    if (error) throw new Error(error.code === "23505" ? "MO_ALREADY_EXISTS" : error.message);

    const stages = data.stage_codes
      .map((code, idx) => {
        const found = STAGE_CATALOG.find((s) => s.code === code);
        if (!found) return null;
        return {
          company_id,
          manufacturing_order_id: mo.id,
          sequence: idx + 1,
          code: found.code,
          name_ar: found.name_ar,
          name_en: found.name_en,
        };
      })
      .filter(Boolean);
    if (stages.length) {
      const { error: stageErr } = await c.supabase.from("manufacturing_stages").insert(stages);
      if (stageErr) throw new Error(stageErr.message);
    }
    return mo;
  });

const STATUS_ROLES: Record<string, readonly string[]> = {
  approved: PLANNING,
  awaiting_materials: [...PLANNING, "warehouse_manager"],
  ready_to_produce: [...PLANNING, "warehouse_manager"],
  in_production: PRODUCTION,
  quality_check: PRODUCTION,
  ready_for_delivery: QUALITY,
  delivered: [...ADMIN, "warehouse_manager", "sales_manager"],
  cancelled: ADMIN,
};

export const setManufacturingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum([
          "approved",
          "awaiting_materials",
          "ready_to_produce",
          "in_production",
          "quality_check",
          "ready_for_delivery",
          "delivered",
          "cancelled",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, STATUS_ROLES[data.status] ?? ADMIN);

    const { data: mo, error } = await c.supabase
      .from("manufacturing_orders")
      .select("*, bom_lines(planned_qty, reserved_qty, issued_qty), quality_inspections(result, approved_by)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!mo) throw new Error("MO_NOT_FOUND");

    const bom = (mo.bom_lines ?? []) as { planned_qty: number; reserved_qty: number; issued_qty: number }[];

    if (data.status === "ready_to_produce") {
      if (mo.status === "draft") throw new Error("MO_NOT_APPROVED");
      if (!bom.length) throw new Error("BOM_REQUIRED");
      const short = bom.some((l) => Number(l.reserved_qty) + Number(l.issued_qty) < Number(l.planned_qty));
      if (short) throw new Error("MATERIALS_NOT_RESERVED");
    }
    if (data.status === "in_production") {
      if (mo.status !== "ready_to_produce") throw new Error("MO_NOT_READY_TO_PRODUCE");
    }
    if (data.status === "ready_for_delivery") {
      const inspections = (mo.quality_inspections ?? []) as { result: string; approved_by: string | null }[];
      const passed = inspections.some((i) => i.result === "pass" && i.approved_by);
      if (!passed) throw new Error("QC_APPROVAL_REQUIRED");
    }

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "approved") {
      patch["approved_by"] = c.userId;
      patch["approved_at"] = new Date().toISOString();
    }
    if (data.status === "in_production" && !mo.actual_start) patch["actual_start"] = new Date().toISOString();
    if (data.status === "ready_for_delivery" && !mo.actual_end) patch["actual_end"] = new Date().toISOString();

    const { error: upErr } = await c.supabase.from("manufacturing_orders").update(patch).eq("id", data.id);
    if (upErr) throw new Error(upErr.message.replace(/^.*INVALID_MO_TRANSITION/, "INVALID_MO_TRANSITION"));

    if (mo.sales_order_id) {
      const soStatus =
        data.status === "in_production"
          ? "in_production"
          : data.status === "ready_for_delivery"
            ? "ready"
            : null;
      if (soStatus) await c.supabase.from("sales_orders").update({ status: soStatus }).eq("id", mo.sales_order_id);
    }
    return { ok: true, status: data.status };
  });

/* ============ Stages ============ */

export const updateStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["pending", "in_progress", "passed", "failed"]).optional(),
        assignee_id: uuid.optional().nullable(),
        planned_start: z.string().optional().nullable(),
        planned_end: z.string().optional().nullable(),
        progress_percent: z.number().min(0).max(100).optional(),
        notes: z.string().trim().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, PRODUCTION);
    const { id, ...rest } = data;

    const { data: stage, error } = await c.supabase
      .from("manufacturing_stages")
      .select("*, manufacturing_orders(id, status)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!stage) throw new Error("STAGE_NOT_FOUND");

    const moStatus = stage.manufacturing_orders?.status as string | undefined;
    if (rest.status && rest.status !== "pending" && moStatus !== "in_production" && moStatus !== "quality_check") {
      throw new Error("MO_NOT_IN_PRODUCTION");
    }

    const patch: Record<string, unknown> = { ...rest };
    if (rest.status === "in_progress" && !stage.actual_start) patch["actual_start"] = new Date().toISOString();
    if (rest.status === "passed") {
      patch["actual_end"] = new Date().toISOString();
      if (rest.progress_percent === undefined) patch["progress_percent"] = 100;
    }

    const { error: upErr } = await c.supabase.from("manufacturing_stages").update(patch).eq("id", id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

/* ============ BOM ============ */

export const saveBomLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid.optional().nullable(),
        manufacturing_order_id: uuid,
        item_id: uuid,
        warehouse_id: uuid.optional().nullable(),
        location_id: uuid.optional().nullable(),
        unit: z.string().trim().min(1).max(30),
        planned_qty: qty,
        unit_cost: z.number().min(0).max(10_000_000).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, PLANNING);
    const company_id = await companyOf(c);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await c.supabase.from("bom_lines").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await c.supabase
      .from("bom_lines")
      .insert({ ...rest, company_id })
      .select("id")
      .single();
    if (error) throw new Error(error.code === "23505" ? "BOM_ITEM_DUPLICATE" : error.message);
    return row;
  });

export const deleteBomLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, PLANNING);
    const { data: line, error } = await c.supabase
      .from("bom_lines")
      .select("issued_qty, reserved_qty")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!line) throw new Error("BOM_LINE_NOT_FOUND");
    if (Number(line.issued_qty) > 0 || Number(line.reserved_qty) > 0) throw new Error("BOM_LINE_IN_USE");
    const { error: delErr } = await c.supabase.from("bom_lines").delete().eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });

/* ============ Material reservation / issue / return ============ */

async function moveMaterial(
  c: Ctx,
  company_id: string,
  args: {
    line: any;
    quantity: number;
    movement_type: "reserve" | "release_reserve" | "issue_to_mfg" | "return_from_mfg";
    idempotency_key: string;
    note?: string | null;
  },
) {
  const { data: existing } = await c.supabase
    .from("stock_movements")
    .select("id")
    .eq("company_id", company_id)
    .eq("idempotency_key", args.idempotency_key)
    .maybeSingle();
  if (existing) return { duplicate: true };

  if (!args.line.warehouse_id) throw new Error("BOM_WAREHOUSE_REQUIRED");

  const { error } = await c.supabase.from("stock_movements").insert({
    company_id,
    item_id: args.line.item_id,
    movement_type: args.movement_type,
    quantity: args.quantity,
    unit_cost: args.line.unit_cost ?? 0,
    warehouse_id: args.line.warehouse_id,
    location_id: args.line.location_id,
    manufacturing_order_id: args.line.manufacturing_order_id,
    bom_line_id: args.line.id,
    reference_type: "manufacturing_order",
    reference_id: args.line.manufacturing_order_id,
    idempotency_key: args.idempotency_key,
    note: args.note ?? null,
    created_by: c.userId,
  });
  if (error) {
    if (error.code === "23505") return { duplicate: true };
    throw new Error(error.message.includes("INSUFFICIENT_STOCK") ? "INSUFFICIENT_STOCK" : error.message);
  }
  return { duplicate: false };
}

export const reserveMaterials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ manufacturing_order_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...WAREHOUSE, "production_manager"]);
    const company_id = await companyOf(c);

    const { data: mo, error } = await c.supabase
      .from("manufacturing_orders")
      .select("id, status, bom_lines(*)")
      .eq("id", data.manufacturing_order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!mo) throw new Error("MO_NOT_FOUND");
    if (mo.status === "draft") throw new Error("MO_NOT_APPROVED");

    const lines = (mo.bom_lines ?? []) as any[];
    if (!lines.length) throw new Error("BOM_REQUIRED");

    let reserved = 0;
    for (const line of lines) {
      const need = Number(line.planned_qty) - Number(line.reserved_qty) - Number(line.issued_qty);
      if (need <= 0) continue;
      const res = await moveMaterial(c, company_id, {
        line,
        quantity: need,
        movement_type: "reserve",
        idempotency_key: `reserve:${line.id}:${Number(line.reserved_qty)}:${need}`,
      });
      if (!res.duplicate) {
        const { error: upErr } = await c.supabase
          .from("bom_lines")
          .update({ reserved_qty: Number(line.reserved_qty) + need })
          .eq("id", line.id);
        if (upErr) throw new Error(upErr.message);
        reserved += 1;
      }
    }
    return { ok: true, reserved };
  });

export const issueMaterials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        manufacturing_order_id: uuid,
        lines: z.array(z.object({ bom_line_id: uuid, quantity: qty })).min(1),
        idempotency_key: z.string().trim().min(8).max(80),
        note: z.string().trim().max(300).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...WAREHOUSE, "production_manager"]);
    const company_id = await companyOf(c);

    const { data: mo, error } = await c.supabase
      .from("manufacturing_orders")
      .select("id, status")
      .eq("id", data.manufacturing_order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!mo) throw new Error("MO_NOT_FOUND");
    if (mo.status === "draft") throw new Error("MO_NOT_APPROVED");

    let issued = 0;
    for (const l of data.lines) {
      const { data: line, error: lineErr } = await c.supabase
        .from("bom_lines")
        .select("*")
        .eq("id", l.bom_line_id)
        .eq("manufacturing_order_id", data.manufacturing_order_id)
        .maybeSingle();
      if (lineErr) throw new Error(lineErr.message);
      if (!line) throw new Error("BOM_LINE_NOT_FOUND");

      const res = await moveMaterial(c, company_id, {
        line,
        quantity: l.quantity,
        movement_type: "issue_to_mfg",
        idempotency_key: `${data.idempotency_key}:${l.bom_line_id}`,
        note: data.note ?? null,
      });
      if (!res.duplicate) {
        const { error: upErr } = await c.supabase
          .from("bom_lines")
          .update({
            issued_qty: Number(line.issued_qty) + l.quantity,
            reserved_qty: Math.max(0, Number(line.reserved_qty) - l.quantity),
          })
          .eq("id", line.id);
        if (upErr) throw new Error(upErr.message);
        issued += 1;
      }
    }
    return { ok: true, issued };
  });

export const returnMaterials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bom_line_id: uuid,
        quantity: qty,
        scrap: z.boolean().default(false),
        idempotency_key: z.string().trim().min(8).max(80),
        note: z.string().trim().max(300).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...WAREHOUSE, "production_manager"]);
    const company_id = await companyOf(c);

    const { data: line, error } = await c.supabase
      .from("bom_lines")
      .select("*")
      .eq("id", data.bom_line_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!line) throw new Error("BOM_LINE_NOT_FOUND");
    const outstanding = Number(line.issued_qty) - Number(line.returned_qty) - Number(line.scrap_qty);
    if (data.quantity > outstanding) throw new Error("RETURN_EXCEEDS_ISSUED");

    if (data.scrap) {
      const { data: existing } = await c.supabase
        .from("stock_movements")
        .select("id")
        .eq("company_id", company_id)
        .eq("idempotency_key", data.idempotency_key)
        .maybeSingle();
      if (existing) return { ok: true, duplicate: true };
      const { error: upErr } = await c.supabase
        .from("bom_lines")
        .update({ scrap_qty: Number(line.scrap_qty) + data.quantity })
        .eq("id", line.id);
      if (upErr) throw new Error(upErr.message);
      const { error: logErr } = await c.supabase.from("audit_logs").insert({
        company_id,
        user_id: c.userId,
        action: "mfg.scrap_recorded",
        entity: "bom_lines",
        entity_id: line.id,
        details: { quantity: data.quantity, note: data.note ?? null, key: data.idempotency_key },
      });
      if (logErr) throw new Error(logErr.message);
      return { ok: true, duplicate: false };
    }

    const res = await moveMaterial(c, company_id, {
      line,
      quantity: data.quantity,
      movement_type: "return_from_mfg",
      idempotency_key: data.idempotency_key,
      note: data.note ?? null,
    });
    if (!res.duplicate) {
      const { error: upErr } = await c.supabase
        .from("bom_lines")
        .update({ returned_qty: Number(line.returned_qty) + data.quantity })
        .eq("id", line.id);
      if (upErr) throw new Error(upErr.message);
    }
    return { ok: true, duplicate: res.duplicate };
  });

/* ============ Quality ============ */

export const createInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        manufacturing_order_id: uuid,
        stage_id: uuid.optional().nullable(),
        checklist: z.array(z.object({ label: z.string().trim().min(1).max(160), ok: z.boolean() })).max(40),
        result: z.enum(["pass", "fail", "rework"]),
        defects: z.string().trim().max(1000).optional().nullable(),
        corrective_action: z.string().trim().max(1000).optional().nullable(),
        attachments: z.array(z.string().trim().url().max(500)).max(10).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, QUALITY);
    const company_id = await companyOf(c);
    if (data.result !== "pass" && !data.defects) throw new Error("DEFECTS_REQUIRED");
    const { data: row, error } = await c.supabase
      .from("quality_inspections")
      .insert({
        company_id,
        manufacturing_order_id: data.manufacturing_order_id,
        stage_id: data.stage_id || null,
        checklist: data.checklist,
        result: data.result,
        defects: data.defects || null,
        corrective_action: data.corrective_action || null,
        attachments: data.attachments,
        inspected_by: c.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const approveInspection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...ADMIN, "production_manager"]);
    const { data: row, error } = await c.supabase
      .from("quality_inspections")
      .update({ approved_by: c.userId, approved_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("id, result")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============ Labor ============ */

export const addLaborLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        manufacturing_order_id: uuid,
        stage_id: uuid.optional().nullable(),
        worker_name: z.string().trim().min(2).max(120),
        work_date: z.string(),
        hours: z.number().positive().max(24),
        hourly_rate: z.number().min(0).max(10_000).optional().nullable(),
        note: z.string().trim().max(300).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireRole(c, [...PRODUCTION, "hr"]);
    const company_id = await companyOf(c);
    const { data: row, error } = await c.supabase
      .from("labor_logs")
      .insert({
        ...data,
        stage_id: data.stage_id || null,
        hourly_rate: data.hourly_rate ?? null,
        company_id,
        created_by: c.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

