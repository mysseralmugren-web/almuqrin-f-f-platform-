import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReceiptText, Sparkles, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/theme";
import { applyAiRecommendation, getAiJob, listAiJobs, reviewAiJob } from "@/lib/ai.functions";
import { createSupplier, listSuppliers } from "@/lib/purchasing.functions";
import { money } from "@/components/app/purchasing-ui";

export const Route = createFileRoute("/_authenticated/ai-assistant/invoice")({
  head: () => ({
    meta: [
      { title: "فاتورة مورد ذكية · AlMugren AI Factory OS" },
      { name: "description", content: "Approve an AI supplier-invoice analysis, match or create the supplier, and create a draft supplier invoice without ledger posting." },
    ],
  }),
  component: SmartSupplierInvoicePage,
});

type Line = {
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  vat_rate: number;
};

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s\-_/.,،]/g, "");
}

function fieldValue(rows: any[], patterns: RegExp[]) {
  const row = rows.find((r) => {
    const key = `${r.field_path ?? ""} ${r.label_ar ?? ""} ${r.label_en ?? ""}`;
    return patterns.some((p) => p.test(key));
  });
  if (!row) return "";
  return String(row.reviewed_value_text ?? row.value_text ?? row.reviewed_value_number ?? row.value_number ?? "").trim();
}

function toDate(value: string) {
  const m = value.match(/(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (!m) return new Date().toISOString().slice(0, 10);
  return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
}

function extractedLines(rows: any[]): Line[] {
  const grouped = new Map<number, Line>();
  for (const r of rows.filter((e) => e.group_key === "line" || e.line_no != null)) {
    const n = Number(r.line_no ?? 1);
    const line = grouped.get(n) ?? { description: "", unit: "قطعة", quantity: 1, unit_price: 0, discount_percent: 0, vat_rate: 15 };
    const key = `${r.field_path ?? ""} ${r.label_ar ?? ""} ${r.label_en ?? ""}`;
    const text = String(r.reviewed_value_text ?? r.value_text ?? "").trim();
    const num = Number(r.reviewed_value_number ?? r.value_number ?? text);
    if (/desc|description|وصف|بيان/i.test(key)) line.description = text;
    else if (/qty|quantity|كمية/i.test(key) && Number.isFinite(num)) line.quantity = num;
    else if (/unit_price|price|سعر/i.test(key) && Number.isFinite(num)) line.unit_price = num;
    else if (/discount|خصم/i.test(key) && Number.isFinite(num)) line.discount_percent = num;
    else if (/vat|tax|ضريب/i.test(key) && Number.isFinite(num)) line.vat_rate = num;
    else if (/unit|وحدة/i.test(key)) line.unit = text || "قطعة";
    grouped.set(n, line);
  }
  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, line]) => line)
    .filter((line) => line.description && line.quantity > 0 && line.unit_price >= 0);
}

function SmartSupplierInvoicePage() {
  const t = useT();
  const qc = useQueryClient();
  const listJobs = useServerFn(listAiJobs);
  const getJob = useServerFn(getAiJob);
  const suppliersFn = useServerFn(listSuppliers);
  const addSupplier = useServerFn(createSupplier);
  const review = useServerFn(reviewAiJob);
  const apply = useServerFn(applyAiRecommendation);

  const jobsQ = useQuery({
    queryKey: ["ai-supplier-invoice-jobs"],
    queryFn: () => listJobs({ data: { kind: "supplier_invoice", status: "completed" } }),
  });
  const suppliersQ = useQuery({ queryKey: ["suppliers"], queryFn: () => suppliersFn() });
  const [jobId, setJobId] = useState("");
  const jobQ = useQuery({
    queryKey: ["ai-supplier-invoice-job", jobId],
    queryFn: () => getJob({ data: { id: jobId } }),
    enabled: !!jobId,
  });
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierVat, setSupplierVat] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxTreatment, setTaxTreatment] = useState<"standard" | "exempt" | "out_of_scope">("standard");
  const [lines, setLines] = useState<Line[]>([]);
  const [preparedFor, setPreparedFor] = useState("");
  const [createdInvoiceId, setCreatedInvoiceId] = useState("");

  const data = jobQ.data;
  const rows = data?.extractions ?? [];
  const rec = useMemo(() => {
    const recs = data?.recommendations ?? [];
    return recs.find((r: any) => r.status === "approved") ?? recs.find((r: any) => r.status === "draft") ?? null;
  }, [data]);

  const prepare = () => {
    if (!data?.job) return;
    const name = fieldValue(rows, [/supplier.*name/i, /vendor.*name/i, /اسم.*المورد/i, /المورد/i]);
    const vat = fieldValue(rows, [/supplier.*vat/i, /vendor.*vat/i, /vat.*number/i, /الرقم.*الضريب/i]).replace(/\D/g, "").slice(0, 15);
    const number = fieldValue(rows, [/invoice.*number/i, /invoice.*no/i, /رقم.*الفاتورة/i]);
    const date = fieldValue(rows, [/invoice.*date/i, /تاريخ.*الفاتورة/i]);
    const parsedLines = extractedLines(rows);
    const suppliers = suppliersQ.data ?? [];
    const match = suppliers.find((s: any) => vat && String(s.vat_number ?? "") === vat)
      ?? suppliers.find((s: any) => name && (normalized(s.name_ar) === normalized(name) || normalized(s.name_en) === normalized(name)))
      ?? null;
    setSupplierName(name);
    setSupplierVat(vat);
    setSupplierId(match?.id ?? "");
    setInvoiceNumber(number);
    setInvoiceDate(toDate(date));
    setTaxTreatment("standard");
    setLines(parsedLines.length ? parsedLines : [{ description: "", unit: "قطعة", quantity: 1, unit_price: 0, discount_percent: 0, vat_rate: 15 }]);
    setPreparedFor(data.job.id);
    setCreatedInvoiceId("");
    if (match) toast.success(t("تمت مطابقة المورد تلقائيًا", "Supplier matched automatically"));
    else toast.message(t("لم تتم مطابقة مورد؛ يمكنك اختياره أو إنشاؤه من بيانات الفاتورة", "No supplier match; select one or create it from the invoice"));
  };

  const createSupplierM = useMutation({
    mutationFn: () => addSupplier({
      data: {
        code: `AI-${Date.now().toString(36).slice(-10)}`.toUpperCase(),
        name_ar: supplierName || "مورد جديد",
        name_en: null,
        vat_number: supplierVat || null,
        cr_number: null,
        iban: null,
        bank_name: null,
        payment_terms_days: 30,
        category: "AI invoice import",
        status: "active",
        email: null,
        phone: null,
        city: null,
        address: null,
        notes: `Created from AI supplier-invoice analysis ${jobId}`,
      },
    }),
    onSuccess: async (r) => {
      setSupplierId(r.id);
      await qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(t("تم إنشاء المورد وربطه بالفاتورة", "Supplier created and linked"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const applyM = useMutation({
    mutationFn: async () => {
      if (!data?.job || !rec) throw new Error("AI_RECOMMENDATION_REQUIRED");
      if (!supplierId) throw new Error("SUPPLIER_REQUIRED");
      if (!invoiceNumber.trim()) throw new Error("INVOICE_NUMBER_REQUIRED");
      const validLines = lines.filter((l) => l.description.trim() && l.quantity > 0 && l.unit_price >= 0);
      if (!validLines.length) throw new Error("INVOICE_LINES_REQUIRED");

      await review({ data: { job_id: data.job.id, action: "approve", notes: "Approved for supplier-invoice draft creation", recommendation_id: null } });
      if (rec.status === "draft") {
        await review({ data: { job_id: data.job.id, action: "approve", notes: "Approved recommendation for supplier-invoice draft creation", recommendation_id: rec.id } });
      }
      return apply({
        data: {
          recommendation_id: rec.id,
          draft: {
            target: "supplier_invoice",
            supplier_id: supplierId,
            supplier_invoice_number: invoiceNumber.trim(),
            invoice_date: invoiceDate,
            due_date: null,
            tax_treatment: taxTreatment,
            lines: validLines,
          },
        },
      });
    },
    onSuccess: async (r) => {
      setCreatedInvoiceId(r.id);
      await qc.invalidateQueries({ queryKey: ["ai-supplier-invoice-jobs"] });
      await qc.invalidateQueries({ queryKey: ["ai-supplier-invoice-job", jobId] });
      toast.success(t("تم اعتماد التحليل وإنشاء مسودة فاتورة المورد", "Analysis approved and supplier invoice draft created"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const totals = lines.reduce((a, l) => {
    const gross = l.quantity * l.unit_price;
    const discount = gross * (l.discount_percent / 100);
    const taxable = gross - discount;
    const vat = taxTreatment === "standard" ? taxable * (l.vat_rate / 100) : 0;
    return { subtotal: a.subtotal + taxable, vat: a.vat + vat };
  }, { subtotal: 0, vat: 0 });

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-5 w-5" />{t("فاتورة مورد ذكية", "Smart supplier invoice")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("يحوّل تحليل فاتورة المورد المكتمل إلى مسودة قابلة للمراجعة. لا يتم إنشاء قيد محاسبي أو اعتماد مالي تلقائيًا.", "Converts a completed supplier-invoice analysis into a reviewable draft. No ledger posting or financial approval occurs automatically.")}
          </p>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Select value={jobId} onValueChange={(v) => { setJobId(v); setPreparedFor(""); setCreatedInvoiceId(""); }}>
              <SelectTrigger><SelectValue placeholder={t("اختر تحليل فاتورة مكتمل", "Select a completed invoice analysis")} /></SelectTrigger>
              <SelectContent>
                {(jobsQ.data ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.job_number} · {j.title ?? t("فاتورة مورد", "Supplier invoice")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={prepare} disabled={!jobQ.data || suppliersQ.isLoading} className="gap-2"><Sparkles className="h-4 w-4" />{t("تجهيز تلقائي", "Auto prepare")}</Button>
          </div>
          {jobId && !jobQ.isLoading && !rec && <p className="text-sm text-destructive">{t("هذا التحليل لا يحتوي توصية قابلة للاعتماد. أعد التحليل أو راجع نتيجته أولًا.", "This analysis has no actionable recommendation. Re-analyze or review it first.")}</p>}
        </CardContent>
      </Card>

      {preparedFor === jobId && data?.job ? (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">{t("مراجعة المسودة قبل الإنشاء", "Review draft before creation")}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 lg:col-span-2">
                <Label>{t("المورد", "Supplier")}</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder={t("اختر المورد", "Select supplier")} /></SelectTrigger>
                  <SelectContent>{(suppliersQ.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name_ar ?? s.name_en}</SelectItem>)}</SelectContent>
                </Select>
                {!supplierId && (
                  <div className="rounded-lg border p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder={t("اسم المورد المستخرج", "Extracted supplier name")} />
                      <Input value={supplierVat} onChange={(e) => setSupplierVat(e.target.value.replace(/\D/g, "").slice(0, 15))} placeholder={t("الرقم الضريبي", "VAT number")} dir="ltr" />
                    </div>
                    <Button size="sm" variant="outline" className="mt-2 gap-2" onClick={() => createSupplierM.mutate()} disabled={createSupplierM.isPending || supplierName.trim().length < 2 || (!!supplierVat && supplierVat.length !== 15)}>
                      <UserPlus className="h-4 w-4" />{t("إنشاء المورد من بيانات الفاتورة", "Create supplier from invoice")}
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2"><Label>{t("رقم الفاتورة", "Invoice number")}</Label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} dir="ltr" /></div>
              <div className="space-y-2"><Label>{t("تاريخ الفاتورة", "Invoice date")}</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("المعالجة الضريبية", "Tax treatment")}</Label><Select value={taxTreatment} onValueChange={(v) => setTaxTreatment(v as typeof taxTreatment)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">{t("ضريبة مدخلات 15%", "Input VAT 15%")}</SelectItem><SelectItem value="exempt">{t("معفاة", "Exempt")}</SelectItem><SelectItem value="out_of_scope">{t("خارج النطاق", "Out of scope")}</SelectItem></SelectContent></Select></div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>{t("البيان", "Description")}</TableHead><TableHead>{t("الوحدة", "Unit")}</TableHead><TableHead>{t("الكمية", "Qty")}</TableHead><TableHead>{t("سعر الوحدة", "Unit price")}</TableHead><TableHead>{t("خصم %", "Disc %")}</TableHead><TableHead>{t("VAT %", "VAT %")}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell><Input value={l.description} onChange={(e) => setLines((s) => s.map((x, n) => n === i ? { ...x, description: e.target.value } : x))} /></TableCell>
                      <TableCell><Input value={l.unit} onChange={(e) => setLines((s) => s.map((x, n) => n === i ? { ...x, unit: e.target.value } : x))} /></TableCell>
                      <TableCell><Input type="number" min="0.001" value={l.quantity} onChange={(e) => setLines((s) => s.map((x, n) => n === i ? { ...x, quantity: Number(e.target.value) } : x))} /></TableCell>
                      <TableCell><Input type="number" min="0" value={l.unit_price} onChange={(e) => setLines((s) => s.map((x, n) => n === i ? { ...x, unit_price: Number(e.target.value) } : x))} /></TableCell>
                      <TableCell><Input type="number" min="0" max="100" value={l.discount_percent} onChange={(e) => setLines((s) => s.map((x, n) => n === i ? { ...x, discount_percent: Number(e.target.value) } : x))} /></TableCell>
                      <TableCell><Input type="number" min="0" max="100" value={l.vat_rate} disabled={taxTreatment !== "standard"} onChange={(e) => setLines((s) => s.map((x, n) => n === i ? { ...x, vat_rate: Number(e.target.value) } : x))} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-4 text-sm">
              <div>{t("قبل الضريبة", "Subtotal")}: <strong>{money(totals.subtotal)}</strong> · {t("ضريبة المدخلات", "Input VAT")}: <strong>{money(totals.vat)}</strong> · {t("الإجمالي", "Total")}: <strong>{money(totals.subtotal + totals.vat)}</strong></div>
              <Button onClick={() => applyM.mutate()} disabled={applyM.isPending || !supplierId || !rec || !invoiceNumber.trim()} className="gap-2"><CheckCircle2 className="h-4 w-4" />{t("اعتماد التحليل وإنشاء مسودة الفاتورة", "Approve analysis & create invoice draft")}</Button>
            </div>

            {createdInvoiceId && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="font-medium">{t("تم إنشاء مسودة فاتورة المورد وربطها بتحليل الذكاء الاصطناعي. الخطوة التالية هي المطابقة والاعتماد المحاسبي من وحدة المشتريات.", "Supplier invoice draft created and linked to the AI analysis. Next, perform matching and accounting approval in Purchasing.")}</p>
                <Button asChild variant="outline" className="mt-3"><Link to="/purchasing/invoices">{t("فتح فواتير الموردين", "Open supplier invoices")}</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
