import { Fragment, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ReceiptText, Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  approveSupplierInvoice,
  createSupplierInvoice,
  listPurchaseOrders,
  listSupplierInvoices,
  listSuppliers,
  matchSupplierInvoice,
  listSupplierInvoiceItems,
} from "@/lib/purchasing.functions";
import { MATCH_STATUS, SINV_STATUS } from "@/lib/purchasing-constants";
import { EmptyState, StatusPill, money, useFail } from "@/components/app/purchasing-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/purchasing/invoices")({
  head: () => ({
    meta: [
      { title: "فواتير الموردين · AlMugren AI Factory OS" },
      { name: "description", content: "Supplier invoices with PO/GRN/invoice three-way matching and documented overrides." },
      { property: "og:title", content: "فواتير الموردين · AlMugren AI Factory OS" },
      { property: "og:description", content: "Three-way matched supplier invoices and approvals." },
    ],
  }),
  component: SupplierInvoicesPage,
});

function SupplierInvoicesPage() {
  const t = useT();
  const qc = useQueryClient();
  const fail = useFail();

  const fetchInvoices = useServerFn(listSupplierInvoices);
  const fetchSuppliers = useServerFn(listSuppliers);
  const fetchPos = useServerFn(listPurchaseOrders);
  const addInvoice = useServerFn(createSupplierInvoice);
  const runMatch = useServerFn(matchSupplierInvoice);
  const approve = useServerFn(approveSupplierInvoice);
  const fetchItems = useServerFn(listSupplierInvoiceItems);

  const { data: invoices = [] } = useQuery({ queryKey: ["supplier-invoices"], queryFn: () => fetchInvoices({}) });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => fetchSuppliers({}) });
  const { data: pos = [] } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => fetchPos({}) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["supplier-invoices"] });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", purchase_order_id: "", number: "", date: "", due: "", subtotal: "", vat: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [treatment, setTreatment] = useState<"standard" | "exempt" | "out_of_scope">("standard");
  const [lines, setLines] = useState<{ description: string; unit: string; quantity: string; unit_price: string; discount_percent: string }[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const addLine = () => setLines((l) => [...l, { description: "", unit: "pcs", quantity: "1", unit_price: "0", discount_percent: "0" }]);
  const setLine = (i: number, k: string, v: string) => setLines((l) => l.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));

  const vatRate = treatment === "standard" ? 15 : 0;
  const lineTotals = lines.reduce(
    (acc, l) => {
      const q = Number(l.quantity || 0);
      const p = Number(l.unit_price || 0);
      const disc = Math.round(q * p * (Number(l.discount_percent || 0) / 100) * 100) / 100;
      const taxable = Math.round((q * p - disc) * 100) / 100;
      const vat = Math.round(taxable * (vatRate / 100) * 100) / 100;
      return { taxable: acc.taxable + taxable, vat: acc.vat + vat };
    },
    { taxable: 0, vat: 0 },
  );

  const { data: itemRows = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["supplier-invoice-items", expanded],
    queryFn: () => fetchItems({ data: { supplier_invoice_id: expanded! } }),
    enabled: !!expanded,
  });

  const create = useMutation({
    mutationFn: () =>
      addInvoice({
        data: {
          supplier_id: form.supplier_id,
          purchase_order_id: form.purchase_order_id || null,
          supplier_invoice_number: form.number.trim(),
          invoice_date: form.date,
          due_date: form.due || null,
          tax_treatment: treatment,
          subtotal: lines.length ? 0 : Number(form.subtotal || 0),
          vat_amount: lines.length ? 0 : Number(form.vat || 0),
          ...(lines.length
            ? {
                lines: lines.map((l) => ({
                  description: l.description.trim(),
                  unit: l.unit.trim() || "pcs",
                  quantity: Number(l.quantity || 0),
                  unit_price: Number(l.unit_price || 0),
                  discount_percent: Number(l.discount_percent || 0),
                  vat_rate: vatRate,
                })),
              }
            : {}),
        },
      }),
    onSuccess: () => {
      toast.success(t("تم حفظ فاتورة المورد", "Supplier invoice saved"));
      setForm({ supplier_id: "", purchase_order_id: "", number: "", date: "", due: "", subtotal: "", vat: "" });
      setLines([]);
      setTreatment("standard");
      setOpen(false);
      refresh();
    },
    onError: fail,
  });

  const match = useMutation({
    mutationFn: (id: string) => runMatch({ data: { supplier_invoice_id: id } }),
    onSuccess: (res: any) => {
      toast.success(res?.note ?? t("مطابقة ثلاثية ناجحة", "Three-way match passed"));
      refresh();
    },
    onError: fail,
  });

  const doApprove = useMutation({
    mutationFn: (v: { supplier_invoice_id: string; override_reason?: string | null }) => approve({ data: v }),
    onSuccess: () => {
      toast.success(t("تم اعتماد الفاتورة", "Invoice approved"));
      refresh();
    },
    onError: fail,
  });

  const valid =
    form.supplier_id &&
    form.number.trim() &&
    form.date &&
    (lines.length
      ? lines.every((l) => l.description.trim() && Number(l.quantity) > 0 && Number(l.unit_price) >= 0)
      : Number(form.subtotal) >= 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("فواتير الموردين", "Supplier invoices")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("مطابقة أمر الشراء والاستلام والفاتورة قبل الاعتماد", "PO ↔ GRN ↔ invoice matching before approval")}
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} disabled={(suppliers as any[]).length === 0}>
          <Plus className="h-4 w-4" />
          {t("فاتورة مورد", "New invoice")}
        </Button>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("تسجيل فاتورة مورد", "Record supplier invoice")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="si-sup">{t("المورد *", "Supplier *")}</Label>
              <select id="si-sup" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)}>
                <option value="">—</option>
                {(suppliers as any[]).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="si-po">{t("أمر الشراء", "Purchase order")}</Label>
              <select id="si-po" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.purchase_order_id} onChange={(e) => set("purchase_order_id", e.target.value)}>
                <option value="">—</option>
                {(pos as any[])
                  .filter((p) => !form.supplier_id || p.supplier_id === form.supplier_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.po_number}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="si-num">{t("رقم فاتورة المورد *", "Invoice number *")}</Label>
              <Input id="si-num" value={form.number} onChange={(e) => set("number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="si-date">{t("تاريخ الفاتورة *", "Invoice date *")}</Label>
              <Input id="si-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="si-due">{t("تاريخ الاستحقاق", "Due date")}</Label>
              <Input id="si-due" type="date" value={form.due} onChange={(e) => set("due", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="si-treat">{t("المعالجة الضريبية", "Tax treatment")}</Label>
              <select
                id="si-treat"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value as typeof treatment)}
              >
                <option value="standard">{t("فاتورة ضريبية 15%", "Taxable 15%")}</option>
                <option value="exempt">{t("معفاة", "Exempt")}</option>
                <option value="out_of_scope">{t("خارج النطاق", "Out of scope")}</option>
              </select>
            </div>
            {lines.length === 0 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="si-sub">{t("المبلغ قبل الضريبة *", "Subtotal *")}</Label>
                  <Input id="si-sub" type="number" min="0" value={form.subtotal} onChange={(e) => set("subtotal", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-vat">{t("ضريبة المدخلات", "Input VAT")}</Label>
                  <Input id="si-vat" type="number" min="0" value={form.vat} onChange={(e) => set("vat", e.target.value)} disabled={treatment !== "standard"} />
                </div>
              </>
            ) : null}

            <div className="space-y-3 sm:col-span-3">
              <div className="flex items-center justify-between">
                <Label>{t("بنود الفاتورة", "Invoice lines")}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-4 w-4" />
                  {t("بند", "Line")}
                </Button>
              </div>
              {lines.map((l, i) => (
                <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-6">
                  <Input
                    className="sm:col-span-2"
                    placeholder={t("الوصف", "Description")}
                    value={l.description}
                    onChange={(e) => setLine(i, "description", e.target.value)}
                  />
                  <Input placeholder={t("الوحدة", "Unit")} value={l.unit} onChange={(e) => setLine(i, "unit", e.target.value)} />
                  <Input type="number" min="0" placeholder={t("الكمية", "Qty")} value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} />
                  <Input type="number" min="0" placeholder={t("السعر", "Price")} value={l.unit_price} onChange={(e) => setLine(i, "unit_price", e.target.value)} />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder={t("خصم %", "Disc %")}
                      value={l.discount_percent}
                      onChange={(e) => setLine(i, "discount_percent", e.target.value)}
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)} aria-label={t("حذف", "Remove")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {lines.length ? (
                <p className="text-sm text-muted-foreground">
                  {t("قبل الضريبة", "Subtotal")}: <span className="font-semibold text-foreground">{money(lineTotals.taxable)}</span> ·{" "}
                  {t("الضريبة", "VAT")}: <span className="font-semibold text-foreground">{money(lineTotals.vat)}</span> ·{" "}
                  {t("الإجمالي", "Total")}: <span className="font-semibold text-foreground">{money(lineTotals.taxable + lineTotals.vat)}</span>
                </p>
              ) : null}
            </div>
            <div className="flex items-end gap-2 sm:col-span-3">
              <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
                {t("حفظ", "Save")}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("إلغاء", "Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(invoices as any[]).length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="h-6 w-6" />}
          title={t("لا توجد فواتير موردين", "No supplier invoices")}
          hint={t("سجّل فاتورة المورد بعد استلام البضاعة.", "Record a supplier invoice after receiving goods.")}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم الفاتورة", "Invoice")}</TableHead>
                  <TableHead>{t("المورد", "Supplier")}</TableHead>
                  <TableHead>{t("أمر الشراء", "PO")}</TableHead>
                  <TableHead>{t("الإجمالي", "Total")}</TableHead>
                  <TableHead>{t("المطابقة", "Match")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices as any[]).map((inv) => (
                  <Fragment key={inv.id}>
                  <TableRow>
                    <TableCell className="font-mono text-xs">
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:underline"
                        onClick={() => setExpanded((v) => (v === inv.id ? null : inv.id))}
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${expanded === inv.id ? "rotate-180" : ""}`} />
                        {inv.supplier_invoice_number}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{inv.suppliers?.name_ar}</TableCell>
                    <TableCell>{inv.purchase_orders?.po_number ?? "—"}</TableCell>
                    <TableCell className="font-semibold">{money(inv.total)}</TableCell>
                    <TableCell>
                      <StatusPill status={inv.match_status} labels={MATCH_STATUS} />
                      {inv.discrepancy_note ? <p className="mt-1 text-xs text-muted-foreground">{inv.discrepancy_note}</p> : null}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={inv.status} labels={SINV_STATUS} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        {["draft", "discrepancy", "matched"].includes(inv.status) ? (
                          <Button size="sm" variant="outline" onClick={() => match.mutate(inv.id)}>
                            {t("مطابقة ثلاثية", "Match")}
                          </Button>
                        ) : null}
                        {inv.status === "matched" ? (
                          <Button size="sm" onClick={() => doApprove.mutate({ supplier_invoice_id: inv.id })}>
                            {t("اعتماد", "Approve")}
                          </Button>
                        ) : null}
                        {inv.status === "discrepancy" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const r = window.prompt(t("مبرر تجاوز الاختلاف", "Override reason"))?.trim();
                              if (!r) return;
                              doApprove.mutate({ supplier_invoice_id: inv.id, override_reason: r });
                            }}
                          >
                            {t("اعتماد باستثناء", "Override")}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded === inv.id ? (
                    <TableRow key={`${inv.id}-lines`}>
                      <TableCell colSpan={7} className="bg-muted/40 text-sm">
                        {itemsLoading ? (
                          <span className="text-muted-foreground">{t("جارٍ التحميل…", "Loading…")}</span>
                        ) : (itemRows as any[]).length === 0 ? (
                          <span className="text-muted-foreground">{t("لا توجد بنود مسجلة لهذه الفاتورة", "No lines recorded for this invoice")}</span>
                        ) : (
                          <ul className="space-y-1">
                            {(itemRows as any[]).map((it) => (
                              <li key={it.id} className="flex flex-wrap justify-between gap-2">
                                <span>
                                  {it.description} — {it.quantity} {it.unit} × {money(it.unit_price)}
                                </span>
                                <span className="font-medium">
                                  {money(it.taxable_amount)} + {money(it.vat_amount)} = {money(it.line_total)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

