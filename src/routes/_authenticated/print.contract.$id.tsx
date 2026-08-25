import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading, ErrorState, riyal } from "@/components/app/hr-ui";
import { getContractForPrint } from "@/lib/hr.functions";

export const Route = createFileRoute("/_authenticated/print/contract/$id")({
  head: () => ({
    meta: [
      { title: "طباعة عقد عمل · AlMugren AI Factory OS" },
      { name: "description", content: "Printable Arabic employment contract for AlMugren Furniture Factory." },
      { property: "og:title", content: "طباعة عقد عمل · AlMugren AI Factory OS" },
      { property: "og:description", content: "Printable employment contract." },
    ],
  }),
  component: ContractPrint,
});

function ContractPrint() {
  const { id } = Route.useParams();
  const fetchContract = useServerFn(getContractForPrint);
  const q = useQuery({ queryKey: ["contract-print", id], queryFn: () => fetchContract({ data: { id } }) });

  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <ErrorState message="تعذر تحميل العقد" />;

  const ct: any = q.data.contract;
  const emp = ct.employees;
  const co: any = q.data.company;

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
        <p className="mt-1 text-xs text-muted-foreground">
          {[co?.address_district, co?.address_street, co?.address_city].filter(Boolean).join(" - ") || "الرياض – حي النور – شارع طريب"}
        </p>
        {co?.cr_number ? <p className="text-xs text-muted-foreground">السجل التجاري: {co.cr_number}</p> : null}
        <h2 className="mt-4 text-lg font-bold">عقد عمل</h2>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div><span className="text-muted-foreground">اسم الموظف: </span>{emp.full_name_ar}</div>
        <div><span className="text-muted-foreground">رقم الموظف: </span>{emp.employee_number}</div>
        <div><span className="text-muted-foreground">المسمى الوظيفي: </span>{q.data.job_title ?? "—"}</div>
        <div><span className="text-muted-foreground">الجنسية: </span>{emp.nationality ?? "—"}</div>
        <div><span className="text-muted-foreground">نوع العقد: </span>{ct.contract_type}</div>
        <div><span className="text-muted-foreground">تاريخ البداية: </span>{ct.start_date}</div>
        <div><span className="text-muted-foreground">تاريخ النهاية: </span>{ct.end_date ?? "غير محدد"}</div>
        <div><span className="text-muted-foreground">فترة التجربة: </span>{ct.probation_days} يومًا</div>
        <div><span className="text-muted-foreground">الراتب الأساسي: </span>{riyal(ct.basic_salary)}</div>
        <div><span className="text-muted-foreground">بدل السكن: </span>{riyal(ct.housing_allowance)}</div>
        <div><span className="text-muted-foreground">بدل النقل: </span>{riyal(ct.transport_allowance)}</div>
        <div><span className="text-muted-foreground">ساعات العمل: </span>{ct.working_hours_per_day} / {ct.working_days_per_week} أيام</div>
      </section>

      {q.data.clauses ? (
        <section className="space-y-2">
          <h3 className="font-bold">البنود</h3>
          <p className="whitespace-pre-wrap leading-7">{q.data.clauses}</p>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-8 pt-10">
        <div className="border-t pt-2 text-center">توقيع الموظف</div>
        <div className="border-t pt-2 text-center">توقيع صاحب العمل</div>
      </section>
      <p className="text-[10px] text-muted-foreground">هذه النسخة مطبوعة من النظام، والبنود القابلة للتهيئة مسؤولية المنشأة ولا تمثل اعتمادًا نظاميًا تلقائيًا.</p>
    </div>
  );
}
