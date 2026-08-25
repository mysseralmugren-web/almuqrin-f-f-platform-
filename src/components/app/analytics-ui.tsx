import type { ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/lib/theme";
import {
  analyticsErrorText,
  riyadhMonthStart,
  riyadhToday,
  RIYADH_TZ,
} from "@/lib/analytics-constants";
import { logAnalyticsExport } from "@/lib/analytics.functions";
import type {
  AnalyticsExportReport,
  AnalyticsPrintReport,
  AnalyticsScope,
} from "@/lib/analytics.functions";
import { recordsToCsv } from "@/lib/csv";

export function useAr() {
  return useTheme().lang === "ar";
}

export function useAnalyticsFail() {
  const ar = useAr();
  return (e: unknown) =>
    toast.error(analyticsErrorText(e instanceof Error ? e.message : String(e), ar));
}

export interface Filters {
  from: string;
  to: string;
  customerId?: string;
  departmentId?: string;
  projectId?: string;
}

export const defaultFilters = (): Filters => ({ from: riyadhMonthStart(), to: riyadhToday() });

export function num(v: unknown, digits = 0) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function money(v: unknown) {
  if (v === null || v === undefined) return "—";
  return num(v, 2);
}

export function ratio(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

export function formatStamp(iso: unknown, ar: boolean) {
  if (!iso) return "—";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(ar ? "ar-SA" : "en-GB", {
    timeZone: RIYADH_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
  onClick?: () => void;
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "bad"
          ? "text-destructive"
          : "";
  return (
    <Card
      className={`shadow-card ${onClick ? "cursor-pointer transition hover:shadow-elegant" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1.5 text-xl font-bold tabular-nums ${toneCls}`}>{value}</div>
        {hint ? <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export function Loading() {
  const ar = useAr();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {ar ? "جارٍ حساب المؤشرات…" : "Calculating KPIs…"}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const ar = useAr();
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
      {analyticsErrorText(error instanceof Error ? error.message : String(error), ar)}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function SetupWarning({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{items.join(" · ")}</div>
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** CSV export with server-side audit logging. Sensitive columns must be filtered by the caller. */
export async function exportAnalyticsCsv(
  report: AnalyticsExportReport,
  rows: Array<Record<string, unknown>>,
  scope: AnalyticsScope,
) {
  if (rows.length === 0) return;
  try {
    await logAnalyticsExport({ data: { report, format: "csv", scope } });
  } catch (error) {
    console.error("Analytics export audit failed", error);
    toast.error("تعذر توثيق التصدير؛ لم يتم تنزيل الملف");
    return;
  }

  const blob = new Blob(["\uFEFF" + recordsToCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report}-${riyadhToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FilterBar({
  value,
  onChange,
  onRefresh,
  generatedAt,
  extra,
  onExport,
  onPrint,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  onRefresh: () => void;
  generatedAt?: unknown;
  extra?: ReactNode;
  onExport?: () => void;
  onPrint?: () => void;
}) {
  const ar = useAr();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 print:hidden">
      <div className="grid gap-1.5">
        <Label className="text-xs">{ar ? "من" : "From"}</Label>
        <Input
          type="date"
          className="w-40"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs">{ar ? "إلى" : "To"}</Label>
        <Input
          type="date"
          className="w-40"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
      {extra}
      <div className="ms-auto flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          {ar ? "آخر تحديث: " : "Last updated: "}
          {formatStamp(generatedAt, ar)}
        </span>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          {ar ? "تحديث" : "Refresh"}
        </Button>
        {onExport ? (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
        ) : null}
        {onPrint ? (
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4" />
            {ar ? "طباعة PDF" : "Print PDF"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function printReport(report: AnalyticsPrintReport, scope: AnalyticsScope) {
  const target = new URL(`/print/report/${report}`, window.location.origin);
  for (const [key, value] of Object.entries(scope)) {
    if (value != null) target.searchParams.set(key, String(value));
  }
  const popup = window.open(target.toString(), "_blank");
  if (!popup) {
    toast.error("تعذر فتح صفحة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع.");
    return;
  }
  popup.opener = null;
}
