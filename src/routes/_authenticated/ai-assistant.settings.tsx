import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/theme";
import { AI_TEXT_MODELS, SEAT_PITCHES } from "@/lib/ai-constants";
import { AiLoading, useAiFail } from "@/components/app/ai-ui";
import { getAiAccess, getAiSettings, saveAiSettings } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات الموظف الذكي · AlMugren AI Factory OS" },
      { name: "description", content: "Non-secret AI settings: model, retention policy, file limits, brand palette and permissions." },
    ],
  }),
  component: AiSettings,
});

function AiSettings() {
  const t = useT();
  const fail = useAiFail();
  const fetchSettings = useServerFn(getAiSettings);
  const fetchAccess = useServerFn(getAiAccess);
  const save = useServerFn(saveAiSettings);

  const settingsQ = useQuery({ queryKey: ["ai-settings"], queryFn: () => fetchSettings() });
  const accessQ = useQuery({ queryKey: ["ai-access"], queryFn: () => fetchAccess() });
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (settingsQ.data && !form) {
      const s: any = settingsQ.data;
      setForm({
        enabled: s.enabled, default_model: s.default_model, retention_days: s.retention_days,
        max_file_mb: s.max_file_mb, max_attempts: s.max_attempts, seat_pitch_cm: s.seat_pitch_cm,
        brand_primary: s.brand_primary, brand_secondary: s.brand_secondary,
        watermark_text: s.watermark_text ?? "", admin_kinds_only: s.admin_kinds_only,
      });
    }
  }, [settingsQ.data, form]);

  const mSave = useMutation({
    mutationFn: () => save({ data: { ...form, watermark_text: form.watermark_text || null } }),
    onSuccess: () => toast.success(t("تم الحفظ", "Saved")),
    onError: fail,
  });

  if (settingsQ.isLoading || !form) return <AiLoading />;
  const canEdit = !!accessQ.data?.isAdmin;
  const set = (k: string, v: unknown) => setForm((s: any) => ({ ...s, [k]: v }));

  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="text-base">{t("إعدادات غير سرية", "Non-secret settings")}</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-3">
          <Switch id="enabled" checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} disabled={!canEdit} />
          <Label htmlFor="enabled">{t("تفعيل الموظف الذكي", "Enable AI employee")}</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="admin-only" checked={form.admin_kinds_only} onCheckedChange={(v) => set("admin_kinds_only", v)} disabled={!canEdit} />
          <Label htmlFor="admin-only">{t("قصر كل الأنواع على الإدارة", "Restrict all kinds to management")}</Label>
        </div>
        <div className="space-y-2">
          <Label>{t("النموذج الافتراضي", "Default model")}</Label>
          <Select value={form.default_model} onValueChange={(v) => set("default_model", v)} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{AI_TEXT_MODELS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("عرض الجلسة الافتراضي (سم)", "Default seat pitch (cm)")}</Label>
          <Select value={String(form.seat_pitch_cm)} onValueChange={(v) => set("seat_pitch_cm", Number(v))} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SEAT_PITCHES.map((p) => (<SelectItem key={p} value={String(p)}>{p}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("مدة الاحتفاظ (أيام)", "Retention (days)")}</Label>
          <Input type="number" dir="ltr" value={form.retention_days} onChange={(e) => set("retention_days", Number(e.target.value))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>{t("أقصى حجم ملف (ميجابايت)", "Max file size (MB)")}</Label>
          <Input type="number" dir="ltr" value={form.max_file_mb} onChange={(e) => set("max_file_mb", Number(e.target.value))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>{t("أقصى عدد محاولات", "Max attempts")}</Label>
          <Input type="number" dir="ltr" value={form.max_attempts} onChange={(e) => set("max_attempts", Number(e.target.value))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>{t("نص العلامة المائية", "Watermark text")}</Label>
          <Input value={form.watermark_text} onChange={(e) => set("watermark_text", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>{t("اللون الأساسي", "Primary color")}</Label>
          <Input value={form.brand_primary} onChange={(e) => set("brand_primary", e.target.value)} dir="ltr" disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>{t("اللون الثانوي", "Secondary color")}</Label>
          <Input value={form.brand_secondary} onChange={(e) => set("brand_secondary", e.target.value)} dir="ltr" disabled={!canEdit} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={() => mSave.mutate()} disabled={!canEdit || mSave.isPending}>{t("حفظ", "Save")}</Button>
          {!canEdit && <p className="mt-2 text-xs text-muted-foreground">{t("العرض فقط — الإعدادات للإدارة", "Read-only — management can edit")}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {t("مفاتيح مزودي الذكاء تُدار في أسرار المشروع على الخادم فقط ولا تُخزن هنا.", "AI provider keys live in server-side project secrets only and are never stored here.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

