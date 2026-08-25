import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { projectsAnalytics, analyticsContext } from "@/lib/analytics.functions";
import { useT } from "@/lib/theme";
import { Empty, ErrorState, FilterBar, Kpi, Loading, Section, defaultFilters, exportAnalyticsCsv, num, printReport } from "@/components/app/analytics-ui";

export const Route = createFileRoute("/_authenticated/reports/projects")({
  head: () => ({
    meta: [
      { title: "تحليلات المشاريع والتركيب · التقارير · AlMugren AI Factory OS" },
      { name: "description", content: "Project status, installation progress, deliveries, snags, warranties and service claims." },
      { property: "og:title", content: "تحليلات المشاريع والتركيب · AlMugren AI Factory OS" },
      { property: "og:description", content: "Projects, installation and after-sales KPIs." },
    ],
  }),
  component: ProjectsReport,
});

function ProjectsReport() {
  const t = useT();
  const [filters, setFilters] = useState(defaultFilters());
  const fetchData = useServerFn(projectsAnalytics);
  const fetchCtx = useServerFn(analyticsContext);
  const { data: ctx } = useQuery({ queryKey: ["analytics", "ctx"], queryFn: () => fetchCtx({}) });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", "projects", filters],
    queryFn: () => fetchData({ data: { from: filters.from, to: filters.to, projectId: filters.projectId || null } }),
  });
  const scope = { from: filters.from, to: filters.to, projectId: filters.projectId ?? null };

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <Empty text={t("لا توجد بيانات", "No data")} />;
  const byStatus = Object.entries((data.by_status ?? {}) as Record<string, number>);

  return (
    <div className="space-y-6">
      <FilterBar value={filters} onChange={setFilters} onRefresh={() => void refetch()} generatedAt={data.generated_at}
        onExport={() => void exportAnalyticsCsv("projects", byStatus.map(([status, count]) => ({ status, count })), scope)}
        onPrint={() => void printReport("projects", scope)}
        extra={
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("المشروع", "Project")}</Label>
            <select className="h-9 w-60 rounded-md border bg-background px-2 text-sm" value={filters.projectId ?? ""}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value || undefined })}>
              <option value="">{t("كل المشاريع", "All projects")}</option>
              {(ctx?.projects ?? []).map((p: any) => (<option key={p.id} value={p.id}>{p.project_number} — {p.name_ar}</option>))}
            </select>
          </div>
        } />

      <Section title={t("المشاريع", "Projects")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("عدد المشاريع", "Projects")} value={num(data.totals?.count)} />
          <Kpi label={t("نشطة", "Active")} value={num(data.totals?.active)} />
          <Kpi label={t("سُلّمت في موعدها", "On time")} value={num(data.totals?.on_time)} tone="good" />
          <Kpi label={t("متأخرة", "Delayed")} value={num(data.totals?.delayed)} tone={Number(data.totals?.delayed) > 0 ? "bad" : "good"} />
        </div>
      </Section>

      <Section title={t("التركيب والتسليم", "Installation & delivery")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("أوامر تركيب", "Installation orders")} value={num(data.installations?.count)} />
          <Kpi label={t("قيد التنفيذ", "In progress")} value={num(data.installations?.in_progress)} />
          <Kpi label={t("محاضر تسليم", "Delivery notes")} value={num(data.deliveries?.count)} />
          <Kpi label={t("ملاحظات مفتوحة", "Open snags")} value={num(data.snags?.open)} tone={Number(data.snags?.open) > 0 ? "warn" : "good"} />
        </div>
      </Section>

      <Section title={t("الضمان وخدمة ما بعد البيع", "Warranty & service")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("ضمانات سارية", "Active warranties")} value={num(data.warranties?.active)} />
          <Kpi label={t("مطالبات مفتوحة", "Open claims")} value={num(data.claims?.open)} tone={Number(data.claims?.open) > 0 ? "warn" : "good"} />
          <Kpi label={t("تجاوزت SLA", "SLA breached")} value={num(data.claims?.breached_sla)} tone={Number(data.claims?.breached_sla) > 0 ? "bad" : "good"} />
          <Kpi label={t("متوسط الإغلاق (ساعة)", "Avg resolution (h)")} value={data.claims?.avg_resolution_hours == null ? "—" : num(data.claims.avg_resolution_hours, 1)} />
        </div>
      </Section>

      <Section title={t("الحالات", "Status distribution")}>
        {byStatus.length === 0 ? <Empty text={t("لا توجد مشاريع", "No projects")} /> : (
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {byStatus.map(([s, n]) => (<Kpi key={s} label={s} value={num(n)} />))}
          </div>
        )}
      </Section>
    </div>
  );
}

