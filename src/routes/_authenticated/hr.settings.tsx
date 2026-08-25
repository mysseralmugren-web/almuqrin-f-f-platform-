import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading, ErrorState, useHrFail, today } from "@/components/app/hr-ui";
import { getHrSettings, saveHrSettings, saveGosiSettings, getHrAccess } from "@/lib/hr.functions";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/hr/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات الموارد البشرية · AlMugren AI Factory OS" },
      { name: "description", content: "Payroll accounts mapping, contract clauses, GOSI rates and WPS configuration." },
      { property: "og:title", content: "إعدادات الموارد البشرية · AlMugren AI Factory OS" },
      { property: "og:description", content: "Payroll accounts, GOSI rates and WPS configuration." },
    ],
  }),
  component: HrSettingsPage,
});

const ACCOUNT_FIELDS = [
  ["salary_expense_account_id", "مصروف الرواتب والأجور", "Salary expense"],
  ["allowances_expense_account_id", "مصروف البدلات", "Allowances expense"],
  ["gosi_expense_account_id", "مصروف التأمينات (حصة المنشأة)", "GOSI expense"],
  ["gosi_payable_account_id", "التأمينات المستحقة", "GOSI payable"],
  ["payroll_payable_account_id", "الرواتب المستحقة", "Payroll payable"],
  ["advances_account_id", "سلف الموظفين", "Employee advances"],
] as const;

function HrSettingsPage() {
  const t = useT();
  const fail = useHrFail();
  const qc = useQueryClient();

  const fetchSettings = useServerFn(getHrSettings);
  const fetchAccess = useServerFn(getHrAccess);
  const saveSettings = useServerFn(saveHrSettings);
  const saveGosi = useServerFn(saveGosiSettings);

  const access = useQuery({ queryKey: ["hr-access"], queryFn: () => fetchAccess({}) });
  const q = useQuery({ queryKey: ["hr-settings"], queryFn: () => fetchSettings({}) });

  const [f, setF] = useState<Record<string, string>>({});
  const [g, setG] = useState({ effective_from: today(), saudi_employee_rate: "", saudi_employer_rate: "", expat_employee_rate: "", expat_employer_rate: "", ceiling_amount: "0" });

  useEffect(() => {
    if (q.data?.settings) {
      setF(Object.fromEntries(Object.entries(q.data.settings).map(([k, v]) => [k, v == null ? "" : String(v)])));
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          ...Object.fromEntries(ACCOUNT_FIELDS.map(([k]) => [k, f[k] || null])),
          default_probation_days: Number(f["default_probation_days"] || 90),
          overtime_rate_multiplier: Number(f["overtime_rate_multiplier"] || 1.5),
          working_days_per_month: Number(f["working_days_per_month"] || 30),
          contract_clauses_ar: f["contract_clauses_ar"] || null,
          wps_bank_code: f["wps_bank_code"] || null,
          wps_establishment_id: f["wps_establishment_id"] || null,
        } as any,
      }),
    onSuccess: () => { toast.success(t("تم حفظ الإعدادات", "Settings saved")); void qc.invalidateQueries({ queryKey: ["hr-settings"] }); },
    onError: fail,
  });

  const addGosi = useMutation({
    mutationFn: () =>
      saveGosi({
        data: {
          effective_from: g.effective_from,
          saudi_employee_rate: Number(g.saudi_employee_rate || 0),
          saudi_employer_rate: Number(g.saudi_employer_rate || 0),
          expat_employee_rate: Number(g.expat_employee_rate || 0),
          expat_employer_rate: Number(g.expat_employer_rate || 0),
          ceiling_amount: Number(g.ceiling_amount || 0),
        },
      }),
    onSuccess: () => { toast.success(t("تم حفظ نسب التأمينات", "GOSI rates saved")); void qc.invalidateQueries({ queryKey: ["hr-settings"] }); },
    onError: fail,
  });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorState message={t("تعذر تحميل الإعدادات", "Could not load settings")} />;
  if (!access.data?.isHr) return <ErrorState message={t("الإعدادات مقصورة على الموارد البشرية", "Settings are restricted to HR")} />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="h-4 w-4" />{t("ربط حسابات الرواتب (الوحدة 06)", "Payroll GL accounts (Module 06)")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {ACCOUNT_FIELDS.map(([k, ar_, en]) => (
            <div key={k} className="space-y-1.5">
              <Label>{t(ar_, en)}</Label>
              <Select value={f[k] || undefined} onValueChange={(v) => setF({ ...f, [k]: v })}>
                <SelectTrigger><SelectValue placeholder={t("غير محدد", "Not set")} /></SelectTrigger>
                <SelectContent>
                  {(q.data?.accounts ?? []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="space-y-1.5">
            <Label>{t("فترة التجربة الافتراضية (أيام)", "Default probation (days)")}</Label>
            <Input type="number" value={f["default_probation_days"] ?? "90"} onChange={(e) => setF({ ...f, default_probation_days: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("معامل الساعة الإضافية", "Overtime multiplier")}</Label>
            <Input type="number" step="0.1" value={f["overtime_rate_multiplier"] ?? "1.5"} onChange={(e) => setF({ ...f, overtime_rate_multiplier: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("أيام العمل شهريًا", "Working days per month")}</Label>
            <Input type="number" value={f["working_days_per_month"] ?? "30"} onChange={(e) => setF({ ...f, working_days_per_month: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("رمز بنك حماية الأجور", "WPS bank code")}</Label>
            <Input value={f["wps_bank_code"] ?? ""} onChange={(e) => setF({ ...f, wps_bank_code: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("رقم المنشأة في حماية الأجور", "WPS establishment ID")}</Label>
            <Input value={f["wps_establishment_id"] ?? ""} onChange={(e) => setF({ ...f, wps_establishment_id: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("بنود العقد (قابلة للتهيئة)", "Contract clauses (configurable)")}</Label>
            <Textarea rows={6} value={f["contract_clauses_ar"] ?? ""} onChange={(e) => setF({ ...f, contract_clauses_ar: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              {t("البنود تُطبع كما تُدخلها ولا تمثل اعتمادًا نظاميًا تلقائيًا.", "Clauses are printed as entered and do not constitute automatic legal certification.")}
            </p>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button className="gap-2" disabled={save.isPending} onClick={() => save.mutate()}><Save className="h-4 w-4" />{t("حفظ", "Save")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t("نسب التأمينات الاجتماعية (مؤرخة)", "GOSI rates (dated)")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>{t("سارية من", "Effective from")}</Label><Input type="date" value={g.effective_from} onChange={(e) => setG({ ...g, effective_from: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("سعودي - الموظف %", "Saudi employee %")}</Label><Input type="number" step="0.01" value={g.saudi_employee_rate} onChange={(e) => setG({ ...g, saudi_employee_rate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("سعودي - المنشأة %", "Saudi employer %")}</Label><Input type="number" step="0.01" value={g.saudi_employer_rate} onChange={(e) => setG({ ...g, saudi_employer_rate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("غير سعودي - الموظف %", "Expat employee %")}</Label><Input type="number" step="0.01" value={g.expat_employee_rate} onChange={(e) => setG({ ...g, expat_employee_rate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("غير سعودي - المنشأة %", "Expat employer %")}</Label><Input type="number" step="0.01" value={g.expat_employer_rate} onChange={(e) => setG({ ...g, expat_employer_rate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("الحد الأعلى للأجر الخاضع", "Contribution ceiling")}</Label><Input type="number" value={g.ceiling_amount} onChange={(e) => setG({ ...g, ceiling_amount: e.target.value })} /></div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" disabled={addGosi.isPending} onClick={() => addGosi.mutate()}>{t("حفظ النسب", "Save rates")}</Button>
          </div>
          {(q.data?.gosi ?? []).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("سارية من", "Effective")}</TableHead>
                  <TableHead>{t("سعودي (موظف/منشأة)", "Saudi (emp/comp)")}</TableHead>
                  <TableHead>{t("غير سعودي (موظف/منشأة)", "Expat (emp/comp)")}</TableHead>
                  <TableHead>{t("الحد الأعلى", "Ceiling")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(q.data?.gosi ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.effective_from}</TableCell>
                    <TableCell className="font-mono">{r.saudi_employee_rate}% / {r.saudi_employer_rate}%</TableCell>
                    <TableCell className="font-mono">{r.expat_employee_rate}% / {r.expat_employer_rate}%</TableCell>
                    <TableCell className="font-mono">{r.ceiling_amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t("النسب إعدادات داخلية للاحتساب فقط، ولا يتم إرسال أي بيانات إلى جهة رسمية.", "Rates are internal calculation settings only; no data is transmitted to any authority.")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

