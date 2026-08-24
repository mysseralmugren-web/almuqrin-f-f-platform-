import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading, ErrorState, riyal } from "@/components/app/hr-ui";
import { getPayslip } from "@/lib/hr.functions";

export const Route = createFileRoute("/_authenticated/print/payslip/$id")({
  head: () => ({
    meta: [
      { title: "قسيمة راتب · AlMugren AI Factory OS" },
      { name: "description", content: "Printable payslip with earnings, deductions and net pay." },
      { property: "og:title", content: "قسيمة راتب · AlMugren AI Factory OS" },
      { property: "og:description", content: "Printable payslip." },
    ],
  }),
  component: PayslipPrint,
});

function PayslipPrint() {
  const { id } = Route.useParams();
  const fetchSlip = useServerFn(getPayslip);
  const q = useQuery({ queryKey: ["payslip", id], queryFn: () => fetchSlip({ data: { item_id: id } }) });

  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message="تعذر تحميل قسيمة الراتب" />;

  const it: any = q.data.item;
  const co: any = q.data.company;
  const period = it.payroll_runs.payroll_periods;
  const rows: Array<[string, unknown]> = [
    ["الراتب الأساسي", it.basic_salary],
    ["بدل السكن", it.housing_allowance],
    ["بدل النقل", it.transport_allowance],
    ["بدلات أخرى", it.other_allowance],
    ["العمل الإضافي", it.overtime_amount],
  ];
  const ded: Array<[string, unknown]> = [
    ["التأمينات (حصة الموظف)", it.gosi_employee],
    ["السلف", it.advances_deduction],
    ["خصومات أخرى", it.other_deduction],
  ];

  return (
    <div dir="rtl" className="mx-auto max-w-[210mm] space-y-6 bg-card p-8 text-sm shadow-card print:shadow-none">
      <div className="flex justify-end print:hidden">
        <Button className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" />طباعة</Button>
      </div>
      <header className="border-b pb-4 text-center">
        <img
          src="/brand/almugren-furniture-logo.jpeg"
          alt="شعار مصنع المقرن للأثاث"
          className="mx-auto h-24 w-24 object-contain"
        />
        <h1 className="text-xl font-bold">{co?.name_ar ?? "مصنع ميسر عبدالرحمن المقرن للأثاث"}</h1>
        <h2 className="mt-3 text-lg font-bold">قسيمة راتب — {period.year}/{String(period.month).padStart(2, "0")}</h2>
        <p className="text-xs text-muted-foreground">رقم المسيّر: {it.payroll_runs.run_number}</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div><span className="text-muted-foreground">الموظف: </span>{it.employees.full_name_ar}</div>
        <div><span className="text-muted-foreground">رقم الموظف: </span>{it.employees.employee_number}</div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-bold">المستحقات</h3>
          {rows.map(([l, v]) => (
            <div key={l} className="flex justify-between border-b py-1"><span>{l}</span><span className="font-mono">{riyal(v)}</span></div>
          ))}
          <div className="flex justify-between py-1 font-bold"><span>الإجمالي</span><span className="font-mono">{riyal(it.total_earnings)}</span></div>
        </div>
        <div>
          <h3 className="mb-2 font-bold">الاستقطاعات</h3>
          {ded.map(([l, v]) => (
            <div key={l} className="flex justify-between border-b py-1"><span>{l}</span><span className="font-mono">{riyal(v)}</span></div>
          ))}
          <div className="flex justify-between py-1 font-bold"><span>الإجمالي</span><span className="font-mono">{riyal(it.total_deductions)}</span></div>
        </div>
      </section>

      <div className="flex justify-between rounded-lg border p-3 text-base font-bold">
        <span>صافي الراتب</span><span className="font-mono">{riyal(it.net_pay)}</span>
      </div>
    </div>
  );
}
