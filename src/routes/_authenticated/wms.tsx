import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Warehouse, PackagePlus, ArrowLeftRight, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createItem,
  createStorageLocation,
  createWarehouse,
  listItems,
  listStockBalances,
  listStockMovements,
  listWarehouses,
  recordStockMovement,
} from "@/lib/mes.functions";
import { MOVEMENT_AR, type MovementType } from "@/lib/mes-constants";
import { errorText } from "./mes.index";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/wms")({
  head: () => ({
    meta: [
      { title: "المستودعات WMS · AlMugren AI Factory OS" },
      { name: "description", content: "Warehouses, locations, items, stock balances and transaction-safe movements." },
      { property: "og:title", content: "المستودعات WMS · AlMugren AI Factory OS" },
      { property: "og:description", content: "Warehouses, items, balances and stock movements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WmsPage,
});

const num = (v: unknown) => Number(v ?? 0);

function WmsPage() {
  const t = useT();
  const qc = useQueryClient();

  const fetchWarehouses = useServerFn(listWarehouses);
  const fetchItems = useServerFn(listItems);
  const fetchBalances = useServerFn(listStockBalances);
  const fetchMovements = useServerFn(listStockMovements);
  const addWarehouse = useServerFn(createWarehouse);
  const addLocation = useServerFn(createStorageLocation);
  const addItem = useServerFn(createItem);
  const addMovement = useServerFn(recordStockMovement);

  const { data: warehouses = [] } = useQuery({ queryKey: ["warehouses"], queryFn: () => fetchWarehouses({}) });
  const { data: items = [] } = useQuery({ queryKey: ["items"], queryFn: () => fetchItems({}) });
  const { data: balances = [] } = useQuery({ queryKey: ["stock-balances"], queryFn: () => fetchBalances({}) });
  const { data: movements = [] } = useQuery({ queryKey: ["stock-movements"], queryFn: () => fetchMovements({}) });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["warehouses"] });
    void qc.invalidateQueries({ queryKey: ["items"] });
    void qc.invalidateQueries({ queryKey: ["stock-balances"] });
    void qc.invalidateQueries({ queryKey: ["stock-movements"] });
  };
  const fail = (e: Error) => toast.error(errorText(e.message, t));

  const [whCode, setWhCode] = useState("");
  const [whName, setWhName] = useState("");
  const [locWh, setLocWh] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locName, setLocName] = useState("");

  const [sku, setSku] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemUnit, setItemUnit] = useState("قطعة");
  const [itemCategory, setItemCategory] = useState("");
  const [itemCost, setItemCost] = useState("");
  const [itemMin, setItemMin] = useState("");

  const [mvType, setMvType] = useState<MovementType>("receipt");
  const [mvItem, setMvItem] = useState("");
  const [mvWh, setMvWh] = useState("");
  const [mvToWh, setMvToWh] = useState("");
  const [mvQty, setMvQty] = useState("");
  const [mvCost, setMvCost] = useState("");
  const [mvNote, setMvNote] = useState("");

  const whMutation = useMutation({
    mutationFn: () => addWarehouse({ data: { code: whCode.trim(), name_ar: whName.trim() } }),
    onSuccess: () => { toast.success(t("تم إنشاء المستودع", "Warehouse created")); setWhCode(""); setWhName(""); refresh(); },
    onError: fail,
  });
  const locMutation = useMutation({
    mutationFn: () => addLocation({ data: { warehouse_id: locWh, code: locCode.trim(), name_ar: locName.trim() } }),
    onSuccess: () => { toast.success(t("تم إنشاء الموقع", "Location created")); setLocCode(""); setLocName(""); refresh(); },
    onError: fail,
  });
  const itemMutation = useMutation({
    mutationFn: () =>
      addItem({
        data: {
          sku: sku.trim(),
          name_ar: itemName.trim(),
          unit: itemUnit.trim() || "قطعة",
          category: itemCategory.trim() || null,
          standard_cost: Number(itemCost) || 0,
          min_qty: Number(itemMin) || 0,
        },
      }),
    onSuccess: () => { toast.success(t("تم إنشاء الصنف", "Item created")); setSku(""); setItemName(""); setItemCost(""); setItemMin(""); refresh(); },
    onError: fail,
  });
  const mvMutation = useMutation({
    mutationFn: () =>
      addMovement({
        data: {
          item_id: mvItem,
          movement_type: mvType as "receipt" | "transfer" | "adjustment",
          quantity: Number(mvQty),
          unit_cost: Number(mvCost) || 0,
          warehouse_id: mvWh,
          to_warehouse_id: mvType === "transfer" ? mvToWh : null,
          note: mvNote.trim() || null,
          idempotency_key: `manual:${mvType}:${mvItem}:${mvWh}:${Date.now()}`,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(res?.duplicate ? t("العملية مسجلة مسبقًا", "Already recorded") : t("تم تسجيل الحركة", "Movement recorded"));
      setMvQty(""); setMvCost(""); setMvNote("");
      refresh();
    },
    onError: fail,
  });

  const wh = warehouses as any[];
  const itemList = items as any[];

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <Warehouse className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("الوحدة 04", "Module 04")}
          </div>
          <h1 className="mt-0.5 text-2xl font-bold sm:text-3xl">{t("المستودعات والمخزون", "Warehouse & inventory")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("أرصدة حقيقية وحركات آمنة مرتبطة بأوامر التصنيع", "Real balances and safe movements linked to production")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="balances">
        <TabsList className="flex-wrap">
          <TabsTrigger value="balances">{t("الأرصدة", "Balances")}</TabsTrigger>
          <TabsTrigger value="movements" className="gap-1"><ArrowLeftRight className="h-4 w-4" />{t("الحركات", "Movements")}</TabsTrigger>
          <TabsTrigger value="items" className="gap-1"><PackagePlus className="h-4 w-4" />{t("الأصناف", "Items")}</TabsTrigger>
          <TabsTrigger value="setup" className="gap-1"><ScrollText className="h-4 w-4" />{t("المستودعات والمواقع", "Warehouses")}</TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="mt-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("أرصدة المخزون", "Stock balances")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(balances as any[]).length === 0 && (
                <Empty t={t} text={["لا توجد أرصدة بعد — سجّل استلامًا للمواد", "No balances yet — record a receipt"]} />
              )}
              {(balances as any[]).map((b) => {
                const available = num(b.quantity) - num(b.reserved_quantity);
                const low = num(b.items?.min_qty) > 0 && available < num(b.items?.min_qty);
                return (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="font-medium">{b.items?.name_ar}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {b.items?.sku} · {b.warehouses?.name_ar}{b.storage_locations?.code ? ` / ${b.storage_locations.code}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{t("الرصيد", "Qty")}: <b>{num(b.quantity)}</b></span>
                      <span className="text-muted-foreground">{t("محجوز", "Reserved")}: {num(b.reserved_quantity)}</span>
                      <span>{t("المتاح", "Available")}: <b>{available}</b></span>
                      {low && <Badge variant="outline" className="text-destructive">{t("تحت الحد الأدنى", "Below min")}</Badge>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-4 space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("تسجيل حركة مخزون", "Record a movement")}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t("نوع الحركة", "Type")}</Label>
                <Select value={mvType} onValueChange={(v) => setMvType(v as MovementType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">{t(MOVEMENT_AR.receipt, "Receipt")}</SelectItem>
                    <SelectItem value="transfer">{t(MOVEMENT_AR.transfer, "Transfer")}</SelectItem>
                    <SelectItem value="adjustment">{t(MOVEMENT_AR.adjustment, "Adjustment")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("الصنف", "Item")}</Label>
                <Select value={mvItem} onValueChange={setMvItem}>
                  <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                  <SelectContent>
                    {itemList.map((i) => <SelectItem key={i.id} value={i.id}>{i.name_ar} — {i.sku}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("المستودع المصدر", "Warehouse")}</Label>
                <Select value={mvWh} onValueChange={setMvWh}>
                  <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                  <SelectContent>
                    {wh.map((w) => <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {mvType === "transfer" && (
                <div className="space-y-1">
                  <Label>{t("المستودع الهدف", "Target warehouse")}</Label>
                  <Select value={mvToWh} onValueChange={setMvToWh}>
                    <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                    <SelectContent>
                      {wh.filter((w) => w.id !== mvWh).map((w) => <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label>{mvType === "adjustment" ? t("الكمية (± للتسوية)", "Quantity (±)") : t("الكمية", "Quantity")}</Label>
                <Input type="number" step="0.001" value={mvQty} onChange={(e) => setMvQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("تكلفة الوحدة", "Unit cost")}</Label>
                <Input type="number" min="0" step="0.01" value={mvCost} onChange={(e) => setMvCost(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>{t("ملاحظة", "Note")}</Label>
                <Input value={mvNote} onChange={(e) => setMvNote(e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <Button
                  disabled={
                    !mvItem || !mvWh || !Number(mvQty) || mvMutation.isPending ||
                    (mvType === "transfer" && !mvToWh) ||
                    (mvType !== "adjustment" && Number(mvQty) <= 0)
                  }
                  onClick={() => mvMutation.mutate()}
                >
                  {t("تسجيل الحركة", "Record")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("آخر الحركات", "Recent movements")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(movements as any[]).length === 0 && <Empty t={t} text={["لا توجد حركات", "No movements yet"]} />}
              {(movements as any[]).map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{m.items?.name_ar}</div>
                    <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("ar-SA")}</div>
                  </div>
                  <Badge variant="secondary">{MOVEMENT_AR[m.movement_type as MovementType] ?? m.movement_type}</Badge>
                  <span>{num(m.quantity)} {m.items?.unit}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-4 space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("إضافة صنف", "Add item")}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1"><Label>{t("رمز الصنف", "SKU")}</Label><Input dir="ltr" value={sku} onChange={(e) => setSku(e.target.value)} /></div>
              <div className="space-y-1 sm:col-span-2"><Label>{t("الاسم", "Name")}</Label><Input value={itemName} onChange={(e) => setItemName(e.target.value)} /></div>
              <div className="space-y-1"><Label>{t("الوحدة", "Unit")}</Label><Input value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} /></div>
              <div className="space-y-1"><Label>{t("التصنيف", "Category")}</Label><Input value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} /></div>
              <div className="space-y-1"><Label>{t("التكلفة المعيارية", "Standard cost")}</Label><Input type="number" min="0" step="0.01" value={itemCost} onChange={(e) => setItemCost(e.target.value)} /></div>
              <div className="space-y-1"><Label>{t("الحد الأدنى", "Min qty")}</Label><Input type="number" min="0" step="0.001" value={itemMin} onChange={(e) => setItemMin(e.target.value)} /></div>
              <div className="sm:col-span-3">
                <Button disabled={!sku.trim() || itemName.trim().length < 2 || itemMutation.isPending} onClick={() => itemMutation.mutate()}>
                  {t("إضافة", "Add")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("الأصناف", "Items")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {itemList.length === 0 && <Empty t={t} text={["لا توجد أصناف", "No items yet"]} />}
              {itemList.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <span>{i.name_ar}</span>
                  <span dir="ltr" className="text-xs text-muted-foreground">{i.sku}</span>
                  <span className="text-muted-foreground">{i.unit}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="mt-4 space-y-4">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("إضافة مستودع", "Add warehouse")}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1"><Label>{t("الرمز", "Code")}</Label><Input dir="ltr" value={whCode} onChange={(e) => setWhCode(e.target.value)} /></div>
              <div className="space-y-1 sm:col-span-2"><Label>{t("الاسم", "Name")}</Label><Input value={whName} onChange={(e) => setWhName(e.target.value)} /></div>
              <div className="sm:col-span-3">
                <Button disabled={!whCode.trim() || whName.trim().length < 2 || whMutation.isPending} onClick={() => whMutation.mutate()}>
                  {t("إضافة", "Add")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("إضافة موقع تخزين", "Add storage location")}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>{t("المستودع", "Warehouse")}</Label>
                <Select value={locWh} onValueChange={setLocWh}>
                  <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                  <SelectContent>{wh.map((w) => <SelectItem key={w.id} value={w.id}>{w.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>{t("الرمز", "Code")}</Label><Input dir="ltr" value={locCode} onChange={(e) => setLocCode(e.target.value)} /></div>
              <div className="space-y-1"><Label>{t("الاسم", "Name")}</Label><Input value={locName} onChange={(e) => setLocName(e.target.value)} /></div>
              <div className="sm:col-span-3">
                <Button disabled={!locWh || !locCode.trim() || !locName.trim() || locMutation.isPending} onClick={() => locMutation.mutate()}>
                  {t("إضافة", "Add")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("المستودعات الحالية", "Existing warehouses")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {wh.length === 0 && <Empty t={t} text={["لا توجد مستودعات", "No warehouses yet"]} />}
              {wh.map((w) => (
                <div key={w.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{w.name_ar}</span>
                    <span dir="ltr" className="text-xs text-muted-foreground">{w.code}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(w.storage_locations ?? []).map((l: any) => (
                      <Badge key={l.id} variant="outline">{l.code} · {l.name_ar}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

