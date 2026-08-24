import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createPurchaseOrder, listPurchaseOrders, listSuppliers, setPurchaseOrderStatus } from "@/lib/purchasing.functions";
import { PO_STATUS, TAX_TREATMENT, UNITS } from "@/lib/purchasing-constants";
import { EmptyState, StatusPill, money, useFail } from "@/components/app/purchasing-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/purchasing/po")({
  head: () => ({
    meta: [
      { title: "أوامر الشراء · AlMugren AI Factory OS" },
      { name: "description", content: "Purchase orders with server-side totals, 15% input VAT, exemption reasons and approval limits." },
      { property: "og:title", content: "أوامر الشراء · AlMugren AI Factory OS" },
      { property: "og:description", content: "Purchase orders with server-calculated totals and approvals." },
    ],
  }),
  component: PurchaseOrdersPage,
});

type Line = { description: string; unit: string; quantity: string; unit_price: string; discount_percent: string };
const emptyLine: Line = { description: "", unit: UNITS[0], quantity: "", unit_price: "", discount_percent: "0" };

function PurchaseOrdersPage() {
  const t = useT();
  const qc = useQueryClient();
  const fail = useFail();

  const fetchPos = useServerFn(listPurchaseOrders);
  const fetchSuppliers = useServerFn(listSuppliers);
  const addPo = useServerFn(createPurchaseOrder);
  const setStatus = useServerFn(setPurchaseOrderStatus);

  const { data: pos = [] } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => fetchPos({}) });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => fetchSuppliers({}) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["purchase-orders"] });

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expected, setExpected] = useState("");
  const [treatment, setTreatment] = useState<"standard" | "exempt" | "out_of_scope">("standard");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const preview = lines.reduce(
    (acc, l) => {
      const gross = Number(l.quantity || 0) * Number(l.unit_price || 0);
      const taxable = gross - (gross * Number(l.discount_percent || 0)) / 100;
      const vat = treatment === "standard" ? taxable * 0.15 : 0;
      return { taxable: acc.taxable + taxable, vat: acc.vat + vat };
    },
    { taxable: 0, vat: 0 },
  );

  const create = useMutation({
    mutationFn: () =>
      addPo({
        data: {
          supplier_id: supplierId,
          expected_date: expected || null,
          tax_treatment: treatment,
          tax_exemption_reason: treatment === "standard" ? null : reason.trim(),
          notes: null,
          items: lines
            .filter((l) => l.description.trim() && Number(l.quantity) > 0)
            .map((l) => ({
              description: l.description.trim(),
              unit: l.unit,
              quantity: Number(l.quantity),
              unit_price: Number(l.unit_price || 0),
              discount_percent: Number(l.discount_percent || 0),
              vat_rate: 15,
            })),
        },
      }),
    onSuccess: () => {
      toast.success(t("تم إنشاء أمر الشراء", "Purchase order created"));
      setLines([{ ...emptyLine }]);
      setSupplierId("");
      setExpected("");
      setReason("");
      setOpen(false);
      refresh();
    },
    onError: fail,
  });

  const transition = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "cancelled" | "closed"; reason?: string | null }) => setStatus({ data: v }),
    onSuccess: () => {
      toast.success(t("تم تحديث الحالة", "Status updated"));
      refresh();
    },
    onError: fail,
  });

  const valid =
    supplierId &&
    lines.some((l) => l.description.trim() && Number(l.quantity) > 0 && Number(l.unit_price) >= 0) &&
    (treatment === "standard" || reason.trim().length > 2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("أوامر الشراء", "Purchase orders")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("الإجماليات والضريبة تُحتسب في الخادم فقط", "Totals and VAT are computed server-side only")}
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} disabled={(suppliers as any[]).length === 0}>
          <Plus className="h-4 w-4" />
          {t("أمر شراء", "New order")}
        </Button>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("أمر شراء جديد", "New purchase order")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="po-sup">{t("المورد *", "Supplier *")}</Label>
                <select
                  id="po-sup"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">—</option>
                  {(suppliers as any[]).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-date">{t("تاريخ التوريد المتوقع", "Expected date")}</Label>
                <Input id="po-date" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-tax">{t("المعالجة الضريبية", "Tax treatment")}</Label>
                <select
                  id="po-tax"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value as typeof treatment)}
                >
                  {Object.entries(TAX_TREATMENT).map(([k, v]) => (
                    <option key={k} value={k}>
                      {t(v.ar, v.en)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {treatment !== "standard" ? (
              <div className="space-y-2">
                <Label htmlFor="po-reason">{t("سبب الإعفاء *", "Exemption reason *")}</Label>
                <Input id="po-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            ) : null}

            <div className="space-y-3">
              {lines.map((l, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                  <Input placeholder={t("الوصف", "Description")} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                  <Input placeholder={t("الوحدة", "Unit")} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
                  <Input type="number" min="0" placeholder={t("الكمية", "Qty")} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                  <Input type="number" min="0" placeholder={t("سعر الوحدة", "Unit price")} value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} />
                  <Input type="number" min="0" max="100" placeholder={t("خصم %", "Disc %")} value={l.discount_percent} onChange={(e) => setLine(i, { discount_percent: e.target.value })} />
                  <Button variant="ghost" size="icon" onClick={() => setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { ...emptyLine }])}>
                <Plus className="h-4 w-4" />
                {t("إضافة بند", "Add line")}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                {t("تقدير", "Preview")}: {money(preview.taxable)} + {t("ضريبة", "VAT")} {money(preview.vat)} ={" "}
                <span className="font-semibold text-foreground">{money(preview.taxable + preview.vat)}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {t("إلغاء", "Cancel")}
                </Button>
                <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
                  {t("حفظ كمسودة", "Save draft")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(pos as any[]).length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title={t("لا توجد أوامر شراء", "No purchase orders")}
          hint={t("أنشئ أمر شراء بعد ترسية العرض أو اعتماد الطلب.", "Create an order after awarding an RFQ or approving a request.")}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرقم", "Number")}</TableHead>
                  <TableHead>{t("المورد", "Supplier")}</TableHead>
                  <TableHead>{t("قبل الضريبة", "Subtotal")}</TableHead>
                  <TableHead>{t("الضريبة", "VAT")}</TableHead>
                  <TableHead>{t("الإجمالي", "Total")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pos as any[]).map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs">{po.po_number}</TableCell>
                    <TableCell className="font-medium">{po.suppliers?.name_ar}</TableCell>
                    <TableCell>{money(po.subtotal)}</TableCell>
                    <TableCell>{money(po.vat_amount)}</TableCell>
                    <TableCell className="font-semibold">{money(po.total)}</TableCell>
                    <TableCell>
                      <StatusPill status={po.status} labels={PO_STATUS} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        {po.status === "draft" ? (
                          <Button size="sm" onClick={() => transition.mutate({ id: po.id, status: "approved" })}>
                            {t("اعتماد", "Approve")}
                          </Button>
                        ) : null}
                        {["draft", "approved"].includes(po.status) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const r = window.prompt(t("سبب الإلغاء", "Cancellation reason"))?.trim();
                              if (!r) return;
                              transition.mutate({ id: po.id, status: "cancelled", reason: r });
                            }}
                          >
                            {t("إلغاء", "Cancel")}
                          </Button>
                        ) : null}
                        {po.status === "received" ? (
                          <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: po.id, status: "closed" })}>
                            {t("إقفال", "Close")}
                          </Button>
                        ) : null}
                      </div>
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

