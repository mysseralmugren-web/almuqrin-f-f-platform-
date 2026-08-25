import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Factory, Plus, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createManufacturingOrder,
  listConvertibleSalesOrders,
  listManufacturingOrders,
} from "@/lib/mes.functions";
import { MFG_STATUSES, MFG_STATUS_AR, MFG_STATUS_EN, STAGE_CATALOG, type MfgStatus } from "@/lib/mes-constants";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/mes/")({ component: MesListPage });

const BOARD: MfgStatus[] = [
  "draft",
  "approved",
  "awaiting_materials",
  "ready_to_produce",
  "in_production",
  "quality_check",
  "ready_for_delivery",
  "delivered",
];

function MesListPage() {
  const t = useT();
  const qc = useQueryClient();
  const fetchOrders = useServerFn(listManufacturingOrders);
  const fetchSalesOrders = useServerFn(listConvertibleSalesOrders);
  const createMo = useServerFn(createManufacturingOrder);

  const [open, setOpen] = useState(false);
  const [salesOrderId, setSalesOrderId] = useState("");
  const [itemId, setItemId] = useState("__all__");
  const [quantity, setQuantity] = useState("1");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [stages, setStages] = useState<string[]>(STAGE_CATALOG.map((s) => s.code));

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["mfg-orders"],
    queryFn: () => fetchOrders({}),
  });
  const { data: salesOrders = [] } = useQuery({
    queryKey: ["mfg-convertible"],
    queryFn: () => fetchSalesOrders({}),
    enabled: open,
  });

  const selectedOrder = useMemo(
    () => (salesOrders as any[]).find((o) => o.id === salesOrderId),
    [salesOrders, salesOrderId],
  );

  const mutation = useMutation({
    mutationFn: () =>
      createMo({
        data: {
          sales_order_id: salesOrderId,
          sales_order_item_id: itemId === "__all__" ? null : itemId,
          quantity: Number(quantity) || 1,
          planned_start: plannedStart || null,
          planned_end: plannedEnd || null,
          stage_codes: stages,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(t(`تم إنشاء أمر التصنيع ${res.mo_number}`, `Created ${res.mo_number}`));
      setOpen(false);
      setSalesOrderId("");
      setItemId("__all__");
      void qc.invalidateQueries({ queryKey: ["mfg-orders"] });
      void qc.invalidateQueries({ queryKey: ["mfg-convertible"] });
    },
    onError: (e: Error) => toast.error(errorText(e.message, t)),
  });

  const list = orders as any[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
            <Factory className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {t("الوحدة 04", "Module 04")}
            </div>
            <h1 className="mt-0.5 text-2xl font-bold sm:text-3xl">{t("أوامر التصنيع", "Manufacturing orders")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("من أمر البيع إلى التسليم عبر المراحل والجودة", "From sales order to delivery through stages and QC")}
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("أمر تصنيع جديد", "New order")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{t("إنشاء أمر تصنيع من أمر بيع", "Create from sales order")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("أمر البيع", "Sales order")}</Label>
                <Select value={salesOrderId} onValueChange={(v) => { setSalesOrderId(v); setItemId("__all__"); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("اختر أمر بيع مؤكدًا", "Select a confirmed order")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(salesOrders as any[]).map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.order_number} — {o.customers?.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(salesOrders as any[]).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("لا توجد أوامر بيع مؤكدة بعد", "No confirmed sales orders yet")}
                  </p>
                )}
              </div>

              {selectedOrder && (
                <div className="space-y-2">
                  <Label>{t("النطاق", "Scope")}</Label>
                  <Select value={itemId} onValueChange={setItemId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t("أمر واحد لكامل أمر البيع", "One order for the whole SO")}</SelectItem>
                      {(selectedOrder.sales_order_items ?? []).map((i: any) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.description} ({i.quantity} {i.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("الكمية", "Quantity")}</Label>
                  <Input type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("بداية مخططة", "Planned start")}</Label>
                  <Input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("نهاية مخططة", "Planned end")}</Label>
                  <Input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("مراحل التصنيع", "Production stages")}</Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
                  {STAGE_CATALOG.map((s) => (
                    <label key={s.code} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={stages.includes(s.code)}
                        onCheckedChange={(v) =>
                          setStages((prev) =>
                            v
                              ? [...STAGE_CATALOG.map((x) => x.code)].filter((c) => prev.includes(c) || c === s.code)
                              : prev.filter((c) => c !== s.code),
                          )
                        }
                      />
                      {t(s.name_ar, s.name_en)}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!salesOrderId || stages.length === 0 || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {t("إنشاء الأمر", "Create order")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">{t("لوحة كانبان", "Kanban")}</TabsTrigger>
          <TabsTrigger value="list">{t("القائمة", "List")}</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          {list.length === 0 && !isLoading ? (
            <EmptyState t={t} />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {BOARD.map((status) => {
                const cards = list.filter((m) => m.status === status);
                return (
                  <div key={status} className="w-64 shrink-0 rounded-xl border bg-muted/30 p-2">
                    <div className="mb-2 flex items-center justify-between px-1 text-sm font-semibold">
                      <span>{t(MFG_STATUS_AR[status], MFG_STATUS_EN[status])}</span>
                      <Badge variant="secondary">{cards.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {cards.map((m) => (
                        <Link key={m.id} to="/mes/$id" params={{ id: m.id }} className="block">
                          <Card className="shadow-card transition hover:shadow-elegant">
                            <CardContent className="space-y-1 p-3">
                              <div className="text-sm font-semibold" dir="ltr">{m.mo_number}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {m.sales_orders?.customers?.name_ar ?? t("بدون عميل", "No customer")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("المراحل", "Stages")}: {(m.manufacturing_stages ?? []).length} ·{" "}
                                {t("المواد", "BOM")}: {(m.bom_lines ?? []).length}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                      {cards.length === 0 && (
                        <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                          {t("لا شيء", "Empty")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {list.length === 0 ? (
            <EmptyState t={t} />
          ) : (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">{t("كل أوامر التصنيع", "All manufacturing orders")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((m) => (
                  <Link
                    key={m.id}
                    to="/mes/$id"
                    params={{ id: m.id }}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 transition hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold" dir="ltr">{m.mo_number}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.sales_orders?.order_number} · {m.sales_orders?.customers?.name_ar}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{t(MFG_STATUS_AR[m.status as MfgStatus], MFG_STATUS_EN[m.status as MfgStatus])}</Badge>
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ t }: { t: (ar: string, en: string) => string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="py-14 text-center text-muted-foreground">
        {t(
          "لا توجد أوامر تصنيع بعد — أنشئ أمرًا من أمر بيع مؤكد",
          "No manufacturing orders yet — create one from a confirmed sales order",
        )}
      </CardContent>
    </Card>
  );
}

export function errorText(code: string, t: (ar: string, en: string) => string) {
  const map: Record<string, [string, string]> = {
    FORBIDDEN_ROLE: ["ليس لديك صلاحية لهذا الإجراء", "You are not allowed to do this"],
    MO_ALREADY_EXISTS: ["يوجد أمر تصنيع لهذا البند بالفعل", "A manufacturing order already exists"],
    ORDER_NOT_CONFIRMED: ["أمر البيع غير مؤكد", "Sales order is not confirmed"],
    MO_NOT_APPROVED: ["يجب اعتماد الأمر أولًا", "Approve the order first"],
    BOM_REQUIRED: ["أضف قائمة المواد أولًا", "Add BOM lines first"],
    MATERIALS_NOT_RESERVED: ["المواد غير محجوزة بالكامل", "Materials are not fully reserved"],
    MO_NOT_READY_TO_PRODUCE: ["الأمر غير جاهز للإنتاج", "Order is not ready to produce"],
    QC_APPROVAL_REQUIRED: ["يلزم فحص جودة ناجح ومعتمد", "An approved passing inspection is required"],
    INSUFFICIENT_STOCK: ["الرصيد غير كافٍ", "Insufficient stock"],
    RETURN_EXCEEDS_ISSUED: ["المرتجع يتجاوز المصروف", "Return exceeds issued quantity"],
    BOM_WAREHOUSE_REQUIRED: ["حدد المستودع لبند المواد", "Set a warehouse on the BOM line"],
    BOM_ITEM_DUPLICATE: ["الصنف مضاف مسبقًا", "Item already added"],
    BOM_LINE_IN_USE: ["لا يمكن حذف بند مصروف أو محجوز", "Cannot delete an issued/reserved line"],
    DEFECTS_REQUIRED: ["اذكر العيوب عند الرفض", "Describe defects when not passing"],
    NO_COMPANY: ["أكمل بيانات المنشأة أولًا", "Complete company profile first"],
    MO_NOT_IN_PRODUCTION: ["ابدأ التصنيع قبل تحديث المراحل", "Start production before updating stages"],
    SKU_EXISTS: ["رمز الصنف مستخدم", "SKU already exists"],
    WAREHOUSE_CODE_EXISTS: ["رمز المستودع مستخدم", "Warehouse code exists"],
    ADJUSTMENT_REQUIRES_MANAGER: ["التسوية تتطلب إذن مدير المستودع", "Adjustment requires warehouse manager"],
  };
  for (const key of Object.keys(map)) {
    if (code.includes(key)) return t(map[key]![0], map[key]![1]);
  }
  if (code.includes("INVALID_MO_TRANSITION")) return t("انتقال حالة غير مسموح", "Invalid status transition");
  return code;
}

