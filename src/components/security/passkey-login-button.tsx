import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/theme";
import { toast } from "sonner";

export function PasskeyLoginButton() {
  const t = useT();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const supported = typeof window !== "undefined" && "PublicKeyCredential" in window;

  async function signIn() {
    if (!supported) {
      toast.error(t("هذا الجهاز أو المتصفح لا يدعم تسجيل الدخول بالبصمة.", "This device or browser does not support passkey sign-in."));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
      toast.success(t("تم تسجيل الدخول بالبصمة بنجاح", "Signed in with passkey"));
      navigate({ to: "/dashboard" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(
        message.toLowerCase().includes("passkey")
          ? t("لا يوجد مفتاح مرور مسجل لهذا الجهاز أو تعذر التحقق.", "No passkey is registered for this device, or verification failed.")
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full gap-2"
      onClick={signIn}
      disabled={loading || !supported}
    >
      <Fingerprint className="h-5 w-5" />
      {loading
        ? t("جاري التحقق...", "Verifying...")
        : t("الدخول بالبصمة / Face ID", "Sign in with Face ID / biometrics")}
    </Button>
  );
}
