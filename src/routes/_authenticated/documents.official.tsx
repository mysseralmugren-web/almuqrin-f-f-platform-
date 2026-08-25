import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderArchive, Upload, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createCompanyDocUploadUrl, deleteCompanyDocFile, getCompanyDocFileUrl, listCompanyDocuments,
  registerCompanyDocFile, saveCompanyDocument, setCompanyDocumentStatus,
} from "@/lib/documents.functions";
import { COMPANY_DOC_STATUS_LABEL, COMPANY_DOC_TYPES, DOC_FILE_MAX_MB, DOC_FILE_MIME } from "@/lib/documents-constants";
import { StatusBadge, useAr, useDocFail } from "@/components/app/documents-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/documents/official")({
  head: () => ({
    meta: [
      { title: "المستندات الرسمية للمنشأة · AlMugren AI Factory OS" },
      { name: "description", content: "Commercial registration, VAT certificate and address proof with expiry tracking." },
    ],
  }),
  component: OfficialDocsPage,
});

const EMPTY = { doc_type: "cr", title: "", reference_no: "", issued_on: "", expires_on: "", notes: "" };

function OfficialDocsPage() {
  const t = useT();
  const ar = useAr();
  const fail = useDocFail();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY });

  const list = useServerFn(listCompanyDocuments);
  const saveDoc = useServerFn(saveCompanyDocument);
  const setStatus = useServerFn(setCompanyDocumentStatus);
  const createUrl = useServerFn(createCompanyDocUploadUrl);
  const register = useServerFn(registerCompanyDocFile);
  const getUrl = useServerFn(getCompanyDocFileUrl);
  const delFile = useServerFn(deleteCompanyDocFile);

  const { data: docs = [] } = useQuery({ queryKey: ["company-docs"], queryFn: () => list({}) });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["company-docs"] });

  const create = useMutation({
    mutationFn: () =>
      saveDoc({
        data: {
          doc_type: form['doc_type'] as never,
          title: form['title'] ?? "",
          reference_no: form['reference_no'] || null,
          issued_on: form['issued_on'] || null,
          expires_on: form['expires_on'] || null,
          notes: form['notes'] || null,
        },
      }),
    onSuccess: () => { toast.success(t("تم إنشاء المستند", "Record created")); setForm({ ...EMPTY }); invalidate(); },
    onError: fail,
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: string }) => setStatus({ data: v as never }),
    onSuccess: () => { toast.success(t("تم تحديث الحالة", "Status updated")); invalidate(); },
    onError: fail,
  });

  const removeFile = useMutation({
    mutationFn: (file_id: string) => delFile({ data: { file_id } }),
    onSuccess: () => { toast.success(t("تم الحذف", "Deleted")); invalidate(); },
    onError: fail,
  });

  async function openFile(file_id: string) {
    try {
      const res = await getUrl({ data: { file_id } });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) { fail(e); }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadFor) return;
    try {
      if (!(DOC_FILE_MIME as readonly string[]).includes(file.type)) throw new Error("FILE_TYPE_NOT_ALLOWED");
      if (file.size > DOC_FILE_MAX_MB * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
      const signed = await createUrl({
        data: { company_document_id: uploadFor, file_name: file.name, content_type: file.type, size_bytes: file.size },
      });
      const put = await fetch(signed.signed_url, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!put.ok) throw new Error(await put.text());
      await register({
        data: {
          company_document_id: uploadFor, object_path: signed.path, file_name: file.name,
          content_type: file.type, size_bytes: file.size,
        },
      });
      toast.success(t("تم رفع الملف", "File uploaded"));
      invalidate();
    } catch (err) { fail(err); }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <input ref={fileInput} type="file" className="hidden" accept={DOC_FILE_MIME.join(",")} onChange={onPick} />

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderArchive className="h-4 w-4 text-primary" />
            {t("إضافة مستند رسمي", "Add an official record")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("النوع", "Type")}</Label>
              <Select value={form['doc_type']} onValueChange={(v) => setForm((f) => ({ ...f, doc_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_DOC_TYPES.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{ar ? d.ar : d.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("العنوان", "Title")}</Label>
              <Input required value={form['title'] ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("الرقم المرجعي", "Reference no.")}</Label>
              <Input value={form['reference_no'] ?? ""} onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("تاريخ الإصدار", "Issued on")}</Label>
              <Input type="date" value={form['issued_on'] ?? ""} onChange={(e) => setForm((f) => ({ ...f, issued_on: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("تاريخ الانتهاء", "Expires on")}</Label>
              <Input type="date" value={form['expires_on'] ?? ""} onChange={(e) => setForm((f) => ({ ...f, expires_on: e.target.value }))} />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={create.isPending} className="gradient-primary font-semibold">
                {t("إضافة", "Add")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {docs.length === 0 && (
          <Card className="shadow-card lg:col-span-2">
            <CardContent className="py-10 text-center text-muted-foreground">
              {t("لا توجد مستندات رسمية مسجلة", "No official records yet")}
            </CardContent>
          </Card>
        )}
        {docs.map((d: any) => {
          const expired = d.expires_on && d.expires_on < today;
          return (
            <Card key={d.id} className="shadow-card">
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {d.reference_no ?? "—"} · {d.issued_on ?? "—"} → {d.expires_on ?? "—"}
                  </p>
                </div>
                <StatusBadge
                  status={expired ? "expired" : d.status}
                  label={
                    COMPANY_DOC_STATUS_LABEL[expired ? "expired" : d.status]
                      ? ar
                        ? COMPANY_DOC_STATUS_LABEL[expired ? "expired" : d.status]!.ar
                        : COMPANY_DOC_STATUS_LABEL[expired ? "expired" : d.status]!.en
                      : d.status
                  }
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {expired && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                    {t("منتهي الصلاحية — يلزم رفع نسخة سارية ومراجعتها.", "Expired — upload a valid copy and review it.")}
                  </p>
                )}
                <ul className="space-y-1 text-sm">
                  {(d.files ?? []).map((f: any) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                      <span className="truncate" dir="ltr">{f.file_name}</span>
                      <span className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" onClick={() => void openFile(f.id)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeFile.mutate(f.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </span>
                    </li>
                  ))}
                  {(d.files ?? []).length === 0 && (
                    <li className="text-xs text-muted-foreground">{t("لا توجد ملفات مرفقة", "No files attached")}</li>
                  )}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => { setUploadFor(d.id); fileInput.current?.click(); }}
                  >
                    <Upload className="h-4 w-4" /> {t("رفع ملف", "Upload")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: d.id, status: "review" })}>
                    {t("مراجعة", "Review")}
                  </Button>
                  <Button size="sm" className="gradient-primary" onClick={() => statusMut.mutate({ id: d.id, status: "approved" })}>
                    {t("اعتماد", "Approve")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: d.id, status: "rejected" })}>
                    {t("رفض", "Reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
