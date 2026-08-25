import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, KeyRound, PauseCircle, PlayCircle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/theme";
import {
  getIntegrationsOverview,
  saveIntegration,
  setIntegrationState,
  testIntegrationWebhook,
} from "@/lib/integrations.functions";
import {
  HEALTH_LABEL,
  INTEGRATION_KIND_LABEL,
  INTEGRATION_STATUS_LABEL,
  WEBSITE_DOMAIN,
  type IntegrationKind,
  type IntegrationStatus,
} from "@/lib/integrations-constants";

export const Route = createFileRoute("/_authenticated/integrations/")({
  component: IntegrationsHub,
});

const DEFAULT_PROVIDER: Record<IntegrationKind, string> = {
  website: "almugren_site",
  whatsapp: "meta_cloud",
  email: "smtp",
};

function IntegrationsHub() {
  const t = useT();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getIntegrationsOverview);
  const save = useServerFn(saveIntegration);
  const test = useServerFn(testIntegrationWebhook);
  const toggle = useServerFn(setIntegrationState);
  const [origins, setOrigins] = useState<Record<string, string>>({});

  const { data } = useQuery({ queryKey: ["integrations"], queryFn: () => fetchOverview({}) });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["integrations"] });

  const configure = useMutation({
    mutationFn: (kind: IntegrationKind) =>
      save({
        data: {
          kind,
          provider: DEFAULT_PROVIDER[kind],
          display_name: INTEGRATION_KIND_LABEL[kind].ar,
          scopes: kind === "whatsapp" ? ["messages:read", "messages:send", "templates:read"] : ["forms:intake"],
          allowed_origins:
            kind === "website"
              ? (origins[kind] ?? `https://${WEBSITE_DOMAIN}`).split(",").map((s) => s.trim()).filter(Boolean)
              : [],
          rate_limit_per_min: 60,
          config: kind === "website" ? { captcha_required: true, domain: WEBSITE_DOMAIN } : {},
        },
      }),
    onSuccess: () => {
      toast.success(t("تم حفظ الإعداد", "Configuration saved"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runTest = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (r) =>
      r.ok
        ? (toast.success(t("نجح اختبار الويب هوك — التكامل نشط", "Webhook test passed — integration active")), invalidate())
        : toast.error(t("الاختبار فشل: أسرار ناقصة", "Test failed: missing secrets")),
    onError: (e: Error) => toast.error(e.message),
  });

  const setState = useMutation({
    mutationFn: (v: { id: string; action: "pause" | "resume" }) => toggle({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">
        {t(
          "لا يُعتبر أي تكامل متصلًا قبل إدخال أسرار الموفر في إعدادات المشروع ونجاح اختبار الويب هوك. لا تُدخل الأسرار في المحادثة.",
          "No integration is considered connected until provider secrets exist in project settings and the webhook test passes. Never paste secrets into chat.",
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(data?.integrations ?? []).map((item) => {
          const status = (item.row?.status ?? "disconnected") as IntegrationStatus;
          return (
            <Card key={item.kind} className="shadow-card">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <CardTitle className="text-base">{t(INTEGRATION_KIND_LABEL[item.kind].ar, INTEGRATION_KIND_LABEL[item.kind].en)}</CardTitle>
                <Badge variant={item.connected ? "default" : "outline"}>
                  {t(INTEGRATION_STATUS_LABEL[status].ar, INTEGRATION_STATUS_LABEL[status].en)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  {t("الصحة", "Health")}: {t(HEALTH_LABEL[item.row?.health ?? "unknown"].ar, HEALTH_LABEL[item.row?.health ?? "unknown"].en)}
                </div>
                <div className="text-muted-foreground">
                  {t("آخر مزامنة", "Last sync")}: {item.row?.last_sync_at ? new Date(item.row.last_sync_at).toLocaleString() : "—"}
                </div>
                {item.row?.scopes?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {item.row.scopes.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                ) : null}

                {item.missing_secrets.length > 0 ? (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      {t("أسرار مطلوبة في إعدادات المشروع:", "Secrets required in Project Settings:")}
                      <div className="mt-1 font-mono">{item.missing_secrets.join(", ")}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" /> {t("الأسرار مكتملة", "Secrets present")}
                  </div>
                )}

                {!item.webhook_tested && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" /> {t("لم يتم اختبار الويب هوك بعد", "Webhook not tested yet")}
                  </div>
                )}

                {item.kind === "website" && (
                  <div className="space-y-1">
                    <Label htmlFor="origins" className="text-xs">{t("النطاقات المسموحة", "Allowed origins")}</Label>
                    <Input
                      id="origins"
                      value={origins[item.kind] ?? `https://${WEBSITE_DOMAIN}`}
                      onChange={(e) => setOrigins((o) => ({ ...o, [item.kind]: e.target.value }))}
                    />
                  </div>
                )}

                {data?.is_admin && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => configure.mutate(item.kind)}>
                      {t("حفظ الإعداد", "Save config")}
                    </Button>
                    <Button size="sm" disabled={!item.row} onClick={() => item.row && runTest.mutate(item.row.id)}>
                      {t("اختبار الويب هوك", "Test webhook")}
                    </Button>
                    {item.row && status === "active" && (
                      <Button size="sm" variant="ghost" onClick={() => setState.mutate({ id: item.row!.id, action: "pause" })}>
                        <PauseCircle className="me-1 h-4 w-4" /> {t("إيقاف", "Pause")}
                      </Button>
                    )}
                    {item.row && status === "paused" && (
                      <Button size="sm" variant="ghost" onClick={() => setState.mutate({ id: item.row!.id, action: "resume" })}>
                        <PlayCircle className="me-1 h-4 w-4" /> {t("استئناف", "Resume")}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("عناوين الاستقبال", "Webhook endpoints")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
          <div>POST /api/public/website/submit</div>
          <div>POST /api/public/whatsapp/webhook</div>
          <div className="font-sans">
            {t(
              "التوقيع: HMAC-SHA256 مرتبط بالشركة والتكامل، مع ترويسات x-almugren-integration-id وx-almugren-signature وx-almugren-timestamp، ونافذة 5 دقائق.",
              "Signature: tenant-bound HMAC-SHA256 with x-almugren-integration-id, x-almugren-signature and x-almugren-timestamp, using a 5-minute window.",
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
