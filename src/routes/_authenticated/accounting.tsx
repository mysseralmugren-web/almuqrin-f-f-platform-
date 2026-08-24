import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Calculator, BookOpen, FileStack, Landmark, Percent, BarChart3, Settings2, ScrollText } from "lucide-react";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/accounting")({
  head: () => ({
    meta: [
      { title: "المالية والمحاسبة · AlMugren AI Factory OS" },
      { name: "description", content: "Chart of accounts, journal entries, automated posting, treasury, Saudi VAT and financial reports." },
      { property: "og:title", content: "المالية والمحاسبة · AlMugren AI Factory OS" },
      { property: "og:description", content: "General ledger, VAT return, treasury and financial statements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountingLayout,
});

function AccountingLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/accounting", ar: "دليل الحسابات", en: "Accounts", icon: BookOpen, exact: true },
    { to: "/accounting/journal", ar: "القيود اليومية", en: "Journal", icon: FileStack, exact: false },
    { to: "/accounting/ledger", ar: "دفتر الأستاذ", en: "Ledger", icon: ScrollText, exact: false },
    { to: "/accounting/posting", ar: "الترحيل الآلي", en: "Auto posting", icon: Calculator, exact: false },
    { to: "/accounting/treasury", ar: "الخزينة والبنوك", en: "Treasury", icon: Landmark, exact: false },
    { to: "/accounting/vat", ar: "ضريبة القيمة المضافة", en: "VAT", icon: Percent, exact: false },
    { to: "/accounting/reports", ar: "التقارير المالية", en: "Reports", icon: BarChart3, exact: false },
    { to: "/accounting/setup", ar: "الإعدادات المحاسبية", en: "Setup", icon: Settings2, exact: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <Calculator className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("الوحدة 06", "Module 06")}
          </div>
          <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">
            {t("المالية والمحاسبة والضرائب", "Finance, Accounting & Tax")}
          </h1>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 rounded-xl border bg-card p-1.5">
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

