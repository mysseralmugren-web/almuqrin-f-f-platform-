import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/theme";
import { Loading, useProjectFail } from "@/components/app/projects-ui";
import { getProjectSettings, saveProjectSettings } from "@/lib/projects.functions";

export const Route = createFileRoute("/_authenticated/projects/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات المشاريع والضمان · AlMugren AI Factory OS" },
      { name: "description", content: "Warranty defaults, SLA response time and project notification rules." },
    ],
  }),
  component: ProjectSettingsPage,
});

const DEFAULTS = {
  default_warranty_months: 12,
  warranty_scope_ar: "عيوب التصنيع فقط",
  warranty_terms_ar: "",
  claim_response_hours: 48,
  notify_overdue_tasks: true,
  notify_pending_approvals: true,
  notify_upcoming_installations: true,
  notify_upcoming_deliveries: true,
  notify_critical_snags: true,
  notify_warranty_expiry: true,
  warranty_expiry_notice_days: 30,
  upcoming_window_days: 7,
};

function ProjectSettingsPage() {
  const t = useT();
  const fail = useProjectFail();
  const fetchSettings = useServerFn(getProjectSettings);
  const save = useServerFn(saveProjectSettings);
  const [form, setForm] = useState(DEFAULTS);

  const { data, isLoading } = useQuery({ queryKey: ["project-settings"], queryFn: () => fetchSettings() });
  useEffect(() => {
    if (data) setForm({ ...DEFAULTS, ...data, warranty_terms_ar: data.warranty_terms_ar ?? "" });
  }, [data]);

  const mSave = useMutation({
    mutationFn: () => save({ data: { ...form, warranty_terms_ar: form.warranty_terms_ar || null } }),
    onSuccess: () => toast.success(t("تم حفظ الإعدادات", "Settings saved")),
    onError: fail,
  });

  if (isLoading) return <Loading />;

  const toggles = [
    ["notify_overdue_tasks", "تنبيه المهام المتأخرة", "Overdue tasks"],
    ["notify_pending_approvals", "تنبيه الاعتمادات المعلقة", "Pending approvals"],
    ["notify_upcoming_installations", "تنبيه عمليات التركيب القادمة", "Upcoming installations"],
    ["notify_upcoming_deliveries", "تنبيه عمليات التسليم القادمة", "Upcoming deliveries"],
    ["notify_critical_snags", "تنبيه الملاحظات الحرجة", "Critical snags"],
    ["notify_warranty_expiry", "تنبيه قرب انتهاء الضمان", "Warranty expiry"],
  ] as const;

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <Label>{t("مدة الضمان الافتراضية (شهر)", "Default warranty (months)")}</Label>
            <Input type="number" dir="ltr" value={form.default_warranty_months} onChange={(e) => setForm({ ...form, default_warranty_months: Number(e.target.value) || 1 })} />
          </div>
          <div>
            <Label>{t("زمن الاستجابة للبلاغ (ساعة)", "Claim response (hours)")}</Label>
            <Input type="number" dir="ltr" value={form.claim_response_hours} onChange={(e) => setForm({ ...form, claim_response_hours: Number(e.target.value) || 1 })} />
          </div>
          <div>
            <Label>{t("تنبيه قبل انتهاء الضمان (يوم)", "Warranty notice (days)")}</Label>
            <Input type="number" dir="ltr" value={form.warranty_expiry_notice_days} onChange={(e) => setForm({ ...form, warranty_expiry_notice_days: Number(e.target.value) || 1 })} />
          </div>
          <div>
            <Label>{t("نافذة التنبيهات القادمة (يوم)", "Upcoming window (days)")}</Label>
            <Input type="number" dir="ltr" value={form.upcoming_window_days} onChange={(e) => setForm({ ...form, upcoming_window_days: Number(e.target.value) || 1 })} />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("نطاق الضمان", "Warranty scope")}</Label>
            <Input value={form.warranty_scope_ar} onChange={(e) => setForm({ ...form, warranty_scope_ar: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <Label>{t("شروط الضمان", "Warranty terms")}</Label>
            <Textarea rows={4} value={form.warranty_terms_ar} onChange={(e) => setForm({ ...form, warranty_terms_ar: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
          {toggles.map(([key, ar, en]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{t(ar, en)}</span>
              <Switch checked={(form as any)[key]} onCheckedChange={(v) => setForm({ ...form, [key]: v })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button className="gap-2 gradient-primary" onClick={() => mSave.mutate()} disabled={mSave.isPending}>
        <Save className="h-4 w-4" />{t("حفظ الإعدادات", "Save settings")}
      </Button>
    </div>
  );
}

