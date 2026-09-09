import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, ArrowUpLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODULES, GROUP_LABELS, type ModuleDef } from "@/lib/modules";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/erp")({
  head: () => ({
    meta: [
      { title: "Enterprise Resource Planning · AlMugren AI Factory OS" },
      { name: "description", content: "Unified enterprise resource planning module." },
    ],
  }),
  component: ErpHub,
});

const ERP_GROUPS: ModuleDef["group"][] = ["operations", "commercial", "finance"];

function ErpHub() {
  const t = useT();
  return (
    <div className="space-y-8">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <Boxes className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <Badge variant="secondary" className="mb-2">ERP</Badge>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("تخطيط موارد المؤسسة", "Enterprise Resource Planning")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("بوابتك الموحدة لتطبيقات التشغيل والتجارة والمالية", "Your unified hub for operations, commercial and finance apps")}
          </p>
        </div>
      </div>

      {ERP_GROUPS.map((group) => {
        const modules = MODULES.filter((module) => module.group === group && module.key !== "erp");
        return (
          <section key={group} className="space-y-3">
            <h2 className="text-lg font-semibold">{t(GROUP_LABELS[group].ar, GROUP_LABELS[group].en)}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link key={module.key} to={module.path} className="group block">
                    <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
                      <CardContent className="flex items-center gap-4 p-5">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{t(module.labelAr, module.labelEn)}</div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">{module.path}</div>
                        </div>
                        <ArrowUpLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

