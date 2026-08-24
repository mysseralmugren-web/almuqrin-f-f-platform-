import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT, useTheme } from "@/lib/theme";
import { AI_JOB_KIND, labelOf } from "@/lib/ai-constants";
import { AiChip, AiLoading, money } from "@/components/app/ai-ui";
import { getAiUsageReport } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant/usage")({
  head: () => ({
    meta: [
      { title: "تقارير استخدام الموظف الذكي · AlMugren AI Factory OS" },
      { name: "description", content: "Success rate, processing time, cost and field acceptance rate for AI analysis runs." },
    ],
  }),
  component: UsagePage,
});

function UsagePage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fetchReport = useServerFn(getAiUsageReport);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useQuery({ queryKey: ["ai-usage", from, to], queryFn: () => fetchReport({ data: { from: from || null, to: to || null } }) });

  const kpis = [
    { ar: "عدد التشغيلات", en: "Total runs", value: q.data?.total_runs ?? 0 },
    { ar: "نسبة النجاح", en: "Success rate", value: `${q.data?.success_rate ?? 0}%` },
    { ar: "متوسط الزمن", en: "Avg duration", value: `${Math.round((q.data?.avg_duration_ms ?? 0) / 100) / 10}s` },
    { ar: "التكلفة (دولار)", en: "Cost (USD)", value: money(q.data?.total_cost_usd) },
    { ar: "نسبة قبول الحقول", en: "Field acceptance", value: `${q.data?.acceptance_rate ?? 0}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>{t("من", "From")}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>{t("إلى", "To")}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {q.isLoading ? (
        <AiLoading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((k) => (
              <Card key={k.en} className="shadow-card">
                <CardContent className="py-4">
                  <div className="text-xs text-muted-foreground">{t(k.ar, k.en)}</div>
                  <div className="mt-1 text-2xl font-bold" dir="ltr">{k.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("حسب نوع التحليل", "By analysis kind")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("النوع", "Kind")}</TableHead>
                    <TableHead>{t("التشغيلات", "Runs")}</TableHead>
                    <TableHead>{t("الإخفاقات", "Failures")}</TableHead>
                    <TableHead>{t("التكلفة", "Cost")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(q.data?.by_kind ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{t("لا توجد بيانات", "No data")}</TableCell></TableRow>
                  )}
                  {(q.data?.by_kind ?? []).map((r: any) => (
                    <TableRow key={r.kind}>
                      <TableCell>{labelOf(AI_JOB_KIND, r.kind, ar)}</TableCell>
                      <TableCell dir="ltr">{r.runs}</TableCell>
                      <TableCell dir="ltr">{r.failed}</TableCell>
                      <TableCell dir="ltr">{money(r.cost_usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base">{t("آخر العمليات", "Recent runs")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("النوع", "Kind")}</TableHead>
                    <TableHead>{t("النموذج", "Model")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                    <TableHead>{t("المدة", "Duration")}</TableHead>
                    <TableHead>{t("التكلفة", "Cost")}</TableHead>
                    <TableHead>{t("التاريخ", "Date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(q.data?.recent ?? []).map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell>{labelOf(AI_JOB_KIND, u.kind, ar)}</TableCell>
                      <TableCell dir="ltr" className="text-xs">{u.model}</TableCell>
                      <TableCell><AiChip value={u.status} label={u.status} /></TableCell>
                      <TableCell dir="ltr">{Math.round(Number(u.duration_ms ?? 0) / 100) / 10}s</TableCell>
                      <TableCell dir="ltr">{money(u.cost_usd)}</TableCell>
                      <TableCell dir="ltr" className="text-xs">{new Date(u.created_at).toLocaleString("en-GB")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

