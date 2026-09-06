import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Printer, Send, Check, X, Stamp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getGeneratedDocument, logDocumentDelivery, reviseDocument, transitionDocument } from "@/lib/documents.functions";
import { DOC_KIND_LABEL, type DocKind } from "@/lib/documents-constants";
import { money, StatusBadge, useAr, useDocFail } from "@/components/app/documents-ui";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  head: () => ({
    meta: [
      { title: "معاينة وطباعة الوثيقة · AlMugren AI Factory OS" },
      { name: "description", content: "A4 branded document snapshot with approval trail, QR and print delivery log." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocumentViewer,
});

function DocumentViewer() {
  const { id } = useParams({ from: "/_authenticated/documents/$id" });
  const ar = useAr();
  const fail = useDocFail();
  const qc = useQueryClient();
  const t = (a: string, e: string) => (ar ? a : e);

  const fetchDoc = useServerFn(getGeneratedDocument);
  const transition = useServerFn(transitionDocument);
  const revise = useServerFn(reviseDocument);
  const logDelivery = useServerFn(logDocumentDelivery);

  const { data, isLoading } = useQuery({ queryKey: ["generated-doc", id], queryFn: () => fetchDoc({ data: { id } }) });
  const [qr, setQr] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const doc: any = data?.doc;
  const snap: any = doc?.snapshot ?? {};

  useEffect(() => {
    if (!doc?.qr_payload) { setQr(null); return; }
    void QRCode.toDataURL(doc.qr_payload, { margin: 0, width: 220 }).then(setQr).catch(() => setQr(null));
  }, [doc?.qr_payload]);

  const act = useMutation({
    mutationFn: (action: "submit" | "approve" | "reject" | "issue" | "void") =>
      transition({ data: { id, action, note: note || null } }),
    onSuccess: () => {
      toast.success(t("تم تنفيذ الإجراء", "Action completed"));
      setNote("");
      void qc.invalidateQueries({ queryKey: ["generated-doc", id] });
      void qc.invalidateQueries({ queryKey: ["generated-docs"] });
    },
    onError: fail,
  });

  const reviseMut = useMutation({
    mutationFn: () => revise({ data: { id, reason: note || "تصحيح" } }),
    onSuccess: () => { toast.success(t("تم إنشاء نسخة مصححة", "Corrected revision created")); void qc.invalidateQueries(); },
    onError: fail,
  });

  if (isLoading || !doc) return <div className="p-10 text-center text-muted-foreground">…</div>;

  const c = snap.company ?? {};
  const brand = snap.brand ?? {};
  const items: any[] = snap.items ?? [];
  const totals = snap.totals ?? {};
  const kindLabel = ar ? DOC_KIND_LABEL[doc.kind as DocKind].ar : DOC_KIND_LABEL[doc.kind as DocKind].en;
  const addr = c.address ?? {};

  function print() {
    logDelivery({ data: { id, channel: "print" } }).catch(() => undefined);
    window.print();
  }

  return (
    <div className="mx-auto max-w-[210mm] space-y-4">
      <style>{`@media print { .no-print { display:none !important; } @page { size: A4; margin: 12mm; } body { background:#fff; } }`}</style>

      <div className="no-print flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <StatusBadge status={doc.status} />
        <span className="text-sm text-muted-foreground" dir="ltr">
          {doc.doc_number ?? t("غير مرقّمة", "unnumbered")} · rev {doc.revision}
        </span>
        <Input
          className="h-9 w-56"
          placeholder={t("ملاحظة / سبب", "Note / reason")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {doc.status === "draft" && data?.can_edit && (
          <Button size="sm" variant="outline" className="gap-2" onClick={() => act.mutate("submit")}>
            <Send className="h-4 w-4" /> {t("إرسال للمراجعة", "Submit")}
          </Button>
        )}
        {doc.status === "review" && data?.can_approve && (
          <>
            <Button size="sm" className="gap-2 gradient-primary" onClick={() => act.mutate("approve")}>
              <Check className="h-4 w-4" /> {t("اعتماد", "Approve")}
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => act.mutate("reject")}>
              <X className="h-4 w-4" /> {t("إرجاع", "Reject")}
            </Button>
          </>
        )}
        {doc.status === "approved" && data?.can_approve && (
          <Button size="sm" className="gap-2 gradient-primary" onClick={() => act.mutate("issue")}>
            <Stamp className="h-4 w-4" /> {t("إصدار وترقيم", "Issue & number")}
          </Button>
        )}
        {doc.status === "issued" && data?.can_approve && (
          <>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => reviseMut.mutate()}>
              <RotateCcw className="h-4 w-4" /> {t("نسخة مصححة", "Corrected revision")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => act.mutate("void")}>{t("إلغاء", "Void")}</Button>
          </>
        )}
        <Button size="sm" className="ms-auto gap-2 gradient-primary" onClick={print}>
          <Printer className="h-4 w-4" /> {t("طباعة A4", "Print A4")}
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl border bg-card p-8 text-sm shadow-card print:border-0 print:shadow-none" dir="rtl">
        {brand.watermark_enabled && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ opacity: 0.14 }}>
            <img src="/brand/almugren-furniture-logo.jpeg" alt="" className="h-32 w-32 rotate-[-22deg] object-contain" />
          </div>
        )}

        <div className="relative">
          <header className="flex items-start justify-between gap-6 border-b pb-5" style={{ borderColor: brand.secondary }}>
            <div>
              <div className="text-xl font-bold" style={{ color: brand.primary }}>{c.legal_name_ar ?? "—"}</div>
              {c.name_en && <div className="text-xs text-muted-foreground">{c.name_en}</div>}
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <div>الرقم الضريبي: <span dir="ltr">{c.vat_number ?? "—"}</span></div>
                <div>السجل التجاري: <span dir="ltr">{c.cr_number ?? "—"}</span></div>
                <div>
                  {[addr.building_no, addr.street, addr.district, addr.city, addr.postal_code].filter(Boolean).join("، ") || "—"}
                </div>
                {addr.short_address && <div dir="ltr">{addr.short_address}</div>}
                {c.phone && <div dir="ltr">{c.phone}</div>}
                {c.email && <div dir="ltr">{c.email}</div>}
              </div>
            </div>
            <div className="text-left">
              <div className="rounded-lg px-4 py-2 text-white" style={{ background: brand.primary }}>
                <div className="text-xs opacity-80">{kindLabel}</div>
                <div className="text-lg font-bold" dir="ltr">{doc.doc_number ?? snap.source_number ?? "—"}</div>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <div>التاريخ: <span dir="ltr">{String(snap.source_date ?? "").slice(0, 10) || "—"}</span></div>
                <div>المرجع: <span dir="ltr">{snap.source_number ?? "—"}</span></div>
                {doc.revision > 1 && <div>نسخة مصححة رقم {doc.revision}</div>}
                {doc.status !== "issued" && <div className="font-semibold text-destructive">غير صادرة — للمعاينة فقط</div>}
              </div>
            </div>
          </header>

          {snap.party && (
            <section className="mt-5 rounded-lg border p-4">
              <div className="mb-1 text-xs font-semibold text-muted-foreground">الطرف الآخر</div>
              <div className="font-bold">{snap.party.name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {[snap.party.city, snap.party.phone, snap.party.vat_number && `الرقم الضريبي: ${snap.party.vat_number}`]
                  .filter(Boolean).join(" · ")}
              </div>
            </section>
          )}

          {items.length > 0 && (
            <table className="mt-5 w-full border-collapse text-xs">
              <thead>
                <tr style={{ background: `${brand.secondary}40` }}>
                  <th className="border p-2">#</th>
                  <th className="border p-2 text-right">الوصف</th>
                  <th className="border p-2">الكمية</th>
                  <th className="border p-2">سعر الوحدة</th>
                  <th className="border p-2">الخصم</th>
                  <th className="border p-2">الضريبة</th>
                  <th className="border p-2">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={i.id ?? idx}>
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">{i.description ?? i.item_description ?? i.area_name ?? "—"}</td>
                    <td className="border p-2 text-center" dir="ltr">{Number(i.quantity ?? i.quantity_received ?? 0)}</td>
                    <td className="border p-2 text-center" dir="ltr">{i.unit_price == null ? "—" : money(i.unit_price)}</td>
                    <td className="border p-2 text-center" dir="ltr">{i.discount_amount == null ? "—" : money(i.discount_amount)}</td>
                    <td className="border p-2 text-center" dir="ltr">{i.vat_amount == null ? "—" : money(i.vat_amount)}</td>
                    <td className="border p-2 text-center font-medium" dir="ltr">{i.line_total == null ? "—" : money(i.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totals.total != null && (
            <div className="mt-4 flex justify-end">
              <div className="w-72 space-y-1 text-xs">
                <div className="flex justify-between"><span>الإجمالي قبل الخصم</span><span dir="ltr">{money(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span>الخصم</span><span dir="ltr">-{money(totals.discount_total)}</span></div>
                <div className="flex justify-between"><span>ضريبة القيمة المضافة 15%</span><span dir="ltr">{money(totals.vat_amount)}</span></div>
                <div className="flex justify-between border-t pt-1 text-sm font-bold" style={{ color: brand.primary }}>
                  <span>الإجمالي المستحق (ر.س)</span><span dir="ltr">{money(totals.total)}</span>
                </div>
              </div>
            </div>
          )}

          {qr && (
            <div className="mt-5 flex items-center gap-3 rounded-lg border p-3">
              <img src={qr} alt="ZATCA QR" className="h-24 w-24" />
              <div className="text-[11px] text-muted-foreground">
                <div className="font-semibold text-foreground">رمز الاستجابة السريعة (هيئة الزكاة والضريبة والجمارك)</div>
                <div>المرحلة الأولى — بدون ختم تشفيري أو ربط مباشر مع فاتورة.</div>
              </div>
            </div>
          )}

          {snap.terms_ar && (
            <section className="mt-5 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
              <div className="mb-1 font-semibold text-foreground">الشروط والأحكام</div>
              {snap.terms_ar}
            </section>
          )}

          <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
            <div className="border-t pt-2 text-center">توقيع المصنع</div>
            <div className="border-t pt-2 text-center">توقيع الطرف الآخر</div>
          </div>

          {snap.footer_ar && <div className="mt-4 text-center text-[10px] text-muted-foreground">{snap.footer_ar}</div>}
        </div>
      </div>

      <div className="no-print rounded-xl border bg-card p-4 text-xs text-muted-foreground">
        <div className="mb-2 font-semibold text-foreground">سجل الاعتماد والتسليم</div>
        {(data?.approvals ?? []).map((a: any) => (
          <div key={a.id} dir="ltr" className="text-right">
            {String(a.created_at).slice(0, 19)} — {a.action}: {a.from_status} → {a.to_status} {a.note ? `· ${a.note}` : ""}
          </div>
        ))}
        {(data?.deliveries ?? []).map((d: any) => (
          <div key={d.id} dir="ltr" className="text-right">
            {String(d.created_at).slice(0, 19)} — {d.channel} {d.target_masked ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}
