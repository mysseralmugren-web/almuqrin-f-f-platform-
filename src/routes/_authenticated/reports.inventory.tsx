import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inventoryAnalytics } from "@/lib/analytics.functions";
import { useT } from "@/lib/theme";
import {
  Empty, ErrorState, FilterBar, Kpi, Loading, Section,
  defaultFilters, exportAnalyticsCsv, money, num, printReport,
} from "@/components/app/analytics-ui";

export const Route = createFileRoute("/_authenticated/reports/inventory")({
  head: () => ({
    meta: [
      { title: "تحليلات المخزون · التقارير · AlMugren AI Factory OS" },
      { name: "description", content: "Stock value, shortages below minimum, material consumption and top consumed items." },
      { property: "og:title", content: "تحليلات المخزون · AlMugren AI Factory OS" },
      { property: "og:description", content: "Inventory KPIs with item drill-down." },
    ],
  }),
  component: InventoryReport,
});

function InventoryReport() {
  const t = useT();
  const [filters, setFilters] = useState(defaultFilters());
  const fetchData = useServerFn(inventoryAnalytics);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics", "inventory", filters.from, filters.to],
    queryFn: () => fetchData({ data: { from: filters.from, to: filters.to } }),
  });
  const scope = { from: filters.from, to: filters.to };

  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data) return <Empty text={t("لا توجد بيانات", "No data")} />;

  const shortages = (data.shortages ?? []) as Array<Record<string, any>>;
  const topConsumed = (data.top_consumed ?? []) as Array<Record<string, any>>;
  const exportRows = shortages.map((s) => ({ sku: s.sku, name: s.name, on_hand: s.on_hand, min_qty: s.min_qty, gap: s.gap }));

  return (
    <div className="space-y-6">
      <FilterBar
        value={filters}
        onChange={setFilters}
        onRefresh={() => void refetch()}
        generatedAt={data.generated_at}
        onExport={() => void exportAnalyticsCsv("inventory-shortages", exportRows, scope)}
        onPrint={() => void printReport("inventory", scope)}
      />

      <Section title={t("الأرصدة", "Balances")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("عدد الأصناف", "Items in stock")} value={num(data.stock?.items)} />
          <Kpi label={t("إجمالي الكميات", "Total quantity")} value={num(data.stock?.quantity, 2)} />
          <Kpi label={t("الكميات المحجوزة", "Reserved")} value={num(data.stock?.reserved, 2)} />
          <Kpi
            label={t("قيمة المخزون", "Stock value")}
            value={data.can_view_costs ? money(data.stock?.value) : t("محجوب", "Restricted")}
          />
        </div>
      </Section>

      <Section title={t("الحركة خلال الفترة", "Movements in period")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={t("مستلم", "Received")} value={num(data.consumption?.received_qty, 2)} />
          <Kpi label={t("مصروف للتصنيع", "Issued to production")} value={num(data.consumption?.issued_qty, 2)} />
          <Kpi label={t("مرتجع من التصنيع", "Returned")} value={num(data.consumption?.returned_qty, 2)} />
          <Kpi
            label={t("تكلفة المواد المصروفة", "Issued material cost")}
            value={data.can_view_costs ? money(data.consumption?.issued_cost) : t("محجوب", "Restricted")}
          />
        </div>
      </Section>

      <Section title={t("أصناف تحت الحد الأدنى", "Items below minimum")}>
        {shortages.length === 0 ? (
          <Empty text={t("لا توجد نواقص", "No shortages")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرمز", "SKU")}</TableHead>
                  <TableHead>{t("الصنف", "Item")}</TableHead>
                  <TableHead className="text-end">{t("الرصيد", "On hand")}</TableHead>
                  <TableHead className="text-end">{t("الحد الأدنى", "Minimum")}</TableHead>
                  <TableHead className="text-end">{t("النقص", "Gap")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortages.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell><Link to="/wms" className="text-primary hover:underline">{i.sku}</Link></TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell className="text-end tabular-nums">{num(i.on_hand, 2)}</TableCell>
                    <TableCell className="text-end tabular-nums">{num(i.min_qty, 2)}</TableCell>
                    <TableCell className="text-end tabular-nums text-destructive">{num(i.gap, 2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section title={t("أكثر الأصناف استهلاكًا", "Top consumed items")}>
        {topConsumed.length === 0 ? (
          <Empty text={t("لا يوجد استهلاك في هذه الفترة", "No consumption in this period")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرمز", "SKU")}</TableHead>
                  <TableHead>{t("الصنف", "Item")}</TableHead>
                  <TableHead className="text-end">{t("الكمية", "Qty")}</TableHead>
                  {data.can_view_costs ? <TableHead className="text-end">{t("التكلفة", "Cost")}</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {topConsumed.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.sku}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell className="text-end tabular-nums">{num(i.qty, 2)}</TableCell>
                    {data.can_view_costs ? <TableCell className="text-end tabular-nums">{money(i.cost)}</TableCell> : null}
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

