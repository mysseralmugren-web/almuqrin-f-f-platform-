import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/theme";
import { FINANCE_AI_PIPELINES, FINANCE_AI_SKILLS } from "@/lib/finance-ai.registry";

export const Route = createFileRoute("/_authenticated/ai-assistant/finance")({
  head: () => ({
    meta: [
      { title: "Finance AI Suite · AlMugren AI Factory OS" },
      { name: "description", content: "Financial AI skills for invoice processing, VAT, cost accounting, controls, profitability and cashflow." },
    ],
  }),
  component: FinanceAiSuitePage,
});

function FinanceAiSuitePage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5" />{t("حزمة Finance AI", "Finance AI Suite")}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">{t("15 مهارة مالية مترابطة مع مراجعة بشرية إلزامية قبل أي إجراء عالي التأثير.", "15 connected finance skills with mandatory human approval before any high-impact action.")}</p>
            </div>
            <Badge variant="secondary">15 Skills</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {FINANCE_AI_SKILLS.map((skill) => (
            <Card key={skill.id} className="border-muted">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{t(skill.nameAr, skill.nameEn)}</h3>
                  {skill.highImpactAction ? <ShieldCheck className="h-4 w-4 text-muted-foreground" /> : <Workflow className="h-4 w-4 text-muted-foreground" />}
                </div>
                <p className="text-sm text-muted-foreground">{skill.descriptionAr}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{skill.category}</Badge>
                  {skill.humanApprovalRequired && <Badge variant="outline">{t("اعتماد بشري", "Human approval")}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{t("مسارات التشغيل", "Execution pipelines")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {Object.entries(FINANCE_AI_PIPELINES).map(([name, pipeline]) => (
            <div key={name} className="rounded-xl border p-4">
              <div className="mb-3 font-semibold" dir="ltr">{name}</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {pipeline.map((skill, index) => (
                  <div key={skill} className="flex items-center gap-2">
                    <Badge variant="secondary">{skill}</Badge>
                    {index < pipeline.length - 1 && <span className="text-muted-foreground">→</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t("قاعدة الأمان: الحزمة لا تنفذ دفعاً أو ترحيلاً محاسبياً أو تغيير IBAN أو اعتماداً مالياً نهائياً تلقائياً.", "Safety boundary: the suite never auto-posts journals, sends payments, changes IBANs, or performs final financial approval.")}</p>
    </div>
  );
}
