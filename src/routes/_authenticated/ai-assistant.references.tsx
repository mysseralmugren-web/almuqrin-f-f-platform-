import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, FileUp, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/theme";
import {
  createOriginalDesignFromReference,
  getDesignReferenceStats,
  importDesignReferences,
  listDesignReferences,
} from "@/lib/design-reference.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant/references")({
  head: () => ({
    meta: [
      { title: "مكتبة مراجع التصميم · منصة المقرن" },
      {
        name: "description",
        content: "Private internal design-reference library with human review and original-design safeguards.",
      },
    ],
  }),
  component: DesignReferences,
});

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some(Boolean)).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])),
  );
}

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function DesignReferences() {
  const t = useT();
  const qc = useQueryClient();
  const list = useServerFn(listDesignReferences);
  const stats = useServerFn(getDesignReferenceStats);
  const importRows = useServerFn(importDesignReferences);
  const createOriginal = useServerFn(createOriginalDesignFromReference);
  const [search, setSearch] = useState("");
  const [csvName, setCsvName] = useState("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [changeSummary, setChangeSummary] = useState("");

  const refsQ = useQuery({
    queryKey: ["design-references", search],
    queryFn: () => list({ data: { search: search || null, limit: 200 } }),
  });
  const statsQ = useQuery({ queryKey: ["design-reference-stats"], queryFn: () => stats() });

  const mapped = useMemo(
    () =>
      csvRows.map((r) => ({
        reference_code: r.reference_code?.trim(),
        title_ar: r.title_ar?.trim(),
        collection_ar: r.collection_ar?.trim() || null,
        image_file: r.image_file?.trim() || null,
        source_file: r.source_file?.trim() || null,
        image_width: toNumber(r.image_width),
        image_height: toNumber(r.image_height),
        store_status: r.store_status?.trim(),
        copyright_note_ar: r.copyright_note_ar?.trim() || null,
        three_d_mode: r.three_d_mode?.trim(),
        three_d_template: r.three_d_template?.trim() || null,
        design_instruction_ar: r.design_instruction_ar?.trim() || null,
      })),
    [csvRows],
  );

  const importM = useMutation({
    mutationFn: async () => {
      if (!mapped.length) throw new Error(t("ملف CSV فارغ", "CSV is empty"));
      let imported = 0;
      for (let i = 0; i < mapped.length; i += 100) {
        const chunk = mapped.slice(i, i + 100) as any;
        const result = await importRows({ data: { rows: chunk } });
        imported += result.imported;
      }
      return imported;
    },
    onSuccess: async (count) => {
      toast.success(t(`تم استيراد ${count} مرجعًا كبيانات غير معتمدة للتصنيف`, `Imported ${count} references as unverified metadata`));
      setCsvRows([]);
      setCsvName("");
      await qc.invalidateQueries({ queryKey: ["design-references"] });
      await qc.invalidateQueries({ queryKey: ["design-reference-stats"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("فشل الاستيراد", "Import failed")),
  });

  const originalM = useMutation({
    mutationFn: () =>
      createOriginal({
        data: {
          reference_id: selectedId,
          title_ar: originalTitle,
          change_summary: changeSummary,
          dimensions: {},
          materials: {},
          colors: {},
        },
      }),
    onSuccess: () => {
      toast.success(t("تم إنشاء مسودة تصميم أصلية منفصلة عن المرجع", "Created a separate original-design draft"));
      setSelectedId("");
      setOriginalTitle("");
      setChangeSummary("");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("تعذر إنشاء التصميم", "Could not create design")),
  });

  const total = statsQ.data?.total ?? 0;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("إجمالي المراجع", "Total references")}</div><div className="mt-1 text-2xl font-bold">{total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("بانتظار مراجعة بشرية", "Pending human review")}</div><div className="mt-1 text-2xl font-bold">{statsQ.data?.pendingHuman ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("بانتظار تحليل AI", "Pending AI review")}</div><div className="mt-1 text-2xl font-bold">{statsQ.data?.pendingAi ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("مخاطر حقوق مرتفعة", "High copyright risk")}</div><div className="mt-1 text-2xl font-bold">{statsQ.data?.highCopyrightRisk ?? 0}</div></CardContent></Card>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileUp className="h-4 w-4" />{t("استيراد ملف المراجع", "Import references")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t(
              "يُحفظ collection_ar كتصنيف مبدئي غير معتمد فقط. جميع المراجع تبقى private_design_reference وpublish_allowed=false حتى بعد المراجعة.",
              "collection_ar is retained only as an unverified provisional label. References always remain private and non-publishable.",
            )}
          </p>
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const parsed = parseCsv(text);
              setCsvRows(parsed);
              setCsvName(file.name);
            }}
          />
          {csvName && <div className="text-sm">{csvName} · {csvRows.length} {t("سجل", "rows")}</div>}
          <Button onClick={() => importM.mutate()} disabled={!csvRows.length || importM.isPending}>
            {importM.isPending ? t("جارٍ الاستيراد…", "Importing…") : t("استيراد آمن", "Safe import")}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" />{t("المكتبة الداخلية", "Internal library")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("ابحث بالرمز أو العنوان أو التصنيف المعتمد", "Search code, title or reviewed category")} />
          <div className="grid gap-3 lg:grid-cols-2">
            {(refsQ.data ?? []).map((r: any) => (
              <div key={r.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r.reference_code}</div>
                    <div className="text-sm text-muted-foreground">{r.title_ar}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{r.human_review_status}</Badge>
                    <Badge variant="secondary">{r.classification_source}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>{t("التصنيف المبدئي", "Provisional")}: {r.provisional_collection_ar ?? "—"}</span>
                  <span>{t("التصنيف المعتمد", "Reviewed")}: {r.detected_category ?? "—"}</span>
                  <span>{t("المصدر", "Source")}: {r.source_file ?? "—"}</span>
                  <span>{t("الأبعاد", "Image size")}: {r.image_width ?? "—"}×{r.image_height ?? "—"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedId(r.id); setOriginalTitle(`تصميم المقرن من ${r.reference_code}`); }}>
                    <Sparkles className="me-1 h-3.5 w-3.5" />{t("حوّل إلى تصميم أصلي", "Create original design")}
                  </Button>
                  <Button asChild size="sm" variant="ghost"><Link to="/ai-assistant/render">{t("استوديو 3D", "3D studio")}</Link></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedId && (
        <Card className="border-primary/30 shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />{t("إنشاء تصميم المقرن الأصلي", "Create original AlMuqrin design")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>{t("اسم التصميم الجديد", "New design title")}</Label><Input value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>{t("التغييرات الجوهرية المطلوبة", "Required substantive changes")}</Label><Textarea rows={4} value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder={t("غيّر النسب والهيكل والخامات والتفاصيل؛ اذكر التعديلات التي تجعل التصميم مستقلاً عن المرجع.", "Describe changes to proportions, structure, materials and details that make the new design distinct.")} /></div>
            <div className="flex gap-2">
              <Button onClick={() => originalM.mutate()} disabled={originalM.isPending || originalTitle.trim().length < 3 || changeSummary.trim().length < 20}>{t("إنشاء المسودة", "Create draft")}</Button>
              <Button variant="ghost" onClick={() => setSelectedId("")}>{t("إلغاء", "Cancel")}</Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("لا ينشئ هذا الإجراء منتج متجر ولا يسمح بالنشر. المنتج التجاري يتطلب مسار اعتماد منفصل بعد مراجعة بشرية.", "This never creates or publishes a store product. Commercial publication requires a separate human-approved workflow.")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
