import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { FileStack, BadgeCheck, FolderArchive, LayoutTemplate, Files } from "lucide-react";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "مركز المستندات والهوية · AlMugren AI Factory OS" },
      {
        name: "description",
        content: "Company identity, official records, A4 templates and immutable issued document snapshots.",
      },
      { property: "og:title", content: "مركز المستندات والهوية · AlMugren AI Factory OS" },
      { property: "og:description", content: "Identity, templates, numbering and ZATCA-ready printable documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsLayout,
});

function DocumentsLayout() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    { to: "/documents", ar: "سجل الوثائق", en: "Register", icon: Files, exact: true },
    { to: "/documents/identity", ar: "الهوية والبيانات النظامية", en: "Identity", icon: BadgeCheck, exact: false },
    { to: "/documents/official", ar: "المستندات الرسمية", en: "Official records", icon: FolderArchive, exact: false },
    { to: "/documents/templates", ar: "القوالب والترقيم", en: "Templates", icon: LayoutTemplate, exact: false },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <FileStack className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("الوحدة 10", "Module 10")}
          </div>
          <h1 className="mt-0.5 truncate text-2xl font-bold sm:text-3xl">
            {t("مركز المستندات والهوية والقوالب والطباعة", "Documents, Identity, Templates & Printing")}
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
