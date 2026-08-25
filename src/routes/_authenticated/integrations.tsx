import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Plug, Inbox, Globe, MessageCircle, BellRing } from "lucide-react";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({
    meta: [
      { title: "التكاملات والموقع وواتساب · AlMugren AI Factory OS" },
      {
        name: "description",
        content: "Integration hub, website intake, WhatsApp Business inbox and notification queue for AlMugren factory.",
      },
      { property: "og:title", content: "التكاملات والموقع وواتساب · AlMugren AI Factory OS" },
      { property: "og:description", content: "Website leads, WhatsApp conversations, unified inbox and reliable notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsLayout,
});

function IntegrationsLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/integrations", ar: "مركز التكاملات", en: "Hub", icon: Plug, exact: true },
    { to: "/integrations/inbox", ar: "الصندوق الموحّد", en: "Unified inbox", icon: Inbox, exact: false },
    { to: "/integrations/website", ar: "طلبات الموقع", en: "Website leads", icon: Globe, exact: false },
    { to: "/integrations/whatsapp", ar: "واتساب", en: "WhatsApp", icon: MessageCircle, exact: false },
    { to: "/integrations/notifications", ar: "الإشعارات", en: "Notifications", icon: BellRing, exact: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <Plug className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("الوحدة 11", "Module 11")}
          </div>
          <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">
            {t("التكاملات والموقع وواتساب والإشعارات", "Integrations, Website, WhatsApp & Notifications")}
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
