import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Receipt, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listInvoices } from "@/lib/workflow.functions";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "الفواتير الضريبية · AlMugren AI Factory OS" },
      { name: "description", content: "ZATCA-ready tax invoices with TLV QR payload." },
    ],
  }),
  component: InvoicesPage,
});

const money = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(n);

function InvoicesPage() {
  const t = useT();
  const fetchInvoices = useServerFn(listInvoices);
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => fetchInvoices({}) });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <Receipt className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("الفواتير الضريبية", "Tax invoices")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("فواتير متوافقة مع رمز الاستجابة السريعة TLV", "Invoices carrying the ZATCA TLV QR payload")}
          </p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("رقم الفاتورة", "Invoice #")}</TableHead>
                <TableHead>{t("العميل", "Customer")}</TableHead>
                <TableHead>{t("التاريخ", "Date")}</TableHead>
                <TableHead>{t("الضريبة", "VAT")}</TableHead>
                <TableHead>{t("الإجمالي", "Total")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {t("لا توجد فواتير بعد", "No invoices yet")}
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((inv: any) => (
                <>
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium" dir="ltr">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.customers?.name_ar}</TableCell>
                    <TableCell dir="ltr">{inv.issue_date}</TableCell>
                    <TableCell dir="ltr">{money(Number(inv.vat_amount))}</TableCell>
                    <TableCell dir="ltr">{money(Number(inv.total))}</TableCell>
                    <TableCell><Badge variant="secondary">{inv.status}</Badge></TableCell>
                  </TableRow>
                  <TableRow key={`${inv.id}-qr`}>
                    <TableCell colSpan={6} className="bg-muted/30 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="break-all" dir="ltr">{inv.qr_tlv}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

