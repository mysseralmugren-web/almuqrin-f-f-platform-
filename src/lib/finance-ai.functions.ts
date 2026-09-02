import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rangeSchema = z.object({ from: dateStr, to: dateStr }).refine((v) => v.from <= v.to, { message: "INVALID_DATE_RANGE" });
const n = (v: unknown) => Number(v ?? 0) || 0;

export const financeAiDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const c = context as Ctx;
    const canView = await c.supabase.rpc("analytics_can_view_finance");
    if (canView.error) throw new Error(canView.error.message);
    if (!canView.data) throw new Error("FORBIDDEN_FINANCE");

    const [finance, summary, projects, invoices, mos, stock, labor, cashOut, anomalies] = await Promise.all([
      c.supabase.rpc("analytics_finance", { _from: data.from, _to: data.to }),
      c.supabase.from("financial_ai_summary").select("pending_reviews, approved_input_vat, approved_purchase_total, last_invoice_at").maybeSingle(),
      c.supabase.from("projects").select("id, project_number, name_ar, name_en, sales_order_id, budget_amount, status").limit(1000),
      c.supabase.from("invoices").select("sales_order_id, subtotal, vat_amount, total, status, issue_date").neq("status", "void").gte("issue_date", data.from).lte("issue_date", data.to).limit(5000),
      c.supabase.from("manufacturing_orders").select("id, sales_order_id, overhead_cost, planned_labor_cost").limit(5000),
      c.supabase.from("stock_movements").select("manufacturing_order_id, quantity, unit_cost, movement_type, created_at").eq("movement_type", "issue_to_mfg").gte("created_at", `${data.from}T00:00:00+03:00`).lte("created_at", `${data.to}T23:59:59+03:00`).limit(10000),
      c.supabase.from("labor_logs").select("manufacturing_order_id, hours, hourly_rate, work_date").gte("work_date", data.from).lte("work_date", data.to).limit(10000),
      c.supabase.from("cash_vouchers").select("amount, voucher_type, voucher_date, status").eq("voucher_type", "payment").eq("status", "confirmed").gte("voucher_date", data.from).lte("voucher_date", data.to).limit(5000),
      c.supabase.from("invoice_ai_anomalies").select("id", { count: "exact", head: true }),
    ]);

    for (const r of [finance, summary, projects, invoices, mos, stock, labor, cashOut, anomalies]) {
      if (r.error) throw new Error(r.error.message);
    }

    const moBySales = new Map<string, string[]>();
    const overheadByMo = new Map<string, number>();
    for (const mo of mos.data ?? []) {
      if (mo.sales_order_id) moBySales.set(mo.sales_order_id, [...(moBySales.get(mo.sales_order_id) ?? []), mo.id]);
      overheadByMo.set(mo.id, n(mo.overhead_cost));
    }
    const materialByMo = new Map<string, number>();
    for (const row of stock.data ?? []) if (row.manufacturing_order_id) materialByMo.set(row.manufacturing_order_id, (materialByMo.get(row.manufacturing_order_id) ?? 0) + n(row.quantity) * n(row.unit_cost));
    const laborByMo = new Map<string, number>();
    for (const row of labor.data ?? []) if (row.manufacturing_order_id) laborByMo.set(row.manufacturing_order_id, (laborByMo.get(row.manufacturing_order_id) ?? 0) + n(row.hours) * n(row.hourly_rate));
    const revenueBySales = new Map<string, number>();
    for (const inv of invoices.data ?? []) if (inv.sales_order_id) revenueBySales.set(inv.sales_order_id, (revenueBySales.get(inv.sales_order_id) ?? 0) + n(inv.subtotal));

    const profitability = (projects.data ?? []).map((p: any) => {
      const revenue = p.sales_order_id ? (revenueBySales.get(p.sales_order_id) ?? 0) : 0;
      const moIds = p.sales_order_id ? (moBySales.get(p.sales_order_id) ?? []) : [];
      const material = moIds.reduce((s, id) => s + (materialByMo.get(id) ?? 0), 0);
      const laborCost = moIds.reduce((s, id) => s + (laborByMo.get(id) ?? 0), 0);
      const overhead = moIds.reduce((s, id) => s + (overheadByMo.get(id) ?? 0), 0);
      const cost = material + laborCost + overhead;
      const profit = revenue - cost;
      return { id: p.id, projectNumber: p.project_number, nameAr: p.name_ar, nameEn: p.name_en, status: p.status, revenue, material, labor: laborCost, overhead, cost, profit, margin: revenue > 0 ? (profit / revenue) * 100 : null };
    }).filter((p: any) => p.revenue !== 0 || p.cost !== 0).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 12);

    const f = finance.data ?? {};
    const cashIn = n(f.cash_in);
    const cashOutTotal = (cashOut.data ?? []).reduce((s: number, v: any) => s + n(v.amount), 0);
    return {
      range: data,
      generatedAt: new Date().toISOString(),
      kpis: {
        revenue: n(f.pnl?.revenue), expenses: n(f.pnl?.expenses), netProfit: n(f.pnl?.net),
        inputVat: n(f.vat?.input), outputVat: n(f.vat?.output), netVat: n(f.vat?.output) - n(f.vat?.input),
        receivables: n(f.receivables?.open_invoices), overdueReceivables: n(f.receivables?.overdue_schedules), payables: n(f.payables),
        cashIn, cashOut: cashOutTotal, netCashflow: cashIn - cashOutTotal,
        materialCost: n(f.cost_of_production?.material), laborCost: n(f.cost_of_production?.labor), unpostedEntries: n(f.unposted_entries), accountsConfigured: n(f.accounts_configured),
        pendingAiReviews: n(summary.data?.pending_reviews), approvedAiInputVat: n(summary.data?.approved_input_vat), approvedAiPurchases: n(summary.data?.approved_purchase_total), anomalyCount: n(anomalies.count),
      },
      profitability,
      lastInvoiceAt: summary.data?.last_invoice_at ?? null,
    };
  });
