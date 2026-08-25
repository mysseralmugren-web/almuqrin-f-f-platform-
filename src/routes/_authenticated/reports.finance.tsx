import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { financeAnalytics } from "@/lib/analytics.functions";
import { useT } from "@/lib/theme";
import { Empty, ErrorState, FilterBar, Kpi, Loading, Section, SetupWarning, defaultFilters, exportAnalyticsCsv, money, num, printReport } from "@/components/app/analytics-ui";

export const Route = createFileRoute("/_authenticated/reports/finance")({
  head: () => ({
    meta: [
      { title: "التحليلات المالية · التقارير · AlMugren AI Factory OS" },
      { name: "description", content: "Revenue, expenses, VAT position, receivables, payables and production cost from posted entries." },
      { property: "og:title", content: "التحليلات المالية · AlMugren AI Factory OS" },
      { property: "og:description", content: "Finance KPIs restricted to authorised roles." },
    ],
  }),
  component: FinanceReport,
});

function FinanceReport() {
  const t = useT();
  const [filters, setFilters] = useState(defaultFilters());
  const fetchData = useServerFn(financeAnalytics);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", "finance", filters.from, filters.to],
    queryFn: () => fetchData({ data: { from: filters.from, to: filters.to } }),
    retry: false,
  });
  const scope = { from: filters.from, to: filters.to };

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <Empty text={t("لا توجد بيانات", "No data")} />;

  const netVat = Number(data.vat?.output ?? 0) - Number(data.vat?.input ?? 0);
  const cost = Number(data.cost_of_production?.material ?? 0) + Number(data.cost_of_production?.labor ?? 0);
  const gaps: string[] = [];
  if (Number(data.accounts_configured) === 0) gaps.push(t("دليل الحسابات غير معد — التقارير المحاسبية ستظهر صفرية", "Chart of accounts is empty — accounting figures will be zero"));
  if (Number(data.unposted_entries) > 0) gaps.push(t(`يوجد ${data.unposted_entries} قيد غير مرحّل خارج الحساب`, `${data.unposted_entries} unposted entries excluded`));

  const rows = [
    { kpi: "revenue", value: data.pnl?.revenue },
    { kpi: "expenses", value: data.pnl?.expenses },
    { kpi: "net", value: data.pnl?.net },
    { kpi: "output_vat", value: data.vat?.output },
    { kpi: "input_vat", value: data.vat?.input },
    { kpi: "net_vat", value: netVat },
  ];

  return (
    <div className="space-y-6">
      <FilterBar value={filters} onChange={setFilters} onRefresh={() => void refetch()} generatedAt={data.generated_at}
        onExport={() => void exportAnalyticsCsv("finance", rows, scope)} onPrint={() => void printReport("finance", scope)} />
      <SetupWarning items={gaps} />

      <Section title={t("النتيجة (قيود مرحّلة فقط)", "Result (posted entries only)")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi label={t("الإيرادات", "Revenue")} value={money(data.pnl?.revenue)} tone="good" />
          <Kpi label={t("المصروفات", "Expenses")} value={money(data.pnl?.expenses)} />
          <Kpi label={t("صافي النتيجة", "Net result")} value={money(data.pnl?.net)} tone={Number(data.pnl?.net ?? 0) >= 0 ? "good" : "bad"} />
        </div>
      </Section>

      <Section title={t("ضريبة القيمة المضافة", "VAT position")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi label={t("ضريبة المخرجات", "Output VAT")} value={money(data.vat?.output)} />
          <Kpi label={t("ضريبة المدخلات", "Input VAT")} value={money(data.vat?.input)} />
          <Kpi label={t("الصافي المستحق", "Net VAT")} value={money(netVat)} tone={netVat >= 0 ? "warn" : "good"} />
        </div>
      </Section>

      <Section title={t("السيولة والذمم", "Cash & balances")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("التحصيل", "Cash in")} value={money(data.cash_in)} tone="good" />
          <Kpi label={t("فواتير عملاء مفتوحة", "Open receivables")} value={money(data.receivables?.open_invoices)} tone="warn" />
          <Kpi label={t("دفعات متأخرة", "Overdue instalments")} value={money(data.receivables?.overdue_schedules)} tone="bad" />
          <Kpi label={t("مستحقات الموردين", "Payables")} value={money(data.payables)} />
        </div>
      </Section>

      <Section title={t("التكلفة والانحراف", "Cost & variance")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("تكلفة المواد", "Material cost")} value={money(data.cost_of_production?.material)} />
          <Kpi label={t("تكلفة العمالة", "Labour cost")} value={money(data.cost_of_production?.labor)} />
          <Kpi label={t("إجمالي تكلفة الإنتاج", "Total production cost")} value={money(cost)} />
          <Kpi label={t("قيود غير مرحّلة", "Unposted entries")} value={num(data.unposted_entries)} tone={Number(data.unposted_entries) > 0 ? "warn" : "good"} />
        </div>
      </Section>
    </div>
  );
}

