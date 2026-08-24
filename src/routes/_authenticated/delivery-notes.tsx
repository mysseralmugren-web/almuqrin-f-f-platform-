import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listDeliveryNotes } from "@/lib/workflow.functions";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/delivery-notes")({
  head: () => ({
    meta: [
      { title: "محاضر التسليم · AlMugren AI Factory OS" },
      { name: "description", content: "Delivery notes linked to issued tax invoices." },
    ],
  }),
  component: DeliveryNotesPage,
});

function DeliveryNotesPage() {
  const t = useT();
  const fetchNotes = useServerFn(listDeliveryNotes);
  const { data: notes = [] } = useQuery({ queryKey: ["delivery-notes"], queryFn: () => fetchNotes({}) });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-elegant">
          <Truck className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("محاضر التسليم", "Delivery notes")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("مرتبطة بأوامر البيع والفواتير الصادرة", "Linked to sales orders and issued invoices")}
          </p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("رقم المحضر", "Note #")}</TableHead>
                <TableHead>{t("أمر البيع", "Sales order")}</TableHead>
                <TableHead>{t("العميل", "Customer")}</TableHead>
                <TableHead>{t("المستلم", "Received by")}</TableHead>
                <TableHead>{t("التاريخ", "Date")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {t("لا توجد محاضر تسليم بعد", "No delivery notes yet")}
                  </TableCell>
                </TableRow>
              )}
              {notes.map((n: any) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium" dir="ltr">{n.dn_number}</TableCell>
                  <TableCell dir="ltr">{n.sales_orders?.order_number ?? "—"}</TableCell>
                  <TableCell>{n.customers?.name_ar}</TableCell>
                  <TableCell>{n.received_by ?? "—"}</TableCell>
                  <TableCell dir="ltr">{n.delivery_date}</TableCell>
                  <TableCell><Badge variant="secondary">{n.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

