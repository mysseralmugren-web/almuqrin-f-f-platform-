import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, RefreshCw, FileText, Download, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT, useTheme } from "@/lib/theme";
import { AI_JOB_KIND, AI_JOB_STATUS, AI_REC_STATUS, AI_VALUE_KIND, labelOf } from "@/lib/ai-constants";
import { AiChip, AiLoading, ConfidenceBadge, useAiFail } from "@/components/app/ai-ui";
import { getAiJob, getAiFileUrl, reviewAiField, reviewAiJob, runAiJob, applyAiRecommendation } from "@/lib/ai.functions";
import { listSuppliers } from "@/lib/purchasing.functions";
import { listCustomers } from "@/lib/workflow.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant/$id")({
  head: () => ({
    meta: [
      { title: "نتيجة تحليل الموظف الذكي · AlMugren AI Factory OS" },
      { name: "description", content: "Side-by-side review of the source document and the extracted fields before approval." },
    ],
  }),
  component: AiJobPage,
});

type Line = { description: string; unit: string; quantity: string; unit_price: string; discount_percent: string; vat_rate: string };
const emptyLine = (): Line => ({ description: "", unit: "قطعة", quantity: "1", unit_price: "0", discount_percent: "0", vat_rate: "15" });

function AiJobPage() {
  const { id } = Route.useParams();
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useAiFail();
  const qc = useQueryClient();

  const fetchJob = useServerFn(getAiJob);
  const fileUrl = useServerFn(getAiFileUrl);
  const saveField = useServerFn(reviewAiField);
  const review = useServerFn(reviewAiJob);
  const run = useServerFn(runAiJob);
  const apply = useServerFn(applyAiRecommendation);
  const fetchSuppliers = useServerFn(listSuppliers);
  const fetchCustomers = useServerFn(listCustomers);

  const jobQ = useQuery({ queryKey: ["ai-job", id], queryFn: () => fetchJob({ data: { id } }) });
  const suppliersQ = useQuery({ queryKey: ["suppliers"], queryFn: () => fetchSuppliers() });
  const customersQ = useQuery({ queryKey: ["customers"], queryFn: () => fetchCustomers() });

  const [preview, setPreview] = useState<{ url: string; mime: string } | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [applyRec, setApplyRec] = useState<string | null>(null);
  const [target, setTarget] = useState<"supplier_invoice" | "quotation">("supplier_invoice");
  const [partyId, setPartyId] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const files = jobQ.data?.files ?? [];
  const firstFile = files[0];

  useEffect(() => {
    let active = true;
    if (!firstFile) return;
    void fileUrl({ data: { file_id: firstFile.id } })
      .then((r) => { if (active) setPreview({ url: r.url, mime: firstFile.mime_type }); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [firstFile?.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of jobQ.data?.extractions ?? []) {
      const k = e.group_key ?? "root";
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [jobQ.data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["ai-job", id] });

  const mField = useMutation({
    mutationFn: (v: { id: string; accepted: boolean; text: string | null }) =>
      saveField({ data: { id: v.id, is_accepted: v.accepted, reviewed_value_text: v.text, reviewed_value_number: v.text && !Number.isNaN(Number(v.text)) ? Number(v.text) : null } }),
    onSuccess: refresh,
    onError: fail,
  });
  const mReview = useMutation({
    mutationFn: (v: { action: "approve" | "reject" | "request_changes" | "reanalyze"; recommendation_id?: string }) =>
      review({ data: { job_id: id, action: v.action, notes: notes || null, recommendation_id: v.recommendation_id ?? null } }),
    onSuccess: () => { toast.success(t("تم تسجيل المراجعة", "Review recorded")); setNotes(""); refresh(); },
    onError: fail,
  });
  const mRun = useMutation({ mutationFn: () => run({ data: { id } }), onSuccess: () => { toast.success(t("تمت إعادة التحليل", "Re-analysis completed")); refresh(); }, onError: fail });

  const mApply = useMutation({
    mutationFn: () => {
      const parsedLines = lines.map((l) => ({
        description: l.description, unit: l.unit, quantity: Number(l.quantity) || 0, unit_price: Number(l.unit_price) || 0,
        discount_percent: Number(l.discount_percent) || 0, vat_rate: Number(l.vat_rate) || 0,
      }));
      const draft = target === "supplier_invoice"
        ? { target: "supplier_invoice" as const, supplier_id: partyId, supplier_invoice_number: docNumber, invoice_date: docDate, tax_treatment: "standard" as const, lines: parsedLines }
        : { target: "quotation" as const, customer_id: partyId, valid_until: null, notes: null, lines: parsedLines };
      return apply({ data: { recommendation_id: applyRec!, draft } });
    },
    onSuccess: (r) => { toast.success(t(`تم إنشاء مسودة (${r.entity})`, `Draft created (${r.entity})`)); setApplyRec(null); refresh(); },
    onError: fail,
  });

  const prefillLines = () => {
    const rows = (jobQ.data?.extractions ?? []).filter((e: any) => e.group_key === "line");
    const byLine = new Map<number, Line>();
    for (const r of rows) {
      const n = Number(r.line_no ?? 1);
      const l = byLine.get(n) ?? emptyLine();
      const v = r.reviewed_value_text ?? r.value_text ?? (r.value_number != null ? String(r.value_number) : "");
      if (/desc/i.test(r.field_path)) l.description = v;
      else if (/qty|quantity/i.test(r.field_path)) l.quantity = String(r.value_number ?? v);
      else if (/price/i.test(r.field_path)) l.unit_price = String(r.value_number ?? v);
      else if (/discount/i.test(r.field_path)) l.discount_percent = String(r.value_number ?? v);
      else if (/unit/i.test(r.field_path)) l.unit = v || "قطعة";
      byLine.set(n, l);
    }
    const list = [...byLine.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l);
    setLines(list.length ? list : [emptyLine()]);
  };

  if (jobQ.isLoading) return <AiLoading label={t("جارٍ التحميل…", "Loading…")} />;
  const job = jobQ.data?.job;
  if (!job) return <p className="py-10 text-center text-muted-foreground">{t("المهمة غير موجودة", "Job not found")}</p>;

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold" dir="ltr">{job.job_number}</span>
              <AiChip value={job.status} label={labelOf(AI_JOB_STATUS, job.status, ar)} />
              <ConfidenceBadge value={job.confidence} />
            </div>
            <p className="text-sm text-muted-foreground">
              {labelOf(AI_JOB_KIND, job.kind, ar)} · {job.title ?? "—"} · <span dir="ltr">{job.model}</span>
            </p>
            {job.error_message && <p className="text-xs text-destructive" dir="ltr">{job.error_code}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => mRun.mutate()} disabled={mRun.isPending || job.attempts >= job.max_attempts}>
              <RefreshCw className="h-4 w-4" />{t("إعادة التحليل", "Re-analyze")}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => mReview.mutate({ action: "reject" })}>
              <X className="h-4 w-4" />{t("رفض النتيجة", "Reject result")}
            </Button>
            <Button className="gap-2" onClick={() => mReview.mutate({ action: "approve" })}>
              <Check className="h-4 w-4" />{t("اعتماد المراجعة", "Approve review")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">{t("المستند المصدر", "Source document")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {files.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد ملفات", "No files")}</p>}
            <div className="flex flex-wrap gap-2">
              {files.map((f: any) => (
                <Button key={f.id} size="sm" variant="outline" className="gap-2"
                  onClick={() => fileUrl({ data: { file_id: f.id } }).then((r) => setPreview({ url: r.url, mime: f.mime_type })).catch(fail)}>
                  <FileText className="h-4 w-4" /><span className="max-w-[160px] truncate" dir="ltr">{f.file_name}</span>
                </Button>
              ))}
            </div>
            {preview && (
              preview.mime === "application/pdf" ? (
                <div className="space-y-2">
                  <iframe title="document" src={preview.url} className="h-[520px] w-full rounded-lg border" />
                  <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Download className="h-3 w-3" />{t("فتح في نافذة جديدة (رابط موقّع 5 دقائق)", "Open in new tab (5-minute signed URL)")}
                  </a>
                </div>
              ) : (
                <img src={preview.url} alt={t("المستند المصدر", "Source document")} className="max-h-[520px] w-full rounded-lg border object-contain" />
              )
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">{t("الحقول المستخرجة", "Extracted fields")}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {grouped.length === 0 && <p className="text-sm text-muted-foreground">{t("لا توجد نتائج بعد", "No results yet")}</p>}
            {grouped.map(([group, rows]) => (
              <div key={group} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">{group}</h3>
                <div className="space-y-2">
                  {rows.map((e: any) => {
                    const current = edits[e.id] ?? e.reviewed_value_text ?? e.value_text ?? (e.value_number != null ? String(e.value_number) : "");
                    return (
                      <div key={e.id} className="rounded-lg border p-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{ar ? e.label_ar ?? e.field_path : e.label_en ?? e.field_path}</span>
                          <AiChip value={e.value_kind} label={labelOf(AI_VALUE_KIND, e.value_kind, ar)} />
                          <ConfidenceBadge value={e.confidence} />
                          {e.line_no != null && <span className="text-xs text-muted-foreground" dir="ltr">#{e.line_no}</span>}
                          {e.is_reviewed && <AiChip value={e.is_accepted ? "approved" : "rejected"} label={e.is_accepted ? t("مقبول", "Accepted") : t("مرفوض", "Rejected")} />}
                        </div>
                        <Input value={current} onChange={(ev) => setEdits((s) => ({ ...s, [e.id]: ev.target.value }))} />
                        {(e.evidence?.snippet || e.evidence?.location) && (
                          <p className="mt-1 text-[11px] text-muted-foreground" dir="auto">
                            {t("الدليل", "Evidence")}: {e.evidence.snippet ?? e.evidence.location}{e.evidence.page ? ` · ${t("صفحة", "page")} ${e.evidence.page}` : ""}
                          </p>
                        )}
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => mField.mutate({ id: e.id, accepted: true, text: current })}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => mField.mutate({ id: e.id, accepted: false, text: current })}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{t("التوصيات والتنبيهات", "Recommendations & alerts")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("التوصية", "Recommendation")}</TableHead>
                <TableHead>{t("الأهمية", "Severity")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
                <TableHead className="text-end">{t("إجراءات", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(jobQ.data?.recommendations ?? []).length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{t("لا توجد توصيات", "No recommendations")}</TableCell></TableRow>
              )}
              {(jobQ.data?.recommendations ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{ar ? r.title_ar : r.title_en ?? r.title_ar}</div>
                    {r.rationale && <div className="text-xs text-muted-foreground">{r.rationale}</div>}
                  </TableCell>
                  <TableCell><AiChip value={r.severity} label={r.severity} /></TableCell>
                  <TableCell><AiChip value={r.status} label={labelOf(AI_REC_STATUS, r.status, ar)} /></TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      {r.status === "draft" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => mReview.mutate({ action: "approve", recommendation_id: r.id })}>{t("اعتماد", "Approve")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => mReview.mutate({ action: "reject", recommendation_id: r.id })}>{t("رفض", "Reject")}</Button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <Dialog open={applyRec === r.id} onOpenChange={(o) => { setApplyRec(o ? r.id : null); if (o) prefillLines(); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-2"><Wand2 className="h-3.5 w-3.5" />{t("إنشاء مسودة", "Create draft")}</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader><DialogTitle>{t("إنشاء مسودة من التوصية", "Create a draft from the recommendation")}</DialogTitle></DialogHeader>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>{t("نوع المستند", "Document type")}</Label>
                                <Select value={target} onValueChange={(v) => { setTarget(v as any); setPartyId(""); }}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="supplier_invoice">{t("فاتورة مورد (مسودة)", "Supplier invoice (draft)")}</SelectItem>
                                    <SelectItem value="quotation">{t("عرض سعر (مسودة)", "Quotation (draft)")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>{target === "supplier_invoice" ? t("المورد", "Supplier") : t("العميل", "Customer")}</Label>
                                <Select value={partyId} onValueChange={setPartyId}>
                                  <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                                  <SelectContent>
                                    {(target === "supplier_invoice" ? suppliersQ.data ?? [] : customersQ.data ?? []).map((p: any) => (
                                      <SelectItem key={p.id} value={p.id}>{p.name_ar ?? p.name_en}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {target === "supplier_invoice" && (
                                <div className="space-y-2">
                                  <Label>{t("رقم فاتورة المورد", "Supplier invoice #")}</Label>
                                  <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} dir="ltr" />
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label>{t("التاريخ", "Date")}</Label>
                                <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
                              </div>
                            </div>
                            <div className="max-h-64 space-y-2 overflow-auto">
                              {lines.map((l, idx) => (
                                <div key={idx} className="grid grid-cols-2 gap-2 rounded-lg border p-2 md:grid-cols-6">
                                  <Input className="md:col-span-2" placeholder={t("الوصف", "Description")} value={l.description} onChange={(e) => setLines((s) => s.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} />
                                  <Input placeholder={t("الوحدة", "Unit")} value={l.unit} onChange={(e) => setLines((s) => s.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)))} />
                                  <Input placeholder={t("الكمية", "Qty")} value={l.quantity} onChange={(e) => setLines((s) => s.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))} dir="ltr" />
                                  <Input placeholder={t("السعر", "Price")} value={l.unit_price} onChange={(e) => setLines((s) => s.map((x, i) => (i === idx ? { ...x, unit_price: e.target.value } : x)))} dir="ltr" />
                                  <Input placeholder={t("ضريبة %", "VAT %")} value={l.vat_rate} onChange={(e) => setLines((s) => s.map((x, i) => (i === idx ? { ...x, vat_rate: e.target.value } : x)))} dir="ltr" />
                                </div>
                              ))}
                              <Button size="sm" variant="outline" onClick={() => setLines((s) => [...s, emptyLine()])}>{t("إضافة بند", "Add line")}</Button>
                            </div>
                            <DialogFooter>
                              <Button onClick={() => mApply.mutate()} disabled={mApply.isPending || !partyId}>
                                {t("إنشاء المسودة", "Create draft")}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      {r.status === "applied" && <span className="text-xs text-muted-foreground" dir="ltr">{r.applied_entity}</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{t("سجل المراجعة", "Review log")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t("ملاحظات المراجعة", "Review notes")} />
          <div className="space-y-2">
            {(jobQ.data?.reviews ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>{r.action}</span>
                <span className="text-xs text-muted-foreground" dir="ltr">{new Date(r.created_at).toLocaleString("en-GB")}</span>
              </div>
            ))}
            {(jobQ.data?.reviews ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("لا يوجد سجل مراجعة", "No review history")}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

