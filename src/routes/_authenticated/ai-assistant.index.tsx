import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Play, Ban, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT, useTheme } from "@/lib/theme";
import { AI_FILE_KINDS, AI_JOB_KIND, AI_JOB_STATUS, labelOf, type AiJobKind } from "@/lib/ai-constants";
import { AiChip, AiLoading, ConfidenceBadge, newIdempotencyKey, uploadToSignedUrl, useAiFail, validateFile } from "@/components/app/ai-ui";
import {
  getAiAccess, listAiJobs, createAiJob, createAiUploadUrl, registerAiFile, runAiJob, cancelAiJob, deleteAiJob,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai-assistant/")({
  head: () => ({
    meta: [
      { title: "صندوق مهام الموظف الذكي · AlMugren AI Factory OS" },
      { name: "description", content: "Upload documents and images, track AI processing status and open results for review." },
    ],
  }),
  component: AiInbox,
});

function AiInbox() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useAiFail();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAccess = useServerFn(getAiAccess);
  const fetchJobs = useServerFn(listAiJobs);
  const addJob = useServerFn(createAiJob);
  const signUpload = useServerFn(createAiUploadUrl);
  const register = useServerFn(registerAiFile);
  const run = useServerFn(runAiJob);
  const cancel = useServerFn(cancelAiJob);
  const remove = useServerFn(deleteAiJob);

  const [kind, setKind] = useState<AiJobKind>("supplier_invoice");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const accessQ = useQuery({ queryKey: ["ai-access"], queryFn: () => fetchAccess() });
  const jobsQ = useQuery({
    queryKey: ["ai-jobs", filterKind, filterStatus],
    queryFn: () => fetchJobs({ data: { kind: filterKind === "all" ? null : (filterKind as AiJobKind), status: filterStatus === "all" ? null : (filterStatus as any) } }),
    refetchInterval: 15000,
  });

  const allowedKinds = AI_FILE_KINDS.filter((k) => accessQ.data?.kinds?.[k]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ai-jobs"] });

  const submit = async () => {
    if (files.length === 0) return toast.error(t("أضف ملفًا واحدًا على الأقل", "Attach at least one file"));
    for (const f of files) {
      const bad = validateFile(f);
      if (bad) return fail(new Error(bad));
    }
    setBusy(true);
    try {
      const job = await addJob({ data: { kind, title: title || null, idempotency_key: newIdempotencyKey(kind), input_params: note ? { context: note } : {} } });
      for (const f of files) {
        const signed = await signUpload({ data: { job_id: job.id, file_name: f.name, mime_type: f.type as any, size_bytes: f.size } });
        await uploadToSignedUrl(signed.path, signed.token, f);
        await register({ data: { job_id: job.id, object_path: signed.path, file_name: f.name, mime_type: f.type as any, size_bytes: f.size } });
      }
      toast.success(t("تم إنشاء المهمة، جارٍ التحليل", "Job created, analysis started"));
      setFiles([]);
      setTitle("");
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
      refresh();
      await run({ data: { id: job.id, context_note: note || null } });
      toast.success(t("اكتمل التحليل — النتائج بانتظار المراجعة", "Analysis completed — results await review"));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const mRun = useMutation({ mutationFn: (id: string) => run({ data: { id } }), onSuccess: () => { toast.success(t("اكتمل التحليل", "Analysis completed")); refresh(); }, onError: (e) => { fail(e); refresh(); } });
  const mCancel = useMutation({ mutationFn: (id: string) => cancel({ data: { id } }), onSuccess: refresh, onError: fail });
  const mDelete = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onMutate: async (id: string) => {
      setDeletingId(id);
      await qc.cancelQueries({ queryKey: ["ai-jobs"] });
      const snapshots = qc.getQueriesData({ queryKey: ["ai-jobs"] });
      qc.setQueriesData({ queryKey: ["ai-jobs"] }, (old: any) =>
        Array.isArray(old) ? old.filter((job: any) => job.id !== id) : old,
      );
      return { snapshots };
    },
    onSuccess: () => {
      toast.success(t("تم الحذف مع ملفاته", "Deleted with its files"));
    },
    onError: (e, _id, context) => {
      context?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      fail(e);
    },
    onSettled: () => {
      setDeletingId(null);
      refresh();
    },
  });

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base">{t("مهمة تحليل جديدة", "New analysis job")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("نوع التحليل", "Analysis kind")}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as AiJobKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowedKinds.map((k) => (
                  <SelectItem key={k} value={k}>{labelOf(AI_JOB_KIND, k, ar)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allowedKinds.length === 0 && (
              <p className="text-xs text-destructive">{t("لا تملك صلاحية لأي نوع تحليل", "You have no permitted analysis kinds")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("عنوان المهمة (اختياري)", "Job title (optional)")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("الملفات (PDF أو صورة، حتى 20 ميجابايت)", "Files (PDF or image, up to 20MB)")}</Label>
            <Input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground" dir="ltr">{files.map((f) => f.name).join(" · ")}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("ملاحظات أو سياق إضافي", "Extra context")}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={submit} disabled={busy || allowedKinds.length === 0} className="gap-2">
              <FileUp className="h-4 w-4" />
              {busy ? t("جارٍ التحليل…", "Analyzing…") : t("رفع وتحليل", "Upload & analyze")}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("كل نتيجة تُحفظ كمسودة ولا يتم إنشاء أي قيد أو مستند قبل اعتماد مستخدم مخوّل.", "Every result is stored as a draft; no record or ledger entry is created before an authorized user approves it.")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">{t("صندوق المهام", "Task inbox")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={filterKind} onValueChange={setFilterKind}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("كل الأنواع", "All kinds")}</SelectItem>
                {Object.keys(AI_JOB_KIND).map((k) => (<SelectItem key={k} value={k}>{labelOf(AI_JOB_KIND, k, ar)}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("كل الحالات", "All statuses")}</SelectItem>
                {Object.keys(AI_JOB_STATUS).map((k) => (<SelectItem key={k} value={k}>{labelOf(AI_JOB_STATUS, k, ar)}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {jobsQ.isLoading ? (
            <AiLoading label={t("جارٍ التحميل…", "Loading…")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم المهمة", "Job #")}</TableHead>
                  <TableHead>{t("النوع", "Kind")}</TableHead>
                  <TableHead>{t("العنوان", "Title")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead>{t("الثقة", "Confidence")}</TableHead>
                  <TableHead>{t("المحاولات", "Attempts")}</TableHead>
                  <TableHead className="text-end">{t("إجراءات", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(jobsQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{t("لا توجد مهام بعد", "No jobs yet")}</TableCell></TableRow>
                )}
                {(jobsQ.data ?? []).map((j: any) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium" dir="ltr">
                      <Link to="/ai-assistant/$id" params={{ id: j.id }} className="text-primary hover:underline">{j.job_number}</Link>
                    </TableCell>
                    <TableCell>{labelOf(AI_JOB_KIND, j.kind, ar)}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{j.title ?? "—"}</TableCell>
                    <TableCell><AiChip value={j.status} label={labelOf(AI_JOB_STATUS, j.status, ar)} /></TableCell>
                    <TableCell><ConfidenceBadge value={j.confidence} /></TableCell>
                    <TableCell dir="ltr">{j.attempts}/{j.max_attempts}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {(j.status === "queued" || j.status === "failed") && (
                          <Button size="sm" variant="ghost" onClick={() => mRun.mutate(j.id)} disabled={mRun.isPending || deletingId === j.id}>
                            {j.status === "failed" ? <RefreshCw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        )}
                        {j.status === "queued" && (
                          <Button size="sm" variant="ghost" onClick={() => mCancel.mutate(j.id)} disabled={deletingId === j.id}><Ban className="h-4 w-4" /></Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => mDelete.mutate(j.id)} disabled={mDelete.isPending || deletingId === j.id}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
