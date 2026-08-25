import { createFileRoute } from "@tanstack/react-router";
import { GripVertical, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useT, useTheme } from "@/lib/theme";
import { LEADS, PIPELINE_STAGES, CRM_KPIS, sar } from "@/lib/crm-data";

export const Route = createFileRoute("/_authenticated/crm/pipeline")({
  head: () => ({
    meta: [
      { title: "Sales Pipeline · CRM · AlMugren AI Factory OS" },
      { name: "description", content: "Kanban view of the furniture sales pipeline from lead to won deal." },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const t = useT();
  const { lang } = useTheme();
  const grand = LEADS.reduce((s, l) => s + l.value, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CRM_KPIS.map((k) => (
          <Card key={k.en} className="shadow-card">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{t(k.ar, k.en)}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold" dir="ltr">{k.value}</span>
                <Badge variant="secondary" className="text-[10px]" dir="ltr">{k.delta}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("مراحل المسار البيعي", "Pipeline stages")}
          </CardTitle>
          <CardDescription>
            {t("توزيع الفرص وقيمها على مراحل البيع.", "Opportunity distribution and value by stage.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PIPELINE_STAGES.map((s) => {
            const items = LEADS.filter((l) => l.stage === s.key);
            const val = items.reduce((a, l) => a + l.value, 0);
            return (
              <div key={s.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t(s.ar, s.en)} · {items.length}</span>
                  <span className="text-muted-foreground" dir="ltr">{sar(val)} SAR</span>
                </div>
                <Progress value={grand ? (val / grand) * 100 : 0} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {PIPELINE_STAGES.map((s) => {
            const items = LEADS.filter((l) => l.stage === s.key);
            return (
              <div key={s.key} className="w-72 shrink-0 rounded-xl border bg-card p-3 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <Badge className={s.tone + " hover:opacity-90"}>{t(s.ar, s.en)}</Badge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      {t("لا توجد فرص", "No opportunities")}
                    </div>
                  )}
                  {items.map((l) => (
                    <div key={l.id} className="rounded-lg border bg-surface p-3 transition hover:shadow-elegant">
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{lang === "ar" ? l.companyAr : l.company}</div>
                          <div className="truncate text-xs text-muted-foreground">{lang === "ar" ? l.contactAr : l.contact}</div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="font-semibold" dir="ltr">{sar(l.value)}</span>
                            <span className="text-muted-foreground">{l.owner.split(" ")[0]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

