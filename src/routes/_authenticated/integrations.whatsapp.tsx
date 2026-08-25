import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/theme";
import {
  approveWaTemplate,
  getConversation,
  listConversations,
  listWaTemplates,
  saveWaTemplate,
} from "@/lib/integrations.functions";
import { MESSAGE_STATUS_LABEL, PRIORITY_LABEL, type Priority } from "@/lib/integrations-constants";

export const Route = createFileRoute("/_authenticated/integrations/whatsapp")({
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const t = useT();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", body: "" });

  const fetchConversations = useServerFn(listConversations);
  const fetchConversation = useServerFn(getConversation);
  const fetchTemplates = useServerFn(listWaTemplates);
  const createTemplate = useServerFn(saveWaTemplate);
  const approve = useServerFn(approveWaTemplate);

  const { data: conversations } = useQuery({ queryKey: ["wa-convs"], queryFn: () => fetchConversations({}) });
  const { data: thread } = useQuery({
    queryKey: ["wa-conv", selected],
    queryFn: () => fetchConversation({ data: { id: selected! } }),
    enabled: !!selected,
  });
  const { data: templates } = useQuery({ queryKey: ["wa-templates"], queryFn: () => fetchTemplates({}) });

  const saveTemplateM = useMutation({
    mutationFn: () => createTemplate({ data: { name: form.name, body: form.body, language: "ar", category: "utility", variables: [] } }),
    onSuccess: () => {
      toast.success(t("تم إنشاء إصدار جديد من القالب", "New template version created"));
      setForm({ name: "", body: "" });
      void qc.invalidateQueries({ queryKey: ["wa-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveM = useMutation({
    mutationFn: (id: string) => approve({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["wa-templates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="shadow-card lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">{t("المحادثات", "Conversations")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(conversations ?? []).length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("لا توجد محادثات واردة.", "No inbound conversations.")}
            </div>
          )}
          {(conversations ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full rounded-lg border p-3 text-start text-sm transition-colors ${
                selected === c.id ? "border-primary bg-muted" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="truncate font-medium">{c.contact_name ?? c.contact_phone_masked}</span>
                {c.unread_count > 0 && <Badge className="ms-auto text-[10px]">{c.unread_count}</Badge>}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{c.contact_phone_masked}</span>
                <Badge variant="outline" className="text-[10px]">
                  {t(PRIORITY_LABEL[c.priority as Priority].ar, PRIORITY_LABEL[c.priority as Priority].en)}
                </Badge>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">{t("الرسائل", "Messages")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selected && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("اختر محادثة لعرض الرسائل.", "Select a conversation to view messages.")}
              </div>
            )}
            {(thread?.messages ?? []).map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-lg border p-3 text-sm ${
                  m.direction === "inbound" ? "bg-surface" : "ms-auto bg-muted"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.body ?? t("(وسائط)", "(media)")}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {t(MESSAGE_STATUS_LABEL[m.status].ar, MESSAGE_STATUS_LABEL[m.status].en)} ·{" "}
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">{t("قوالب واتساب (بإصدارات)", "WhatsApp templates (versioned)")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {t(
                "الإرسال يتم فقط عبر الطابور بعد اعتماد المستند واختيار مستلم مسجّل في بطاقة العميل.",
                "Sending happens only through the queue, after document approval and picking a recipient stored on the customer record.",
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tpl-name">{t("المعرف (أحرف صغيرة و_)", "Name (lowercase, _)")}</Label>
                <Input id="tpl-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="tpl-body">{t("النص", "Body")}</Label>
                <Textarea id="tpl-body" rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" onClick={() => saveTemplateM.mutate()} disabled={saveTemplateM.isPending}>
              {t("إنشاء إصدار", "Create version")}
            </Button>

            <div className="space-y-2 pt-2">
              {(templates ?? []).map((tpl) => (
                <div key={tpl.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                  <span className="font-mono text-xs">{tpl.name} v{tpl.version}</span>
                  <Badge variant={tpl.status === "approved" ? "default" : "outline"} className="text-[10px]">{tpl.status}</Badge>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{tpl.body}</span>
                  {tpl.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => approveM.mutate(tpl.id)}>
                      {t("اعتماد", "Approve")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
