import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/theme";
import { convertSubmission, listSubmissions, triageSubmission } from "@/lib/integrations.functions";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  SUBMISSION_KIND_LABEL,
  SUBMISSION_STATUS_LABEL,
  type Priority,
  type SubmissionKind,
  type SubmissionStatus,
} from "@/lib/integrations-constants";

export const Route = createFileRoute("/_authenticated/integrations/website")({
  component: WebsiteLeads,
});

function WebsiteLeads() {
  const t = useT();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const fetchList = useServerFn(listSubmissions);
  const triage = useServerFn(triageSubmission);
  const convert = useServerFn(convertSubmission);

  const { data } = useQuery({
    queryKey: ["submissions", search],
    queryFn: () => fetchList({ data: { search: search || undefined } }),
  });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["submissions"] });

  const triageM = useMutation({
    mutationFn: (v: { id: string; priority?: Priority; status?: "triage" | "rejected" | "spam"; assign_to_me?: boolean }) =>
      triage({ data: { ...v, mark_read: true } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const convertM = useMutation({
    mutationFn: (id: string) => convert({ data: { id, create_quotation: true } }),
    onSuccess: () => {
      toast.success(t("تم إنشاء العميل وعرض السعر (مسودة)", "Customer and draft quotation created"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">{t("طلبات الموقع الإلكتروني", "Website submissions")}</CardTitle>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("بحث بالاسم أو الموضوع", "Search name or subject")}
          className="h-9 sm:w-64"
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {(data ?? []).length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t("لا توجد طلبات واردة بعد.", "No inbound submissions yet.")}
          </div>
        )}
        {(data ?? []).map((s) => (
          <div key={s.id} className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{s.full_name}</span>
              <Badge variant="secondary" className="text-[10px]">
                {t(SUBMISSION_KIND_LABEL[s.kind as SubmissionKind].ar, SUBMISSION_KIND_LABEL[s.kind as SubmissionKind].en)}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {t(SUBMISSION_STATUS_LABEL[s.status as SubmissionStatus].ar, SUBMISSION_STATUS_LABEL[s.status as SubmissionStatus].en)}
              </Badge>
              <span className="text-xs text-muted-foreground">{s.phone ?? s.email ?? "—"}</span>
              <span className="ms-auto text-[11px] text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
            </div>
            {s.subject && <div className="text-sm font-medium">{s.subject}</div>}
            {s.message && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.message}</p>}
            {s.files?.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {s.files.map((f: { id: string; file_name: string }) => (
                  <span key={f.id} className="flex items-center gap-1 rounded border px-2 py-1">
                    <Paperclip className="h-3 w-3" /> {f.file_name}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {PRIORITIES.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={s.priority === p ? "default" : "outline"}
                  onClick={() => triageM.mutate({ id: s.id, priority: p })}
                >
                  {t(PRIORITY_LABEL[p].ar, PRIORITY_LABEL[p].en)}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => triageM.mutate({ id: s.id, assign_to_me: true })}>
                {t("أسندها لي", "Assign to me")}
              </Button>
              <Button
                size="sm"
                className="gradient-primary font-semibold"
                disabled={s.status === "converted" || convertM.isPending}
                onClick={() => convertM.mutate(s.id)}
              >
                {s.status === "converted" ? t("تم التحويل", "Converted") : t("تحويل إلى عميل + عرض سعر", "Convert to customer + quote")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => triageM.mutate({ id: s.id, status: "spam" })}>
                {t("غير مرغوب", "Spam")}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
