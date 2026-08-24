import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { manufacturingAnalytics } from "@/lib/analytics.functions";
import { MFG_STATUS_AR, MFG_STATUS_EN, type MfgStatus } from "@/lib/mes-constants";
import { useT } from "@/lib/theme";
import {
  Empty, ErrorState, FilterBar, Kpi, Loading, Section,
  defaultFilters, exportAnalyticsCsv, money, num, printReport, ratio,
} from "@/components/app/analytics-ui";

export const Route = createFileRoute("/_authenticated/reports/manufacturing")({
  head: () => ({
    meta: [
      { title: "تحليلات التصنيع · التقارير · AlMugren AI Factory OS" },
      { name: "description", content: "Manufacturing order status, lead time, stage bottlenecks, quality pass rate and labour effort." },
      { property: "og:title", content: "تحليلات التصنيع · AlMugren AI Factory OS" },
      { property: "og:description", content: "MES KPIs with drill-down to manufacturing orders." },
    ],
  }),
  component: MfgReport,
});

function MfgReport() {
  const t = useT();
  const [filters, setFilters] = useState(defaultFilters());
  const fetchData = useServerFn(manufacturingAnalytics);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", "mfg", filters.from, filters.to],
    queryFn: () => fetchData({ data: { from: filters.from, to: filters.to } }),
  });
  const scope = { from: filters.from, to: filters.to };

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <Empty text={t("لا توجد بيانات", "No data")} />;

  const byStatus = Object.entries((data.by_status ?? {}) as Record<string, number>);
  const late = (data.late ?? []) as Array<{ id: string; number: string; status: string; planned_end: string; days_late: number }>;
  const stages = (data.stages ?? []) as Array<Record<string, any>>;

  return (
    <div className="space-y-6">
      <FilterBar
        value={filters}
        onChange={setFilters}
        onRefresh={() => void refetch()}
        generatedAt={data.generated_at}
        onExport={() => void exportAnalyticsCsv("manufacturing", stages, scope)}
        onPrint={() => void printReport("manufacturing", scope)}
      />

      <Section title={t("أوامر التصنيع", "Manufacturing orders")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("عدد الأوامر", "Orders")} value={num(data.totals?.count)} />
          <Kpi label={t("الكمية", "Quantity")} value={num(data.totals?.quantity, 2)} />
          <Kpi label={t("مكتملة", "Completed")} value={num(data.totals?.completed)} tone="good" />
          <Kpi label={t("متوسط زمن الدورة (يوم)", "Avg lead time (days)")} value={data.totals?.avg_lead_days == null ? "—" : num(data.totals.avg_lead_days, 2)} />
        </div>
      </Section>

      <Section title={t("الحالات", "Status distribution")}>
        {byStatus.length === 0 ? (
          <Empty text={t("لا توجد أوامر في هذه الفترة", "No orders in this period")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {byStatus.map(([s, n]) => (
              <Kpi key={s} label={t(MFG_STATUS_AR[s as MfgStatus] ?? s, MFG_STATUS_EN[s as MfgStatus] ?? s)} value={num(n)} />
            ))}
          </div>
        )}
      </Section>

      <Section title={t("الجودة والعمالة", "Quality & labour")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("فحوص الجودة", "QC inspections")} value={num(data.quality?.total)} />
          <Kpi label={t("نسبة الاجتياز", "Pass rate")} value={ratio(data.quality?.pass_rate)} tone={Number(data.quality?.pass_rate ?? 0) >= 90 ? "good" : "warn"} />
          <Kpi label={t("إعادة عمل", "Rework")} value={num(data.quality?.rework)} tone={Number(data.quality?.rework) > 0 ? "warn" : "default"} />
          <Kpi
            label={data.can_view_costs ? t("ساعات / تكلفة العمالة", "Labour hours / cost") : t("ساعات العمالة", "Labour hours")}
            value={data.can_view_costs ? `${num(data.labor?.hours, 1)} · ${money(data.labor?.cost)}` : num(data.labor?.hours, 1)}
          />
        </div>
      </Section>

      <Section title={t("مراحل الإنتاج", "Production stages")}>
        {stages.length === 0 ? (
          <Empty text={t("لا توجد مراحل مسجلة", "No stages recorded")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("المرحلة", "Stage")}</TableHead>
                  <TableHead className="text-end">{t("بانتظار", "Pending")}</TableHead>
                  <TableHead className="text-end">{t("قيد التنفيذ", "In progress")}</TableHead>
                  <TableHead className="text-end">{t("مكتملة", "Passed")}</TableHead>
                  <TableHead className="text-end">{t("متعثرة", "Failed")}</TableHead>
                  <TableHead className="text-end">{t("متوسط الإنجاز", "Avg progress")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((s) => (
                  <TableRow key={s.code}>
                    <TableCell>{s.name ?? s.code}</TableCell>
                    <TableCell className="text-end tabular-nums">{num(s.pending)}</TableCell>
                    <TableCell className="text-end tabular-nums">{num(s.in_progress)}</TableCell>
                    <TableCell className="text-end tabular-nums">{num(s.passed)}</TableCell>
                    <TableCell className="text-end tabular-nums">{num(s.failed)}</TableCell>
                    <TableCell className="text-end tabular-nums">{ratio(s.avg_progress)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section title={t("أوامر متأخرة", "Late orders")}>
        {late.length === 0 ? (
          <Empty text={t("لا توجد أوامر متأخرة", "No late orders")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم الأمر", "MO #")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead>{t("النهاية المخططة", "Planned end")}</TableHead>
                  <TableHead className="text-end">{t("أيام التأخير", "Days late")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {late.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link to="/mes/$id" params={{ id: m.id }} className="text-primary hover:underline">{m.number}</Link>
                    </TableCell>
                    <TableCell>{t(MFG_STATUS_AR[m.status as MfgStatus] ?? m.status, MFG_STATUS_EN[m.status as MfgStatus] ?? m.status)}</TableCell>
                    <TableCell className="text-sm">{m.planned_end}</TableCell>
                    <TableCell className="text-end tabular-nums text-destructive">{num(m.days_late)}</TableCell>
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

