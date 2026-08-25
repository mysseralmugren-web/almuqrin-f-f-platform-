import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyCompany, saveMyCompany } from "@/lib/workflow.functions";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "بيانات المنشأة · AlMugren AI Factory OS" },
      { name: "description", content: "Company profile, VAT number and Saudi national address." },
    ],
  }),
  component: SettingsPage,
});

const FIELDS = [
  ["name_ar", "اسم المنشأة (عربي)", "Company name (AR)", true],
  ["name_en", "اسم المنشأة (إنجليزي)", "Company name (EN)", false],
  ["vat_number", "الرقم الضريبي (15 رقم)", "VAT number (15 digits)", true],
  ["cr_number", "السجل التجاري", "CR number", false],
  ["address_building_no", "رقم المبنى", "Building no.", true],
  ["address_street", "الشارع", "Street", true],
  ["address_district", "الحي", "District", true],
  ["address_city", "المدينة", "City", true],
  ["address_postal_code", "الرمز البريدي (5 أرقام)", "Postal code (5 digits)", true],
  ["address_additional_no", "الرقم الإضافي", "Additional no.", false],
  ["phone", "الهاتف", "Phone", false],
  ["email", "البريد الإلكتروني", "Email", false],
] as const;

function SettingsPage() {
  const t = useT();
  const qc = useQueryClient();
  const fetchCompany = useServerFn(getMyCompany);
  const save = useServerFn(saveMyCompany);
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: () => fetchCompany({}) });
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (company) {
      const next: Record<string, string> = {};
      for (const [key] of FIELDS) next[key] = (company as Record<string, unknown>)[key]?.toString() ?? "";
      setForm(next);
    }
  }, [company]);

  const mutation = useMutation({
    mutationFn: (values: Record<string, string>) => save({ data: values as never }),
    onSuccess: () => {
      toast.success(t("تم حفظ بيانات المنشأة", "Company data saved"));
      void qc.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const incomplete =
    !/^[0-9]{15}$/.test(form.vat_number ?? "") ||
    !/^[0-9]{5}$/.test(form.address_postal_code ?? "") ||
    !form.address_building_no ||
    !form.address_street ||
    !form.address_district ||
    !form.address_city;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <Building2 className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("بيانات المنشأة", "Company profile")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "الرقم الضريبي والعنوان الوطني إلزامية قبل إصدار أي فاتورة ضريبية.",
              "VAT number and national address are mandatory before issuing any tax invoice.",
            )}
          </p>
        </div>
      </div>

      {incomplete && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {t(
            "بيانات المنشأة غير مكتملة — لا يمكن إصدار فواتير ضريبية حتى اكتمالها.",
            "Company data is incomplete — tax invoices cannot be issued until it is complete.",
          )}
        </div>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("المعلومات الأساسية والعنوان الوطني", "Core details & national address")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(([key, ar, en, required]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>
                  {t(ar, en)} {required && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={key}
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  required={required}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending} className="gradient-primary font-semibold">
                {mutation.isPending ? t("جاري الحفظ...", "Saving...") : t("حفظ", "Save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

