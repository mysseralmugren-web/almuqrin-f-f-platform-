import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Users, Target, GitBranch, CalendarCheck, UserSquare2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "CRM · AlMugren AI Factory OS" },
      { name: "description", content: "Leads, sales pipeline, customer accounts and follow-up activities." },
      { property: "og:title", content: "CRM · AlMugren AI Factory OS" },
      { property: "og:description", content: "Leads, sales pipeline, customer accounts and follow-up activities." },
    ],
  }),
  component: CrmLayout,
});

function CrmLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/crm/leads", ar: "العملاء المحتملون", en: "Leads", icon: Target },
    { to: "/crm/pipeline", ar: "المسار البيعي", en: "Pipeline", icon: GitBranch },
    { to: "/crm/customers", ar: "حسابات العملاء", en: "Accounts", icon: UserSquare2 },
    { to: "/crm/activities", ar: "الأنشطة والمتابعات", en: "Activities", icon: CalendarCheck },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
            <Users className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {t("الوحدة 02", "Module 02")}
            </div>
            <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">
              {t("إدارة علاقات العملاء", "Customer Relationship Management")}
            </h1>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {t(
                "العملاء المحتملون، المسار البيعي، حسابات العملاء، والمتابعات.",
                "Leads, sales pipeline, customer accounts and follow-ups.",
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" className="shrink-0 gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{t("تصدير", "Export")}</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-card">
        {tabs.map((tab) => {
          const active = pathname === tab.to || (tab.to === "/crm/leads" && pathname === "/crm");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition " +
                (active
                  ? "gradient-primary text-primary-foreground shadow-elegant"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              <Icon className="h-4 w-4" />
              {t(tab.ar, tab.en)}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}

