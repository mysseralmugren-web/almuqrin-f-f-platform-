import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ClipboardList, LayoutGrid, Hammer, LifeBuoy, Settings2 } from "lucide-react";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "المشاريع والتركيبات وخدمة ما بعد البيع · AlMugren AI Factory OS" },
      { name: "description", content: "Projects, site surveys, approvals, tasks, installation, delivery, handover, warranties and after-sales service." },
      { property: "og:title", content: "المشاريع والتركيبات وخدمة ما بعد البيع · AlMugren AI Factory OS" },
      { property: "og:description", content: "Site surveys, drawings and approvals, tasks, installation orders, handover, snags and warranty claims." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsLayout,
});

function ProjectsLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/projects", ar: "المشاريع", en: "Projects", icon: LayoutGrid, exact: true },
    { to: "/projects/installations", ar: "التركيب والتسليم", en: "Installation & delivery", icon: Hammer, exact: false },
    { to: "/projects/service", ar: "الضمان والخدمة", en: "Warranty & service", icon: LifeBuoy, exact: false },
    { to: "/projects/settings", ar: "الإعدادات", en: "Settings", icon: Settings2, exact: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <ClipboardList className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("الوحدة 08", "Module 08")}
          </div>
          <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">
            {t("إدارة المشاريع والتركيبات وخدمة ما بعد البيع", "Projects, Installation & After-Sales")}
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

