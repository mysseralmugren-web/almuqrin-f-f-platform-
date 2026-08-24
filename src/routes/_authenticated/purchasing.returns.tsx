import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Undo2, Plus, FileMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createDebitNote,
  createSupplierReturn,
  listDebitNotes,
  listSupplierReturns,
  listSuppliers,
  postSupplierReturn,
} from "@/lib/purchasing.functions";
import { listItems, listWarehouses } from "@/lib/mes.functions";
import { RETURN_STATUS } from "@/lib/purchasing-constants";
import { EmptyState, StatusPill, money, useFail } from "@/components/app/purchasing-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/purchasing/returns")({
  head: () => ({
    meta: [
      { title: "مرتجعات الموردين · AlMugren AI Factory OS" },
      { name: "description", content: "Supplier returns posted to stock and linked debit notes." },
      { property: "og:title", content: "مرتجعات الموردين · AlMugren AI Factory OS" },
      { property: "og:description", content: "Supplier returns and debit notes." },
    ],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
  const t = useT();
  const qc = useQueryClient();
  const fail = useFail();

  const fetchReturns = useServerFn(listSupplierReturns);
  const fetchNotes = useServerFn(listDebitNotes);
  const fetchSuppliers = useServerFn(listSuppliers);
  const fetchItems = useServerFn(listItems);
  const fetchWarehouses = useServerFn(listWarehouses);
  const addReturn = useServerFn(createSupplierReturn);
  const postReturn = useServerFn(postSupplierReturn);
  const addNote = useServerFn(createDebitNote);

  const { data: returns = [] } = useQuery({ queryKey: ["supplier-returns"], queryFn: () => fetchReturns({}) });
  const { data: notes = [] } = useQuery({ queryKey: ["debit-notes"], queryFn: () => fetchNotes({}) });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => fetchSuppliers({}) });
  const { data: items = [] } = useQuery({ queryKey: ["items"], queryFn: () => fetchItems({}) });
  const { data: warehouses = [] } = useQuery({ queryKey: ["warehouses"], queryFn: () => fetchWarehouses({}) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["supplier-returns"] });
    void qc.invalidateQueries({ queryKey: ["debit-notes"] });
    void qc.invalidateQueries({ queryKey: ["stock-balances"] });
  };

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", warehouse_id: "", item_id: "", quantity: "", unit_price: "", reason: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: () =>
      addReturn({
        data: {
          supplier_id: form.supplier_id,
          purchase_order_id: null,
          goods_receipt_id: null,
          supplier_invoice_id: null,
          warehouse_id: form.warehouse_id,
          reason: form.reason.trim(),
          lines: [{ item_id: form.item_id, quantity: Number(form.quantity), unit_price: Number(form.unit_price || 0), note: null }],
        },
      }),
    onSuccess: () => {
      toast.success(t("تم إنشاء المرتجع كمسودة", "Return created as draft"));
      setForm({ supplier_id: "", warehouse_id: "", item_id: "", quantity: "", unit_price: "", reason: "" });
      setOpen(false);
      refresh();
    },
    onError: fail,
  });

  const post = useMutation({
    mutationFn: (v: { supplier_return_id: string; warehouse_id: string }) => postReturn({ data: v }),
    onSuccess: () => {
      toast.success(t("تم ترحيل المرتجع وخصمه من المخزون", "Return posted and deducted from stock"));
      refresh();
    },
    onError: fail,
  });

  const debit = useMutation({
    mutationFn: (v: { supplier_id: string; supplier_return_id: string; subtotal: number; reason: string }) =>
      addNote({ data: { ...v, supplier_invoice_id: null, vat_rate: 15 } }),
    onSuccess: () => {
      toast.success(t("تم إصدار إشعار الخصم", "Debit note issued"));
      refresh();
    },
    onError: fail,
  });

  const valid = form.supplier_id && form.warehouse_id && form.item_id && Number(form.quantity) > 0 && form.reason.trim().length > 2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("مرتجعات الموردين وإشعارات الخصم", "Supplier returns & debit notes")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("الترحيل يخصم من رصيد المستودع بحركة مخزون آمنة", "Posting deducts warehouse stock through a safe movement")}
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} disabled={(suppliers as any[]).length === 0 || (items as any[]).length === 0}>
          <Plus className="h-4 w-4" />
          {t("مرتجع جديد", "New return")}
        </Button>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("مرتجع إلى مورد", "Return to supplier")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ret-sup">{t("المورد *", "Supplier *")}</Label>
              <select id="ret-sup" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)}>
                <option value="">—</option>
                {(suppliers as any[]).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-wh">{t("المستودع *", "Warehouse *")}</Label>
              <select id="ret-wh" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.warehouse_id} onChange={(e) => set("warehouse_id", e.target.value)}>
                <option value="">—</option>
                {(warehouses as any[]).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-item">{t("الصنف *", "Item *")}</Label>
              <select id="ret-item" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.item_id} onChange={(e) => set("item_id", e.target.value)}>
                <option value="">—</option>
                {(items as any[]).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.sku} — {i.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-qty">{t("الكمية *", "Quantity *")}</Label>
              <Input id="ret-qty" type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-price">{t("تكلفة الوحدة", "Unit cost")}</Label>
              <Input id="ret-price" type="number" min="0" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-reason">{t("سبب الإرجاع *", "Reason *")}</Label>
              <Input id="ret-reason" value={form.reason} onChange={(e) => set("reason", e.target.value)} />
            </div>
            <div className="flex items-end gap-2 sm:col-span-3">
              <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
                {t("حفظ كمسودة", "Save draft")}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("إلغاء", "Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(returns as any[]).length === 0 ? (
        <EmptyState
          icon={<Undo2 className="h-6 w-6" />}
          title={t("لا توجد مرتجعات", "No supplier returns")}
          hint={t("سجّل مرتجعًا عند رفض مواد بعد الاستلام.", "Record a return when materials are rejected after receipt.")}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرقم", "Number")}</TableHead>
                  <TableHead>{t("المورد", "Supplier")}</TableHead>
                  <TableHead>{t("السبب", "Reason")}</TableHead>
                  <TableHead>{t("البنود", "Lines")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(returns as any[]).map((r) => {
                  const value = (r.supplier_return_items ?? []).reduce((s: number, l: any) => s + Number(l.quantity) * Number(l.unit_price), 0);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.return_number}</TableCell>
                      <TableCell className="font-medium">{r.suppliers?.name_ar}</TableCell>
                      <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                      <TableCell>{r.supplier_return_items?.length ?? 0}</TableCell>
                      <TableCell>
                        <StatusPill status={r.status} labels={RETURN_STATUS} />
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          {r.status === "draft" ? (
                            <select
                              className="h-8 rounded-md border bg-background px-2 text-xs"
                              defaultValue=""
                              onChange={(e) => {
                                if (!e.target.value) return;
                                post.mutate({ supplier_return_id: r.id, warehouse_id: e.target.value });
                              }}
                            >
                              <option value="">{t("ترحيل من مستودع…", "Post from warehouse…")}</option>
                              {(warehouses as any[]).map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name_ar}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          {r.status === "posted" ? (
                            <Button size="sm" variant="outline" onClick={() => debit.mutate({ supplier_id: r.supplier_id, supplier_return_id: r.id, subtotal: value, reason: r.reason })}>
                              <FileMinus className="h-4 w-4" />
                              {t("إشعار خصم", "Debit note")}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(notes as any[]).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("إشعارات الخصم", "Debit notes")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرقم", "Number")}</TableHead>
                  <TableHead>{t("المورد", "Supplier")}</TableHead>
                  <TableHead>{t("قبل الضريبة", "Subtotal")}</TableHead>
                  <TableHead>{t("الضريبة", "VAT")}</TableHead>
                  <TableHead>{t("الإجمالي", "Total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(notes as any[]).map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.dn_number}</TableCell>
                    <TableCell>{n.suppliers?.name_ar}</TableCell>
                    <TableCell>{money(n.subtotal)}</TableCell>
                    <TableCell>{money(n.vat_amount)}</TableCell>
                    <TableCell className="font-semibold">{money(n.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

