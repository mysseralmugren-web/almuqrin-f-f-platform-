import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Layers, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  listPeriods, createYearPeriods, setPeriodStatus, listCostCenters, createCostCenter,
  getAccountingSettings, saveAccountingSettings, listAccounts,
} from "@/lib/accounting.functions";
import { PERIOD_STATUS, SETTING_KEYS } from "@/lib/accounting-constants";
import { EmptyState } from "@/components/app/purchasing-ui";
import { useAccFail } from "@/components/app/accounting-ui";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/accounting/setup")({
  head: () => ({
    meta: [
      { title: "الإعدادات المحاسبية · AlMugren AI Factory OS" },
      { name: "description", content: "Fiscal periods, cost centers and posting account mapping." },
      { property: "og:title", content: "الإعدادات المحاسبية · AlMugren AI Factory OS" },
      { property: "og:description", content: "Fiscal periods, cost centers and posting account mapping." },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useAccFail();
  const qc = useQueryClient();

  const fetchPeriods = useServerFn(listPeriods);
  const fetchCenters = useServerFn(listCostCenters);
  const fetchSettings = useServerFn(getAccountingSettings);
  const fetchAccounts = useServerFn(listAccounts);
  const mkYear = useServerFn(createYearPeriods);
  const setStatus = useServerFn(setPeriodStatus);
  const mkCenter = useServerFn(createCostCenter);
  const saveMap = useServerFn(saveAccountingSettings);

  const { data: periods = [] } = useQuery({ queryKey: ["periods"], queryFn: () => fetchPeriods({}) });
  const { data: centers = [] } = useQuery({ queryKey: ["cost-centers"], queryFn: () => fetchCenters({}) });
  const { data: settings } = useQuery({ queryKey: ["acc-settings"], queryFn: () => fetchSettings({}) });
  const { data: accounts = [] } = useQuery({ queryKey: ["coa"], queryFn: () => fetchAccounts({}) });

  const postable = (accounts as any[]).filter((a) => a.is_postable);
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [cc, setCc] = useState({ code: "", name_ar: "" });
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      const next: Record<string, string> = {};
      for (const s of SETTING_KEYS) next[s.key] = (settings as any)[s.key] ?? "";
      setMap(next);
    }
  }, [settings]);

  const yearMut = useMutation({
    mutationFn: () => mkYear({ data: { year } }),
    onSuccess: (r: any) => { toast.success(t(`تم إنشاء ${r.created} فترة`, `${r.created} periods created`)); qc.invalidateQueries({ queryKey: ["periods"] }); },
    onError: fail,
  });
  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "open" | "closed" }) => setStatus({ data: v }),
    onSuccess: () => { toast.success(t("تم تحديث الفترة", "Period updated")); qc.invalidateQueries({ queryKey: ["periods"] }); },
    onError: fail,
  });
  const ccMut = useMutation({
    mutationFn: () => mkCenter({ data: { code: cc.code.trim(), name_ar: cc.name_ar.trim() } }),
    onSuccess: () => { toast.success(t("تم إنشاء مركز التكلفة", "Cost center created")); setCc({ code: "", name_ar: "" }); qc.invalidateQueries({ queryKey: ["cost-centers"] }); },
    onError: fail,
  });
  const mapMut = useMutation({
    mutationFn: () => saveMap({ data: Object.fromEntries(SETTING_KEYS.map((s) => [s.key, map[s.key] || null])) as any }),
    onSuccess: () => { toast.success(t("تم حفظ ربط الحسابات", "Mapping saved")); qc.invalidateQueries({ queryKey: ["acc-settings"] }); qc.invalidateQueries({ queryKey: ["finance-overview"] }); },
    onError: fail,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarRange className="h-4 w-4" />{t("الفترات المالية", "Fiscal periods")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5">
              <Label>{t("السنة", "Year")}</Label>
              <Input type="number" className="w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <Button size="sm" onClick={() => yearMut.mutate()} disabled={yearMut.isPending}>
              <Plus className="h-4 w-4" />{t("إنشاء فترات السنة", "Create year periods")}
            </Button>
          </div>
          {(periods as any[]).length === 0 ? (
            <EmptyState icon={<CalendarRange className="h-6 w-6" />} title={t("لا توجد فترات مالية", "No fiscal periods")} hint={t("القيود لا تُرحّل بدون فترة مفتوحة", "Entries cannot post without an open period")} />
          ) : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>{t("الفترة", "Period")}</TableHead><TableHead>{t("من", "From")}</TableHead><TableHead>{t("إلى", "To")}</TableHead><TableHead>{t("الحالة", "Status")}</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {(periods as any[]).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="text-xs">{p.start_date}</TableCell>
                      <TableCell className="text-xs">{p.end_date}</TableCell>
                      <TableCell><Badge variant="secondary" className="border-0">{ar ? PERIOD_STATUS[p.status as "open"].ar : PERIOD_STATUS[p.status as "open"].en}</Badge></TableCell>
                      <TableCell className="text-end">
                        <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: p.id, status: p.status === "open" ? "closed" : "open" })}>
                          {p.status === "open" ? t("إقفال", "Close") : t("فتح", "Reopen")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4" />{t("مراكز التكلفة", "Cost centers")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5"><Label>{t("الرمز", "Code")}</Label><Input className="w-28" value={cc.code} onChange={(e) => setCc({ ...cc, code: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>{t("الاسم", "Name")}</Label><Input value={cc.name_ar} onChange={(e) => setCc({ ...cc, name_ar: e.target.value })} /></div>
            <Button size="sm" onClick={() => ccMut.mutate()} disabled={ccMut.isPending || !cc.code.trim() || cc.name_ar.trim().length < 2}>
              <Plus className="h-4 w-4" />{t("إضافة", "Add")}
            </Button>
          </div>
          {(centers as any[]).length === 0 ? (
            <EmptyState icon={<Layers className="h-6 w-6" />} title={t("لا توجد مراكز تكلفة", "No cost centers")} hint={t("اختياري لتحليل المصروفات", "Optional for expense analysis")} />
          ) : (
            <ul className="space-y-2 text-sm">
              {(centers as any[]).map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="font-medium">{c.name_ar}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4" />{t("ربط حسابات الترحيل الآلي", "Automated posting account mapping")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {postable.length === 0 ? (
            <EmptyState icon={<Link2 className="h-6 w-6" />} title={t("أنشئ دليل الحسابات أولًا", "Create the chart of accounts first")} hint={t("لا يمكن الربط بدون حسابات قابلة للترحيل", "Mapping needs postable accounts")} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SETTING_KEYS.map((s) => (
                  <div key={s.key} className="grid gap-1.5">
                    <Label className="text-xs">{ar ? s.ar : s.en}</Label>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={map[s.key] ?? ""} onChange={(e) => setMap({ ...map, [s.key]: e.target.value })}>
                      <option value="">{t("غير محدد", "Not set")}</option>
                      {postable.filter((a) => a.account_type === s.type).map((a) => (<option key={a.id} value={a.id}>{a.code} · {a.name_ar}</option>))}
                    </select>
                  </div>
                ))}
              </div>
              <Button onClick={() => mapMut.mutate()} disabled={mapMut.isPending}>{t("حفظ الربط", "Save mapping")}</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

