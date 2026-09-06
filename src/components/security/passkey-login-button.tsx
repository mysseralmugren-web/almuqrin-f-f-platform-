import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/theme";
import { toast } from "sonner";

function passkeyErrorMessage(message: string, t: ReturnType<typeof useT>) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("passkey") ||
    normalized.includes("credential") ||
    normalized.includes("notallowederror") ||
    normalized.includes("aborterror")
  ) {
    return t(
      "تعذر التحقق بالبصمة. تأكد من اختيار مفتاح مرور «Apple Passwords» ثم حاول مرة أخرى.",
      "Passkey verification could not be completed. Select your passkey and try again.",
    );
  }
  return message;
}

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

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error(t("لم يكتمل تسجيل الدخول بالبصمة. حاول مرة أخرى.", "Passkey sign-in did not complete. Please try again."));
      }

      toast.success(t("تم تسجيل الدخول بالبصمة بنجاح", "Signed in with passkey"));
      await navigate({ to: "/dashboard" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(passkeyErrorMessage(message, t));
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
      aria-busy={loading}
    >
      <Fingerprint className="h-5 w-5" />
      {loading
        ? t("جاري التحقق...", "Verifying...")
        : t("الدخول بالبصمة / Face ID", "Sign in with Face ID / biometrics")}
    </Button>
  );
}
