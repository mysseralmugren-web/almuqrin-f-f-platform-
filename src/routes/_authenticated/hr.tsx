import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { UserCog, Users, FileSignature, CalendarClock, Plane, Package2, Wallet, Settings2, UserCircle2 } from "lucide-react";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/hr")({
  head: () => ({
    meta: [
      { title: "الموارد البشرية والرواتب · AlMugren AI Factory OS" },
      { name: "description", content: "Employees, contracts, attendance, leaves, custodies and payroll for AlMugren Furniture Factory." },
      { property: "og:title", content: "الموارد البشرية والرواتب · AlMugren AI Factory OS" },
      { property: "og:description", content: "Employee files, contracts, attendance, leaves, custodies, GOSI and payroll." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrLayout,
});

function HrLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/hr", ar: "الموظفون", en: "Employees", icon: Users, exact: true },
    { to: "/hr/contracts", ar: "العقود", en: "Contracts", icon: FileSignature, exact: false },
    { to: "/hr/attendance", ar: "الدوام والحضور", en: "Attendance", icon: CalendarClock, exact: false },
    { to: "/hr/leaves", ar: "الإجازات", en: "Leaves", icon: Plane, exact: false },
    { to: "/hr/custody", ar: "العهد", en: "Custodies", icon: Package2, exact: false },
    { to: "/hr/payroll", ar: "الرواتب", en: "Payroll", icon: Wallet, exact: false },
    { to: "/hr/me", ar: "خدمة الموظف", en: "Self service", icon: UserCircle2, exact: false },
    { to: "/hr/settings", ar: "الإعدادات", en: "Settings", icon: Settings2, exact: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <UserCog className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("الوحدة 07", "Module 07")}
          </div>
          <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">
            {t("الموارد البشرية وشؤون الموظفين والرواتب", "HR, Employee Affairs & Payroll")}
          </h1>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 rounded-xl border bg-card p-1.5">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(tab.ar, tab.en)}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}

