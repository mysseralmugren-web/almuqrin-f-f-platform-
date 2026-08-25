import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Check, Download, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  decideIdentityProposal, getCompanyIdentity, loadIdentityProposals, saveCompanyIdentity, setIdentityStatus,
} from "@/lib/documents.functions";
import { ADDRESS_PROOF_NOTICE, BRAND } from "@/lib/documents-constants";
import { StatusBadge, useAr, useDocFail } from "@/components/app/documents-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/documents/identity")({
  head: () => ({
    meta: [
      { title: "الهوية والبيانات النظامية · AlMugren AI Factory OS" },
      { name: "description", content: "Brand identity, legal metadata and human-approved identity proposals." },
    ],
  }),
  component: IdentityPage,
});

const TEXT_FIELDS = [
  ["legal_name_ar", "الاسم القانوني (عربي)", "Legal name (AR)"],
  ["legal_name_en", "الاسم القانوني (إنجليزي)", "Legal name (EN)"],
  ["trade_name_ar", "الاسم التجاري (عربي)", "Trade name (AR)"],
  ["trade_name_en", "الاسم التجاري (إنجليزي)", "Trade name (EN)"],
  ["short_address", "العنوان المختصر", "Short address"],
  ["vat_effective_date", "تاريخ نفاذ الضريبة", "VAT effective date"],
  ["contact_phone", "الهاتف", "Phone"],
  ["contact_email", "البريد الإلكتروني", "Email"],
  ["website", "الموقع الإلكتروني", "Website"],
  ["watermark_text", "نص العلامة المائية", "Watermark text"],
] as const;

function IdentityPage() {
  const t = useT();
  const ar = useAr();
  const fail = useDocFail();
  const qc = useQueryClient();

  const fetchIdentity = useServerFn(getCompanyIdentity);
  const save = useServerFn(saveCompanyIdentity);
  const setStatus = useServerFn(setIdentityStatus);
  const loadProposals = useServerFn(loadIdentityProposals);
  const decide = useServerFn(decideIdentityProposal);

  const { data } = useQuery({ queryKey: ["identity"], queryFn: () => fetchIdentity({}) });
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = (data?.identity ?? {}) as Record<string, unknown>;
    const next: Record<string, string> = {};
    for (const [key] of TEXT_FIELDS) next[key] = id[key]?.toString() ?? "";
    next['footer_note_ar'] = (id['footer_note_ar'] as string) ?? "";
    setForm(next);
  }, [data]);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["identity"] });

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...form,
          primary_color: BRAND.primary,
          secondary_color: BRAND.secondary,
          watermark_enabled: true,
          vat_effective_date: form['vat_effective_date'] || null,
        } as never,
      }),
    onSuccess: () => { toast.success(t("تم الحفظ كمسودة", "Saved as draft")); invalidate(); },
    onError: fail,
  });

  const statusMut = useMutation({
    mutationFn: (s: "review" | "approved") => setStatus({ data: { status: s } }),
    onSuccess: () => { toast.success(t("تم تحديث الحالة", "Status updated")); invalidate(); },
    onError: fail,
  });

  const proposalsMut = useMutation({
    mutationFn: () => loadProposals({}),
    onSuccess: () => { toast.success(t("تم تحميل المقترحات للمراجعة", "Proposals loaded for review")); invalidate(); },
    onError: fail,
  });

  const decideMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => decide({ data: v }),
    onSuccess: () => { toast.success(t("تم تسجيل القرار", "Decision recorded")); invalidate(); },
    onError: fail,
  });

  const identity: any = data?.identity ?? null;
  const company: any = data?.company ?? {};
  const proposals: any[] = (data?.proposals as any[]) ?? [];

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveMut.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <span>{ar ? ADDRESS_PROOF_NOTICE.ar : ADDRESS_PROOF_NOTICE.en}</span>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-4 w-4 text-primary" />
            {t("هوية المنشأة", "Company identity")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge status={identity?.status ?? "draft"} />
            <Button size="sm" variant="outline" onClick={() => statusMut.mutate("review")}>
              {t("إرسال للمراجعة", "Submit for review")}
            </Button>
            <Button size="sm" onClick={() => statusMut.mutate("approved")} className="gradient-primary">
              {t("اعتماد", "Approve")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            {TEXT_FIELDS.map(([key, arLabel, enLabel]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{t(arLabel, enLabel)}</Label>
                <Input
                  id={key}
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="footer_note_ar">{t("تذييل الوثائق", "Document footer")}</Label>
              <Textarea
                id="footer_note_ar"
                rows={2}
                value={form['footer_note_ar'] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, footer_note_ar: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground sm:col-span-2">
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-8 rounded" style={{ background: BRAND.primary }} /> {BRAND.primary}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-8 rounded border" style={{ background: BRAND.secondary }} /> {BRAND.secondary}
              </span>
              <span>{t("ألوان الهوية ثابتة (كحلي + فضي) بدون تدرجات ذهبية.", "Fixed identity colours (navy + silver).")}</span>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saveMut.isPending} className="gradient-primary font-semibold">
                {saveMut.isPending ? t("جاري الحفظ...", "Saving...") : t("حفظ كمسودة", "Save draft")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">{t("مقترحات بيانات تحتاج اعتمادًا بشريًا", "Identity values pending human approval")}</CardTitle>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => proposalsMut.mutate()}>
            <Download className="h-4 w-4" />
            {t("تحميل المقترحات", "Load proposals")}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("الحقل", "Field")}</TableHead>
                <TableHead>{t("القيمة المقترحة", "Proposed value")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    {t("لا توجد مقترحات — لن يتم تطبيق أي قيمة تلقائيًا.", "No proposals — nothing is applied automatically.")}
                  </TableCell>
                </TableRow>
              )}
              {proposals.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium" dir="ltr">{p.field_key}</TableCell>
                  <TableCell dir="ltr">{p.proposed_value}</TableCell>
                  <TableCell><StatusBadge status={p.status === "pending" ? "review" : p.status} /></TableCell>
                  <TableCell className="text-end">
                    {p.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" className="gap-1 gradient-primary" onClick={() => decideMut.mutate({ id: p.id, approve: true })}>
                          <Check className="h-3.5 w-3.5" /> {t("اعتماد", "Approve")}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => decideMut.mutate({ id: p.id, approve: false })}>
                          <X className="h-3.5 w-3.5" /> {t("رفض", "Reject")}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{t("البيانات النظامية المعتمدة حاليًا", "Currently stored legal data")}</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>{t("الرقم الضريبي", "VAT number")}: <span dir="ltr">{company.vat_number ?? "—"}</span></div>
          <div>{t("السجل التجاري", "CR number")}: <span dir="ltr">{company.cr_number ?? "—"}</span></div>
          <div className="sm:col-span-2">
            {t("العنوان الوطني", "National address")}:{" "}
            {[company.address_building_no, company.address_street, company.address_district, company.address_city, company.address_postal_code]
              .filter(Boolean).join("، ") || "—"}
          </div>
          <div className="sm:col-span-2 text-xs text-muted-foreground">
            {t(
              "تُعدّل هذه القيم عبر اعتماد المقترحات أو صفحة بيانات المنشأة، ولا يمكن إصدار فاتورة ضريبية قبل اكتمالها واعتماد الهوية.",
              "These values change via approved proposals or the company profile page; tax invoices stay blocked until complete and approved.",
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
