import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, ShieldCheck, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/verify/document")({
  head: () => ({ meta: [{ title: "التحقق من المستند · Factory OS" }] }),
  component: DocumentVerificationPage,
});

type Verification = {
  valid: boolean;
  company_name?: string;
  document_title?: string | null;
  document_reference?: string;
  generated_at?: string;
  status?: string;
  error?: string;
};

function DocumentVerificationPage() {
  const [result, setResult] = useState<Verification | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t") ?? "";
    const s = params.get("s") ?? "";
    fetch(`/api/public/document/verify?t=${encodeURIComponent(t)}&s=${encodeURIComponent(s)}`, { cache: "no-store" })
      .then(async (response) => ({ status: response.status, body: (await response.json()) as Verification }))
      .then(({ body }) => setResult(body))
      .catch(() => setResult({ valid: false, error: "verification_failed" }));
  }, []);

  const valid = result?.valid === true;
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-900 text-white">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">التحقق من صحة المستند</h1>
          <p className="mt-2 text-sm text-slate-500">خدمة التحقق من المستندات الصادرة من المنصة</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {!result ? <FileCheck2 className="h-5 w-5" /> : valid ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
              {!result ? "جارٍ التحقق…" : valid ? "المستند صحيح وموقع من النظام" : "تعذر التحقق من المستند"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {valid && result ? (
              <dl className="grid gap-4 text-sm">
                <Row label="المنشأة" value={result.company_name || "—"} />
                <Row label="عنوان المستند" value={result.document_title || "مستند صادر من المنصة"} />
                <Row label="المرجع" value={result.document_reference || "—"} />
                <Row label="وقت إنشاء رمز التحقق" value={formatDate(result.generated_at)} />
                <Row label="الحالة" value="صادر من المنصة" />
              </dl>
            ) : result ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                رمز التحقق غير صالح أو تم تغييره. لا تعتمد المستند قبل الرجوع إلى الجهة المصدرة.
              </div>
            ) : (
              <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-400">لا يعرض رمز التحقق بيانات مالية أو شخصية حساسة للعامة.</p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-slate-100 pb-3 last:border-0"><dt className="text-slate-500">{label}</dt><dd className="font-medium break-words">{value}</dd></div>;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("ar-SA");
}
