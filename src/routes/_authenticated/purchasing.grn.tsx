import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackageCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createGoodsReceipt, listGoodsReceipts, listPurchaseOrders, postGoodsReceipt } from "@/lib/purchasing.functions";
import { listWarehouses } from "@/lib/mes.functions";
import { GRN_STATUS } from "@/lib/purchasing-constants";
import { EmptyState, StatusPill, useFail } from "@/components/app/purchasing-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/purchasing/grn")({
  head: () => ({
    meta: [
      { title: "استلام البضاعة · AlMugren AI Factory OS" },
      { name: "description", content: "Partial and full goods receipts with QC quantities and idempotent stock postings." },
      { property: "og:title", content: "استلام البضاعة · AlMugren AI Factory OS" },
      { property: "og:description", content: "Goods receipts feeding transaction-safe stock movements." },
    ],
  }),
  component: GrnPage,
});

function GrnPage() {
  const t = useT();
  const qc = useQueryClient();
  const fail = useFail();

  const fetchGrns = useServerFn(listGoodsReceipts);
  const fetchPos = useServerFn(listPurchaseOrders);
  const fetchWarehouses = useServerFn(listWarehouses);
  const addGrn = useServerFn(createGoodsReceipt);
  const postGrn = useServerFn(postGoodsReceipt);

  const { data: grns = [] } = useQuery({ queryKey: ["goods-receipts"], queryFn: () => fetchGrns({}) });
  const { data: pos = [] } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => fetchPos({}) });
  const { data: warehouses = [] } = useQuery({ queryKey: ["warehouses"], queryFn: () => fetchWarehouses({}) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["goods-receipts"] });
    void qc.invalidateQueries({ queryKey: ["purchase-orders"] });
    void qc.invalidateQueries({ queryKey: ["stock-balances"] });
  };

  const [open, setOpen] = useState(false);
  const [poId, setPoId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [overReason, setOverReason] = useState("");
  const [rows, setRows] = useState<Record<string, { received: string; rejected: string; note: string }>>({});

  const receivable = (pos as any[]).filter((p) => ["approved", "partially_received"].includes(p.status));
  const po = useMemo(() => receivable.find((p) => p.id === poId), [receivable, poId]);

  const create = useMutation({
    mutationFn: async () => {
      const grn = await addGrn({
        data: {
          purchase_order_id: poId,
          warehouse_id: warehouseId,
          location_id: null,
          receipt_date: null,
          delivery_note_ref: null,
          notes: null,
          over_receipt_reason: overReason.trim() || null,
          lines: (po?.purchase_order_items ?? [])
            .filter((it: any) => Number(rows[it.id]?.received ?? 0) > 0)
            .map((it: any) => ({
              purchase_order_item_id: it.id,
              item_id: it.item_id ?? null,
              quantity_received: Number(rows[it.id]!.received),
              quantity_rejected: Number(rows[it.id]?.rejected ?? 0),
              rejection_reason: null,
              qc_note: rows[it.id]?.note?.trim() || null,
            })),
        },
      });
      return grn;
    },
    onSuccess: () => {
      toast.success(t("تم إنشاء محضر الاستلام كمسودة", "Receipt created as draft"));
      setRows({});
      setPoId("");
      setOverReason("");
      setOpen(false);
      refresh();
    },
    onError: fail,
  });

  const post = useMutation({
    mutationFn: (id: string) => postGrn({ data: { goods_receipt_id: id } }),
    onSuccess: () => {
      toast.success(t("تم ترحيل الاستلام إلى المخزون", "Receipt posted to stock"));
      refresh();
    },
    onError: fail,
  });

  const anyQty = Object.values(rows).some((r) => Number(r.received || 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("محاضر الاستلام", "Goods receipts")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("استلام جزئي أو كامل، الكميات المقبولة فقط تدخل المخزون", "Partial or full receipts; only accepted quantities enter stock")}
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} disabled={receivable.length === 0 || (warehouses as any[]).length === 0}>
          <Plus className="h-4 w-4" />
          {t("استلام جديد", "New receipt")}
        </Button>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("استلام بضاعة", "Receive goods")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="grn-po">{t("أمر الشراء *", "Purchase order *")}</Label>
                <select id="grn-po" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={poId} onChange={(e) => { setPoId(e.target.value); setRows({}); }}>
                  <option value="">—</option>
                  {receivable.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.po_number} — {p.suppliers?.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grn-wh">{t("المستودع *", "Warehouse *")}</Label>
                <select id="grn-wh" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                  <option value="">—</option>
                  {(warehouses as any[]).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grn-over">{t("مبرر الاستلام الزائد", "Over-receipt reason")}</Label>
                <Input id="grn-over" value={overReason} onChange={(e) => setOverReason(e.target.value)} />
              </div>
            </div>

            {po ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("البند", "Item")}</TableHead>
                    <TableHead>{t("المطلوب", "Ordered")}</TableHead>
                    <TableHead>{t("المستلم سابقًا", "Received")}</TableHead>
                    <TableHead>{t("الكمية المستلمة", "Receiving")}</TableHead>
                    <TableHead>{t("مرفوض", "Rejected")}</TableHead>
                    <TableHead>{t("ملاحظة الفحص", "QC note")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(po.purchase_order_items ?? []).map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.description}</TableCell>
                      <TableCell>{Number(it.quantity)}</TableCell>
                      <TableCell>{Number(it.received_quantity)}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-24"
                          type="number"
                          min="0"
                          value={rows[it.id]?.received ?? ""}
                          onChange={(e) => setRows((r) => ({ ...r, [it.id]: { received: e.target.value, rejected: r[it.id]?.rejected ?? "", note: r[it.id]?.note ?? "" } }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-24"
                          type="number"
                          min="0"
                          value={rows[it.id]?.rejected ?? ""}
                          onChange={(e) => setRows((r) => ({ ...r, [it.id]: { received: r[it.id]?.received ?? "", rejected: e.target.value, note: r[it.id]?.note ?? "" } }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          value={rows[it.id]?.note ?? ""}
                          onChange={(e) => setRows((r) => ({ ...r, [it.id]: { received: r[it.id]?.received ?? "", rejected: r[it.id]?.rejected ?? "", note: e.target.value } }))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}

            <div className="flex gap-2">
              <Button disabled={!poId || !warehouseId || !anyQty || create.isPending} onClick={() => create.mutate()}>
                {t("حفظ كمسودة", "Save draft")}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("إلغاء", "Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(grns as any[]).length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="h-6 w-6" />}
          title={t("لا توجد محاضر استلام", "No goods receipts")}
          hint={t("استلم بضاعة مقابل أمر شراء معتمد.", "Receive goods against an approved purchase order.")}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرقم", "Number")}</TableHead>
                  <TableHead>{t("أمر الشراء", "PO")}</TableHead>
                  <TableHead>{t("المورد", "Supplier")}</TableHead>
                  <TableHead>{t("المستودع", "Warehouse")}</TableHead>
                  <TableHead>{t("البنود", "Lines")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(grns as any[]).map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-xs">{g.grn_number}</TableCell>
                    <TableCell>{g.purchase_orders?.po_number}</TableCell>
                    <TableCell>{g.suppliers?.name_ar}</TableCell>
                    <TableCell>{g.warehouses?.name_ar}</TableCell>
                    <TableCell>{g.goods_receipt_items?.length ?? 0}</TableCell>
                    <TableCell>
                      <StatusPill status={g.status} labels={GRN_STATUS} />
                    </TableCell>
                    <TableCell className="text-end">
                      {g.status === "draft" ? (
                        <Button size="sm" disabled={post.isPending} onClick={() => post.mutate(g.id)}>
                          {t("ترحيل للمخزون", "Post to stock")}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

