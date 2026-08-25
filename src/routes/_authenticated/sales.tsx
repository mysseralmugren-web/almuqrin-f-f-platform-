import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TrendingUp, Receipt, Factory, Truck, Wallet, ListChecks, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listSalesOrders, recordPayment, issueInvoiceForOrder, createDeliveryNote,
  savePaymentSchedule,
} from "@/lib/workflow.functions";
import { createManufacturingOrder } from "@/lib/mes.functions";
import { STAGE_CATALOG } from "@/lib/mes-constants";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "أوامر البيع · AlMugren AI Factory OS" },
      { name: "description", content: "Sales orders, payments, invoicing and delivery." },
    ],
  }),
  component: SalesPage,
});

interface Installment { label_ar: string; label_en: string; percentage: string; trigger_stage: "on_signature" | "production_50" | "before_delivery" | "custom" }

const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(n);

function SalesPage() {
  const t = useT();
  const qc = useQueryClient();
  const fetchOrders = useServerFn(listSalesOrders);
  const pay = useServerFn(recordPayment);
  const invoice = useServerFn(issueInvoiceForOrder);
  const produce = useServerFn(createManufacturingOrder);
  const deliver = useServerFn(createDeliveryNote);
  const saveSchedule = useServerFn(savePaymentSchedule);

  const { data: orders = [] } = useQuery({ queryKey: ["sales-orders"], queryFn: () => fetchOrders({}) });
  const [payFor, setPayFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [scheduleFor, setScheduleFor] = useState<any | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [deliverFor, setDeliverFor] = useState<string | null>(null);
  const [receivedBy, setReceivedBy] = useState("");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["sales-orders"] });
    void qc.invalidateQueries({ queryKey: ["invoices"] });
    void qc.invalidateQueries({ queryKey: ["production-orders"] });
    void qc.invalidateQueries({ queryKey: ["delivery-notes"] });
  };
  const fail = (e: Error) =>
    toast.error(
      e.message.startsWith("COMPANY_DATA_INCOMPLETE")
        ? t(
            "أكمل بيانات المنشأة والرقم الضريبي والعنوان الوطني قبل إصدار الفاتورة",
            "Complete company data, VAT number and national address before issuing an invoice",
          )
        : e.message === "INVOICE_REQUIRED_BEFORE_DELIVERY"
          ? t("يجب إصدار الفاتورة قبل التسليم", "An invoice must be issued before delivery")
          : e.message,
    );

  const payMutation = useMutation({
    mutationFn: () => pay({ data: { sales_order_id: payFor!, amount: Number(amount), method: "bank_transfer" } }),
    onSuccess: () => { toast.success(t("تم تسجيل الدفعة", "Payment recorded")); setPayFor(null); setAmount(""); refresh(); },
    onError: fail,
  });
  const invoiceMutation = useMutation({
    mutationFn: (id: string) => invoice({ data: { sales_order_id: id } }),
    onSuccess: (r) => { toast.success(`${t("تم إصدار الفاتورة", "Invoice issued")} ${r.invoice_number}`); refresh(); },
    onError: fail,
  });
  const produceMutation = useMutation({
    mutationFn: (id: string) =>
      produce({
        data: { sales_order_id: id, stage_codes: STAGE_CATALOG.map((s) => s.code) },
      }),
    onSuccess: (r) => { toast.success(`${t("تم فتح أمر تصنيع", "Manufacturing order created")} ${r.mo_number}`); refresh(); },
    onError: fail,
  });
  const deliverMutation = useMutation({
    mutationFn: () => deliver({ data: { sales_order_id: deliverFor!, received_by: receivedBy } }),
    onSuccess: (r) => {
      toast.success(`${t("تم إنشاء محضر التسليم", "Delivery note created")} ${r.dn_number}`);
      setDeliverFor(null); setReceivedBy(""); refresh();
    },
    onError: fail,
  });

  const scheduleMutation = useMutation({
    mutationFn: () =>
      saveSchedule({
        data: {
          sales_order_id: scheduleFor.id,
          installments: installments.map((i) => ({
            label_ar: i.label_ar,
            label_en: i.label_en,
            percentage: Number(i.percentage),
            trigger_stage: i.trigger_stage,
          })),
        },
      }),
    onSuccess: () => { toast.success(t("تم تحديث جدول الدفعات", "Payment schedule updated")); setScheduleFor(null); refresh(); },
    onError: (e: Error) =>
      toast.error(
        e.message === "FORBIDDEN_ROLE"
          ? t("تعديل الدفعات يتطلب صلاحية مدير", "Adjusting installments requires manager permission")
          : e.message.includes("100")
            ? t("مجموع النسب يجب أن يساوي 100%", "Percentages must total 100%")
            : e.message,
      ),
  });

  const openSchedule = (o: any) => {
    const rows = (o.payment_schedules ?? []).slice().sort((a: any, b: any) => a.sequence - b.sequence);
    setInstallments(
      rows.length
        ? rows.map((r: any) => ({ label_ar: r.label_ar, label_en: r.label_en, percentage: String(r.percentage), trigger_stage: r.trigger_stage }))
        : [
            { label_ar: "دفعة عند التوقيع", label_en: "On signature", percentage: "50", trigger_stage: "on_signature" },
            { label_ar: "دفعة عند إنجاز 50% من التصنيع", label_en: "At 50% production", percentage: "30", trigger_stage: "production_50" },
            { label_ar: "دفعة قبل/عند التسليم", label_en: "Before delivery", percentage: "20", trigger_stage: "before_delivery" },
          ],
    );
    setScheduleFor(o);
  };

  const percentSum = installments.reduce((sum, i) => sum + (Number(i.percentage) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <TrendingUp className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("أوامر البيع", "Sales orders")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("الدفعات، التصنيع، الفاتورة الضريبية، ومحضر التسليم", "Payments, production, tax invoice and delivery note")}
          </p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("رقم الأمر", "Order #")}</TableHead>
                <TableHead>{t("العميل", "Customer")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
                <TableHead>{t("الإجمالي", "Total")}</TableHead>
                <TableHead>{t("المدفوع", "Paid")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {t("لا توجد أوامر بيع بعد — حوّل عرض سعر معتمد", "No sales orders yet — convert an accepted quotation")}
                  </TableCell>
                </TableRow>
              )}
              {orders.map((o: any) => {
                const paid = (o.payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
                const hasInvoice = (o.invoices ?? []).length > 0;
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium" dir="ltr">{o.order_number}</TableCell>
                    <TableCell>{o.customers?.name_ar}</TableCell>
                    <TableCell><Badge variant="secondary">{o.status}</Badge></TableCell>
                    <TableCell dir="ltr">{money(Number(o.total))}</TableCell>
                    <TableCell dir="ltr">{money(paid)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setPayFor(o.id)}>
                          <Wallet className="h-4 w-4" />{t("دفعة", "Payment")}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => produceMutation.mutate(o.id)}>
                          <Factory className="h-4 w-4" />{t("تصنيع", "Produce")}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" disabled={hasInvoice} onClick={() => invoiceMutation.mutate(o.id)}>
                          <Receipt className="h-4 w-4" />{t("فاتورة", "Invoice")}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openSchedule(o)}>
                          <ListChecks className="h-4 w-4" />{t("الدفعات", "Installments")}
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setDeliverFor(o.id)}>
                          <Truck className="h-4 w-4" />{t("تسليم", "Deliver")}
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

      <Dialog open={!!payFor} onOpenChange={(v) => !v && setPayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("تسجيل دفعة", "Record payment")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t("المبلغ", "Amount")}</Label>
              <Input id="amount" type="number" min="0.01" step="0.01" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Button className="w-full gradient-primary" disabled={!amount || payMutation.isPending} onClick={() => payMutation.mutate()}>
              {t("حفظ", "Save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!scheduleFor} onOpenChange={(v) => !v && setScheduleFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t("جدول الدفعات", "Payment schedule")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("الافتراضي 50% عند التوقيع، 30% عند إنجاز 50%، 20% قبل/عند التسليم — التعديل يتطلب صلاحية مدير.",
                 "Default 50% on signature, 30% at 50% production, 20% before delivery — adjusting requires manager permission.")}
            </p>
            {installments.map((inst, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2 rounded-lg border p-2">
                <Input className="col-span-6" value={inst.label_ar}
                  onChange={(e) => setInstallments((p) => p.map((r, i) => (i === idx ? { ...r, label_ar: e.target.value } : r)))} />
                <Input className="col-span-3" type="number" min="0.01" max="100" step="0.5" dir="ltr" value={inst.percentage}
                  onChange={(e) => setInstallments((p) => p.map((r, i) => (i === idx ? { ...r, percentage: e.target.value } : r)))} />
                <select className="col-span-2 h-9 rounded-md border border-input bg-background px-2 text-xs"
                  value={inst.trigger_stage}
                  onChange={(e) => setInstallments((p) => p.map((r, i) => (i === idx ? { ...r, trigger_stage: e.target.value as Installment["trigger_stage"] } : r)))}>
                  <option value="on_signature">{t("عند التوقيع", "Signature")}</option>
                  <option value="production_50">{t("إنجاز 50%", "50% production")}</option>
                  <option value="before_delivery">{t("قبل التسليم", "Before delivery")}</option>
                  <option value="custom">{t("مخصص", "Custom")}</option>
                </select>
                <Button variant="ghost" size="icon" className="col-span-1"
                  onClick={() => setInstallments((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" className="gap-1"
                onClick={() => setInstallments((p) => [...p, { label_ar: "دفعة إضافية", label_en: "Extra installment", percentage: "0", trigger_stage: "custom" }])}>
                <Plus className="h-4 w-4" />{t("إضافة دفعة", "Add installment")}
              </Button>
              <span className={percentSum === 100 ? "text-sm text-muted-foreground" : "text-sm font-semibold text-destructive"}>
                {t("المجموع", "Total")}: {percentSum}%
              </span>
            </div>
            <Button className="w-full gradient-primary" disabled={Math.abs(percentSum - 100) > 0.01 || scheduleMutation.isPending}
              onClick={() => scheduleMutation.mutate()}>
              {t("حفظ الجدول", "Save schedule")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deliverFor} onOpenChange={(v) => !v && setDeliverFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("محضر تسليم", "Delivery note")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recv">{t("اسم المستلم", "Received by")}</Label>
              <Input id="recv" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
            </div>
            <Button className="w-full gradient-primary" disabled={receivedBy.length < 2 || deliverMutation.isPending} onClick={() => deliverMutation.mutate()}>
              {t("إنشاء المحضر", "Create note")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

