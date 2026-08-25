import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/theme";
import {
  getNotificationCenter,
  markNotificationRead,
  requeueOutboxEvent,
  saveNotificationPreferences,
} from "@/lib/integrations.functions";
import { CHANNEL_LABEL, OUTBOX_STATUS_LABEL } from "@/lib/integrations-constants";

export const Route = createFileRoute("/_authenticated/integrations/notifications")({
  component: NotificationsPage,
});

interface Prefs {
  in_app_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  muted_topics: string[];
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  timezone: string;
}

const DEFAULT_PREFS: Prefs = {
  in_app_enabled: true,
  email_enabled: false,
  whatsapp_enabled: false,
  muted_topics: [],
  quiet_hours_start: 22,
  quiet_hours_end: 7,
  timezone: "Asia/Riyadh",
};

function NotificationsPage() {
  const t = useT();
  const qc = useQueryClient();
  const fetchCenter = useServerFn(getNotificationCenter);
  const savePrefs = useServerFn(saveNotificationPreferences);
  const markRead = useServerFn(markNotificationRead);
  const requeue = useServerFn(requeueOutboxEvent);

  const { data } = useQuery({ queryKey: ["notification-center"], queryFn: () => fetchCenter({}) });
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (data?.preferences) {
      const p = data.preferences as Record<string, unknown>;
      setPrefs({
        in_app_enabled: Boolean(p.in_app_enabled),
        email_enabled: Boolean(p.email_enabled),
        whatsapp_enabled: Boolean(p.whatsapp_enabled),
        muted_topics: (p.muted_topics as string[]) ?? [],
        quiet_hours_start: (p.quiet_hours_start as number) ?? null,
        quiet_hours_end: (p.quiet_hours_end as number) ?? null,
        timezone: (p.timezone as string) ?? "Asia/Riyadh",
      });
    }
  }, [data]);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["notification-center"] });

  const saveM = useMutation({
    mutationFn: () => savePrefs({ data: prefs }),
    onSuccess: () => {
      toast.success(t("تم حفظ التفضيلات", "Preferences saved"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const readM = useMutation({ mutationFn: (id: string) => markRead({ data: { id } }), onSuccess: invalidate });
  const requeueM = useMutation({
    mutationFn: (id: string) => requeue({ data: { id } }),
    onSuccess: () => {
      toast.success(t("أُعيدت جدولة الحدث", "Event requeued"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("إشعاراتي", "My notifications")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.notifications ?? []).length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("لا توجد إشعارات", "No notifications")}</div>
          )}
          {(data?.notifications ?? []).map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{n.title}</div>
                <div className="truncate text-xs text-muted-foreground">{n.body}</div>
              </div>
              <Badge variant="outline" className="text-[10px]">{n.status}</Badge>
              {!n.read_at && (
                <Button size="sm" variant="ghost" onClick={() => readM.mutate(n.id)}>
                  {t("تعليم كمقروء", "Mark read")}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("تفضيلات الإشعارات", "Notification preferences")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {(["in_app", "email", "whatsapp"] as const).map((ch) => {
            const key = `${ch}_enabled` as "in_app_enabled" | "email_enabled" | "whatsapp_enabled";
            return (
              <div key={ch} className="flex items-center justify-between gap-3">
                <Label htmlFor={ch}>{t(CHANNEL_LABEL[ch].ar, CHANNEL_LABEL[ch].en)}</Label>
                <Switch
                  id={ch}
                  checked={prefs[key]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                />
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="qs">{t("بداية ساعات الهدوء", "Quiet hours start")}</Label>
              <Input
                id="qs"
                type="number"
                min={0}
                max={23}
                value={prefs.quiet_hours_start ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_start: e.target.value === "" ? null : Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qe">{t("نهاية ساعات الهدوء", "Quiet hours end")}</Label>
              <Input
                id="qe"
                type="number"
                min={0}
                max={23}
                value={prefs.quiet_hours_end ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_end: e.target.value === "" ? null : Number(e.target.value) }))}
              />
            </div>
          </div>
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending} className="gradient-primary font-semibold">
            {t("حفظ", "Save")}
          </Button>
        </CardContent>
      </Card>

      {data?.is_admin && (
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("طابور الأحداث (Outbox)", "Event outbox")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.outbox ?? []).length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">{t("الطابور فارغ", "Queue is empty")}</div>
            )}
            {(data.outbox ?? []).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                <span className="font-mono text-xs">{e.topic}</span>
                <Badge variant={e.status === "dead" ? "destructive" : "outline"} className="text-[10px]">
                  {t(OUTBOX_STATUS_LABEL[e.status].ar, OUTBOX_STATUS_LABEL[e.status].en)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t("محاولات", "attempts")}: {e.attempts}/{e.max_attempts}
                </span>
                {e.last_error && <span className="truncate text-xs text-destructive">{e.last_error}</span>}
                {(e.status === "dead" || e.status === "failed") && (
                  <Button size="sm" variant="outline" className="ms-auto" onClick={() => requeueM.mutate(e.id)}>
                    {t("إعادة الجدولة", "Requeue")}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
