import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generalLedger, partyLedger, listAccounts } from "@/lib/accounting.functions";
import { listCustomers } from "@/lib/workflow.functions";
import { listSuppliers } from "@/lib/purchasing.functions";
import { EmptyState } from "@/components/app/purchasing-ui";
import { exportCsv, money, monthStartISO, todayISO } from "@/components/app/accounting-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/accounting/ledger")({
  head: () => ({
    meta: [
      { title: "دفتر الأستاذ وكشوف الحسابات · AlMugren AI Factory OS" },
      { name: "description", content: "General ledger by account and customer/supplier statements built from posted journal entries." },
      { property: "og:title", content: "دفتر الأستاذ وكشوف الحسابات · AlMugren AI Factory OS" },
      { property: "og:description", content: "Account ledger and party statements with running balance, CSV export and A4 print." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LedgerPage,
});

type Mode = "account" | "customer" | "supplier";

function LedgerPage() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("account");
  const [target, setTarget] = useState("");
  const [range, setRange] = useState({ from: monthStartISO(), to: todayISO() });

  const accountsFn = useServerFn(listAccounts);
  const customersFn = useServerFn(listCustomers);
  const suppliersFn = useServerFn(listSuppliers);
  const glFn = useServerFn(generalLedger);
  const plFn = useServerFn(partyLedger);

  const { data: accounts } = useQuery({ queryKey: ["acc-list"], queryFn: () => accountsFn({} as any) });
  const { data: customers } = useQuery({ queryKey: ["cust-list"], queryFn: () => customersFn({} as any) });
  const { data: suppliers } = useQuery({ queryKey: ["supp-list"], queryFn: () => suppliersFn({} as any) });

  const options: Array<{ id: string; label: string }> =
    mode === "account"
      ? ((accounts as any[]) ?? []).filter((a) => a.is_postable !== false).map((a) => ({ id: a.id, label: `${a.code} · ${a.name_ar}` }))
      : mode === "customer"
        ? ((customers as any[]) ?? []).map((c) => ({ id: c.id, label: c.name_ar ?? c.name_en ?? c.id }))
        : ((suppliers as any[]) ?? []).map((s) => ({ id: s.id, label: s.name_ar ?? s.name_en ?? s.id }));

  const { data, isLoading } = useQuery({
    queryKey: ["ledger", mode, target, range],
    enabled: Boolean(target),
    queryFn: () =>
      mode === "account"
        ? (glFn as any)({ data: { ...range, account_id: target } })
        : (plFn as any)({ data: { party: mode, id: target } }),
  });

  const rows: any[] = Array.isArray(data) ? data : [];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          {t("دفتر الأستاذ وكشوف الحسابات", "General ledger & statements")}
        </CardTitle>
        <div className="flex flex-wrap items-end gap-2">
          {mode === "account" ? (
            <>
              <div className="grid gap-1.5"><Label className="text-xs">{t("من", "From")}</Label><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">{t("إلى", "To")}</Label><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
            </>
          ) : null}
          <Button variant="outline" size="sm" disabled={rows.length === 0} onClick={() => exportCsv(`${mode}-ledger.csv`, rows)}><Download className="h-4 w-4" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />{t("طباعة", "Print")}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {([
            { key: "account", ar: "حساب من الدليل", en: "Account" },
            { key: "customer", ar: "كشف حساب عميل", en: "Customer statement" },
            { key: "supplier", ar: "كشف حساب مورد", en: "Supplier statement" },
          ] as const).map((m) => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setTarget(""); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${mode === m.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {t(m.ar, m.en)}
            </button>
          ))}
        </div>

        <div className="grid gap-1.5 sm:max-w-md">
          <Label className="text-xs">{t("اختر السجل", "Select record")}</Label>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">{t("— اختر —", "— Select —")}</option>
            {options.map((o) => (<option key={o.id} value={o.id}>{o.label}</option>))}
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title={!target ? t("اختر حسابًا أو طرفًا لعرض الحركة", "Select an account or party") : isLoading ? t("جارٍ التحميل…", "Loading…") : t("لا توجد حركات مرحّلة", "No posted movements")}
            hint={t("تُبنى الكشوف من القيود المرحّلة فقط", "Statements are built from posted entries only")}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم القيد", "Entry")}</TableHead>
                  <TableHead>{t("التاريخ", "Date")}</TableHead>
                  <TableHead>{t("البيان", "Memo")}</TableHead>
                  <TableHead>{t("المصدر", "Source")}</TableHead>
                  <TableHead className="text-end">{t("مدين", "Debit")}</TableHead>
                  <TableHead className="text-end">{t("دائن", "Credit")}</TableHead>
                  <TableHead className="text-end">{t("الرصيد", "Balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.entry_number}-${i}`}>
                    <TableCell className="font-mono text-xs">{r.entry_number}</TableCell>
                    <TableCell className="text-sm">{r.entry_date}</TableCell>
                    <TableCell className="text-sm">{r.description ?? r.memo ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.source_type ?? "—"}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(r.debit)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(r.credit)}</TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">{money(r.balance)}</TableCell>
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

