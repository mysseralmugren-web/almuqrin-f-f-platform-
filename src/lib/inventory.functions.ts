import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

const ADMIN = ["super_admin", "factory_owner", "general_manager"] as const;
const INVENTORY_EDITORS = [...ADMIN, "warehouse_manager", "purchasing_manager"] as const;
const uuid = z.string().uuid();

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

async function requireInventoryEditor(c: Ctx) {
  const { data, error } = await c.supabase.from("user_roles").select("role").eq("user_id", c.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((row: { role: string }) => row.role);
  if (!roles.some((role: string) => (INVENTORY_EDITORS as readonly string[]).includes(role))) {
    throw new Error("FORBIDDEN_ROLE");
  }
}

export const listPhysicalInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = context as Ctx;
    const companyId = await companyOf(c);

    const [itemsResult, balancesResult, warehousesResult, locationsResult] = await Promise.all([
      c.supabase
        .from("items")
        .select("id, sku, name_ar, category, unit, min_qty, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("sku", { ascending: true }),
      c.supabase
        .from("stock_balances")
        .select("id, item_id, warehouse_id, location_id, quantity, reserved_quantity, updated_at")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false }),
      c.supabase
        .from("warehouses")
        .select("id, code, name_ar, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("code", { ascending: true }),
      c.supabase
        .from("storage_locations")
        .select("id, warehouse_id, code, name_ar, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name_ar", { ascending: true }),
    ]);

    const firstError = itemsResult.error || balancesResult.error || warehousesResult.error || locationsResult.error;
    if (firstError) throw new Error(firstError.message);

    return {
      items: itemsResult.data ?? [],
      balances: balancesResult.data ?? [],
      warehouses: warehousesResult.data ?? [],
      locations: locationsResult.data ?? [],
    };
  });

const countSchema = z.object({
  item_id: uuid,
  warehouse_id: uuid,
  location_id: uuid.optional().nullable(),
  current_balance_id: uuid.optional().nullable(),
  quantity: z.number().min(0).max(1_000_000),
});

export const recordPhysicalInventoryCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => countSchema.parse(input))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    await requireInventoryEditor(c);
    const companyId = await companyOf(c);

    const { data: item, error: itemError } = await c.supabase
      .from("items")
      .select("id, sku")
      .eq("id", data.item_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (itemError) throw new Error(itemError.message);
    if (!item) throw new Error("ITEM_NOT_FOUND");

    const { data: warehouse, error: warehouseError } = await c.supabase
      .from("warehouses")
      .select("id")
      .eq("id", data.warehouse_id)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .maybeSingle();
    if (warehouseError) throw new Error(warehouseError.message);
    if (!warehouse) throw new Error("WAREHOUSE_NOT_FOUND");

    if (data.location_id) {
      const { data: location, error: locationError } = await c.supabase
        .from("storage_locations")
        .select("id")
        .eq("id", data.location_id)
        .eq("warehouse_id", data.warehouse_id)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .maybeSingle();
      if (locationError) throw new Error(locationError.message);
      if (!location) throw new Error("LOCATION_NOT_FOUND");
    }

    let currentQuantity = 0;
    let currentLocationId: string | null = null;

    if (data.current_balance_id) {
      const { data: balance, error: balanceError } = await c.supabase
        .from("stock_balances")
        .select("id, item_id, warehouse_id, location_id, quantity")
        .eq("id", data.current_balance_id)
        .eq("item_id", data.item_id)
        .eq("company_id", companyId)
        .maybeSingle();
      if (balanceError) throw new Error(balanceError.message);
      if (!balance) throw new Error("BALANCE_NOT_FOUND");
      if (balance.warehouse_id !== data.warehouse_id) throw new Error("WAREHOUSE_MISMATCH");
      currentQuantity = Number(balance.quantity ?? 0);
      currentLocationId = balance.location_id ?? null;
    }

    const targetLocationId = data.location_id ?? null;
    const locationChanged = Boolean(data.current_balance_id) && currentLocationId !== targetLocationId;

    if (locationChanged && currentQuantity > 0) {
      const { error: transferError } = await c.supabase.from("stock_movements").insert({
        company_id: companyId,
        item_id: data.item_id,
        movement_type: "transfer",
        quantity: currentQuantity,
        unit_cost: 0,
        warehouse_id: data.warehouse_id,
        location_id: currentLocationId,
        to_warehouse_id: data.warehouse_id,
        to_location_id: targetLocationId,
        idempotency_key: `count-move:${Date.now()}:${crypto.randomUUID()}`,
        reference_type: "physical_count",
        note: `نقل موقع أثناء الجرد الفعلي للصنف ${item.sku}`,
        created_by: c.userId,
      });
      if (transferError) throw new Error(transferError.message);
    }

    const baseAtTarget = locationChanged ? currentQuantity : currentQuantity;
    const delta = data.quantity - baseAtTarget;
    const mustCreateReviewedBalance = !data.current_balance_id || (locationChanged && currentQuantity === 0);

    if (delta !== 0 || mustCreateReviewedBalance) {
      const { error: adjustmentError } = await c.supabase.from("stock_movements").insert({
        company_id: companyId,
        item_id: data.item_id,
        movement_type: "adjustment",
        quantity: delta,
        unit_cost: 0,
        warehouse_id: data.warehouse_id,
        location_id: targetLocationId,
        idempotency_key: `count:${Date.now()}:${crypto.randomUUID()}`,
        reference_type: "physical_count",
        note: `تسوية جرد فعلي للصنف ${item.sku} إلى كمية ${data.quantity}`,
        created_by: c.userId,
      });
      if (adjustmentError) throw new Error(adjustmentError.message);
    }

    return { ok: true, quantity: data.quantity };
  });
