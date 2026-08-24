import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { executiveAnalytics } from "@/lib/analytics.functions";
import { useT } from "@/lib/theme";
import {
  Empty, ErrorState, FilterBar, Kpi, Loading, Section, SetupWarning,
  defaultFilters, exportAnalyticsCsv, money, num, printReport, ratio, useAr,
} from "@/components/app/analytics-ui";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({
    meta: [
      { title: "الملخص التنفيذي · التقارير · AlMugren AI Factory OS" },
      { name: "description", content: "Company-wide executive KPIs computed live from sales, production, inventory, purchasing and finance data." },
      { property: "og:title", content: "الملخص التنفيذي · AlMugren AI Factory OS" },
      { property: "og:description", content: "Live executive KPI overview for the factory." },
    ],
  }),
  component: ExecutiveReport,
});

function ExecutiveReport() {
  const t = useT();
  const ar = useAr();
  const [filters, setFilters] = useState(defaultFilters());
  const fetchData = useServerFn(executiveAnalytics);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["analytics", "executive", filters.from, filters.to],
    queryFn: () => fetchData({ data: { from: filters.from, to: filters.to } }),
  });

  const scope = { from: filters.from, to: filters.to };
  const gaps: string[] = [];
  if (data?.setup_gaps?.no_accounts) gaps.push(t("لم يتم إعداد دليل الحسابات بعد", "Chart of accounts is not configured"));
  if (data?.setup_gaps?.no_items) gaps.push(t("لا توجد أصناف مخزنية مفعّلة", "No active inventory items"));
  if (data?.setup_gaps?.no_vat_number) gaps.push(t("الرقم الضريبي للمنشأة غير مسجل", "Company VAT number is missing"));

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <Empty text={t("لا توجد بيانات", "No data")} />;

  const rows = [
    { kpi: "sales_total", value: data.sales_total },
    { kpi: "orders_count", value: data.orders_count },
    { kpi: "quotes_count", value: data.quotes_count },
    { kpi: "conversion_rate", value: data.conversion_rate },
    { kpi: "invoiced_total", value: data.invoiced_total },
    { kpi: "collections", value: data.collections },
    { kpi: "open_mos", value: data.open_mos },
    { kpi: "late_mos", value: data.late_mos },
    { kpi: "shortage_items", value: data.shortage_items },
    { kpi: "open_pos", value: data.open_pos },
    { kpi: "active_projects", value: data.active_projects },
    { kpi: "open_claims", value: data.open_claims },
  ];

  return (
    <div className="space-y-6">
      <FilterBar
        value={filters}
        onChange={setFilters}
        onRefresh={() => void refetch()}
        generatedAt={data.generated_at}
        onExport={() => void exportAnalyticsCsv("executive", rows, scope)}
        onPrint={() => void printReport("executive", scope)}
      />
      <SetupWarning items={gaps} />
      {isFetching ? <div className="text-xs text-muted-foreground">{t("جارٍ التحديث…", "Refreshing…")}</div> : null}

      <Section title={t("المبيعات والتحصيل", "Sales & collections")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("إجمالي المبيعات (ريال)", "Sales total (SAR)")} value={money(data.sales_total)} />
          <Kpi label={t("عدد أوامر البيع", "Sales orders")} value={num(data.orders_count)} />
          <Kpi label={t("معدل تحويل العروض", "Quote conversion")} value={ratio(data.conversion_rate)} />
          <Kpi label={t("التحصيل (ريال)", "Collections (SAR)")} value={money(data.collections)} />
        </div>
      </Section>

      <Section title={t("العمليات", "Operations")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("أوامر تصنيع مفتوحة", "Open MOs")} value={num(data.open_mos)} />
          <Kpi label={t("أوامر تصنيع متأخرة", "Late MOs")} value={num(data.late_mos)} tone={Number(data.late_mos) > 0 ? "bad" : "good"} />
          <Kpi label={t("أصناف تحت الحد الأدنى", "Shortage items")} value={num(data.shortage_items)} tone={Number(data.shortage_items) > 0 ? "warn" : "good"} />
          <Kpi label={t("أوامر شراء مفتوحة", "Open POs")} value={num(data.open_pos)} />
        </div>
      </Section>

      <Section title={t("المشاريع والخدمة والموظفون", "Projects, service & people")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("مشاريع نشطة", "Active projects")} value={num(data.active_projects)} />
          <Kpi label={t("مطالبات ضمان مفتوحة", "Open warranty claims")} value={num(data.open_claims)} tone={Number(data.open_claims) > 0 ? "warn" : "good"} />
          <Kpi label={t("موظفون نشطون", "Active employees")} value={num(data.active_employees)} />
          <Kpi label={t("قيمة الفواتير الصادرة", "Invoiced total")} value={money(data.invoiced_total)} />
        </div>
      </Section>

      {data.can_view_finance && data.finance ? (
        <Section title={t("النتيجة المالية (قيود مرحّلة فقط)", "Financial result (posted entries only)")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label={t("الإيرادات", "Revenue")} value={money(data.finance.revenue)} tone="good" />
            <Kpi label={t("المصروفات", "Expenses")} value={money(data.finance.expenses)} />
            <Kpi
              label={t("صافي النتيجة", "Net result")}
              value={money(Number(data.finance.revenue ?? 0) - Number(data.finance.expenses ?? 0))}
              tone={Number(data.finance.revenue ?? 0) - Number(data.finance.expenses ?? 0) >= 0 ? "good" : "bad"}
            />
          </div>
        </Section>
      ) : (
        <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
          {t("البيانات المالية مخفية حسب صلاحيتك", "Financial data hidden by your permissions")}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs print:hidden">
        <Link to="/reports/sales" className="rounded-lg border px-3 py-1.5 hover:bg-muted">{t("تفصيل المبيعات", "Sales detail")}</Link>
        <Link to="/reports/manufacturing" className="rounded-lg border px-3 py-1.5 hover:bg-muted">{t("تفصيل التصنيع", "Manufacturing detail")}</Link>
        <Link to="/reports/inventory" className="rounded-lg border px-3 py-1.5 hover:bg-muted">{t("تفصيل المخزون", "Inventory detail")}</Link>
      </div>
    </div>
  );
}

