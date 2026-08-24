import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { salesAnalytics, analyticsContext } from "@/lib/analytics.functions";
import { useT } from "@/lib/theme";
import {
  Empty, ErrorState, FilterBar, Kpi, Loading, Section,
  defaultFilters, exportAnalyticsCsv, money, num, printReport, ratio,
} from "@/components/app/analytics-ui";

export const Route = createFileRoute("/_authenticated/reports/sales")({
  head: () => ({
    meta: [
      { title: "تحليلات المبيعات · التقارير · AlMugren AI Factory OS" },
      { name: "description", content: "Quotation conversion, sales orders, invoicing, collections and overdue receivables." },
      { property: "og:title", content: "تحليلات المبيعات · AlMugren AI Factory OS" },
      { property: "og:description", content: "Sales KPIs with customer drill-down." },
    ],
  }),
  component: SalesReport,
});

function SalesReport() {
  const t = useT();
  const [filters, setFilters] = useState(defaultFilters());
  const fetchData = useServerFn(salesAnalytics);
  const fetchCtx = useServerFn(analyticsContext);
  const { data: ctx } = useQuery({ queryKey: ["analytics", "ctx"], queryFn: () => fetchCtx({}) });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", "sales", filters],
    queryFn: () => fetchData({ data: { from: filters.from, to: filters.to, customerId: filters.customerId || null } }),
  });

  const scope = { from: filters.from, to: filters.to, customerId: filters.customerId ?? null };

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <Empty text={t("لا توجد بيانات", "No data")} />;

  const monthly = (data.monthly ?? []) as Array<{ month: string; orders: number; total: number }>;
  const top = (data.top_customers ?? []) as Array<{ id: string; name: string; orders: number; total: number }>;
  const pipeline = (data.pipeline ?? []) as Array<{ id: string; number: string; customer: string; total: number; valid_until: string; status: string }>;

  return (
    <div className="space-y-6">
      <FilterBar
        value={filters}
        onChange={setFilters}
        onRefresh={() => void refetch()}
        generatedAt={data.generated_at}
        onExport={() => void exportAnalyticsCsv("sales", top.length ? top : monthly, scope)}
        onPrint={() => void printReport("sales", scope)}
        extra={
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("العميل", "Customer")}</Label>
            <select
              className="h-9 w-56 rounded-md border bg-background px-2 text-sm"
              value={filters.customerId ?? ""}
              onChange={(e) => setFilters({ ...filters, customerId: e.target.value || undefined })}
            >
              <option value="">{t("كل العملاء", "All customers")}</option>
              {(ctx?.customers ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </select>
          </div>
        }
      />

      <Section title={t("عروض الأسعار والتحويل", "Quotations & conversion")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("عدد العروض", "Quotations")} value={num(data.quotes?.count)} />
          <Kpi label={t("قيمة العروض", "Quoted value")} value={money(data.quotes?.total)} />
          <Kpi label={t("العروض المقبولة", "Accepted")} value={num(data.quotes?.accepted)} hint={money(data.quotes?.accepted_total)} tone="good" />
          <Kpi label={t("معدل التحويل", "Conversion rate")} value={ratio(data.quotes?.conversion_rate)} />
        </div>
      </Section>

      <Section title={t("أوامر البيع والفوترة", "Orders & invoicing")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("أوامر البيع", "Sales orders")} value={num(data.orders?.count)} hint={money(data.orders?.total)} />
          <Kpi label={t("متوسط قيمة الأمر", "Average order value")} value={money(data.orders?.avg_value)} />
          <Kpi label={t("قيمة الفواتير", "Invoiced")} value={money(data.invoices?.total)} hint={t("ضريبة: ", "VAT: ") + money(data.invoices?.vat)} />
          <Kpi label={t("فواتير غير مسددة", "Open invoices")} value={money(data.invoices?.open_total)} tone="warn" />
        </div>
      </Section>

      <Section title={t("التحصيل والمتأخرات", "Collections & overdue")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi label={t("التحصيل خلال الفترة", "Collected")} value={money(data.collections)} tone="good" />
          <Kpi label={t("دفعات متأخرة", "Overdue instalments")} value={num(data.overdue?.count)} tone={Number(data.overdue?.count) > 0 ? "bad" : "good"} />
          <Kpi label={t("قيمة المتأخرات", "Overdue amount")} value={money(data.overdue?.amount)} tone={Number(data.overdue?.amount) > 0 ? "bad" : "good"} />
        </div>
      </Section>

      {monthly.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 text-sm font-semibold">{t("المبيعات شهريًا", "Monthly sales")}</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Section title={t("أفضل العملاء", "Top customers")}>
        {top.length === 0 ? (
          <Empty text={t("لا توجد أوامر بيع في هذه الفترة", "No sales orders in this period")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("العميل", "Customer")}</TableHead>
                  <TableHead className="text-end">{t("الأوامر", "Orders")}</TableHead>
                  <TableHead className="text-end">{t("الإجمالي", "Total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to="/customers" className="text-primary hover:underline">{c.name}</Link>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{num(c.orders)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section title={t("عروض قيد المتابعة", "Pipeline (sent quotations)")}>
        {pipeline.length === 0 ? (
          <Empty text={t("لا توجد عروض مرسلة", "No sent quotations")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم العرض", "Quote #")}</TableHead>
                  <TableHead>{t("العميل", "Customer")}</TableHead>
                  <TableHead className="text-end">{t("القيمة", "Value")}</TableHead>
                  <TableHead>{t("صالح حتى", "Valid until")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipeline.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link to="/quotations" className="text-primary hover:underline">{q.number}</Link>
                    </TableCell>
                    <TableCell>{q.customer ?? "—"}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(q.total)}</TableCell>
                    <TableCell className="text-sm">{q.valid_until ?? "—"}</TableCell>
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

