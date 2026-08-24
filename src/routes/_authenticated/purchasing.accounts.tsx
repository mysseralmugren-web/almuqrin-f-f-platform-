import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupplierAccounts } from "@/lib/purchasing.functions";
import { EmptyState, money } from "@/components/app/purchasing-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/purchasing/accounts")({
  head: () => ({
    meta: [
      { title: "حسابات الموردين · AlMugren AI Factory OS" },
      { name: "description", content: "Supplier account statement: invoiced, executed payments, debit notes and outstanding balance." },
      { property: "og:title", content: "حسابات الموردين · AlMugren AI Factory OS" },
      { property: "og:description", content: "Supplier balances computed from invoices, payments and debit notes." },
    ],
  }),
  component: SupplierAccountsPage,
});

function SupplierAccountsPage() {
  const t = useT();
  const fetchAccounts = useServerFn(getSupplierAccounts);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["supplier-accounts"],
    queryFn: () => fetchAccounts({}),
  });

  const list = rows as any[];
  const sum = (k: string) => list.reduce((a, r) => a + Number(r[k] ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { ar: "إجمالي الفواتير", en: "Invoiced", v: sum("invoiced") },
          { ar: "المدفوع فعليًا", en: "Paid", v: sum("paid") },
          { ar: "إشعارات الخصم", en: "Debit notes", v: sum("debited") },
          { ar: "الرصيد المستحق", en: "Outstanding", v: sum("balance") },
        ].map((c) => (
          <Card key={c.en}>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground">{t(c.ar, c.en)}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{money(c.v)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            {t("كشف حسابات الموردين", "Supplier account statement")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-6 w-6" />}
              title={isLoading ? t("جارٍ التحميل…", "Loading…") : t("لا توجد حسابات موردين بعد", "No supplier accounts yet")}
              hint={t("تظهر الأرصدة تلقائيًا بعد تسجيل الموردين وفواتيرهم", "Balances appear once suppliers and their invoices are recorded")}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("المورد", "Supplier")}</TableHead>
                    <TableHead>{t("عدد الفواتير", "Invoices")}</TableHead>
                    <TableHead>{t("إجمالي الفواتير", "Invoiced")}</TableHead>
                    <TableHead>{t("مدفوع", "Paid")}</TableHead>
                    <TableHead>{t("قيد الاعتماد", "Committed")}</TableHead>
                    <TableHead>{t("إشعارات خصم", "Debit notes")}</TableHead>
                    <TableHead>{t("متأخر", "Overdue")}</TableHead>
                    <TableHead>{t("الرصيد", "Balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => (
                    <TableRow key={r.supplier_id}>
                      <TableCell className="font-medium">
                        {r.name_ar}
                        <div className="text-xs text-muted-foreground">
                          {r.code} · {t("سداد", "Terms")} {r.payment_terms_days} {t("يوم", "days")}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{r.invoices_count}</TableCell>
                      <TableCell className="tabular-nums">{money(r.invoiced)}</TableCell>
                      <TableCell className="tabular-nums">{money(r.paid)}</TableCell>
                      <TableCell className="tabular-nums">{money(r.committed)}</TableCell>
                      <TableCell className="tabular-nums">{money(r.debited)}</TableCell>
                      <TableCell className={`tabular-nums ${Number(r.overdue) > 0 ? "text-destructive font-semibold" : ""}`}>
                        {money(r.overdue)}
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">{money(r.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

