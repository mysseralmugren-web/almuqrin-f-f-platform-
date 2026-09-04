import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "تأكيد الدخول · AlMugren AI Factory OS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("جاري تأكيد الدخول...");

  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!data.session) {
          throw new Error("لم يتم إنشاء جلسة دخول من الرابط. أرسل Magic Link جديدًا وحاول مرة أخرى.");
        }

        if (!cancelled) {
          navigate({ to: "/dashboard", replace: true });
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : String(error));
          window.setTimeout(() => {
            navigate({ to: "/login", replace: true });
          }, 3500);
        }
      }
    }

    void completeSignIn();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-surface p-6" dir="rtl">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-elegant">
        <div className="text-lg font-bold">تأكيد الدخول</div>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
