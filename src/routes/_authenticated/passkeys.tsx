import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/passkeys")({
  head: () => ({
    meta: [
      { title: "Passkeys · AlMugren AI Factory OS" },
      { name: "description", content: "Manage Face ID, Touch ID and biometric passkeys." },
    ],
  }),
  component: PasskeysPage,
});

type PasskeyItem = {
  id: string;
  friendly_name?: string | null;
  created_at?: string | null;
  last_used_at?: string | null;
};

function PasskeysPage() {
  const t = useT();
  const [items, setItems] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supported = typeof window !== "undefined" && "PublicKeyCredential" in window;

  async function refresh() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.passkey.list();
      if (error) throw error;
      setItems((data ?? []) as PasskeyItem[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function register() {
    if (!supported) {
      toast.error(t("هذا الجهاز أو المتصفح لا يدعم Passkeys.", "This device or browser does not support passkeys."));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      toast.success(t("تم تسجيل البصمة / Face ID لهذا الجهاز", "Passkey registered for this device"));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId: id });
      if (error) throw error;
      toast.success(t("تم حذف مفتاح المرور", "Passkey removed"));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            {t("البصمة وFace ID", "Face ID & biometrics")}
          </CardTitle>
          <CardDescription>
            {t(
              "سجّل مفتاح مرور على هذا الجهاز للدخول لاحقًا باستخدام Face ID أو Touch ID أو بصمة الجهاز دون كتابة كلمة المرور.",
              "Register a passkey on this device to sign in later with Face ID, Touch ID, or device biometrics without typing a password.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{t("دعم الجهاز", "Device support")}</div>
              <div className="text-xs text-muted-foreground">
                {supported ? t("متاح على هذا الجهاز", "Available on this device") : t("غير مدعوم", "Not supported")}
              </div>
            </div>
            <Badge variant={supported ? "secondary" : "destructive"}>
              {supported ? t("جاهز", "Ready") : t("غير متاح", "Unavailable")}
            </Badge>
          </div>

          <Button className="gap-2" onClick={register} disabled={!supported || saving}>
            <Fingerprint className="h-4 w-4" />
            {saving ? t("جاري التسجيل...", "Registering...") : t("إضافة بصمة / Face ID لهذا الجهاز", "Add Face ID / biometric passkey")}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            {t("مفاتيح المرور المسجلة", "Registered passkeys")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">{t("جاري التحميل...", "Loading...")}</div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("لا توجد مفاتيح مرور مسجلة حتى الآن.", "No passkeys registered yet.")}
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.friendly_name || t("جهاز موثوق", "Trusted device")}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {item.last_used_at || item.created_at || item.id}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(item.id)} aria-label={t("حذف", "Delete")}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
