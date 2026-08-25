import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import {
  ArrowUpRight,
  Factory,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Activity,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
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

function DashboardPage() {
  const t = useT();
  const { user } = useAuth();

  const stats = [
    { ar: "طلبات الإنتاج النشطة", en: "Active Production Orders", value: "128", delta: "+12%", icon: Factory, tone: "primary" },
    { ar: "قيمة المخزون", en: "Inventory Value", value: "SAR 4.8M", delta: "+3.4%", icon: Package, tone: "accent" },
    { ar: "المبيعات هذا الشهر", en: "Sales this Month", value: "SAR 1.92M", delta: "+8.1%", icon: TrendingUp, tone: "success" },
    { ar: "أوامر شراء معلقة", en: "Pending POs", value: "17", delta: "-4", icon: ShoppingCart, tone: "warning" },
  ];

  const lines = [
    { ar: "خط تصنيع الأبواب A1", en: "Doors Line A1", pct: 82 },
    { ar: "خط تجميع الخزائن B2", en: "Cabinets Line B2", pct: 64 },
    { ar: "خط التشطيبات C3", en: "Finishing Line C3", pct: 47 },
    { ar: "خط التنجيد D1", en: "Upholstery Line D1", pct: 91 },
  ];

  const activity = [
    { ar: "تم إنشاء طلب إنتاج جديد PO-2041", en: "New production order PO-2041 created", icon: CheckCircle2, tone: "text-success" },
    { ar: "بانتظار موافقة المشتريات PR-338", en: "Purchase request PR-338 pending approval", icon: Clock, tone: "text-warning" },
    { ar: "تنبيه: انخفاض مخزون خشب الزان", en: "Alert: beech wood stock low", icon: AlertTriangle, tone: "text-destructive" },
    { ar: "اكتمل توريد الطلبية SO-1902", en: "Sales order SO-1902 delivered", icon: CheckCircle2, tone: "text-success" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t("لوحة التحكم التنفيذية", "Executive Dashboard")}
          </div>
          <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">
            {t(`مرحباً، ${user?.nameAr}`, `Welcome, ${user?.name}`)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "نظرة عامة على أداء المصنع والعمليات اليوم.",
              "A snapshot of factory performance and operations today.",
            )}
          </p>
        </div>
        <Button className="shrink-0 gradient-accent font-semibold text-primary shadow-elegant">
          <Sparkles className="me-2 h-4 w-4" />
          {t("اسأل المساعد الذكي", "Ask AI Assistant")}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.en} className="shadow-card transition hover:shadow-elegant">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      s.delta.startsWith("-")
                        ? "bg-destructive/10 text-destructive"
                        : "bg-success/10 text-success"
                    }
                  >
                    {s.delta}
                  </Badge>
                </div>
                <div className="mt-4 text-2xl font-bold tracking-tight">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t(s.ar, s.en)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {t("أداء خطوط الإنتاج", "Production Lines Utilization")}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("متوسط الاستخدام خلال آخر 24 ساعة", "Average utilization · last 24h")}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              {t("عرض التفاصيل", "View details")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {lines.map((l) => (
              <div key={l.en} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t(l.ar, l.en)}</span>
                  <span className="text-muted-foreground">{l.pct}%</span>
                </div>
                <Progress value={l.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent-foreground" />
              {t("النشاط الأخير", "Recent Activity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${a.tone}`} />
                  <div className="min-w-0 text-sm">
                    <div className="leading-tight">{t(a.ar, a.en)}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {t("قبل قليل", "Just now")}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quick stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold">312</div>
              <div className="text-xs text-muted-foreground">
                {t("العملاء النشطون", "Active customers")}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft">
              <Factory className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold">98.4%</div>
              <div className="text-xs text-muted-foreground">
                {t("جودة الإنتاج", "Production quality")}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft">
              <Package className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold">1,284</div>
              <div className="text-xs text-muted-foreground">
                {t("أصناف نشطة في المخزون", "Active SKUs in inventory")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
