import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { analyticsPrintSnapshot } from "@/lib/analytics.functions";
import type { AnalyticsPrintReport, AnalyticsScope } from "@/lib/analytics.functions";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const searchSchema = z.object({
  from: date,
  to: date,
  customerId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/print/report/$report")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "طباعة تقرير · منصة المقرن" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnalyticsPrintPage,
});

const REPORT_TITLES: Record<AnalyticsPrintReport, string> = {
  executive: "الملخص التنفيذي",
  sales: "تقرير المبيعات",
  manufacturing: "تقرير التصنيع",
  inventory: "تقرير المخزون",
  purchasing: "تقرير المشتريات",
  finance: "التقرير المالي",
  hr: "تقرير الموارد البشرية",
  projects: "تقرير المشاريع والتركيب",
};

const LABELS: Record<string, string> = {
  active: "نشط",
  amount: "القيمة",
  attendance: "الحضور",
  attendance_rate: "نسبة الحضور",
  avg_lead_days: "متوسط زمن الدورة (يوم)",
  avg_resolution_hours: "متوسط الإغلاق (ساعة)",
  by_department: "حسب القسم",
  by_status: "حسب الحالة",
  can_view_costs: "صلاحية عرض التكاليف",
  can_view_finance: "صلاحية عرض المالية",
  can_view_hr: "صلاحية عرض الموارد البشرية",
  cash_in: "التحصيل",
  claims: "مطالبات الضمان",
  collections: "التحصيل",
  completed: "مكتمل",
  consumption: "حركة المواد",
  cost: "التكلفة",
  cost_of_production: "تكلفة الإنتاج",
  count: "العدد",
  deliveries: "التسليمات",
  expenses: "المصروفات",
  finance: "النتيجة المالية",
  generated_at: "وقت الإنشاء",
  headcount: "القوى العاملة",
  id: "المعرّف",
  installations: "التركيب",
  invoices: "الفواتير",
  labor: "العمالة",
  late: "متأخر",
  monthly: "شهريًا",
  name: "الاسم",
  net: "الصافي",
  open: "مفتوح",
  orders: "الأوامر",
  overdue: "المتأخرات",
  payables: "مستحقات الموردين",
  payroll: "الرواتب",
  pipeline: "قيد المتابعة",
  pnl: "قائمة الدخل",
  quality: "الجودة",
  quantity: "الكمية",
  quotes: "عروض الأسعار",
  receipts: "الاستلامات",
  receivables: "ذمم العملاء",
  revenue: "الإيرادات",
  setup_gaps: "نواقص الإعداد",
  shortages: "النواقص",
  snags: "الملاحظات",
  stages: "مراحل الإنتاج",
  status: "الحالة",
  top_consumed: "الأكثر استهلاكًا",
  top_customers: "أفضل العملاء",
  top_suppliers: "أكبر الموردين",
  total: "الإجمالي",
  totals: "الإجماليات",
  unposted_entries: "قيود غير مرحّلة",
  vat: "ضريبة القيمة المضافة",
  warranties: "الضمانات",
};

function label(key: string) {
  return LABELS[key] ?? key.replaceAll("_", " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown) {
  return value == null || ["string", "number", "boolean"].includes(typeof value);
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function ScalarGrid({ value }: { value: Record<string, unknown> }) {
  const entries = Object.entries(value).filter(([, item]) => isScalar(item));
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {entries.map(([key, item]) => (
        <div key={key} className="rounded-lg border border-slate-200 p-3 break-inside-avoid">
          <div className="text-[10px] text-slate-500">{label(key)}</div>
          <div className="mt-1 font-semibold tabular-nums">{formatValue(item)}</div>
        </div>
      ))}
    </div>
  );
}

function DataSection({ name, value }: { name: string; value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const rows = value.filter(isRecord);
    if (rows.length === value.length) {
      const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
      return (
        <section className="space-y-2 break-inside-avoid-page">
          <h2 className="border-r-4 border-amber-500 pr-2 text-sm font-bold">{label(name)}</h2>
          <table className="w-full table-fixed border-collapse text-[9px]">
            <thead>
              <tr className="bg-slate-100">
                {columns.map((column) => (
                  <th key={column} className="border p-1.5 text-right">
                    {label(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column} className="break-words border p-1.5 align-top">
                      {formatValue(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      );
    }
    return null;
  }

  if (!isRecord(value)) return null;
  const nested = Object.entries(value).filter(([, item]) => !isScalar(item));
  return (
    <section className="space-y-3 break-inside-avoid-page">
      <h2 className="border-r-4 border-amber-500 pr-2 text-sm font-bold">{label(name)}</h2>
      <ScalarGrid value={value} />
      {nested.map(([key, item]) => (
        <DataSection key={key} name={key} value={item} />
      ))}
    </section>
  );
}

function AnalyticsPrintPage() {
  const { report: rawReport } = Route.useParams();
  const search = Route.useSearch();
  const report = rawReport as AnalyticsPrintReport;
  const scope: AnalyticsScope = search;
  const fetchSnapshot = useServerFn(analyticsPrintSnapshot);
  const query = useQuery({
    queryKey: ["analytics-print", report, scope],
    queryFn: () => fetchSnapshot({ data: { report, scope } }),
    retry: false,
  });

  useEffect(() => {
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "ar");
  }, []);

  if (query.isLoading)
    return <div className="p-12 text-center text-slate-500">جارٍ إعداد النسخة الآمنة للتقرير…</div>;
  if (query.isError || !query.data) {
    return (
      <div className="p-12 text-center text-red-700">
        تعذر إعداد التقرير أو توثيق عملية التصدير. لم تُنشأ نسخة للطباعة.
      </div>
    );
  }

  const company = (query.data.company ?? {}) as Record<string, unknown>;
  const snapshot = query.data.snapshot as Record<string, unknown>;
  const generatedAt = formatValue(snapshot.generated_at ?? new Date().toISOString());
  const rootScalars = Object.fromEntries(
    Object.entries(snapshot).filter(([key, value]) => key !== "generated_at" && isScalar(value)),
  );
  const sections = Object.entries(snapshot).filter(
    ([key, value]) => key !== "generated_at" && !isScalar(value),
  );

  return (
    <div className="mx-auto max-w-[210mm] bg-white text-slate-950">
      <style>{`@media print { @page { size: A4; margin: 11mm; } body { background: #fff !important; } .no-print { display: none !important; } .break-inside-avoid-page { break-inside: avoid-page; } }`}</style>
      <div className="no-print mb-4 flex justify-end">
        <Button className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          حفظ أو طباعة PDF
        </Button>
      </div>

      <article className="space-y-6 rounded-xl border border-slate-200 p-7 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div className="flex items-start gap-3">
            <img
              src="/brand/almugren-furniture-logo.jpeg"
              alt="شعار مصنع المقرن للأثاث"
              className="h-20 w-20 shrink-0 object-contain"
            />
            <div>
              <div className="text-xl font-bold text-slate-900">
                {formatValue(company.name_ar) === "—"
                  ? "مصنع ميسر عبدالرحمن المقرن للأثاث"
                  : formatValue(company.name_ar)}
              </div>
              {company.name_en ? (
                <div className="text-xs text-slate-500" dir="ltr">
                  {formatValue(company.name_en)}
                </div>
              ) : null}
              <div className="mt-2 space-y-0.5 text-[10px] text-slate-600">
                {company.vat_number ? (
                  <div>
                    الرقم الضريبي: <span dir="ltr">{formatValue(company.vat_number)}</span>
                  </div>
                ) : null}
                {company.cr_number ? (
                  <div>
                    السجل التجاري: <span dir="ltr">{formatValue(company.cr_number)}</span>
                  </div>
                ) : null}
                <div>
                  {[
                    company.address_building_no,
                    company.address_street,
                    company.address_district,
                    company.address_city,
                    company.address_postal_code,
                  ]
                    .filter(Boolean)
                    .map(formatValue)
                    .join("، ")}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-slate-900 px-5 py-3 text-left text-white">
            <div className="text-[10px] text-slate-300">تقرير تحليلي</div>
            <h1 className="text-base font-bold">{REPORT_TITLES[report] ?? report}</h1>
          </div>
        </header>

        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-slate-50 p-3 text-[10px] text-slate-600">
          <span>
            الفترة: <b dir="ltr">{scope.from}</b> — <b dir="ltr">{scope.to}</b>
          </span>
          <span>
            أُنشئ: <b dir="ltr">{generatedAt}</b>
          </span>
        </div>

        <ScalarGrid value={rootScalars} />
        {sections.map(([key, value]) => (
          <DataSection key={key} name={key} value={value} />
        ))}

        <footer className="border-t pt-3 text-center text-[9px] text-slate-500">
          نسخة مؤمّنة ومقيّدة بصلاحيات المستخدم — منصة المقرن لإدارة المصنع
        </footer>
      </article>
    </div>
  );
}
