import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Factory,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Activity,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم · AlMugren AI Factory OS" },
      { name: "description", content: "Executive dashboard for AlMugren AI Factory OS." },
    ],
  }),
  component: DashboardPage,
});

type Metrics = {
  activeProductionOrders: number;
  inventoryValue: number;
  monthSales: number;
  pendingPurchaseOrders: number;
  activeCustomers: number;
  qualityRate: number | null;
  activeSkus: number;
};

const ZERO_METRICS: Metrics = {
  activeProductionOrders: 0,
  inventoryValue: 0,
  monthSales: 0,
  pendingPurchaseOrders: 0,
  activeCustomers: 0,
  qualityRate: null,
  activeSkus: 0,
};

function money(value: number, lang: "ar" | "en") {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

function DashboardPage() {
  const t = useT();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>(ZERO_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lang: "ar" | "en" = document.documentElement.lang === "en" ? "en" : "ar";

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

        const [
          productionRes,
          purchaseRes,
          customersRes,
          skusRes,
          salesRes,
          qcRes,
          balancesRes,
          itemsRes,
        ] = await Promise.all([
          supabase
            .from("production_orders")
            .select("id", { count: "exact", head: true })
            .in("status", ["planned", "in_progress", "qc", "on_hold"]),
          supabase
            .from("purchase_orders")
            .select("id", { count: "exact", head: true })
            .in("status", ["draft", "approved", "partially_received"]),
          supabase
            .from("customers")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("items")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("sales_orders")
            .select("total")
            .gte("order_date", monthStart)
            .lt("order_date", nextMonth)
            .neq("status", "cancelled"),
          supabase.from("quality_inspections").select("result"),
          supabase.from("stock_balances").select("item_id,quantity"),
          supabase.from("items").select("id,standard_cost"),
        ]);

        const firstError = [
          productionRes,
          purchaseRes,
          customersRes,
          skusRes,
          salesRes,
          qcRes,
          balancesRes,
          itemsRes,
        ].find((r) => r.error)?.error;
        if (firstError) throw firstError;

        const monthSales = (salesRes.data ?? []).reduce(
          (sum, row) => sum + Number(row.total ?? 0),
          0,
        );

        const costs = new Map(
          (itemsRes.data ?? []).map((row) => [row.id, Number(row.standard_cost ?? 0)]),
        );
        const inventoryValue = (balancesRes.data ?? []).reduce(
          (sum, row) => sum + Number(row.quantity ?? 0) * (costs.get(row.item_id) ?? 0),
          0,
        );

        const inspections = qcRes.data ?? [];
        const passed = inspections.filter((row) => row.result === "pass").length;
        const qualityRate = inspections.length ? (passed / inspections.length) * 100 : null;

        if (!cancelled) {
          setMetrics({
            activeProductionOrders: productionRes.count ?? 0,
            inventoryValue,
            monthSales,
            pendingPurchaseOrders: purchaseRes.count ?? 0,
            activeCustomers: customersRes.count ?? 0,
            qualityRate,
            activeSkus: skusRes.count ?? 0,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setMetrics(ZERO_METRICS);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        ar: "طلبات الإنتاج النشطة",
        en: "Active Production Orders",
        value: String(metrics.activeProductionOrders),
        icon: Factory,
      },
      {
        ar: "قيمة المخزون",
        en: "Inventory Value",
        value: money(metrics.inventoryValue, lang),
        icon: Package,
      },
      {
        ar: "المبيعات هذا الشهر",
        en: "Sales this Month",
        value: money(metrics.monthSales, lang),
        icon: TrendingUp,
      },
      {
        ar: "أوامر شراء معلقة",
        en: "Pending Purchase Orders",
        value: String(metrics.pendingPurchaseOrders),
        icon: ShoppingCart,
      },
    ],
    [lang, metrics],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t("لوحة التحكم التنفيذية", "Executive Dashboard")}
          </div>
          <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">
            {t(`مرحباً، ${user?.nameAr ?? ""}`, `Welcome, ${user?.name ?? ""}`)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "هذه الأرقام مرتبطة مباشرة ببيانات التشغيل الفعلية في المنصة.",
              "These metrics are linked directly to live operational data.",
            )}
          </p>
        </div>
        <Button className="shrink-0 gradient-accent font-semibold text-primary shadow-elegant">
          <Sparkles className="me-2 h-4 w-4" />
          {t("اسأل المساعد الذكي", "Ask AI Assistant")}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            {t("تعذر تحميل مؤشرات التشغيل الحية. تم عرض الصفر بدل بيانات تجريبية.", "Live metrics could not be loaded. Zero values are shown instead of demo data.")}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.en} className="shadow-card">
              <CardContent className="p-5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-2xl font-bold tracking-tight">
                  {loading ? "—" : s.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{t(s.ar, s.en)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4 text-primary" />
              {t("أداء الإنتاج", "Production Performance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t(
                "لا توجد بيانات إنتاج فعلية بعد. سيظهر الأداء تلقائياً عند بدء أوامر التصنيع.",
                "No live production data yet. Performance will appear automatically once manufacturing orders start.",
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t("النشاط الأخير", "Recent Activity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t(
                "لا توجد حركات تشغيل فعلية بعد.",
                "No live operational activity yet.",
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold">{loading ? "—" : metrics.activeCustomers}</div>
              <div className="text-xs text-muted-foreground">{t("العملاء النشطون", "Active customers")}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft">
              <ShieldCheck className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold">
                {loading ? "—" : metrics.qualityRate == null ? "—" : `${metrics.qualityRate.toFixed(1)}%`}
              </div>
              <div className="text-xs text-muted-foreground">{t("جودة الإنتاج", "Production quality")}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft">
              <Package className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold">{loading ? "—" : metrics.activeSkus}</div>
              <div className="text-xs text-muted-foreground">{t("أصناف نشطة في المخزون", "Active SKUs in inventory")}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
