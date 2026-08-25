import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuotation } from "@/lib/workflow.functions";

export const Route = createFileRoute("/_authenticated/print/quotation/$id")({
  head: () => ({
    meta: [
      { title: "طباعة عرض السعر · AlMugren AI Factory OS" },
      { name: "description", content: "A4 printable quotation with AlMugren Factory branding." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintQuotation,
});

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const STATUS_AR: Record<string, string> = {
  draft: "مسودة", sent: "مرسل", accepted: "مقبول", rejected: "مرفوض", expired: "منتهي",
};

function PrintQuotation() {
  const { id } = useParams({ from: "/_authenticated/print/quotation/$id" });
  const fetchQuote = useServerFn(getQuotation);
  const { data, isLoading } = useQuery({ queryKey: ["quotation", id], queryFn: () => fetchQuote({ data: { id } }) });

  useEffect(() => {
    document.documentElement.setAttribute("dir", "rtl");
  }, []);

  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">جاري التحميل…</div>;

  const q: any = data.quote;
  const company: any = data.company ?? {};
  const items: any[] = q.quotation_items ?? [];

  return (
    <div className="mx-auto max-w-[210mm] space-y-4">
      <style>{`@media print { .no-print { display: none !important; } @page { size: A4; margin: 12mm; } body { background: #fff; } }`}</style>

      <div className="no-print flex justify-end">
        <Button className="gap-2 gradient-primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> طباعة A4
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-8 text-sm shadow-card print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b pb-5">
          <div className="flex items-start gap-3">
            <img
              src="/brand/almugren-furniture-logo.jpeg"
              alt="شعار مصنع المقرن للأثاث"
              className="h-20 w-20 shrink-0 object-contain"
            />
            <div>
              <div className="text-xl font-bold text-primary">{company.name_ar ?? "مصنع ميسر عبدالرحمن المقرن للأثاث"}</div>
              {company.name_en && <div className="text-xs text-muted-foreground">{company.name_en}</div>}
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <div>الرقم الضريبي: <span dir="ltr">{company.vat_number ?? "—"}</span></div>
                {company.cr_number && <div>السجل التجاري: <span dir="ltr">{company.cr_number}</span></div>}
                <div>
                  {[company.address_building_no, company.address_street, company.address_district, company.address_city, company.address_postal_code]
                    .filter(Boolean).join("، ") || "—"}
                </div>
                {company.phone && <div dir="ltr">{company.phone}</div>}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
              <div className="text-xs opacity-80">عرض سعر</div>
              <div className="text-lg font-bold" dir="ltr">{q.quote_number}</div>
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <div>التاريخ: <span dir="ltr">{q.issue_date}</span></div>
              {q.valid_until && <div>صالح حتى: <span dir="ltr">{q.valid_until}</span></div>}
              <div>الحالة: {STATUS_AR[q.status] ?? q.status}</div>
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-lg border p-4">
          <div className="mb-1 text-xs font-semibold text-muted-foreground">العميل</div>
          <div className="font-bold">{q.customers?.name_ar}</div>
          <div className="text-xs text-muted-foreground">
            {[q.customers?.city, q.customers?.phone, q.customers?.vat_number && `الرقم الضريبي: ${q.customers.vat_number}`]
              .filter(Boolean).join(" · ")}
          </div>
        </section>

        <table className="mt-5 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted">
              <th className="border p-2 text-right">#</th>
              <th className="border p-2 text-right">الوصف</th>
              <th className="border p-2">الوحدة</th>
              <th className="border p-2">الكمية</th>
              <th className="border p-2">سعر الوحدة</th>
              <th className="border p-2">الخصم</th>
              <th className="border p-2">الخاضع للضريبة</th>
              <th className="border p-2">الضريبة</th>
              <th className="border p-2">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={i.id}>
                <td className="border p-2 text-center">{idx + 1}</td>
                <td className="border p-2">{i.description}</td>
                <td className="border p-2 text-center">{i.unit}</td>
                <td className="border p-2 text-center" dir="ltr">{Number(i.quantity)}</td>
                <td className="border p-2 text-center" dir="ltr">{money(i.unit_price)}</td>
                <td className="border p-2 text-center" dir="ltr">{money(i.discount_amount)}</td>
                <td className="border p-2 text-center" dir="ltr">{money(i.taxable_amount)}</td>
                <td className="border p-2 text-center" dir="ltr">{money(i.vat_amount)}</td>
                <td className="border p-2 text-center font-medium" dir="ltr">{money(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1 text-xs">
            <div className="flex justify-between"><span>الإجمالي قبل الخصم</span><span dir="ltr">{money(q.subtotal)}</span></div>
            <div className="flex justify-between"><span>الخصم</span><span dir="ltr">-{money(q.discount_total ?? 0)}</span></div>
            <div className="flex justify-between"><span>ضريبة القيمة المضافة 15%</span><span dir="ltr">{money(q.vat_amount)}</span></div>
            <div className="flex justify-between border-t pt-1 text-sm font-bold text-primary">
              <span>الإجمالي المستحق (ر.س)</span><span dir="ltr">{money(q.total)}</span>
            </div>
          </div>
        </div>

        {q.notes && (
          <section className="mt-5 rounded-lg border p-3 text-xs">
            <div className="font-semibold">ملاحظات</div>
            <p className="mt-1 text-muted-foreground">{q.notes}</p>
          </section>
        )}

        <section className="mt-5 rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
          <div className="font-semibold text-foreground">جدول الدفعات المعتمد عند التحويل لأمر بيع</div>
          <div>50% عند التوقيع · 30% عند إنجاز 50% من التصنيع · 20% قبل/عند التسليم (قابل للتعديل بإذن المدير).</div>
        </section>

        <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
          <div className="border-t pt-2 text-center">توقيع مصنع المقرن</div>
          <div className="border-t pt-2 text-center">توقيع العميل</div>
        </div>

        {data.audit.length > 0 && (
          <section className="no-print mt-6 border-t pt-3 text-[11px] text-muted-foreground">
            <div className="mb-1 font-semibold text-foreground">سجل التدقيق</div>
            {data.audit.map((a: any, i: number) => (
              <div key={i} dir="ltr" className="text-right">{a.created_at} — {a.action} {JSON.stringify(a.details)}</div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
