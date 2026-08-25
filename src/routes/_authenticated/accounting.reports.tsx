import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trialBalance, incomeStatement, balanceSheet, cashFlowDirect, arAging, apAging } from "@/lib/accounting.functions";
import { EmptyState } from "@/components/app/purchasing-ui";
import { exportCsv, money, monthStartISO, todayISO } from "@/components/app/accounting-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/accounting/reports")({
  head: () => ({
    meta: [
      { title: "التقارير المالية · AlMugren AI Factory OS" },
      { name: "description", content: "Trial balance, income statement, balance sheet, cash flow and AR/AP aging." },
      { property: "og:title", content: "التقارير المالية · AlMugren AI Factory OS" },
      { property: "og:description", content: "Financial statements and aging reports with CSV export." },
    ],
  }),
  component: ReportsPage,
});

const REPORTS = [
  { key: "trial", ar: "ميزان المراجعة", en: "Trial balance" },
  { key: "income", ar: "قائمة الدخل", en: "Income statement" },
  { key: "balance", ar: "المركز المالي", en: "Balance sheet" },
  { key: "cash", ar: "التدفق النقدي", en: "Cash flow" },
  { key: "ar", ar: "أعمار ديون العملاء", en: "AR aging" },
  { key: "ap", ar: "أعمار ديون الموردين", en: "AP aging" },
] as const;

function ReportsPage() {
  const t = useT();
  const [tab, setTab] = useState<(typeof REPORTS)[number]["key"]>("trial");
  const [range, setRange] = useState({ from: monthStartISO(), to: todayISO() });

  const fns = {
    trial: useServerFn(trialBalance),
    income: useServerFn(incomeStatement),
    balance: useServerFn(balanceSheet),
    cash: useServerFn(cashFlowDirect),
    ar: useServerFn(arAging),
    ap: useServerFn(apAging),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["report", tab, range],
    queryFn: () => (fns[tab] as any)({ data: range }),
  });

  const rows: any[] = Array.isArray(data)
    ? (data as any[])
    : data
      ? [...((data as any).lines ?? (data as any).rows ?? [])]
      : [];

  const summary: Array<[string, number]> =
    data && !Array.isArray(data)
      ? Object.entries(data as Record<string, unknown>).filter(([, v]) => typeof v === "number") as Array<[string, number]>
      : [];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" />{t("التقارير المالية", "Financial reports")}</CardTitle>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5"><Label className="text-xs">{t("من", "From")}</Label><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">{t("إلى", "To")}</Label><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
          <Button variant="outline" size="sm" disabled={rows.length === 0} onClick={() => exportCsv(`${tab}.csv`, rows)}><Download className="h-4 w-4" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />{t("طباعة", "Print")}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {REPORTS.map((r) => (
            <button key={r.key} onClick={() => setTab(r.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === r.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
              {t(r.ar, r.en)}
            </button>
          ))}
        </div>

        {summary.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary.map(([k, v]) => (
              <div key={k} className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="mt-1 text-lg font-bold tabular-nums">{money(v)}</div>
              </div>
            ))}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState icon={<BarChart3 className="h-6 w-6" />} title={isLoading ? t("جارٍ التحميل…", "Loading…") : t("لا توجد بيانات في هذه الفترة", "No data for this period")} hint={t("التقارير تُبنى من القيود المرحّلة فقط", "Reports are built from posted entries only")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{Object.keys(rows[0]).filter((k) => k !== "id").map((k) => (<TableHead key={k}>{k}</TableHead>))}</TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.id ?? i}>
                    {Object.keys(rows[0]).filter((k) => k !== "id").map((k) => (
                      <TableCell key={k} className={typeof r[k] === "number" ? "text-end tabular-nums" : "text-sm"}>
                        {typeof r[k] === "number" ? money(r[k]) : String(r[k] ?? "—")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

