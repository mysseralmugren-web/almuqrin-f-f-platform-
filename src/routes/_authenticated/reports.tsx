import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BarChart3, TrendingUp, Factory, Package, ShoppingCart, Calculator, UserCog, ClipboardList, BookOpen } from "lucide-react";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير التنفيذية والتحليلات · AlMugren AI Factory OS" },
      { name: "description", content: "Executive analytics and KPIs across sales, manufacturing, inventory, purchasing, finance, HR and projects." },
      { property: "og:title", content: "التقارير التنفيذية والتحليلات · AlMugren AI Factory OS" },
      { property: "og:description", content: "Live KPIs computed from actual factory data with drill-down and CSV/PDF export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsLayout,
});

function ReportsLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/reports", ar: "الملخص التنفيذي", en: "Executive", icon: BarChart3, exact: true },
    { to: "/reports/sales", ar: "المبيعات", en: "Sales", icon: TrendingUp, exact: false },
    { to: "/reports/manufacturing", ar: "التصنيع", en: "Manufacturing", icon: Factory, exact: false },
    { to: "/reports/inventory", ar: "المخزون", en: "Inventory", icon: Package, exact: false },
    { to: "/reports/purchasing", ar: "المشتريات", en: "Purchasing", icon: ShoppingCart, exact: false },
    { to: "/reports/finance", ar: "المالية", en: "Finance", icon: Calculator, exact: false },
    { to: "/reports/hr", ar: "الموارد البشرية", en: "HR", icon: UserCog, exact: false },
    { to: "/reports/projects", ar: "المشاريع", en: "Projects", icon: ClipboardList, exact: false },
    { to: "/reports/definitions", ar: "تعريف المؤشرات", en: "KPI catalogue", icon: BookOpen, exact: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <BarChart3 className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{t("الوحدة 12", "Module 12")}</div>
          <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">
            {t("التقارير التنفيذية والتحليلات ومؤشرات الأداء", "Executive Reports, Analytics & KPIs")}
          </h1>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 rounded-xl border bg-card p-1.5 print:hidden">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {t(tab.ar, tab.en)}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}

