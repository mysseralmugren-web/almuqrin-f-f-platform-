import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileCheck2, FileUp, Scale, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/theme";
import { createAiJob, createAiUploadUrl, registerAiFile, runAiJob } from "@/lib/ai.functions";
import { newIdempotencyKey, uploadToSignedUrl, useAiFail, validateFile } from "@/components/app/ai-ui";

export const Route = createFileRoute("/_authenticated/ai-assistant/legal")({
  head: () => ({
    meta: [
      { title: "المحامي الذكي · منصة المقرن" },
      {
        name: "description",
        content: "مراجعة العقود والشروط والتسليم والبيع الآجل والمستندات مع إبقاء القرار النهائي لدى الإدارة المختصة.",
      },
    ],
  }),
  component: LegalAiWorkspace,
});

const MAX_FILE_BYTES = 20 * 1024 * 1024;

function LegalAiWorkspace() {
  const t = useT();
  const fail = useAiFail();
  const inputRef = useRef<HTMLInputElement>(null);
  const addJob = useServerFn(createAiJob);
  const signUpload = useServerFn(createAiUploadUrl);
  const register = useServerFn(registerAiFile);
  const run = useServerFn(runAiJob);

  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastJob, setLastJob] = useState<{ id: string; job_number?: string } | null>(null);

  const submit = async () => {
    if (!files.length) return toast.error(t("أضف عقدًا أو مستندًا للمراجعة", "Attach a contract or document for review"));
    for (const file of files) {
      const invalid = validateFile(file);
      if (invalid) return fail(new Error(invalid));
      if (file.size > MAX_FILE_BYTES) {
        return toast.error(t("الحد الأقصى للمستند الواحد 20 ميجابايت", "Maximum file size is 20MB"));
      }
    }

    setBusy(true);
    try {
      const legalContext = [
        "SMART_LEGAL_REVIEW",
        "راجع المستند بصفته مراجعة قانونية وإدارية مساعدة لمصنع المقرن في السعودية.",
        "ركّز على: الأطراف والالتزامات والمبالغ والاستحقاقات والضمان والتسليم والتأخير والفسخ والبيع الآجل والائتمان والاختصاص والمخاطر والشروط غير المتوازنة.",
        "ميّز بوضوح بين النص الموجود في المستند، الملاحظة القانونية، والمقترح. لا تفترض نصوصًا أو وقائع غير موجودة.",
        "أي اعتماد أو توقيع أو إخراج بضاعة بالأجل يظل قرارًا بشريًا مخولًا ولا ينفذ تلقائيًا.",
        context.trim(),
      ].filter(Boolean).join("\n");

      const job = await addJob({
        data: {
          kind: "general_document",
          title: title.trim() || t("مراجعة المحامي الذكي", "Smart legal review"),
          idempotency_key: newIdempotencyKey("legal-review"),
          assistant_key: "executive",
          input_params: { context: legalContext, review_mode: "legal", human_approval_required: true },
        },
      });

      for (const file of files) {
        const signed = await signUpload({
          data: {
            job_id: job.id,
            file_name: file.name,
            mime_type: file.type as "application/pdf" | "image/png" | "image/jpeg" | "image/webp",
            size_bytes: file.size,
          },
        });
        await uploadToSignedUrl(signed.path, signed.token, file);
        await register({
          data: {
            job_id: job.id,
            object_path: signed.path,
            file_name: file.name,
            mime_type: file.type as "application/pdf" | "image/png" | "image/jpeg" | "image/webp",
            size_bytes: file.size,
          },
        });
      }

      await run({ data: { id: job.id, context_note: legalContext } });
      setLastJob(job);
      setFiles([]);
      setTitle("");
      setContext("");
      if (inputRef.current) inputRef.current.value = "";
      toast.success(t("اكتملت المراجعة وأصبحت جاهزة للمراجعة البشرية", "Review completed and is ready for human approval"));
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Scale className="h-6 w-6" /></div>
              <div>
                <CardTitle>{t("المحامي الذكي", "Smart legal advisor")}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{t("مراجعة العقود والشروط والتسليم والبيع الآجل قبل اعتماد الإدارة.", "Review contracts, terms, delivery and credit sales before management approval.")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("عنوان المراجعة", "Review title")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("مثال: عقد توريد أثاث لمشروع", "Example: furniture supply contract")} maxLength={160} />
            </div>
            <div className="space-y-2">
              <Label>{t("العقد أو المستند", "Contract or document")}</Label>
              <Input ref={inputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              {files.length > 0 && <p className="text-xs text-muted-foreground" dir="ltr">{files.map((f) => f.name).join(" · ")}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t("ما الذي تريد التأكد منه؟", "What should be checked?")}</Label>
              <Textarea value={context} onChange={(e) => setContext(e.target.value)} rows={4} maxLength={2500} placeholder={t("مثال: راجع شرط الدفعات، غرامة التأخير، التسليم، الضمان، وإخراج البضاعة بالأجل.", "Example: review payments, delay penalties, delivery, warranty and credit release terms.")} />
            </div>
            <Button onClick={submit} disabled={busy} className="gap-2">
              <FileUp className="h-4 w-4" />
              {busy ? t("جارٍ الفحص القانوني…", "Running legal review…") : t("رفع وفحص المستند", "Upload & review")}
            </Button>
            {lastJob && (
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold"><FileCheck2 className="h-4 w-4 text-primary" />{t("تم إنشاء نتيجة مراجعة محفوظة", "Saved review result created")}</div>
                <Link to="/ai-assistant/$id" params={{ id: lastJob.id }} className="mt-2 inline-block text-primary underline underline-offset-4">
                  {t("فتح نتيجة المحامي الذكي", "Open legal review result")} {lastJob.job_number ? `(${lastJob.job_number})` : ""}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">{t("ضوابط الاعتماد", "Approval controls")}</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span>{t("المراجعة مساعدة ولا تستبدل اعتماد المدير أو المستشار القانوني المؤهل.", "The review assists but does not replace authorized management or qualified legal counsel.")}</span></div>
            <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span>{t("لا يتم توقيع عقد أو اعتماد شرط أو إخراج بضاعة بالأجل تلقائيًا.", "No contract, term, or credit goods release is approved automatically.")}</span></div>
            <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span>{t("النتيجة تحفظ داخل سجل مهام الموظف الذكي للمراجعة والتدقيق.", "Results remain in the AI job trail for review and audit.")}</span></div>
            <Link to="/files" className="inline-flex text-primary underline underline-offset-4">{t("فتح مركز الملفات المركزي", "Open central file center")}</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
