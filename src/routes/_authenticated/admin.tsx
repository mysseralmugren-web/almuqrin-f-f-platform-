import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ShieldCheck, Users, Shield, KeyRound, Building2, Download, UserCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "User & Role Management · AlMugren AI Factory OS" },
      { name: "description", content: "Users, roles, permission matrix and multi-tenant companies." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/admin/users", ar: "المستخدمون", en: "Users", icon: Users },
    { to: "/admin/roles", ar: "الأدوار", en: "Roles", icon: Shield },
    { to: "/admin/permissions", ar: "الصلاحيات", en: "Permissions", icon: KeyRound },
    { to: "/admin/companies", ar: "الشركات", en: "Companies", icon: Building2 },
    { to: "/admin/profile", ar: "الملف الشخصي", en: "Profile", icon: UserCircle },
    { to: "/admin/security", ar: "الأمان", en: "Security", icon: Lock },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {t("الوحدة 01", "Module 01")}
            </div>
            <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">
              {t("إدارة المستخدمين والأدوار", "User & Role Management")}
            </h1>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {t(
                "المستخدمون، الأدوار، مصفوفة الصلاحيات، والشركات متعددة المستأجرين.",
                "Users, roles, permission matrix and multi-tenant companies.",
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
          const active =
            pathname === tab.to || (tab.to === "/admin/users" && pathname === "/admin");
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

