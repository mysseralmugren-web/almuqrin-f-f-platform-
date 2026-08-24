import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Send, Check, X, ArrowLeftRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listCustomers, listQuotations, createQuotation, convertQuotationToOrder, setQuotationStatus,
} from "@/lib/workflow.functions";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/quotations")({
  head: () => ({
    meta: [
      { title: "عروض الأسعار · AlMugren AI Factory OS" },
      { name: "description", content: "Quotations linked to CRM customers, with lifecycle and conversion to sales orders." },
    ],
  }),
  component: QuotationsPage,
});

interface ItemRow {
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
}

const emptyRow = (): ItemRow => ({ description: "", unit: "قطعة", quantity: "1", unit_price: "", discount_percent: "0" });
const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const VAT_RATE = 15;

const STATUS_META: Record<string, { ar: string; en: string; variant: "secondary" | "outline" | "default" | "destructive" }> = {
  draft: { ar: "مسودة", en: "Draft", variant: "outline" },
  sent: { ar: "مرسل", en: "Sent", variant: "secondary" },
  accepted: { ar: "مقبول", en: "Accepted", variant: "default" },
  rejected: { ar: "مرفوض", en: "Rejected", variant: "destructive" },
  expired: { ar: "منتهي", en: "Expired", variant: "outline" },
};

function QuotationsPage() {
  const t = useT();
  const qc = useQueryClient();
  const fetchQuotes = useServerFn(listQuotations);
  const fetchCustomers = useServerFn(listCustomers);
  const create = useServerFn(createQuotation);
  const convert = useServerFn(convertQuotationToOrder);
  const setStatus = useServerFn(setQuotationStatus);

  const { data: quotes = [] } = useQuery({ queryKey: ["quotations"], queryFn: () => fetchQuotes({}) });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => fetchCustomers({}) });

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);

  const calc = items.reduce(
    (acc, i) => {
      const qty = Number(i.quantity) || 0;
      const price = Number(i.unit_price) || 0;
      const disc = Math.min(Math.max(Number(i.discount_percent) || 0, 0), 100);
      const gross = qty * price;
      const discount = (gross * disc) / 100;
      const taxable = gross - discount;
      acc.subtotal += gross;
      acc.discount += discount;
      acc.vat += (taxable * VAT_RATE) / 100;
      return acc;
    },
    { subtotal: 0, discount: 0, vat: 0 },
  );
  const total = calc.subtotal - calc.discount + calc.vat;

  const invalid =
    !customerId ||
    items.some(
      (i) =>
        i.description.trim().length === 0 ||
        !(Number(i.quantity) > 0) ||
        !(Number(i.unit_price) >= 0) ||
        Number(i.discount_percent) < 0 ||
        Number(i.discount_percent) > 100,
    );

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["quotations"] });
    void qc.invalidateQueries({ queryKey: ["sales-orders"] });
  };
  const fail = (e: Error) => {
    const m = e.message;
    toast.error(
      m === "FORBIDDEN_ROLE"
        ? t("لا تملك صلاحية لهذا الإجراء", "You are not allowed to perform this action")
        : m === "ORDER_ALREADY_EXISTS"
          ? t("تم تحويل هذا العرض إلى أمر بيع مسبقًا", "This quotation was already converted")
          : m === "QUOTATION_NOT_ACCEPTED"
            ? t("يجب قبول العرض قبل التحويل", "The quotation must be accepted first")
            : m.startsWith("INVALID_TRANSITION")
              ? t("انتقال حالة غير مسموح", "Status transition not allowed")
              : m,
    );
  };

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          customer_id: customerId,
          valid_until: validUntil || null,
          notes: notes || null,
          items: items.map((i) => ({
            description: i.description.trim(),
            unit: i.unit.trim() || "قطعة",
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
            discount_percent: Number(i.discount_percent) || 0,
            vat_rate: VAT_RATE,
          })),
        },
      }),
    onSuccess: (r) => {
      toast.success(`${t("تم إنشاء العرض", "Quotation created")} ${r.quote_number}`);
      setOpen(false);
      setCustomerId(""); setValidUntil(""); setNotes(""); setItems([emptyRow()]);
      refresh();
    },
    onError: fail,
  });

  const statusMutation = useMutation({
    mutationFn: (v: { id: string; status: "sent" | "accepted" | "rejected" | "expired" }) => setStatus({ data: v }),
    onSuccess: () => { toast.success(t("تم تحديث الحالة", "Status updated")); refresh(); },
    onError: fail,
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => convert({ data: { quotation_id: id } }),
    onSuccess: (r) => { toast.success(`${t("تم إنشاء أمر البيع", "Sales order created")} ${r.order_number}`); refresh(); },
    onError: fail,
  });

  const patch = (idx: number, key: keyof ItemRow, value: string) =>
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-elegant">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {t("الوحدة 03", "Module 03")}
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t("عروض الأسعار", "Quotations")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("مرتبطة بعملاء CRM · دورة حياة كاملة · تحويل لأمر بيع", "Linked to CRM customers · full lifecycle · convert to sales order")}
            </p>
          </div>
        </div>
        <Button className="gap-2 gradient-primary shadow-elegant" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("عرض سعر جديد", "New quotation")}
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("رقم العرض", "Quote #")}</TableHead>
                <TableHead>{t("العميل", "Customer")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
                <TableHead>{t("الخصم", "Discount")}</TableHead>
                <TableHead>{t("الضريبة", "VAT")}</TableHead>
                <TableHead>{t("الإجمالي", "Total")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    {t("لا توجد عروض أسعار بعد", "No quotations yet")}
                  </TableCell>
                </TableRow>
              )}
              {quotes.map((q: any) => {
                const meta = STATUS_META[q.status] ?? STATUS_META.draft;
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium" dir="ltr">{q.quote_number}</TableCell>
                    <TableCell>{q.customers?.name_ar}</TableCell>
                    <TableCell><Badge variant={meta.variant}>{t(meta.ar, meta.en)}</Badge></TableCell>
                    <TableCell dir="ltr">{money(Number(q.discount_total ?? 0))}</TableCell>
                    <TableCell dir="ltr">{money(Number(q.vat_amount))}</TableCell>
                    <TableCell className="font-semibold" dir="ltr">{money(Number(q.total))}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {q.status === "draft" && (
                          <Button size="sm" variant="outline" className="gap-1"
                            onClick={() => statusMutation.mutate({ id: q.id, status: "sent" })}>
                            <Send className="h-3.5 w-3.5" />{t("إرسال", "Send")}
                          </Button>
                        )}
                        {q.status === "sent" && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1"
                              onClick={() => statusMutation.mutate({ id: q.id, status: "accepted" })}>
                              <Check className="h-3.5 w-3.5" />{t("قبول", "Accept")}
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1"
                              onClick={() => statusMutation.mutate({ id: q.id, status: "rejected" })}>
                              <X className="h-3.5 w-3.5" />{t("رفض", "Reject")}
                            </Button>
                          </>
                        )}
                        {q.status === "accepted" && (
                          <Button size="sm" variant="outline" className="gap-1"
                            disabled={convertMutation.isPending}
                            onClick={() => convertMutation.mutate(q.id)}>
                            <ArrowLeftRight className="h-3.5 w-3.5" />{t("تحويل لأمر بيع", "To sales order")}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="gap-1" asChild>
                          <a href={`/print/quotation/${q.id}`} target="_blank" rel="noreferrer">
                            <Printer className="h-3.5 w-3.5" />{t("طباعة", "Print")}
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{t("عرض سعر جديد", "New quotation")}</DialogTitle></DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer">{t("العميل", "Customer")}</Label>
                <select
                  id="customer"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">{t("اختر عميلًا", "Select a customer")}</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name_ar}</option>
                  ))}
                </select>
                {customers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("أضف عميلًا من صفحة العملاء أولًا", "Add a customer first from the Customers page")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid">{t("صالح حتى", "Valid until")}</Label>
                <Input id="valid" type="date" dir="ltr" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("البنود", "Line items")}</Label>
              <div className="space-y-2">
                {items.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center gap-2 rounded-lg border p-2">
                    <Input className="col-span-12 sm:col-span-4" placeholder={t("الوصف", "Description")}
                      value={row.description} onChange={(e) => patch(idx, "description", e.target.value)} />
                    <Input className="col-span-4 sm:col-span-2" placeholder={t("الوحدة", "Unit")}
                      value={row.unit} onChange={(e) => patch(idx, "unit", e.target.value)} />
                    <Input className="col-span-4 sm:col-span-2" type="number" min="0.001" step="0.001" dir="ltr"
                      placeholder={t("الكمية", "Qty")} value={row.quantity} onChange={(e) => patch(idx, "quantity", e.target.value)} />
                    <Input className="col-span-4 sm:col-span-2" type="number" min="0" step="0.01" dir="ltr"
                      placeholder={t("سعر الوحدة", "Unit price")} value={row.unit_price} onChange={(e) => patch(idx, "unit_price", e.target.value)} />
                    <Input className="col-span-8 sm:col-span-1" type="number" min="0" max="100" step="0.5" dir="ltr"
                      placeholder="%" value={row.discount_percent} onChange={(e) => patch(idx, "discount_percent", e.target.value)} />
                    <Button variant="ghost" size="icon" className="col-span-4 sm:col-span-1 justify-self-end"
                      onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setItems((p) => [...p, emptyRow()])}>
                <Plus className="h-4 w-4" />{t("إضافة بند", "Add item")}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("ملاحظات", "Notes")}</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span>{t("الإجمالي قبل الخصم", "Subtotal")}</span><span dir="ltr">{money(calc.subtotal)}</span></div>
              <div className="flex justify-between"><span>{t("الخصم", "Discount")}</span><span dir="ltr">-{money(calc.discount)}</span></div>
              <div className="flex justify-between"><span>{t("ضريبة القيمة المضافة 15%", "VAT 15%")}</span><span dir="ltr">{money(calc.vat)}</span></div>
              <div className="mt-1 flex justify-between border-t pt-1 font-bold"><span>{t("الإجمالي", "Total")}</span><span dir="ltr">{money(total)}</span></div>
            </div>

            <Button className="w-full gradient-primary" disabled={invalid || createMutation.isPending}
              onClick={() => createMutation.mutate()}>
              {t("حفظ العرض", "Save quotation")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

