import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BookOpen, FileUp, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { openSafeZip, type SafeZipEntry } from "@/lib/safe-zip";
import {
  createOriginalDesignFromReference,
  getDesignReferenceStats,
  importDesignReferences,
  listDesignReferences,
} from "@/lib/design-reference.functions";
import {
  createDesignReferenceImportJob,
  finalizeDesignReferenceImportJob,
  prepareDesignReferenceUpload,
  recordDesignReferenceImportDuplicate,
  recordDesignReferenceImportFailure,
  registerUploadedDesignReference,
} from "@/lib/design-reference-import.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant/references")({
  head: () => ({
    meta: [
      { title: "مكتبة مراجع التصميم · منصة المقرن" },
      { name: "description", content: "Private internal design-reference library with safe Bulk ZIP Import, human review and original-design safeguards." },
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
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function normalizePath(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

function extensionInfo(name: string) {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "jpg" || ext === "jpeg") return { extension: ext as "jpg" | "jpeg", contentType: "image/jpeg" as const };
  if (ext === "png") return { extension: "png" as const, contentType: "image/png" as const };
  if (ext === "webp") return { extension: "webp" as const, contentType: "image/webp" as const };
  return null;
}

async function hashSha256(bytes: Uint8Array) {
  const source = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(source).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function resolveZipEntry(entries: SafeZipEntry[], requested: string) {
  const wanted = normalizePath(requested);
  const exact = entries.filter((e) => normalizePath(e.name) === wanted);
  if (exact.length === 1) return exact[0];
  const suffix = entries.filter((e) => normalizePath(e.name).endsWith(`/${wanted}`));
  if (suffix.length === 1) return suffix[0];
  if (exact.length + suffix.length > 1) throw new Error(`ZIP_AMBIGUOUS_IMAGE:${wanted}`);
  throw new Error(`ZIP_IMAGE_NOT_FOUND:${wanted}`);
}

function mappedRow(r: CsvRow) {
  return {
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
  };
}

function validateBulkRows(rows: ReturnType<typeof mappedRow>[]) {
  const seen = new Set<string>();
  for (const r of rows) {
    if (!/^AM-REF-\d{4}$/.test(r.reference_code ?? "")) throw new Error(`INVALID_REFERENCE_CODE:${r.reference_code ?? ""}`);
    if (!r.title_ar || r.title_ar.length < 2) throw new Error(`INVALID_TITLE:${r.reference_code}`);
    if (!r.image_file) throw new Error(`MISSING_IMAGE_FILE:${r.reference_code}`);
    if (r.store_status !== "private_design_reference") throw new Error(`INVALID_STORE_STATUS:${r.reference_code}`);
    if (r.three_d_mode !== "parametric_original_design") throw new Error(`INVALID_3D_MODE:${r.reference_code}`);
    if (!extensionInfo(r.image_file)) throw new Error(`UNSUPPORTED_IMAGE_TYPE:${r.image_file}`);
    if (seen.has(r.reference_code!)) throw new Error(`DUPLICATE_REFERENCE_CODE_IN_CSV:${r.reference_code}`);
    seen.add(r.reference_code!);
  }
}

function DesignReferences() {
  const t = useT();
  const qc = useQueryClient();
  const list = useServerFn(listDesignReferences);
  const stats = useServerFn(getDesignReferenceStats);
  const importRows = useServerFn(importDesignReferences);
  const createOriginal = useServerFn(createOriginalDesignFromReference);
  const createImportJob = useServerFn(createDesignReferenceImportJob);
  const prepareUpload = useServerFn(prepareDesignReferenceUpload);
  const registerUpload = useServerFn(registerUploadedDesignReference);
  const recordDuplicate = useServerFn(recordDesignReferenceImportDuplicate);
  const recordFailure = useServerFn(recordDesignReferenceImportFailure);
  const finalizeJob = useServerFn(finalizeDesignReferenceImportJob);

  const [search, setSearch] = useState("");
  const [csvName, setCsvName] = useState("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ processed: number; total: number; imported: number; duplicates: number; failed: number } | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [changeSummary, setChangeSummary] = useState("");

  const refsQ = useQuery({ queryKey: ["design-references", search], queryFn: () => list({ data: { search: search || null, limit: 200 } }) });
  const statsQ = useQuery({ queryKey: ["design-reference-stats"], queryFn: () => stats() });
  const mapped = useMemo(() => csvRows.map(mappedRow), [csvRows]);

  const importM = useMutation({
    mutationFn: async () => {
      if (!mapped.length) throw new Error(t("ملف CSV فارغ", "CSV is empty"));
      let imported = 0;
      for (let i = 0; i < mapped.length; i += 100) {
        const result = await importRows({ data: { rows: mapped.slice(i, i + 100) as any } });
        imported += result.imported;
      }
      return imported;
    },
    onSuccess: async (count) => {
      toast.success(t(`تم استيراد ${count} مرجعًا كبيانات غير معتمدة للتصنيف`, `Imported ${count} references as unverified metadata`));
      setCsvRows([]); setCsvName("");
      await qc.invalidateQueries({ queryKey: ["design-references"] });
      await qc.invalidateQueries({ queryKey: ["design-reference-stats"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("فشل الاستيراد", "Import failed")),
  });

  const bulkM = useMutation({
    mutationFn: async () => {
      if (!zipFile) throw new Error(t("اختر ملف ZIP أولاً", "Choose a ZIP file first"));
      if (zipFile.size > 750 * 1024 * 1024) throw new Error("ZIP_FILE_TOO_LARGE");
      const archive = openSafeZip(await zipFile.arrayBuffer(), { maxEntries: 5000, maxEntryUncompressed: 25 * 1024 * 1024, maxTotalUncompressed: 1500 * 1024 * 1024 });
      const csvCandidates = archive.entries.filter((e) => e.name.toLowerCase().split("/").pop() === "design_references_import.csv");
      if (csvCandidates.length !== 1) throw new Error(csvCandidates.length ? "ZIP_MULTIPLE_IMPORT_CSV" : "ZIP_IMPORT_CSV_NOT_FOUND");
      const csvText = new TextDecoder("utf-8", { fatal: true }).decode(await archive.extract(csvCandidates[0]));
      const rows = parseCsv(csvText).map(mappedRow);
      if (!rows.length) throw new Error("ZIP_IMPORT_CSV_EMPTY");
      validateBulkRows(rows);
      for (const r of rows) resolveZipEntry(archive.entries, r.image_file!);

      const job = await createImportJob({ data: { file_name: zipFile.name, total_items: rows.length } });
      const progress = { processed: 0, total: rows.length, imported: 0, duplicates: 0, failed: 0 };
      setBulkProgress({ ...progress });

      for (const r of rows) {
        let uploadedPath: string | null = null;
        try {
          const entry = resolveZipEntry(archive.entries, r.image_file!);
          if (entry.uncompressedSize > 20 * 1024 * 1024) throw new Error(`IMAGE_TOO_LARGE:${r.reference_code}`);
          const info = extensionInfo(r.image_file!);
          if (!info) throw new Error(`UNSUPPORTED_IMAGE_TYPE:${r.image_file}`);
          const bytes = await archive.extract(entry);
          const hash = await hashSha256(bytes);
          const ticket = await prepareUpload({ data: {
            job_id: job.id,
            reference_code: r.reference_code!,
            image_sha256: hash,
            extension: info.extension,
            content_type: info.contentType,
            size: bytes.byteLength,
          } });

          if (ticket.action === "duplicate") {
            await recordDuplicate({ data: { job_id: job.id } });
            progress.duplicates += 1;
          } else {
            uploadedPath = ticket.path;
            const blob = new Blob([bytes], { type: info.contentType });
            const { error: uploadError } = await supabase.storage.from("design-references-private").uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: info.contentType, upsert: false });
            if (uploadError) throw new Error(`STORAGE_UPLOAD_FAILED:${uploadError.message}`);
            await registerUpload({ data: {
              job_id: job.id,
              reference_code: r.reference_code!,
              image_sha256: hash,
              extension: info.extension,
              content_type: info.contentType,
              size: bytes.byteLength,
              object_path: ticket.path,
              title_ar: r.title_ar!,
              collection_ar: r.collection_ar,
              source_file: r.source_file,
              image_width: r.image_width,
              image_height: r.image_height,
              copyright_note_ar: r.copyright_note_ar,
              three_d_template: r.three_d_template,
              design_instruction_ar: r.design_instruction_ar,
            } });
            progress.imported += 1;
          }
        } catch (error) {
          progress.failed += 1;
          const message = error instanceof Error ? error.message : "IMPORT_ITEM_FAILED";
          try { await recordFailure({ data: { job_id: job.id, message: `${r.reference_code}:${message}` } }); } catch { /* keep original failure */ }
          console.error("[DesignReferenceBulkImport]", r.reference_code, message, uploadedPath ?? "not-uploaded");
        } finally {
          progress.processed += 1;
          setBulkProgress({ ...progress });
        }
      }

      const final = await finalizeJob({ data: { job_id: job.id } });
      return final;
    },
    onSuccess: async (result) => {
      toast.success(t(`اكتمل الاستيراد: ${result.imported_items} جديد، ${result.duplicate_items} مكرر، ${result.failed_items} فشل`, `Import complete: ${result.imported_items} new, ${result.duplicate_items} duplicates, ${result.failed_items} failed`));
      setZipFile(null);
      await qc.invalidateQueries({ queryKey: ["design-references"] });
      await qc.invalidateQueries({ queryKey: ["design-reference-stats"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("فشل استيراد ZIP", "ZIP import failed")),
  });

  const originalM = useMutation({
    mutationFn: () => createOriginal({ data: { reference_id: selectedId, title_ar: originalTitle, change_summary: changeSummary, dimensions: {}, materials: {}, colors: {} } }),
    onSuccess: () => { toast.success(t("تم إنشاء مسودة تصميم أصلية منفصلة عن المرجع", "Created a separate original-design draft")); setSelectedId(""); setOriginalTitle(""); setChangeSummary(""); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("تعذر إنشاء التصميم", "Could not create design")),
  });

  const total = statsQ.data?.total ?? 0;
  const pct = bulkProgress?.total ? Math.round((bulkProgress.processed / bulkProgress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("إجمالي المراجع", "Total references")}</div><div className="mt-1 text-2xl font-bold">{total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("بانتظار مراجعة بشرية", "Pending human review")}</div><div className="mt-1 text-2xl font-bold">{statsQ.data?.pendingHuman ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("بانتظار تحليل AI", "Pending AI review")}</div><div className="mt-1 text-2xl font-bold">{statsQ.data?.pendingAi ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t("مخاطر حقوق مرتفعة", "High copyright risk")}</div><div className="mt-1 text-2xl font-bold">{statsQ.data?.highCopyrightRisk ?? 0}</div></CardContent></Card>
      </div>

      <Card className="border-primary/30 shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Archive className="h-4 w-4" />{t("Bulk ZIP Import — استيراد الحزمة الكاملة", "Bulk ZIP Import")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("ارفع ZIP يحتوي design_references_import.csv ومجلد images. يتم فك الحزمة محليًا في المتصفح، فحص CRC والمسارات، حساب SHA-256، منع التكرار، ثم رفع كل صورة مباشرة إلى التخزين الخاص عبر رابط موقّع. لا يمر ZIP الضخم عبر Vercel Functions.", "Upload a ZIP containing design_references_import.csv and images/. The browser safely validates/extracts it, hashes each image, deduplicates, then uploads images directly to private Storage with signed upload tokens. The large ZIP never passes through Vercel Functions.")}</p>
          <Input type="file" accept=".zip,application/zip" disabled={bulkM.isPending} onChange={(e) => { setZipFile(e.target.files?.[0] ?? null); setBulkProgress(null); }} />
          {zipFile && <div className="text-sm">{zipFile.name} · {(zipFile.size / 1024 / 1024).toFixed(1)} MB</div>}
          {bulkProgress && (
            <div className="space-y-2 rounded-xl border p-3 text-sm">
              <div className="flex justify-between"><span>{t("التقدم", "Progress")}</span><strong>{bulkProgress.processed}/{bulkProgress.total} · {pct}%</strong></div>
              <div className="h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>{t("جديد", "New")}: {bulkProgress.imported}</span><span>{t("مكرر", "Duplicate")}: {bulkProgress.duplicates}</span><span>{t("فشل", "Failed")}: {bulkProgress.failed}</span>
              </div>
            </div>
          )}
          <Button onClick={() => bulkM.mutate()} disabled={!zipFile || bulkM.isPending}>{bulkM.isPending ? t("جارٍ فحص ورفع الحزمة…", "Validating and uploading…") : t("ابدأ الاستيراد الآمن", "Start safe ZIP import")}</Button>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{t("الحماية: ZIP Slip محظور، الملفات المشفرة مرفوضة، JPG/PNG/WEBP فقط، حد الصورة 20MB، SHA-256 للتكرار، التخزين Private، وpublish_allowed=false دائمًا للمراجع.", "Safeguards: Zip Slip blocked, encrypted entries rejected, JPG/PNG/WEBP only, 20MB/image, SHA-256 deduplication, private Storage, and references remain publish_allowed=false.")}</div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileUp className="h-4 w-4" />{t("استيراد CSV فقط", "CSV metadata import")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("استخدمه للبيانات الوصفية فقط. لاستيراد الصور مع البيانات استخدم Bulk ZIP Import أعلاه.", "Use this for metadata only. Use Bulk ZIP Import above for images plus metadata.")}</p>
          <Input type="file" accept=".csv,text/csv" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const parsed = parseCsv(await file.text()); setCsvRows(parsed); setCsvName(file.name); }} />
          {csvName && <div className="text-sm">{csvName} · {csvRows.length} {t("سجل", "rows")}</div>}
          <Button onClick={() => importM.mutate()} disabled={!csvRows.length || importM.isPending}>{importM.isPending ? t("جارٍ الاستيراد…", "Importing…") : t("استيراد البيانات", "Import metadata")}</Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" />{t("المكتبة الداخلية", "Internal library")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("ابحث بالرمز أو العنوان أو التصنيف المعتمد", "Search code, title or reviewed category")} />
          <div className="grid gap-3 lg:grid-cols-2">
            {(refsQ.data ?? []).map((r: any) => (
              <div key={r.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-semibold">{r.reference_code}</div><div className="text-sm text-muted-foreground">{r.title_ar}</div></div><div className="flex flex-wrap gap-1"><Badge variant="outline">{r.human_review_status}</Badge><Badge variant="secondary">{r.classification_source}</Badge></div></div>
                <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2"><span>{t("التصنيف المبدئي", "Provisional")}: {r.provisional_collection_ar ?? "—"}</span><span>{t("التصنيف المعتمد", "Reviewed")}: {r.detected_category ?? "—"}</span><span>{t("المصدر", "Source")}: {r.source_file ?? "—"}</span><span>{t("الأبعاد", "Image size")}: {r.image_width ?? "—"}×{r.image_height ?? "—"}</span></div>
                <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setSelectedId(r.id); setOriginalTitle(`تصميم المقرن من ${r.reference_code}`); }}><Sparkles className="me-1 h-3.5 w-3.5" />{t("حوّل إلى تصميم أصلي", "Create original design")}</Button><Button asChild size="sm" variant="ghost"><Link to="/ai-assistant/render">{t("استوديو 3D", "3D studio")}</Link></Button></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedId && <Card className="border-primary/30 shadow-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />{t("إنشاء تصميم المقرن الأصلي", "Create original AlMuqrin design")}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>{t("اسم التصميم الجديد", "New design title")}</Label><Input value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} /></div><div className="space-y-2"><Label>{t("التغييرات الجوهرية المطلوبة", "Required substantive changes")}</Label><Textarea rows={4} value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder={t("غيّر النسب والهيكل والخامات والتفاصيل؛ اذكر التعديلات التي تجعل التصميم مستقلاً عن المرجع.", "Describe changes to proportions, structure, materials and details that make the new design distinct.")} /></div><div className="flex gap-2"><Button onClick={() => originalM.mutate()} disabled={originalM.isPending || originalTitle.trim().length < 3 || changeSummary.trim().length < 20}>{t("إنشاء المسودة", "Create draft")}</Button><Button variant="ghost" onClick={() => setSelectedId("")}>{t("إلغاء", "Cancel")}</Button></div><p className="text-xs text-muted-foreground">{t("لا ينشئ هذا الإجراء منتج متجر ولا يسمح بالنشر. المنتج التجاري يتطلب مسار اعتماد منفصل بعد مراجعة بشرية.", "This never creates or publishes a store product. Commercial publication requires a separate human-approved workflow.")}</p></CardContent></Card>}
    </div>
  );
}
