import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutTemplate, Copy, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cloneTemplateVersion, ensureDefaultTemplates, listTemplates, publishTemplateVersion, saveTemplateVersion,
} from "@/lib/documents.functions";
import { DOC_KIND_LABEL, DOC_KIND_PREFIX, type DocKind } from "@/lib/documents-constants";
import { useAr, useDocFail } from "@/components/app/documents-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/documents/templates")({
  head: () => ({
    meta: [
      { title: "قوالب الوثائق والترقيم · AlMugren AI Factory OS" },
      { name: "description", content: "Versioned A4 Arabic templates, factory terms and per-kind document numbering." },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const t = useT();
  const ar = useAr();
  const fail = useDocFail();
  const qc = useQueryClient();

  const list = useServerFn(listTemplates);
  const ensure = useServerFn(ensureDefaultTemplates);
  const saveVersion = useServerFn(saveTemplateVersion);
  const publish = useServerFn(publishTemplateVersion);
  const clone = useServerFn(cloneTemplateVersion);

  const { data: templates = [] } = useQuery({ queryKey: ["doc-templates"], queryFn: () => list({}) });
  const [edits, setEdits] = useState<Record<string, { terms_ar: string; footer_ar: string }>>({});
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["doc-templates"] });

  const ensureMut = useMutation({
    mutationFn: () => ensure({}),
    onSuccess: (r: any) => { toast.success(t(`تم إنشاء ${r.created} قالبًا`, `${r.created} templates created`)); invalidate(); },
    onError: fail,
  });
  const saveMut = useMutation({
    mutationFn: (v: { version_id: string; terms_ar: string; footer_ar: string }) => saveVersion({ data: v }),
    onSuccess: () => { toast.success(t("تم الحفظ", "Saved")); invalidate(); },
    onError: fail,
  });
  const publishMut = useMutation({
    mutationFn: (version_id: string) => publish({ data: { version_id } }),
    onSuccess: () => { toast.success(t("تم نشر الإصدار وقفله", "Version published and locked")); invalidate(); },
    onError: fail,
  });
  const cloneMut = useMutation({
    mutationFn: (version_id: string) => clone({ data: { version_id } }),
    onSuccess: () => { toast.success(t("تم إنشاء إصدار جديد قابل للتعديل", "New editable version created")); invalidate(); },
    onError: fail,
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            {t("قوالب A4 عربية لكل نوع وثيقة", "Arabic A4 templates per document kind")}
          </CardTitle>
          <Button size="sm" className="gradient-primary" onClick={() => ensureMut.mutate()} disabled={ensureMut.isPending}>
            {t("إنشاء القوالب القياسية", "Create standard templates")}
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t(
            "كل إصدار منشور مقفل ولا يُعدَّل؛ أي تغيير يتطلب إنشاء إصدار جديد. الوثائق الصادرة تحتفظ برقم الإصدار المستخدم وقت الإصدار.",
            "Published versions are locked; changes require a new version. Issued documents keep the version used at issue time.",
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((tpl: any) => {
          const latest = tpl.versions?.[0];
          const draft = edits[latest?.id] ?? { terms_ar: latest?.terms_ar ?? "", footer_ar: latest?.footer_ar ?? "" };
          return (
            <Card key={tpl.id} className="shadow-card">
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">
                    {ar ? DOC_KIND_LABEL[tpl.kind as DocKind].ar : DOC_KIND_LABEL[tpl.kind as DocKind].en}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {tpl.code} · {DOC_KIND_PREFIX[tpl.kind as DocKind]}-YYYY-00001
                  </p>
                </div>
                {latest && (
                  <Badge variant={latest.is_published ? "default" : "outline"}>
                    v{latest.version} · {latest.is_published ? t("منشور", "Published") : t("مسودة", "Draft")}
                  </Badge>
                )}
              </CardHeader>
              {latest && (
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>{t("الشروط والأحكام", "Terms & conditions")}</Label>
                    <Textarea
                      rows={6}
                      dir="rtl"
                      disabled={latest.is_published}
                      value={draft.terms_ar}
                      onChange={(e) => setEdits((s) => ({ ...s, [latest.id]: { ...draft, terms_ar: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("التذييل", "Footer")}</Label>
                    <Input
                      disabled={latest.is_published}
                      value={draft.footer_ar}
                      onChange={(e) => setEdits((s) => ({ ...s, [latest.id]: { ...draft, footer_ar: e.target.value } }))}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={latest.is_published}
                      onClick={() => saveMut.mutate({ version_id: latest.id, ...draft })}
                    >
                      <Save className="h-4 w-4" /> {t("حفظ", "Save")}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2 gradient-primary"
                      disabled={latest.is_published}
                      onClick={() => publishMut.mutate(latest.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" /> {t("نشر وقفل", "Publish & lock")}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => cloneMut.mutate(latest.id)}>
                      <Copy className="h-4 w-4" /> {t("إصدار جديد", "New version")}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {templates.length === 0 && (
          <Card className="shadow-card lg:col-span-2">
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("لا توجد قوالب بعد — أنشئ القوالب القياسية.", "No templates yet — create the standard set.")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
