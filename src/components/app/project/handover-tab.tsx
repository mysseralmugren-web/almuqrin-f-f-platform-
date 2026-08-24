import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Printer, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT, useTheme } from "@/lib/theme";
import { HANDOVER_TYPE, SNAG_STATUS } from "@/lib/projects-constants";
import { Loading, StatusChip, CriticalBadge, UploadButton, ViewFileButton, useProjectFail } from "@/components/app/projects-ui";
import { listHandovers, createHandover, approveHandover, listSnags, upsertSnag, createWarranty } from "@/lib/projects.functions";

export function HandoverTab({ projectId }: { projectId: string }) {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useProjectFail();
  const qc = useQueryClient();

  const fetchHandovers = useServerFn(listHandovers);
  const fetchSnags = useServerFn(listSnags);
  const add = useServerFn(createHandover);
  const approve = useServerFn(approveHandover);
  const saveSnag = useServerFn(upsertSnag);
  const newWarranty = useServerFn(createWarranty);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ handover_type: "preliminary", handover_date: today, customer_representative: "", representative_id_number: "", notes: "" });
  const [snag, setSnag] = useState({ title_ar: "", description: "", location_note: "", is_critical: false, due_date: "", handover_record_id: "" });

  const handoversQ = useQuery({ queryKey: ["handovers", projectId], queryFn: () => fetchHandovers({ data: { project_id: projectId } }) });
  const snagsQ = useQuery({ queryKey: ["snags", projectId], queryFn: () => fetchSnags({ data: { project_id: projectId } }) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["handovers", projectId] });
    qc.invalidateQueries({ queryKey: ["snags", projectId] });
    qc.invalidateQueries({ queryKey: ["warranties"] });
  };

  const mAdd = useMutation({
    mutationFn: () => add({ data: { project_id: projectId, handover_type: form.handover_type as "preliminary" | "final", handover_date: form.handover_date, customer_representative: form.customer_representative || null, representative_id_number: form.representative_id_number || null, notes: form.notes || null } }),
    onSuccess: () => { toast.success(t("تم إنشاء محضر الاستلام", "Handover created")); refresh(); },
    onError: fail,
  });
  const mApprove = useMutation({ mutationFn: (v: { id: string; path?: string }) => approve({ data: { id: v.id, signature_path: v.path ?? null } }), onSuccess: () => { toast.success(t("تم توقيع المحضر", "Handover signed")); refresh(); }, onError: fail });
  const mSnag = useMutation({
    mutationFn: () => saveSnag({ data: { project_id: projectId, title_ar: snag.title_ar, description: snag.description || null, location_note: snag.location_note || null, is_critical: snag.is_critical, due_date: snag.due_date || null, handover_record_id: snag.handover_record_id || null, status: "open" } }),
    onSuccess: () => { setSnag({ title_ar: "", description: "", location_note: "", is_critical: false, due_date: "", handover_record_id: "" }); refresh(); },
    onError: fail,
  });
  const mSnagPatch = useMutation({ mutationFn: (v: any) => saveSnag({ data: v }), onSuccess: refresh, onError: fail });
  const mWarranty = useMutation({
    mutationFn: (h: any) => newWarranty({ data: { project_id: projectId, handover_record_id: h.id, start_date: h.handover_date } }),
    onSuccess: () => { toast.success(t("تم إصدار الضمان", "Warranty issued")); refresh(); },
    onError: fail,
  });

  if (handoversQ.isLoading || snagsQ.isLoading) return <Loading />;
  const handovers: any[] = handoversQ.data ?? [];
  const snags: any[] = snagsQ.data ?? [];

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-5">
          <div>
            <Label>{t("نوع المحضر", "Type")}</Label>
            <Select value={form.handover_type} onValueChange={(v) => setForm({ ...form, handover_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(HANDOVER_TYPE).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>{t("التاريخ", "Date")}</Label><Input type="date" dir="ltr" value={form.handover_date} onChange={(e) => setForm({ ...form, handover_date: e.target.value })} /></div>
          <div><Label>{t("ممثل العميل", "Representative")}</Label><Input value={form.customer_representative} onChange={(e) => setForm({ ...form, customer_representative: e.target.value })} /></div>
          <div><Label>{t("رقم الهوية", "ID number")}</Label><Input dir="ltr" value={form.representative_id_number} onChange={(e) => setForm({ ...form, representative_id_number: e.target.value })} /></div>
          <div className="flex items-end">
            <Button className="w-full gap-2 gradient-primary" onClick={() => mAdd.mutate()}><Plus className="h-4 w-4" />{t("محضر استلام", "Handover")}</Button>
          </div>
          <Textarea className="sm:col-span-5" rows={2} placeholder={t("ملاحظات المحضر", "Notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </CardContent>
      </Card>

      {handovers.map((h) => (
        <Card key={h.id} className="shadow-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold" dir="ltr">{h.handover_number}</span>
                <StatusChip value={h.handover_type} map={HANDOVER_TYPE} />
                {h.customer_approved && <span className="text-xs text-emerald-600">{t("موقّع من العميل", "Customer signed")}</span>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground" dir="ltr">{h.handover_date} · {h.customer_representative ?? "—"}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ViewFileButton path={h.signature_path} label={t("التوقيع", "Signature")} />
              <Button asChild size="sm" variant="outline" className="gap-1">
                <Link to="/print/project/$kind/$id" params={{ kind: "handover", id: h.id }}><Printer className="h-4 w-4" />{t("طباعة", "Print")}</Link>
              </Button>
              {!h.customer_approved && (
                <>
                  <UploadButton projectId={projectId} kind="signatures" label={t("رفع توقيع", "Upload signature")} onUploaded={(p) => mApprove.mutate({ id: h.id, path: p })} />
                  <Button size="sm" className="gap-1 gradient-primary" onClick={() => mApprove.mutate({ id: h.id })}><CheckCircle2 className="h-4 w-4" />{t("اعتماد العميل", "Customer approve")}</Button>
                </>
              )}
              {h.customer_approved && h.handover_type === "final" && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => mWarranty.mutate(h)}>
                  <ShieldCheck className="h-4 w-4" />{t("إصدار الضمان", "Issue warranty")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="shadow-card">
        <CardContent className="space-y-3 p-5">
          <div className="font-semibold">{t("ملاحظات الاستلام (Snag list)", "Snag list")}</div>
          <div className="grid gap-2 sm:grid-cols-5">
            <Input placeholder={t("العنوان", "Title")} value={snag.title_ar} onChange={(e) => setSnag({ ...snag, title_ar: e.target.value })} />
            <Input placeholder={t("الموقع", "Location")} value={snag.location_note} onChange={(e) => setSnag({ ...snag, location_note: e.target.value })} />
            <Input type="date" dir="ltr" value={snag.due_date} onChange={(e) => setSnag({ ...snag, due_date: e.target.value })} />
            <Select value={snag.handover_record_id} onValueChange={(v) => setSnag({ ...snag, handover_record_id: v })}>
              <SelectTrigger><SelectValue placeholder={t("المحضر (اختياري)", "Handover (optional)")} /></SelectTrigger>
              <SelectContent>{handovers.map((h) => <SelectItem key={h.id} value={h.id}>{h.handover_number}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch checked={snag.is_critical} onCheckedChange={(v) => setSnag({ ...snag, is_critical: v })} />
              <span className="text-xs">{t("حرجة", "Critical")}</span>
            </div>
            <Textarea className="sm:col-span-4" rows={2} placeholder={t("الوصف", "Description")} value={snag.description} onChange={(e) => setSnag({ ...snag, description: e.target.value })} />
            <Button className="gap-1 gradient-primary" disabled={!snag.title_ar.trim()} onClick={() => mSnag.mutate()}><Plus className="h-4 w-4" />{t("إضافة", "Add")}</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("الملاحظة", "Snag")}</TableHead>
                <TableHead>{t("الموقع", "Location")}</TableHead>
                <TableHead>{t("الاستحقاق", "Due")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
                <TableHead>{t("صور", "Photos")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snags.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{t("لا توجد ملاحظات", "No snags")}</TableCell></TableRow>}
              {snags.map((s) => {
                const base = { id: s.id, project_id: projectId, title_ar: s.title_ar, is_critical: s.is_critical, status: s.status };
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2"><span className="font-medium">{s.title_ar}</span>{s.is_critical && <CriticalBadge ar={ar} />}</div>
                      <div className="text-xs text-muted-foreground">{s.description ?? ""}</div>
                      {s.waiver_note && <div className="text-xs text-amber-600">{t("تنازل", "Waiver")}: {s.waiver_note}</div>}
                    </TableCell>
                    <TableCell>{s.location_note ?? "—"}</TableCell>
                    <TableCell dir="ltr">{s.due_date ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={s.status} onValueChange={(v) => mSnagPatch.mutate({ ...base, status: v })}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(SNAG_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="flex flex-wrap items-center gap-1">
                      <ViewFileButton path={s.before_photo_path} label={t("قبل", "Before")} />
                      <ViewFileButton path={s.after_photo_path} label={t("بعد", "After")} />
                      <UploadButton projectId={projectId} kind="snags" label={t("قبل", "Before")} onUploaded={(p) => mSnagPatch.mutate({ ...base, before_photo_path: p })} />
                      <UploadButton projectId={projectId} kind="snags" label={t("بعد", "After")} onUploaded={(p) => mSnagPatch.mutate({ ...base, after_photo_path: p })} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

