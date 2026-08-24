import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createPaymentRequest,
  executePaymentRequest,
  listPaymentRequests,
  listSupplierInvoices,
  setPaymentRequestStatus,
} from "@/lib/purchasing.functions";
import { PAY_STATUS } from "@/lib/purchasing-constants";
import { EmptyState, StatusPill, money, useFail } from "@/components/app/purchasing-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/purchasing/payments")({
  head: () => ({
    meta: [
      { title: "طلبات الدفع · AlMugren AI Factory OS" },
      { name: "description", content: "Supplier payment requests, approvals and execution gated by bank reference and posted accounting entry." },
      { property: "og:title", content: "طلبات الدفع · AlMugren AI Factory OS" },
      { property: "og:description", content: "Payment requests with approval and execution controls." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const t = useT();
  const qc = useQueryClient();
  const fail = useFail();

  const fetchPayments = useServerFn(listPaymentRequests);
  const fetchInvoices = useServerFn(listSupplierInvoices);
  const addPayment = useServerFn(createPaymentRequest);
  const setStatus = useServerFn(setPaymentRequestStatus);
  const execute = useServerFn(executePaymentRequest);

  const { data: payments = [] } = useQuery({ queryKey: ["payment-requests"], queryFn: () => fetchPayments({}) });
  const { data: invoices = [] } = useQuery({ queryKey: ["supplier-invoices"], queryFn: () => fetchInvoices({}) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["payment-requests"] });
    void qc.invalidateQueries({ queryKey: ["supplier-invoices"] });
  };

  const [open, setOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");

  const payable = (invoices as any[]).filter((i) => i.status === "approved");

  const create = useMutation({
    mutationFn: () =>
      addPayment({ data: { supplier_invoice_id: invoiceId, amount: Number(amount || 0), due_date: due || null, method: "bank_transfer" as const } }),
    onSuccess: () => {
      toast.success(t("تم إنشاء طلب الدفع", "Payment request created"));
      setInvoiceId("");
      setAmount("");
      setDue("");
      setOpen(false);
      refresh();
    },
    onError: fail,
  });

  const transition = useMutation({
    mutationFn: (v: { id: string; status: "submitted" | "approved" | "rejected" | "cancelled"; rejection_reason?: string | null }) => setStatus({ data: v }),
    onSuccess: () => {
      toast.success(t("تم تحديث الحالة", "Status updated"));
      refresh();
    },
    onError: fail,
  });

  const doExecute = useMutation({
    mutationFn: (v: { id: string; bank_reference: string }) => execute({ data: { ...v, accounting_posted: true as const } }),
    onSuccess: () => {
      toast.success(t("تم تسجيل تنفيذ الدفع", "Payment marked executed"));
      refresh();
    },
    onError: fail,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("طلبات الدفع", "Payment requests")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("لا يُعد الدفع منفّذًا إلا بمرجع بنكي وتأكيد القيد المحاسبي", "Payment counts as executed only with a bank reference and posted entry")}
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} disabled={payable.length === 0}>
          <Plus className="h-4 w-4" />
          {t("طلب دفع", "New request")}
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{t("لا ينشئ النظام أي قيود محاسبية تلقائية؛ التنفيذ تسجيل يدوي بعد التحويل الفعلي.", "No automatic accounting entries are created; execution is recorded manually after the actual transfer.")}</p>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("طلب دفع جديد", "New payment request")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pay-inv">{t("الفاتورة المعتمدة *", "Approved invoice *")}</Label>
              <select id="pay-inv" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                <option value="">—</option>
                {payable.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.supplier_invoice_number} — {money(i.total)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">{t("المبلغ *", "Amount *")}</Label>
              <Input id="pay-amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-due">{t("تاريخ الاستحقاق", "Due date")}</Label>
              <Input id="pay-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div className="flex items-end gap-2 sm:col-span-3">
              <Button disabled={!invoiceId || Number(amount) <= 0 || create.isPending} onClick={() => create.mutate()}>
                {t("حفظ", "Save")}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("إلغاء", "Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(payments as any[]).length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-6 w-6" />}
          title={t("لا توجد طلبات دفع", "No payment requests")}
          hint={t("أنشئ طلب دفع مقابل فاتورة مورد معتمدة.", "Create a payment request against an approved supplier invoice.")}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرقم", "Number")}</TableHead>
                  <TableHead>{t("المورد", "Supplier")}</TableHead>
                  <TableHead>{t("الفاتورة", "Invoice")}</TableHead>
                  <TableHead>{t("المبلغ", "Amount")}</TableHead>
                  <TableHead>{t("المرجع البنكي", "Bank ref")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments as any[]).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.pay_number}</TableCell>
                    <TableCell className="font-medium">{p.suppliers?.name_ar}</TableCell>
                    <TableCell>{p.supplier_invoices?.supplier_invoice_number}</TableCell>
                    <TableCell className="font-semibold">{money(p.amount)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.bank_reference ?? "—"}</TableCell>
                    <TableCell>
                      <StatusPill status={p.status} labels={PAY_STATUS} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        {p.status === "draft" ? (
                          <Button size="sm" onClick={() => transition.mutate({ id: p.id, status: "submitted" })}>
                            {t("تقديم", "Submit")}
                          </Button>
                        ) : null}
                        {p.status === "submitted" ? (
                          <>
                            <Button size="sm" onClick={() => transition.mutate({ id: p.id, status: "approved" })}>
                              {t("اعتماد", "Approve")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const r = window.prompt(t("سبب الرفض", "Rejection reason"))?.trim();
                                if (!r) return;
                                transition.mutate({ id: p.id, status: "rejected", rejection_reason: r });
                              }}
                            >
                              {t("رفض", "Reject")}
                            </Button>
                          </>
                        ) : null}
                        {p.status === "approved" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              const ref = window.prompt(t("المرجع البنكي للتحويل", "Bank transfer reference"))?.trim();
                              if (!ref || ref.length < 3) return;
                              if (!window.confirm(t("أؤكد أن القيد المحاسبي مسجّل والتحويل تم فعليًا", "Confirm the accounting entry is posted and the transfer completed"))) return;
                              doExecute.mutate({ id: p.id, bank_reference: ref });
                            }}
                          >
                            {t("تسجيل التنفيذ", "Mark executed")}
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

