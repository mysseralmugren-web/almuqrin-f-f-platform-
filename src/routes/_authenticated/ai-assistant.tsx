import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Sparkles, Inbox, Palette, Armchair, BarChart3, Settings2 } from "lucide-react";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () => ({
    meta: [
      { title: "الموظف الذكي · AlMugren AI Factory OS" },
      { name: "description", content: "AI employee: document, image and cost analysis with human review before any draft record." },
      { property: "og:title", content: "الموظف الذكي · AlMugren AI Factory OS" },
      { property: "og:description", content: "Document, image and cost analysis with mandatory human review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiLayout,
});

function AiLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/ai-assistant", ar: "صندوق المهام", en: "Task inbox", icon: Inbox, exact: true },
    { to: "/ai-assistant/design", ar: "تصميم ديزاين", en: "Design skill", icon: Palette, exact: false },
    { to: "/ai-assistant/seating", ar: "سعة الجلسات", en: "Seating capacity", icon: Armchair, exact: false },
    { to: "/ai-assistant/usage", ar: "التقارير والاستخدام", en: "Reports & usage", icon: BarChart3, exact: false },
    { to: "/ai-assistant/settings", ar: "الإعدادات", en: "Settings", icon: Settings2, exact: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("الوحدة 09", "Module 09")}
          </div>
          <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">{t("الموظف الذكي", "AI employee")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("تحليل المستندات والصور والتكاليف — كل نتيجة مسودة تحتاج مراجعة واعتماد", "Document, image and cost analysis — every result is a draft pending human approval")}
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
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

