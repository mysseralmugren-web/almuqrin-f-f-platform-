import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { purchasingAnalytics } from "@/lib/analytics.functions";
import { useT } from "@/lib/theme";
import { Empty, ErrorState, FilterBar, Kpi, Loading, Section, defaultFilters, exportAnalyticsCsv, money, num, printReport, ratio } from "@/components/app/analytics-ui";

export const Route = createFileRoute("/_authenticated/reports/purchasing")({
  head: () => ({
    meta: [
      { title: "تحليلات المشتريات · التقارير · AlMugren AI Factory OS" },
      { name: "description", content: "Purchase orders, on-time receipts, supplier invoices and payables." },
      { property: "og:title", content: "تحليلات المشتريات · AlMugren AI Factory OS" },
      { property: "og:description", content: "Procurement KPIs with supplier drill-down." },
    ],
  }),
  component: PurchasingReport,
});

function PurchasingReport() {
  const t = useT();
  const [filters, setFilters] = useState(defaultFilters());
  const fetchData = useServerFn(purchasingAnalytics);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", "purchasing", filters.from, filters.to],
    queryFn: () => fetchData({ data: { from: filters.from, to: filters.to } }),
  });
  const scope = { from: filters.from, to: filters.to };

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <Empty text={t("لا توجد بيانات", "No data")} />;
  const suppliers = (data.top_suppliers ?? []) as Array<Record<string, any>>;

  return (
    <div className="space-y-6">
      <FilterBar value={filters} onChange={setFilters} onRefresh={() => void refetch()} generatedAt={data.generated_at}
        onExport={() => void exportAnalyticsCsv("purchasing", suppliers, scope)} onPrint={() => void printReport("purchasing", scope)} />

      <Section title={t("أوامر الشراء", "Purchase orders")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("عدد الأوامر", "Orders")} value={num(data.orders?.count)} />
          <Kpi label={t("القيمة الإجمالية", "Total value")} value={money(data.orders?.total)} />
          <Kpi label={t("أوامر مفتوحة", "Open")} value={num(data.orders?.open)} tone="warn" />
          <Kpi label={t("أوامر مستلمة", "Received")} value={num(data.orders?.received)} tone="good" />
        </div>
      </Section>

      <Section title={t("التوريد", "Receiving")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("عدد الاستلامات", "Receipts")} value={num(data.receipts?.count)} />
          <Kpi label={t("مرحّلة", "Posted")} value={num(data.receipts?.posted)} />
          <Kpi label={t("متأخرة", "Late")} value={num(data.receipts?.late)} tone={Number(data.receipts?.late) > 0 ? "bad" : "good"} />
          <Kpi label={t("التوريد في الموعد", "On-time rate")} value={ratio(data.receipts?.on_time_rate)} />
        </div>
      </Section>

      <Section title={t("فواتير الموردين", "Supplier invoices")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("عدد الفواتير", "Invoices")} value={num(data.invoices?.count)} />
          <Kpi label={t("القيمة", "Total")} value={money(data.invoices?.total)} />
          <Kpi label={t("ضريبة المدخلات", "Input VAT")} value={money(data.invoices?.vat)} />
          <Kpi label={t("غير مسددة", "Unpaid")} value={money(data.invoices?.unpaid)} tone="warn" />
        </div>
      </Section>

      <Section title={t("أكبر الموردين", "Top suppliers")}>
        {suppliers.length === 0 ? <Empty text={t("لا توجد أوامر شراء في هذه الفترة", "No purchase orders in this period")} /> : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("المورد", "Supplier")}</TableHead>
                <TableHead className="text-end">{t("الأوامر", "Orders")}</TableHead>
                <TableHead className="text-end">{t("الإجمالي", "Total")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><Link to="/purchasing/po" className="text-primary hover:underline">{s.name}</Link></TableCell>
                    <TableCell className="text-end tabular-nums">{num(s.orders)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  );
}

