import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useTheme } from "@/lib/theme";
import { COMM_CHANNEL, labelOf } from "@/lib/projects-constants";
import { Loading, useProjectFail } from "@/components/app/projects-ui";
import { listCommunications, createCommunication } from "@/lib/projects.functions";

export function CommsTab({ projectId }: { projectId: string }) {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useProjectFail();
  const qc = useQueryClient();
  const fetchComms = useServerFn(listCommunications);
  const add = useServerFn(createCommunication);

  const [form, setForm] = useState({ channel: "call", subject: "", summary: "", outcome: "", next_follow_up: "" });
  const { data = [], isLoading } = useQuery({ queryKey: ["comms", projectId], queryFn: () => fetchComms({ data: { project_id: projectId } }) });

  const mAdd = useMutation({
    mutationFn: () => add({ data: { project_id: projectId, channel: form.channel as any, subject: form.subject, summary: form.summary || null, outcome: form.outcome || null, next_follow_up: form.next_follow_up || null } }),
    onSuccess: () => { setForm({ channel: "call", subject: "", summary: "", outcome: "", next_follow_up: "" }); qc.invalidateQueries({ queryKey: ["comms", projectId] }); },
    onError: fail,
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-4">
          <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(COMM_CHANNEL).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="sm:col-span-2" placeholder={t("الموضوع", "Subject")} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <Input type="date" dir="ltr" value={form.next_follow_up} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} />
          <Textarea className="sm:col-span-2" rows={2} placeholder={t("ملخص التواصل", "Summary")} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <Textarea className="sm:col-span-2" rows={2} placeholder={t("النتيجة", "Outcome")} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
          <div className="sm:col-span-4 sm:text-end">
            <Button className="gap-2 gradient-primary" disabled={!form.subject.trim()} onClick={() => mAdd.mutate()}><Plus className="h-4 w-4" />{t("تسجيل تواصل", "Log communication")}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {data.length === 0 && <Card className="shadow-card"><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("لا يوجد سجل تواصل", "No communications yet")}</CardContent></Card>}
        {data.map((c: any) => (
          <Card key={c.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{c.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {labelOf(COMM_CHANNEL, c.channel, ar)} · <span dir="ltr">{String(c.occurred_at ?? "").slice(0, 16).replace("T", " ")}</span>
                </div>
              </div>
              {c.summary && <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>}
              {c.outcome && <p className="mt-1 text-sm">{t("النتيجة", "Outcome")}: {c.outcome}</p>}
              {c.next_follow_up && <p className="mt-1 text-xs text-amber-600" dir="ltr">{t("متابعة", "Follow-up")}: {c.next_follow_up}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

