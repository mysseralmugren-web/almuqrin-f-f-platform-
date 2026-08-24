import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hrAnalytics, analyticsContext } from "@/lib/analytics.functions";
import { useT } from "@/lib/theme";
import { Empty, ErrorState, FilterBar, Kpi, Loading, Section, defaultFilters, exportAnalyticsCsv, money, num, printReport, ratio } from "@/components/app/analytics-ui";

export const Route = createFileRoute("/_authenticated/reports/hr")({
  head: () => ({
    meta: [
      { title: "تحليلات الموارد البشرية · التقارير · AlMugren AI Factory OS" },
      { name: "description", content: "Headcount, attendance rate, overtime, leaves and approved payroll totals." },
      { property: "og:title", content: "تحليلات الموارد البشرية · AlMugren AI Factory OS" },
      { property: "og:description", content: "HR KPIs restricted to HR and management roles." },
    ],
  }),
  component: HrReport,
});

function HrReport() {
  const t = useT();
  const [filters, setFilters] = useState(defaultFilters());
  const fetchData = useServerFn(hrAnalytics);
  const fetchCtx = useServerFn(analyticsContext);
  const { data: ctx } = useQuery({ queryKey: ["analytics", "ctx"], queryFn: () => fetchCtx({}) });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", "hr", filters],
    queryFn: () => fetchData({ data: { from: filters.from, to: filters.to, departmentId: filters.departmentId || null } }),
    retry: false,
  });
  const scope = { from: filters.from, to: filters.to, departmentId: filters.departmentId ?? null };

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <Empty text={t("لا توجد بيانات", "No data")} />;
  const depts = (data.by_department ?? []) as Array<Record<string, any>>;

  return (
    <div className="space-y-6">
      <FilterBar value={filters} onChange={setFilters} onRefresh={() => void refetch()} generatedAt={data.generated_at}
        onExport={() => void exportAnalyticsCsv("hr-departments", depts.map((d) => ({ department: d.name, headcount: d.count })), scope)}
        onPrint={() => void printReport("hr", scope)}
        extra={
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("القسم", "Department")}</Label>
            <select className="h-9 w-52 rounded-md border bg-background px-2 text-sm" value={filters.departmentId ?? ""}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value || undefined })}>
              <option value="">{t("كل الأقسام", "All departments")}</option>
              {(ctx?.departments ?? []).map((d: any) => (<option key={d.id} value={d.id}>{d.name_ar}</option>))}
            </select>
          </div>
        } />

      <Section title={t("القوى العاملة والحضور", "Workforce & attendance")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("موظفون نشطون", "Active employees")} value={num(data.headcount?.active)} />
          <Kpi label={t("نسبة الحضور", "Attendance rate")} value={ratio(data.attendance?.attendance_rate)} tone={Number(data.attendance?.attendance_rate ?? 0) >= 90 ? "good" : "warn"} />
          <Kpi label={t("ساعات العمل", "Worked hours")} value={num(data.attendance?.worked_hours, 1)} />
          <Kpi label={t("ساعات إضافية", "Overtime hours")} value={num(data.attendance?.overtime_hours, 1)} />
        </div>
      </Section>

      <Section title={t("الغياب والإجازات", "Absence & leaves")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("أيام غياب", "Absent records")} value={num(data.attendance?.absent)} tone={Number(data.attendance?.absent) > 0 ? "warn" : "good"} />
          <Kpi label={t("تأخير", "Late records")} value={num(data.attendance?.late)} />
          <Kpi label={t("طلبات إجازة", "Leave requests")} value={num(data.leaves?.requests)} />
          <Kpi label={t("قيد الموافقة", "Pending approval")} value={num(data.leaves?.pending)} tone="warn" />
        </div>
      </Section>

      <Section title={t("الرواتب (مسيّرات معتمدة/مدفوعة)", "Payroll (approved/paid runs)")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("عدد المسيّرات", "Runs")} value={num(data.payroll?.runs)} />
          <Kpi label={t("إجمالي الأجور", "Gross")} value={money(data.payroll?.gross)} />
          <Kpi label={t("صافي المدفوع", "Net")} value={money(data.payroll?.net)} />
          <Kpi label={t("التأمينات (حصة المنشأة)", "GOSI employer")} value={money(data.payroll?.gosi_employer)} />
        </div>
      </Section>

      <Section title={t("التوزيع حسب القسم", "Headcount by department")}>
        {depts.length === 0 ? <Empty text={t("لا توجد أقسام", "No departments")} /> : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("القسم", "Department")}</TableHead>
                <TableHead className="text-end">{t("عدد الموظفين", "Employees")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {depts.map((d) => (
                  <TableRow key={d.id}><TableCell>{d.name}</TableCell><TableCell className="text-end tabular-nums">{num(d.count)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  );
}

