import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Barcode, Boxes, CheckCircle2, Search, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listPhysicalInventory, recordPhysicalInventoryCount } from "@/lib/inventory.functions";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "الجرد والمخزون · منصة المقرن" },
      { name: "description", content: "الجرد الفعلي، مراجعة الكميات، مواقع التخزين والبحث بالباركود." },
    ],
  }),
  component: InventoryPage,
});

type Item = {
  id: string;
  sku: string;
  name_ar: string;
  category: string | null;
  unit: string;
  min_qty: number | string;
};

type Balance = {
  id: string;
  item_id: string;
  warehouse_id: string;
  location_id: string | null;
  quantity: number | string;
  reserved_quantity: number | string;
};

type WarehouseRow = { id: string; code: string; name_ar: string };
type LocationRow = { id: string; warehouse_id: string; code: string; name_ar: string };

type InventoryRow = {
  key: string;
  itemId: string;
  balanceId: string | null;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string | null;
  locationName: string | null;
  quantity: number;
  reserved: number;
  needsReview: boolean;
};

const IMPORT_PREFIX = "INV-20260912-";
const n = (value: unknown) => Number(value ?? 0);
const qtyText = (value: number) => new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 3 }).format(value);

function InventoryPage() {
  const t = useT();
  const qc = useQueryClient();
  const fetchInventory = useServerFn(listPhysicalInventory);
  const saveCount = useServerFn(recordPhysicalInventoryCount);
  const searchRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editLocation, setEditLocation] = useState("none");

  const inventoryQuery = useQuery({
    queryKey: ["physical-inventory"],
    queryFn: () => fetchInventory({}),
  });

  const data = inventoryQuery.data;
  const items = (data?.items ?? []) as Item[];
  const balances = (data?.balances ?? []) as Balance[];
  const warehouses = (data?.warehouses ?? []) as WarehouseRow[];
  const locations = (data?.locations ?? []) as LocationRow[];

  const rows = useMemo<InventoryRow[]>(() => {
    const whById = new Map(warehouses.map((w) => [w.id, w]));
    const locById = new Map(locations.map((loc) => [loc.id, loc]));
    const mainWarehouse = warehouses.find((w) => w.code === "MAIN") ?? warehouses[0];
    const balancesByItem = new Map<string, Balance[]>();

    for (const balance of balances) {
      const list = balancesByItem.get(balance.item_id) ?? [];
      list.push(balance);
      balancesByItem.set(balance.item_id, list);
    }

    return items.flatMap((item) => {
      const itemBalances = balancesByItem.get(item.id) ?? [];
      if (itemBalances.length === 0) {
        if (!mainWarehouse) return [];
        return [{
          key: `${item.id}:unreviewed`,
          itemId: item.id,
          balanceId: null,
          sku: item.sku,
          name: item.name_ar,
          category: item.category,
          unit: item.unit,
          warehouseId: mainWarehouse.id,
          warehouseName: mainWarehouse.name_ar,
          locationId: null,
          locationName: null,
          quantity: 0,
          reserved: 0,
          needsReview: item.sku.startsWith(IMPORT_PREFIX),
        }];
      }

      return itemBalances.map((balance) => {
        const warehouse = whById.get(balance.warehouse_id) ?? mainWarehouse;
        if (!warehouse) return null;
        const location = balance.location_id ? locById.get(balance.location_id) : null;
        return {
          key: balance.id,
          itemId: item.id,
          balanceId: balance.id,
          sku: item.sku,
          name: item.name_ar,
          category: item.category,
          unit: item.unit,
          warehouseId: warehouse.id,
          warehouseName: warehouse.name_ar,
          locationId: balance.location_id,
          locationName: location?.name_ar ?? null,
          quantity: n(balance.quantity),
          reserved: n(balance.reserved_quantity),
          needsReview: false,
        } satisfies InventoryRow;
      }).filter((row): row is InventoryRow => row !== null);
    });
  }, [items, balances, warehouses, locations]);

  const importedItemIds = useMemo(
    () => new Set(items.filter((item) => item.sku.startsWith(IMPORT_PREFIX)).map((item) => item.id)),
    [items],
  );
  const reviewedImportedIds = useMemo(
    () => new Set(rows.filter((row) => importedItemIds.has(row.itemId) && row.balanceId).map((row) => row.itemId)),
    [rows, importedItemIds],
  );
  const importedCount = importedItemIds.size;
  const reviewCount = Math.max(0, importedCount - reviewedImportedIds.size);
  const reviewedCount = importedCount - reviewCount;
  const totalUnits = rows.reduce((sum, row) => sum + row.quantity, 0);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "ar")),
    [items],
  );

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ar");
    return rows.filter((row) => {
      const searchMatch = !needle || [row.sku, row.name, row.category ?? ""]
        .some((value) => value.toLocaleLowerCase("ar").includes(needle));
      const categoryMatch = category === "all" || row.category === category;
      const reviewMatch = !reviewOnly || row.needsReview;
      return searchMatch && categoryMatch && reviewMatch;
    });
  }, [rows, query, category, reviewOnly]);

  const countMutation = useMutation({
    mutationFn: async (row: InventoryRow) => {
      const quantity = Number(editQty);
      if (!Number.isFinite(quantity) || quantity < 0) throw new Error("INVALID_QUANTITY");
      return saveCount({
        data: {
          item_id: row.itemId,
          warehouse_id: row.warehouseId,
          location_id: editLocation === "none" ? null : editLocation,
          current_balance_id: row.balanceId,
          quantity,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("تم حفظ الجرد وتسجيل التسوية في سجل الحركات", "Inventory count saved and audited"));
      setEditingKey(null);
      void qc.invalidateQueries({ queryKey: ["physical-inventory"] });
      void qc.invalidateQueries({ queryKey: ["stock-balances"] });
      void qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: (error: Error) => {
      const message = error.message === "FORBIDDEN_ROLE"
        ? t("التعديل متاح لمدير المخزون أو الإدارة المخولة فقط", "Inventory editing requires an authorized warehouse role")
        : error.message === "INVALID_QUANTITY"
          ? t("أدخل كمية صحيحة صفر أو أكبر", "Enter a valid non-negative quantity")
          : error.message;
      toast.error(message);
    },
  });

  function startEdit(row: InventoryRow) {
    setEditingKey(row.key);
    setEditQty(String(row.quantity));
    setEditLocation(row.locationId ?? "none");
  }

  async function scanBarcode() {
    type Detector = { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> };
    type DetectorCtor = new (options?: { formats?: string[] }) => Detector;
    const DetectorClass = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

    if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
      toast.info(t("استخدم قارئ الباركود أو اكتب الكود في خانة البحث", "Use a barcode reader or enter the code in search"));
      searchRef.current?.focus();
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();
      const detector = new DetectorClass({ formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code"] });
      const started = Date.now();
      let found = "";
      while (!found && Date.now() - started < 12_000) {
        const codes = await detector.detect(video);
        found = codes[0]?.rawValue ?? "";
        if (!found) await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (found) {
        setQuery(found);
        toast.success(t("تمت قراءة الباركود", "Barcode scanned"));
      } else {
        toast.info(t("لم يتم العثور على باركود واضح", "No barcode detected"));
      }
    } catch {
      toast.info(t("تعذر تشغيل الكاميرا؛ يمكنك استخدام قارئ خارجي أو البحث بالكود", "Camera unavailable; use a scanner or search by code"));
      searchRef.current?.focus();
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  if (inventoryQuery.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">{t("جاري تحميل الجرد…", "Loading inventory…")}</div>;
  }

  if (inventoryQuery.error) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{inventoryQuery.error.message}</div>;
  }

  return (
    <div className="space-y-6" dir={t("rtl", "ltr")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl gradient-primary shadow-elegant">
            <Boxes className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{t("جرد مصنع المقرن", "AlMuqrin factory count")}</div>
            <h1 className="mt-0.5 text-2xl font-bold sm:text-3xl">{t("الجرد والمخزون", "Inventory & stock count")}</h1>
            <p className="text-sm text-muted-foreground">{t("مراجعة الكميات الفعلية، مواقع التخزين والبحث بالباركود مع سجل تدقيق للحركات", "Physical counts, locations and barcode lookup with audited movements")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void scanBarcode()} className="gap-2"><Barcode className="h-4 w-4" />{t("مسح باركود", "Scan barcode")}</Button>
          <Button variant={reviewOnly ? "default" : "outline"} onClick={() => setReviewOnly((value) => !value)} className="gap-2">
            <AlertTriangle className="h-4 w-4" />{t(`يحتاج مراجعة (${reviewCount})`, `Needs review (${reviewCount})`)}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Boxes} label={t("بنود جرد 12 سبتمبر", "Imported count items")} value={importedCount} />
        <Metric icon={CheckCircle2} label={t("تم اعتماد كمياتها", "Counted items")} value={reviewedCount} />
        <Metric icon={AlertTriangle} label={t("تحتاج مراجعة", "Needs review")} value={reviewCount} />
        <Metric icon={Warehouse} label={t("إجمالي الكميات المسجلة", "Recorded units")} value={qtyText(totalUnits)} />
      </div>

      <Card className="shadow-card">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ابحث باسم الصنف أو كود الجرد / الباركود…", "Search item name, count code or barcode…")} className="pr-10" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("كل التصنيفات", "All categories")}</SelectItem>
              {categories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="border-b bg-muted/45 text-right text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("كود الجرد / الباركود", "Count code / barcode")}</th>
              <th className="px-4 py-3">{t("الصنف", "Item")}</th>
              <th className="px-4 py-3">{t("التصنيف", "Category")}</th>
              <th className="px-4 py-3">{t("الكمية", "Qty")}</th>
              <th className="px-4 py-3">{t("الوحدة", "Unit")}</th>
              <th className="px-4 py-3">{t("الموقع", "Location")}</th>
              <th className="px-4 py-3">{t("الحالة", "Status")}</th>
              <th className="px-4 py-3">{t("إجراء", "Action")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">{t("لا توجد أصناف مطابقة", "No matching items")}</td></tr>}
            {filteredRows.map((row) => {
              const editing = editingKey === row.key;
              const rowLocations = locations.filter((loc) => loc.warehouse_id === row.warehouseId);
              return (
                <tr key={row.key} className="border-b align-top last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{row.sku}</td>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.category || "—"}</td>
                  <td className="px-4 py-3 font-semibold">{qtyText(row.quantity)}</td>
                  <td className="px-4 py-3">{row.unit}</td>
                  <td className="px-4 py-3">{row.locationName || row.warehouseName}</td>
                  <td className="px-4 py-3">
                    {row.needsReview
                      ? <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">{t("يحتاج مراجعة", "Needs review")}</Badge>
                      : <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">{t("مجرد", "Counted")}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    {!editing ? (
                      <Button size="sm" variant="outline" onClick={() => startEdit(row)}>{t("تعديل الجرد", "Edit count")}</Button>
                    ) : (
                      <div className="w-72 space-y-3 rounded-lg border bg-background p-3 shadow-sm">
                        <div className="space-y-1">
                          <Label>{t("الكمية الفعلية", "Physical quantity")}</Label>
                          <Input type="number" min="0" step="0.001" value={editQty} onChange={(e) => setEditQty(e.target.value)} autoFocus />
                        </div>
                        <div className="space-y-1">
                          <Label>{t("موقع التخزين", "Storage location")}</Label>
                          <Select value={editLocation} onValueChange={setEditLocation}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("المستودع الرئيسي — بدون موقع فرعي", "Warehouse — no sub-location")}</SelectItem>
                              {rowLocations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name_ar} ({loc.code})</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" disabled={countMutation.isPending} onClick={() => countMutation.mutate(row)}>{t("حفظ الجرد", "Save count")}</Button>
                          <Button size="sm" variant="ghost" disabled={countMutation.isPending} onClick={() => setEditingKey(null)}>{t("إلغاء", "Cancel")}</Button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("يتم حفظ كل فرق جرد كحركة تسوية موثقة بدل تعديل الرصيد مباشرة. البنود غير المقروءة من صور الجرد تبقى في «يحتاج مراجعة» حتى تأكيد الكمية.", "Count differences are saved as audited stock movements. Unclear imported items stay in review until quantity is confirmed.")}
      </p>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: string | number }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>
        <Icon className="h-6 w-6 text-primary" />
      </CardContent>
    </Card>
  );
}
