import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, Landmark, RefreshCw, ShieldCheck, Sparkles, TrendingUp, WalletCards, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/theme";
import { FINANCE_AI_PIPELINES, FINANCE_AI_SKILLS } from "@/lib/finance-ai.registry";
import { financeAiDashboard } from "@/lib/finance-ai.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant/finance")({
  head: () => ({ meta: [
    { title: "Finance AI Suite · AlMugren AI Factory OS" },
    { name: "description", content: "Live financial AI dashboard for VAT, receivables, payables, profitability, expenses and cashflow." },
  ] }),
  component: FinanceAiSuitePage,
});

const sar = new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1 });
const iso = (d: Date) => d.toISOString().slice(0, 10);

function Kpi({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: any }) {
  return <Card className="shadow-card"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div><Icon className="h-5 w-5 text-muted-foreground" /></div></CardContent></Card>;
}

function FinanceAiSuitePage() {
  const t = useT();
  const defaults = useMemo(() => { const now = new Date(); return { from: `${now.getFullYear()}-01-01`, to: iso(now) }; }, []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [range, setRange] = useState(defaults);
  const q = useQuery({ queryKey: ["finance-ai-dashboard", range.from, range.to], queryFn: () => financeAiDashboard({ data: range }) });
  const k = q.data?.kpis;

  return <div className="space-y-6">
    <Card className="shadow-card"><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5" />{t("Finance AI — لوحة مالية حية", "Finance AI — Live dashboard")}</CardTitle><p className="mt-2 text-sm text-muted-foreground">{t("بيانات فعلية من Supabase ضمن صلاحيات المستخدم الحالية، دون دفع أو ترحيل آلي.", "Live Supabase data within the viewer's permissions, with no automatic payment or ledger posting.")}</p></div><div className="flex items-end gap-2"><label className="text-xs text-muted-foreground">{t("من", "From")}<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-40" /></label><label className="text-xs text-muted-foreground">{t("إلى", "To")}<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-40" /></label><Button onClick={() => setRange({ from, to })} disabled={!from || !to || from > to || q.isFetching}><RefreshCw className={`me-2 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />{t("تحديث", "Refresh")}</Button></div></div></CardHeader></Card>

    {q.isError && <Card className="border-destructive"><CardContent className="flex gap-2 p-4 text-sm text-destructive"><AlertTriangle className="h-5 w-5" />{t("تعذر تحميل البيانات المالية. تحقق من صلاحية عرض المالية وإعدادات الحسابات.", "Unable to load finance data. Verify finance-view permissions and accounting setup.")}</CardContent></Card>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label={t("الإيرادات", "Revenue")} value={sar.format(k?.revenue ?? 0)} icon={TrendingUp} />
      <Kpi label={t("المصروفات", "Expenses")} value={sar.format(k?.expenses ?? 0)} icon={WalletCards} />
      <Kpi label={t("صافي الربح المحاسبي", "Accounting net profit")} value={sar.format(k?.netProfit ?? 0)} icon={Landmark} />
      <Kpi label={t("صافي التدفق النقدي", "Net cashflow")} value={sar.format(k?.netCashflow ?? 0)} hint={`${t("داخل", "In")}: ${sar.format(k?.cashIn ?? 0)} · ${t("خارج", "Out")}: ${sar.format(k?.cashOut ?? 0)}`} icon={Banknote} />
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label={t("ذمم العملاء", "Receivables")} value={sar.format(k?.receivables ?? 0)} hint={`${t("متأخر", "Overdue")}: ${sar.format(k?.overdueReceivables ?? 0)}`} icon={WalletCards} />
      <Kpi label={t("ذمم الموردين", "Payables")} value={sar.format(k?.payables ?? 0)} icon={WalletCards} />
      <Kpi label={t("صافي VAT", "Net VAT")} value={sar.format(k?.netVat ?? 0)} hint={`${t("مخرجات", "Output")}: ${sar.format(k?.outputVat ?? 0)} · ${t("مدخلات", "Input")}: ${sar.format(k?.inputVat ?? 0)}`} icon={Landmark} />
      <Kpi label={t("تكلفة الإنتاج المباشرة", "Direct production cost")} value={sar.format((k?.materialCost ?? 0) + (k?.laborCost ?? 0))} hint={`${t("مواد", "Material")}: ${sar.format(k?.materialCost ?? 0)} · ${t("عمالة", "Labor")}: ${sar.format(k?.laborCost ?? 0)}`} icon={Workflow} />
    </div>

    <Card className="shadow-card"><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">{t("رقابة Finance AI", "Finance AI controls")}</CardTitle><Badge variant="secondary">15 Skills</Badge></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">{t("مراجعات AI المعلقة", "Pending AI reviews")}</div><div className="mt-1 text-2xl font-bold">{k?.pendingAiReviews ?? 0}</div></div><div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">{t("شذوذات الفواتير", "Invoice anomalies")}</div><div className="mt-1 text-2xl font-bold">{k?.anomalyCount ?? 0}</div></div><div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">{t("قيود غير مرحلة", "Unposted entries")}</div><div className="mt-1 text-2xl font-bold">{k?.unpostedEntries ?? 0}</div></div><div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">{t("حسابات نشطة", "Active accounts")}</div><div className="mt-1 text-2xl font-bold">{k?.accountsConfigured ?? 0}</div></div></CardContent></Card>

    <Card className="shadow-card"><CardHeader><CardTitle className="text-base">{t("ربحية المشاريع — هامش تصنيع مباشر", "Project profitability — direct manufacturing margin")}</CardTitle><p className="text-xs text-muted-foreground">{t("الإيراد قبل الضريبة مطروحًا منه المواد والعمالة والمصاريف الصناعية المسجلة على أوامر التصنيع.", "Revenue before VAT less recorded materials, labor and manufacturing overhead.")}</p></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-2 text-start">{t("المشروع", "Project")}</th><th className="p-2 text-end">{t("الإيراد", "Revenue")}</th><th className="p-2 text-end">{t("المواد", "Material")}</th><th className="p-2 text-end">{t("العمالة", "Labor")}</th><th className="p-2 text-end">{t("غير مباشر", "Overhead")}</th><th className="p-2 text-end">{t("الربح", "Profit")}</th><th className="p-2 text-end">{t("الهامش", "Margin")}</th></tr></thead><tbody>{(q.data?.profitability ?? []).map((p: any) => <tr key={p.id} className="border-b last:border-0"><td className="p-2"><div className="font-medium">{p.nameAr || p.nameEn || p.projectNumber}</div><div className="text-xs text-muted-foreground">{p.projectNumber}</div></td><td className="p-2 text-end tabular-nums">{sar.format(p.revenue)}</td><td className="p-2 text-end tabular-nums">{sar.format(p.material)}</td><td className="p-2 text-end tabular-nums">{sar.format(p.labor)}</td><td className="p-2 text-end tabular-nums">{sar.format(p.overhead)}</td><td className="p-2 text-end font-semibold tabular-nums">{sar.format(p.profit)}</td><td className="p-2 text-end tabular-nums">{p.margin == null ? "—" : `${pct.format(p.margin)}%`}</td></tr>)}{!q.isLoading && (q.data?.profitability?.length ?? 0) === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{t("لا توجد بيانات مشاريع مالية في الفترة المحددة.", "No project financial data exists for the selected period.")}</td></tr>}</tbody></table></div></CardContent></Card>

    <Card className="shadow-card"><CardHeader><CardTitle className="text-base">{t("مسارات التشغيل", "Execution pipelines")}</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">{Object.entries(FINANCE_AI_PIPELINES).map(([name, pipeline]) => <div key={name} className="rounded-xl border p-4"><div className="mb-3 font-semibold" dir="ltr">{name}</div><div className="flex flex-wrap items-center gap-2 text-sm">{pipeline.map((skill, index) => <div key={skill} className="flex items-center gap-2"><Badge variant="secondary">{skill}</Badge>{index < pipeline.length - 1 && <span className="text-muted-foreground">→</span>}</div>)}</div></div>)}</CardContent></Card>

    <Card className="shadow-card"><CardHeader><CardTitle className="text-base">{t("المهارات والحوكمة", "Skills & governance")}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{FINANCE_AI_SKILLS.map((skill) => <div key={skill.id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{t(skill.nameAr, skill.nameEn)}</h3>{skill.highImpactAction ? <ShieldCheck className="h-4 w-4 text-muted-foreground" /> : <Workflow className="h-4 w-4 text-muted-foreground" />}</div><p className="mt-2 text-sm text-muted-foreground">{skill.descriptionAr}</p></div>)}</CardContent></Card>

    <p className="text-xs text-muted-foreground">{t("قاعدة الأمان: القراءة والتحليل فقط. لا دفع، لا ترحيل محاسبي، لا تغيير IBAN، ولا اعتماد مالي نهائي تلقائي.", "Safety boundary: read and analyze only. No payments, ledger posting, IBAN changes, or automatic final financial approval.")}</p>
  </div>;
}
