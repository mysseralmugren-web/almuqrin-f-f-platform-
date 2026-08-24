import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Boxes, ClipboardCheck, Clock, Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addLaborLog,
  approveInspection,
  createInspection,
  deleteBomLine,
  getManufacturingOrder,
  issueMaterials,
  listItems,
  listWarehouses,
  reserveMaterials,
  returnMaterials,
  saveBomLine,
  setManufacturingStatus,
  updateStage,
} from "@/lib/mes.functions";
import {
  DEFAULT_QC_CHECKLIST,
  MFG_STATUS_AR,
  MFG_STATUS_EN,
  QC_RESULT_AR,
  STAGE_STATUS_AR,
  type MfgStatus,
} from "@/lib/mes-constants";
import { errorText } from "./mes.index";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/mes/$id")({ component: MoDetailPage });

const NEXT_ACTIONS: Partial<Record<MfgStatus, MfgStatus[]>> = {
  draft: ["approved", "cancelled"],
  approved: ["awaiting_materials", "ready_to_produce", "cancelled"],
  awaiting_materials: ["ready_to_produce", "cancelled"],
  ready_to_produce: ["in_production", "cancelled"],
  in_production: ["quality_check", "awaiting_materials"],
  quality_check: ["ready_for_delivery", "in_production"],
  ready_for_delivery: ["quality_check"],
};

const num = (v: unknown) => Number(v ?? 0);

function MoDetailPage() {
  const { id } = Route.useParams();
  const t = useT();
  const qc = useQueryClient();

  const fetchMo = useServerFn(getManufacturingOrder);
  const fetchItems = useServerFn(listItems);
  const fetchWarehouses = useServerFn(listWarehouses);
  const setStatus = useServerFn(setManufacturingStatus);
  const saveStage = useServerFn(updateStage);
  const saveLine = useServerFn(saveBomLine);
  const removeLine = useServerFn(deleteBomLine);
  const reserve = useServerFn(reserveMaterials);
  const issue = useServerFn(issueMaterials);
  const doReturn = useServerFn(returnMaterials);
  const inspect = useServerFn(createInspection);
  const approve = useServerFn(approveInspection);
  const logLabor = useServerFn(addLaborLog);

  const { data: mo, isLoading } = useQuery({ queryKey: ["mfg-order", id], queryFn: () => fetchMo({ data: { id } }) });
  const { data: items = [] } = useQuery({ queryKey: ["items"], queryFn: () => fetchItems({}) });
  const { data: warehouses = [] } = useQuery({ queryKey: ["warehouses"], queryFn: () => fetchWarehouses({}) });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["mfg-order", id] });
    void qc.invalidateQueries({ queryKey: ["mfg-orders"] });
    void qc.invalidateQueries({ queryKey: ["stock-balances"] });
  };
  const fail = (e: Error) => toast.error(errorText(e.message, t));

  const statusMutation = useMutation({
    mutationFn: (status: MfgStatus) => setStatus({ data: { id, status: status as any } }),
    onSuccess: () => { toast.success(t("تم تحديث الحالة", "Status updated")); refresh(); },
    onError: fail,
  });
  const stageMutation = useMutation({
    mutationFn: (vars: any) => saveStage({ data: vars }),
    onSuccess: () => { toast.success(t("تم تحديث المرحلة", "Stage updated")); refresh(); },
    onError: fail,
  });
  const bomMutation = useMutation({
    mutationFn: (vars: any) => saveLine({ data: vars }),
    onSuccess: () => { toast.success(t("تم حفظ بند المواد", "BOM line saved")); refresh(); },
    onError: fail,
  });
  const deleteMutation = useMutation({
    mutationFn: (lineId: string) => removeLine({ data: { id: lineId } }),
    onSuccess: () => { toast.success(t("تم الحذف", "Deleted")); refresh(); },
    onError: fail,
  });
  const reserveMutation = useMutation({
    mutationFn: () => reserve({ data: { manufacturing_order_id: id } }),
    onSuccess: () => { toast.success(t("تم حجز المواد", "Materials reserved")); refresh(); },
    onError: fail,
  });
  const issueMutation = useMutation({
    mutationFn: (vars: { bom_line_id: string; quantity: number }) =>
      issue({
        data: {
          manufacturing_order_id: id,
          lines: [vars],
          idempotency_key: `issue:${id}:${Date.now()}`,
        },
      }),
    onSuccess: () => { toast.success(t("تم صرف المواد", "Materials issued")); refresh(); },
    onError: fail,
  });
  const returnMutation = useMutation({
    mutationFn: (vars: { bom_line_id: string; quantity: number; scrap: boolean }) =>
      doReturn({ data: { ...vars, idempotency_key: `ret:${vars.bom_line_id}:${Date.now()}` } }),
    onSuccess: () => { toast.success(t("تم التسجيل", "Recorded")); refresh(); },
    onError: fail,
  });
  const qcMutation = useMutation({
    mutationFn: (vars: any) => inspect({ data: { manufacturing_order_id: id, ...vars } }),
    onSuccess: () => { toast.success(t("تم تسجيل الفحص", "Inspection recorded")); refresh(); },
    onError: fail,
  });
  const approveMutation = useMutation({
    mutationFn: (inspectionId: string) => approve({ data: { id: inspectionId } }),
    onSuccess: () => { toast.success(t("تم الاعتماد", "Approved")); refresh(); },
    onError: fail,
  });
  const laborMutation = useMutation({
    mutationFn: (vars: any) => logLabor({ data: { manufacturing_order_id: id, ...vars } }),
    onSuccess: () => { toast.success(t("تم تسجيل ساعات العمل", "Labor logged")); refresh(); },
    onError: fail,
  });

  // BOM form
  const [bomItem, setBomItem] = useState("");
  const [bomWarehouse, setBomWarehouse] = useState("");
  const [bomQty, setBomQty] = useState("");
  const [bomCost, setBomCost] = useState("");
  // QC form
  const [checklist, setChecklist] = useState<boolean[]>(DEFAULT_QC_CHECKLIST.map(() => false));
  const [qcResult, setQcResult] = useState<"pass" | "fail" | "rework">("pass");
  const [defects, setDefects] = useState("");
  const [corrective, setCorrective] = useState("");
  const [attachment, setAttachment] = useState("");
  // labor form
  const [worker, setWorker] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [laborStage, setLaborStage] = useState("__none__");

  if (isLoading || !mo) {
    return <div className="py-16 text-center text-muted-foreground">{t("جارٍ التحميل…", "Loading…")}</div>;
  }

  const order = mo as any;
  const stages = [...(order.manufacturing_stages ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
  const bom = (order.bom_lines ?? []) as any[];
  const inspections = (order.quality_inspections ?? []) as any[];
  const labor = (order.labor_logs ?? []) as any[];
  const status = order.status as MfgStatus;
  const totalHours = labor.reduce((s, l) => s + num(l.hours), 0);
  const materialCost = bom.reduce((s, l) => s + (num(l.issued_qty) - num(l.returned_qty)) * num(l.unit_cost), 0);
  const overallProgress = stages.length
    ? Math.round(stages.reduce((s: number, x: any) => s + num(x.progress_percent), 0) / stages.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/mes" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" />
            {t("رجوع لأوامر التصنيع", "Back to orders")}
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl" dir="ltr">{order.mo_number}</h1>
          <p className="text-sm text-muted-foreground">
            {order.sales_orders?.order_number} · {order.sales_orders?.customers?.name_ar}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="px-3 py-1 text-sm" variant="secondary">
            {t(MFG_STATUS_AR[status], MFG_STATUS_EN[status])}
          </Badge>
          {(NEXT_ACTIONS[status] ?? []).map((next) => (
            <Button
              key={next}
              size="sm"
              variant={next === "cancelled" ? "outline" : "default"}
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(next)}
            >
              {t(MFG_STATUS_AR[next], MFG_STATUS_EN[next])}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label={t("نسبة الإنجاز", "Progress")} value={`${overallProgress}%`} />
        <StatCard label={t("بنود المواد", "BOM lines")} value={String(bom.length)} />
        <StatCard label={t("ساعات العمل", "Labor hours")} value={totalHours.toFixed(2)} />
        <StatCard label={t("تكلفة المواد المصروفة", "Issued material cost")} value={materialCost.toFixed(2)} />
      </div>

      <Tabs defaultValue="stages">
        <TabsList className="flex-wrap">
          <TabsTrigger value="stages" className="gap-1"><Layers className="h-4 w-4" />{t("المراحل", "Stages")}</TabsTrigger>
          <TabsTrigger value="bom" className="gap-1"><Boxes className="h-4 w-4" />{t("المواد BOM", "BOM")}</TabsTrigger>
          <TabsTrigger value="qc" className="gap-1"><ClipboardCheck className="h-4 w-4" />{t("الجودة", "Quality")}</TabsTrigger>
          <TabsTrigger value="labor" className="gap-1"><Clock className="h-4 w-4" />{t("ساعات العمل", "Labor")}</TabsTrigger>
        </TabsList>

        {/* ---------- Stages ---------- */}
        <TabsContent value="stages" className="mt-4 space-y-3">
          {stages.length === 0 && <Empty t={t} text={["لا توجد مراحل لهذا الأمر", "No stages on this order"]} />}
          {stages.map((s: any) => (
            <Card key={s.id} className="shadow-card">
              <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{s.sequence}</span>
                    <span className="font-semibold">{t(s.name_ar, s.name_en ?? s.name_ar)}</span>
                    <Badge variant="outline">{t(STAGE_STATUS_AR[s.status] ?? s.status, s.status)}</Badge>
                  </div>
                  <Progress value={num(s.progress_percent)} className="h-2" />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      type="date"
                      defaultValue={s.planned_start ?? ""}
                      onBlur={(e) => e.target.value !== (s.planned_start ?? "") && stageMutation.mutate({ id: s.id, planned_start: e.target.value || null })}
                    />
                    <Input
                      type="date"
                      defaultValue={s.planned_end ?? ""}
                      onBlur={(e) => e.target.value !== (s.planned_end ?? "") && stageMutation.mutate({ id: s.id, planned_end: e.target.value || null })}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder={t("نسبة الإنجاز %", "Progress %")}
                      defaultValue={num(s.progress_percent)}
                      onBlur={(e) => stageMutation.mutate({ id: s.id, progress_percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                    />
                  </div>
                  <Textarea
                    rows={2}
                    placeholder={t("ملاحظات المرحلة", "Stage notes")}
                    defaultValue={s.notes ?? ""}
                    onBlur={(e) => e.target.value !== (s.notes ?? "") && stageMutation.mutate({ id: s.id, notes: e.target.value || null })}
                  />
                </div>
                <div className="flex flex-row gap-2 lg:flex-col">
                  <Button size="sm" variant="outline" onClick={() => stageMutation.mutate({ id: s.id, status: "in_progress" })}>
                    {t("بدء", "Start")}
                  </Button>
                  <Button size="sm" onClick={() => stageMutation.mutate({ id: s.id, status: "passed", progress_percent: 100 })}>
                    {t("إنهاء", "Complete")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => stageMutation.mutate({ id: s.id, status: "failed" })}>
                    {t("تعثر", "Blocked")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ---------- BOM ---------- */}
        <TabsContent value="bom" className="mt-4 space-y-4">
          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{t("قائمة المواد", "Bill of materials")}</CardTitle>
              <Button size="sm" variant="outline" disabled={reserveMutation.isPending} onClick={() => reserveMutation.mutate()}>
                {t("حجز المواد", "Reserve materials")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {bom.length === 0 && <Empty t={t} text={["لم تُضف مواد بعد", "No materials added yet"]} />}
              {bom.map((l) => {
                const outstanding = num(l.issued_qty) - num(l.returned_qty) - num(l.scrap_qty);
                return (
                  <div key={l.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{l.items?.name_ar}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{l.items?.sku} · {l.warehouses?.name_ar ?? "—"}</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                      <Metric label={t("مخطط", "Planned")} value={`${num(l.planned_qty)} ${l.unit}`} />
                      <Metric label={t("محجوز", "Reserved")} value={String(num(l.reserved_qty))} />
                      <Metric label={t("مصروف", "Issued")} value={String(num(l.issued_qty))} />
                      <Metric label={t("مرتجع", "Returned")} value={String(num(l.returned_qty))} />
                      <Metric label={t("هالك", "Scrap")} value={String(num(l.scrap_qty))} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <IssueControl
                        t={t}
                        max={Math.max(0, num(l.planned_qty) - num(l.issued_qty))}
                        onIssue={(q) => issueMutation.mutate({ bom_line_id: l.id, quantity: q })}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={outstanding <= 0}
                        onClick={() => returnMutation.mutate({ bom_line_id: l.id, quantity: outstanding, scrap: false })}
                      >
                        {t("إرجاع المتبقي", "Return remaining")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={outstanding <= 0}
                        onClick={() => returnMutation.mutate({ bom_line_id: l.id, quantity: outstanding, scrap: true })}
                      >
                        {t("تسجيل هالك", "Record scrap")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("إضافة مادة", "Add material")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-5">
              <div className="space-y-1 sm:col-span-2">
                <Label>{t("الصنف", "Item")}</Label>
                <Select value={bomItem} onValueChange={setBomItem}>
                  <SelectTrigger><SelectValue placeholder={t("اختر صنفًا", "Select item")} /></SelectTrigger>
                  <SelectContent>
                    {(items as any[]).map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name_ar} — {i.sku}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("المستودع", "Warehouse")}</Label>
                <Select value={bomWarehouse} onValueChange={setBomWarehouse}>
                  <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                  <SelectContent>
                    {(warehouses as any[]).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("الكمية المخططة", "Planned qty")}</Label>
                <Input type="number" min="0.001" step="0.001" value={bomQty} onChange={(e) => setBomQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("تكلفة الوحدة", "Unit cost")}</Label>
                <Input type="number" min="0" step="0.01" value={bomCost} onChange={(e) => setBomCost(e.target.value)} />
              </div>
              <div className="sm:col-span-5">
                <Button
                  disabled={!bomItem || !bomWarehouse || !(Number(bomQty) > 0) || bomMutation.isPending}
                  onClick={() => {
                    const item = (items as any[]).find((i) => i.id === bomItem);
                    bomMutation.mutate({
                      manufacturing_order_id: id,
                      item_id: bomItem,
                      warehouse_id: bomWarehouse,
                      unit: item?.unit ?? "قطعة",
                      planned_qty: Number(bomQty),
                      unit_cost: Number(bomCost) || 0,
                    });
                    setBomItem(""); setBomQty(""); setBomCost("");
                  }}
                >
                  {t("إضافة", "Add")}
                </Button>
                {(items as any[]).length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("لا توجد أصناف — أضفها من شاشة المستودعات", "No items — add them in the warehouse screen")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Quality ---------- */}
        <TabsContent value="qc" className="mt-4 space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("فحص جودة جديد", "New inspection")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {DEFAULT_QC_CHECKLIST.map((label, idx) => (
                  <label key={label} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checklist[idx]}
                      onCheckedChange={(v) => setChecklist((prev) => prev.map((c, i) => (i === idx ? Boolean(v) : c)))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("النتيجة", "Result")}</Label>
                  <Select value={qcResult} onValueChange={(v) => setQcResult(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">{t("ناجح", "Pass")}</SelectItem>
                      <SelectItem value="fail">{t("مرفوض", "Fail")}</SelectItem>
                      <SelectItem value="rework">{t("إعادة عمل", "Rework")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("رابط مرفق (اختياري)", "Attachment URL (optional)")}</Label>
                  <Input dir="ltr" value={attachment} onChange={(e) => setAttachment(e.target.value)} placeholder="https://" />
                </div>
              </div>
              <Textarea rows={2} placeholder={t("العيوب", "Defects")} value={defects} onChange={(e) => setDefects(e.target.value)} />
              <Textarea rows={2} placeholder={t("الإجراء التصحيحي", "Corrective action")} value={corrective} onChange={(e) => setCorrective(e.target.value)} />
              <Button
                disabled={qcMutation.isPending}
                onClick={() =>
                  qcMutation.mutate({
                    checklist: DEFAULT_QC_CHECKLIST.map((label, i) => ({ label, ok: Boolean(checklist[i]) })),
                    result: qcResult,
                    defects: defects || null,
                    corrective_action: corrective || null,
                    attachments: attachment ? [attachment] : [],
                  })
                }
              >
                {t("تسجيل الفحص", "Record inspection")}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("سجل الفحوصات", "Inspection history")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {inspections.length === 0 && <Empty t={t} text={["لا توجد فحوصات", "No inspections yet"]} />}
              {inspections.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0 text-sm">
                    <Badge variant={i.result === "pass" ? "default" : "outline"}>{t(QC_RESULT_AR[i.result] ?? i.result, i.result)}</Badge>
                    <span className="ms-2 text-xs text-muted-foreground">{new Date(i.inspected_at).toLocaleString("ar-SA")}</span>
                    {i.defects && <div className="mt-1 text-xs text-muted-foreground">{i.defects}</div>}
                  </div>
                  {i.approved_by ? (
                    <Badge variant="secondary">{t("معتمد", "Approved")}</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(i.id)}>
                      {t("اعتماد المسؤول", "Approve")}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Labor ---------- */}
        <TabsContent value="labor" className="mt-4 space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("تسجيل ساعات عمل", "Log working hours")}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-5">
              <div className="space-y-1 sm:col-span-2">
                <Label>{t("اسم العامل", "Worker")}</Label>
                <Input value={worker} onChange={(e) => setWorker(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("التاريخ", "Date")}</Label>
                <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("الساعات", "Hours")}</Label>
                <Input type="number" min="0.25" step="0.25" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("أجر الساعة", "Rate")}</Label>
                <Input type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>{t("المرحلة", "Stage")}</Label>
                <Select value={laborStage} onValueChange={setLaborStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("عام على الأمر", "Whole order")}</SelectItem>
                    {stages.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-5">
                <Button
                  disabled={worker.trim().length < 2 || !(Number(hours) > 0) || laborMutation.isPending}
                  onClick={() => {
                    laborMutation.mutate({
                      worker_name: worker.trim(),
                      work_date: workDate,
                      hours: Number(hours),
                      hourly_rate: rate ? Number(rate) : null,
                      stage_id: laborStage === "__none__" ? null : laborStage,
                    });
                    setWorker(""); setHours(""); setRate("");
                  }}
                >
                  {t("تسجيل", "Log")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("السجل", "History")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {labor.length === 0 && <Empty t={t} text={["لا توجد ساعات مسجلة", "No hours logged"]} />}
              {labor.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <span>{l.worker_name}</span>
                  <span className="text-muted-foreground">{l.work_date}</span>
                  <span>{num(l.hours)} {t("ساعة", "h")}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssueControl({ t, max, onIssue }: { t: (a: string, b: string) => string; max: number; onIssue: (q: number) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-1">
      <Input
        className="h-9 w-28"
        type="number"
        min="0.001"
        step="0.001"
        placeholder={t("كمية الصرف", "Issue qty")}
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <Button
        size="sm"
        disabled={!(Number(v) > 0)}
        onClick={() => { onIssue(Number(v)); setV(""); }}
      >
        {t("صرف", "Issue")}
      </Button>
      {max > 0 && <span className="text-xs text-muted-foreground">{t("المتبقي", "Left")}: {max}</span>}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Empty({ t, text }: { t: (a: string, b: string) => string; text: [string, string] }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {t(text[0], text[1])}
    </div>
  );
}

