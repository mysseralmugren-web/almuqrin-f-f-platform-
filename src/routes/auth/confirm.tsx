import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/confirm")({
  head: () => ({
    meta: [
      { title: "تأكيد الرابط · AlMugren AI Factory OS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthConfirmPage,
});

function AuthConfirmPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("جاري التحقق من رابط الدخول...");

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      try {
        const url = new URL(window.location.href);
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type") as "email" | "recovery" | "invite" | "magiclink" | null;

        if (!tokenHash || !type) {
          throw new Error("رابط الدخول غير مكتمل. أرسل رابطًا جديدًا من Supabase.");
        }

        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) throw error;

        if (!cancelled) navigate({ to: "/dashboard", replace: true });
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : String(error));
          window.setTimeout(() => navigate({ to: "/login", replace: true }), 3500);
        }
      }
    }

    void confirm();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-surface p-6" dir="rtl">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-elegant">
        <div className="text-lg font-bold">تأكيد رابط الدخول</div>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
