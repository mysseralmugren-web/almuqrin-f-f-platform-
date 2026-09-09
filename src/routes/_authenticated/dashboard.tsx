import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useModulePermissions } from "@/lib/module-permissions";
import { MODULES } from "@/lib/modules";
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
  AppWindow,
  ArrowUpLeft,
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

type RoleAppSpec = {
  key: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  descriptionEn: string;
  assistantAr: string;
  assistantEn: string;
  roles: string[];
  moduleKeys: string[];
};

const ROLE_APP_SPECS: RoleAppSpec[] = [
  {
    key: "owner",
    labelAr: "تطبيق المالك",
    labelEn: "Owner App",
    descriptionAr: "القرار، الموافقات، الأداء والتقارير الموحدة.",
    descriptionEn: "Decisions, approvals, performance and unified reports.",
    assistantAr: "مساعد المالك التنفيذي",
    assistantEn: "Executive owner assistant",
    roles: ["factory_owner", "general_manager", "super_admin"],
    moduleKeys: ["dashboard", "reports", "accounting", "mes", "ai-assistant"],
  },
  {
    key: "sales",
    labelAr: "تطبيق المبيعات",
    labelEn: "Sales App",
    descriptionAr: "العملاء، عروض الأسعار، الطلبات والمتابعة اليومية.",
    descriptionEn: "Customers, quotations, orders and daily follow-up.",
    assistantAr: "مساعد المبيعات",
    assistantEn: "Sales assistant",
    roles: ["sales_manager", "sales_employee", "sales_representative"],
    moduleKeys: ["crm", "customers", "quotations", "sales", "ai-assistant"],
  },
  {
    key: "production",
    labelAr: "تطبيق الإنتاج",
    labelEn: "Production App",
    descriptionAr: "أوامر التصنيع، مراحل التشغيل والجودة.",
    descriptionEn: "Manufacturing orders, work stages and quality.",
    assistantAr: "مساعد الإنتاج",
    assistantEn: "Production assistant",
    roles: ["production_manager", "project_manager", "technician", "quality_manager"],
    moduleKeys: ["mes", "projects", "inventory", "ai-assistant"],
  },
  {
    key: "warehouse",
    labelAr: "تطبيق المستودع والمشتريات",
    labelEn: "Warehouse & Purchasing App",
    descriptionAr: "المخزون، الاستلام، الموردون وأوامر الشراء.",
    descriptionEn: "Stock, receiving, suppliers and purchase orders.",
    assistantAr: "مساعد المخزون والمشتريات",
    assistantEn: "Warehouse and purchasing assistant",
    roles: ["warehouse_manager", "purchasing_manager", "purchasing_officer"],
    moduleKeys: ["wms", "inventory", "purchasing", "suppliers", "ai-assistant"],
  },
  {
    key: "finance",
    labelAr: "تطبيق المالية",
    labelEn: "Finance App",
    descriptionAr: "الفواتير، الحسابات والرقابة المالية.",
    descriptionEn: "Invoices, accounting and financial control.",
    assistantAr: "مساعد المالية",
    assistantEn: "Finance assistant",
    roles: ["accountant", "finance_manager"],
    moduleKeys: ["accounting", "invoices", "reports", "ai-assistant"],
  },
  {
    key: "hr",
    labelAr: "تطبيق الموارد البشرية",
    labelEn: "HR App",
    descriptionAr: "شؤون الموظفين، البيانات والإجراءات الداخلية.",
    descriptionEn: "Employees, records and internal processes.",
    assistantAr: "مساعد الموارد البشرية",
    assistantEn: "HR assistant",
    roles: ["hr", "hr_manager"],
    moduleKeys: ["hr", "documents", "ai-assistant"],
  },
  {
    key: "design",
    labelAr: "تطبيق التصميم والمشاريع",
    labelEn: "Design & Projects App",
    descriptionAr: "ملفات المشاريع، المعاينات والمواصفات.",
    descriptionEn: "Project files, previews and specifications.",
    assistantAr: "مساعد التصميم",
    assistantEn: "Design assistant",
    roles: ["designer", "project_manager"],
    moduleKeys: ["projects", "files", "documents", "ai-assistant"],
  },
  {
    key: "store",
    labelAr: "تطبيق المتجر والتسويق",
    labelEn: "Store & Marketing App",
    descriptionAr: "المنتجات، اعتماد المتجر والحملات.",
    descriptionEn: "Products, store approvals and campaigns.",
    assistantAr: "مساعد المتجر والتسويق",
    assistantEn: "Store and marketing assistant",
    roles: ["marketing_manager", "store_manager"],
    moduleKeys: ["store-admin", "marketing", "catalog-ingestion", "ai-assistant"],
  },
];

const OWNER_ROLES = new Set(["factory_owner", "general_manager", "super_admin"]);

function DashboardPage() {
  const t = useT();
  const { user } = useAuth();
  const { can, loading: permissionsLoading } = useModulePermissions();
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

  const roleApps = useMemo(() => {
    if (permissionsLoading) return [];

    const userRoles: readonly string[] = user?.roles ?? [];
    const isOwner = userRoles.some((role) => OWNER_ROLES.has(role));

    return ROLE_APP_SPECS
      .filter((app) => isOwner || app.roles.some((role) => userRoles.includes(role)))
      .map((app) => ({
        ...app,
        shortcuts: app.moduleKeys.flatMap((moduleKey) => {
          const module = MODULES.find((item) => item.key === moduleKey);
          return module && can(module.key, "view") ? [module] : [];
        }),
      }))
      .filter((app) => app.shortcuts.length > 0);
  }, [can, permissionsLoading, user?.roles]);

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
        <Button
          asChild
          className="shrink-0 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 px-5 font-semibold text-slate-900 shadow-md transition hover:from-white hover:via-slate-100 hover:to-slate-200 hover:shadow-lg"
        >
          <a href="/ai-assistant" aria-label={t("اسأل المساعد الذكي", "Ask AI Assistant")}>
            <Sparkles className="me-2 h-4 w-4 text-slate-700" />
            {t("اسأل المساعد الذكي", "Ask AI Assistant")}
          </a>
        </Button>
      </div>

      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background to-background shadow-card">
        <CardHeader className="border-b border-primary/10 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary">
                <AppWindow className="h-4 w-4" />
                {t("مساحات العمل", "WORKSPACES")}
              </div>
              <CardTitle className="mt-2 text-lg">
                {t("تطبيقات العمل حسب دورك", "Role-based work apps")}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "كل تطبيق يجمع مهام الدور ومساعده الذكي، ولا يظهر إلا ما تسمح به صلاحياتك.",
                  "Each app groups a role’s tasks and AI assistant, showing only authorized work.",
                )}
              </p>
            </div>
            <div className="hidden rounded-xl border border-primary/15 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground sm:block">
              {t("تطبيق واحد للمصنع", "One factory app")}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {permissionsLoading ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              {t("جارٍ تحميل التطبيقات المسموح بها…", "Loading your authorized apps…")}
            </div>
          ) : roleApps.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {roleApps.map((app) => (
                <section
                  key={app.key}
                  className="group rounded-2xl border border-border/80 bg-background/90 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{t(app.labelAr, app.labelEn)}</h2>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {t(app.descriptionAr, app.descriptionEn)}
                      </p>
                    </div>
                    <AppWindow className="h-5 w-5 shrink-0 text-primary/70 transition group-hover:text-primary" />
                  </div>
                  <div className="mt-3 rounded-lg bg-primary/[0.07] px-3 py-2 text-xs text-primary">
                    <Sparkles className="me-1 inline h-3.5 w-3.5" />
                    {t(app.assistantAr, app.assistantEn)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {app.shortcuts.map((module, index) => (
                      <a
                        key={module.key}
                        href={module.path}
                        className={
                          index === 0
                            ? "inline-flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            : "inline-flex items-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium transition hover:border-primary/35 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        }
                      >
                        {t(module.labelAr, module.labelEn)}
                        {index === 0 && <ArrowUpLeft className="ms-1 h-3.5 w-3.5" />}
                      </a>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              {t(
                "لا توجد مساحة عمل مفعلة لهذا الحساب. اطلب من مالك المصنع أو الإدارة ربط دورك بصلاحيات الوحدات.",
                "No workspace is enabled for this account. Ask the factory owner or administrator to assign your role and module permissions.",
              )}
            </div>
          )}
        </CardContent>
      </Card>

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