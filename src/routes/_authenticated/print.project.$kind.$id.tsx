import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPrintDoc } from "@/lib/projects.functions";

export const Route = createFileRoute("/_authenticated/print/project/$kind/$id")({
  head: () => ({
    meta: [
      { title: "طباعة مستند المشروع · AlMugren AI Factory OS" },
      { name: "description", content: "A4 printable project document with AlMugren Factory branding." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrintProjectDoc,
});

const TITLES: Record<string, string> = {
  survey: "محضر معاينة موقع",
  installation: "أمر تركيب",
  delivery: "إذن تسليم",
  handover: "محضر استلام",
  warranty: "شهادة ضمان",
  service: "تقرير زيارة صيانة",
};

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

function PrintProjectDoc() {
  const { kind, id } = useParams({ from: "/_authenticated/print/project/$kind/$id" });
  const fetchDoc = useServerFn(getPrintDoc);
  const { data, isLoading } = useQuery({ queryKey: ["print-doc", kind, id], queryFn: () => fetchDoc({ data: { kind: kind as any, id } }) });

  useEffect(() => { document.documentElement.setAttribute("dir", "rtl"); }, []);
  if (isLoading || !data) return <div className="p-10 text-center text-muted-foreground">جاري التحميل…</div>;

  const company: any = data.company ?? {};
  const row: any = data.row;
  const project = row.projects ?? row.warranty_claims?.projects ?? {};
  const customer = project?.customers ?? row.customers ?? {};
  const docNumber = row.survey_number ?? row.io_number ?? row.dn_number ?? row.handover_number ?? row.warranty_number ?? row.visit_number ?? "";

  return (
    <div className="mx-auto max-w-[210mm] space-y-4">
      <style>{`@media print { .no-print { display: none !important; } @page { size: A4; margin: 12mm; } body { background: #fff; } }`}</style>
      <div className="no-print flex justify-end">
        <Button className="gap-2 gradient-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> طباعة A4</Button>
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
                <div>
                  {[company.address_building_no, company.address_street, company.address_district, company.address_city, company.address_postal_code].filter(Boolean).join("، ") || "—"}
                </div>
                {company.phone && <div dir="ltr">{company.phone}</div>}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
              <div className="text-xs opacity-80">{TITLES[kind] ?? "مستند"}</div>
              <div className="text-lg font-bold" dir="ltr">{docNumber}</div>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">المشروع</div>
            <div className="font-bold">{project?.name_ar ?? "—"}</div>
            <div className="text-xs text-muted-foreground" dir="ltr">{project?.project_number ?? ""}</div>
            {project?.site_address && <div className="mt-1 text-xs">{project.site_address}</div>}
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">العميل</div>
            <div className="font-bold">{customer?.name_ar ?? "—"}</div>
            <div className="text-xs text-muted-foreground" dir="ltr">{customer?.phone ?? ""}</div>
          </div>
        </section>

        <section className="mt-5 rounded-lg border p-4">
          {kind === "survey" && (
            <>
              <Row label="تاريخ الزيارة" value={row.visit_date} />
              <Row label="المراجعة" value={row.revision} />
              <Row label="ظروف الموقع" value={row.site_conditions} />
              <Row label="المخاطر" value={row.risks} />
              <table className="mt-4 w-full border-collapse text-xs">
                <thead><tr className="bg-muted"><th className="border p-2">المنطقة</th><th className="border p-2">البند</th><th className="border p-2">الأبعاد</th><th className="border p-2">الكمية</th></tr></thead>
                <tbody>
                  {(row.site_measurements ?? []).map((m: any) => (
                    <tr key={m.id}>
                      <td className="border p-2">{m.area_name}</td>
                      <td className="border p-2">{m.item_description}</td>
                      <td className="border p-2" dir="ltr">{[m.length_value, m.width_value, m.height_value].filter(Boolean).join(" × ")} {m.unit}</td>
                      <td className="border p-2" dir="ltr">{m.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {kind === "installation" && (
            <>
              <Row label="التاريخ المجدول" value={`${row.scheduled_date ?? "—"} ${row.scheduled_time ?? ""}`} />
              <Row label="الفريق" value={row.installation_teams?.name_ar} />
              <Row label="المركبة" value={row.installation_teams?.vehicle_plate} />
              <Row label="جهة الاتصال" value={`${row.contact_name ?? "—"} ${row.contact_phone ?? ""}`} />
              <Row label="العنوان" value={row.site_address} />
              <Row label="التعليمات" value={row.notes} />
            </>
          )}
          {kind === "delivery" && (
            <>
              <Row label="تاريخ التسليم" value={row.delivery_date} />
              <Row label="أمر البيع" value={row.sales_orders?.order_number} />
              <Row label="المستلم" value={`${row.received_by ?? "—"} ${row.received_id_number ?? ""}`} />
              <table className="mt-4 w-full border-collapse text-xs">
                <thead><tr className="bg-muted"><th className="border p-2">البند</th><th className="border p-2">الوحدة</th><th className="border p-2">الكمية</th></tr></thead>
                <tbody>
                  {(row.delivery_note_items ?? []).map((i: any) => (
                    <tr key={i.id}><td className="border p-2">{i.description}</td><td className="border p-2">{i.unit}</td><td className="border p-2" dir="ltr">{i.quantity}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {kind === "handover" && (
            <>
              <Row label="نوع الاستلام" value={row.handover_type === "final" ? "استلام نهائي" : "استلام ابتدائي"} />
              <Row label="التاريخ" value={row.handover_date} />
              <Row label="ممثل العميل" value={`${row.customer_representative ?? "—"} ${row.representative_id_number ?? ""}`} />
              <Row label="الملاحظات" value={row.notes} />
              <table className="mt-4 w-full border-collapse text-xs">
                <thead><tr className="bg-muted"><th className="border p-2">ملاحظة الاستلام</th><th className="border p-2">الموقع</th><th className="border p-2">حرجة</th><th className="border p-2">الحالة</th></tr></thead>
                <tbody>
                  {(row.snag_items ?? []).map((s: any) => (
                    <tr key={s.id}><td className="border p-2">{s.title_ar}</td><td className="border p-2">{s.location_note ?? "—"}</td><td className="border p-2">{s.is_critical ? "نعم" : "لا"}</td><td className="border p-2">{s.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {kind === "warranty" && (
            <>
              <Row label="من" value={row.start_date} />
              <Row label="إلى" value={row.end_date} />
              <Row label="النطاق" value={row.scope_ar} />
              <div className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{row.terms_ar ?? ""}</div>
            </>
          )}
          {kind === "service" && (
            <>
              <Row label="البلاغ" value={row.warranty_claims?.claim_number} />
              <Row label="وصف البلاغ" value={row.warranty_claims?.description} />
              <Row label="تاريخ التنفيذ" value={row.performed_at} />
              <Row label="القطع المستخدمة" value={row.parts_used} />
              <Row label="النتيجة" value={row.outcome} />
            </>
          )}
        </section>

        <footer className="mt-8 grid grid-cols-2 gap-8 text-xs">
          <div className="border-t pt-2 text-center">توقيع ممثل المصنع</div>
          <div className="border-t pt-2 text-center">توقيع ممثل العميل</div>
        </footer>
      </div>
    </div>
  );
}
