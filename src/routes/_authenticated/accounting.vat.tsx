import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Percent, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { vatReturn } from "@/lib/accounting.functions";
import { EmptyState } from "@/components/app/purchasing-ui";
import { exportCsv, money, monthStartISO, todayISO } from "@/components/app/accounting-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/accounting/vat")({
  head: () => ({
    meta: [
      { title: "إقرار ضريبة القيمة المضافة · AlMugren AI Factory OS" },
      { name: "description", content: "Saudi 15% VAT period report separating output and deductible input tax." },
      { property: "og:title", content: "إقرار ضريبة القيمة المضافة · AlMugren AI Factory OS" },
      { property: "og:description", content: "Output VAT, deductible input VAT and net due per period." },
    ],
  }),
  component: VatPage,
});

function VatPage() {
  const t = useT();
  const [range, setRange] = useState({ from: monthStartISO(), to: todayISO() });
  const run = useServerFn(vatReturn);
  const { data, isLoading } = useQuery({ queryKey: ["vat", range], queryFn: () => run({ data: range }) });
  const r = data as any;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4" />{t("إقرار ضريبة القيمة المضافة 15%", "VAT return (15%)")}</CardTitle>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5"><Label className="text-xs">{t("من", "From")}</Label><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">{t("إلى", "To")}</Label><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />{t("طباعة", "Print")}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {!r ? (
            <EmptyState icon={<Percent className="h-6 w-6" />} title={isLoading ? t("جارٍ التحميل…", "Loading…") : t("لا توجد بيانات", "No data")} hint={t("اختر فترة تحتوي مستندات معتمدة", "Pick a period that contains approved documents")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { ar: "مبيعات خاضعة", en: "Standard-rated sales", v: r.sales.standard_base },
                { ar: "مبيعات معفاة/خارج النطاق", en: "Exempt / out of scope", v: r.sales.exempt_base },
                { ar: "ضريبة المخرجات", en: "Output VAT", v: r.sales.output_vat },
                { ar: "مدخلات قابلة للخصم", en: "Deductible input VAT", v: r.purchases.deductible_input_vat },
              ].map((c) => (
                <div key={c.en} className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">{t(c.ar, c.en)}</div>
                  <div className="mt-1 text-xl font-bold tabular-nums">{money(c.v)}</div>
                </div>
              ))}
              <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 sm:col-span-2 lg:col-span-4">
                <div className="text-xs text-muted-foreground">{t("صافي المستحق للهيئة (موجب) أو رصيد لصالح المنشأة (سالب)", "Net due to ZATCA (positive) or credit balance (negative)")}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{money(r.net_due)} SAR</div>
                <p className="mt-2 text-xs text-muted-foreground">{t("تقرير داخلي للمراجعة فقط ولا يُرسل إلى هيئة الزكاة والضريبة والجمارك.", "Internal review report only; it is not submitted to ZATCA.")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {r ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            { title: t("مستندات المخرجات", "Output documents"), rows: r.sales.documents, file: "vat-output.csv" },
            { title: t("مستندات المدخلات", "Input documents"), rows: r.purchases.documents, file: "vat-input.csv" },
          ].map((sec) => (
            <Card key={sec.file}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">{sec.title}</CardTitle>
                <Button variant="outline" size="sm" disabled={sec.rows.length === 0} onClick={() => exportCsv(sec.file, sec.rows)}>
                  <Download className="h-4 w-4" />CSV
                </Button>
              </CardHeader>
              <CardContent>
                {sec.rows.length === 0 ? (
                  <EmptyState icon={<Percent className="h-6 w-6" />} title={t("لا توجد مستندات", "No documents")} hint={t("لا شيء في هذه الفترة", "Nothing in this period")} />
                ) : (
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>{t("المستند", "Document")}</TableHead><TableHead>{t("التاريخ", "Date")}</TableHead>
                        <TableHead className="text-end">{t("الوعاء", "Base")}</TableHead><TableHead className="text-end">{t("الضريبة", "VAT")}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {sec.rows.map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono text-xs">{d.number}</TableCell>
                            <TableCell className="text-xs">{d.date}</TableCell>
                            <TableCell className="text-end tabular-nums">{money(d.base)}</TableCell>
                            <TableCell className="text-end tabular-nums">{money(d.vat)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

