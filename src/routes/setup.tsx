import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { getSetupState, bootstrapFirstAdmin } from "@/lib/setup.functions";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "تهيئة المنصة · AlMugren AI Factory OS" },
      { name: "description", content: "First administrator setup for AlMugren AI Factory OS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const t = useT();
  const navigate = useNavigate();
  const { login } = useAuth();
  const checkState = useServerFn(getSetupState);
  const bootstrap = useServerFn(bootstrapFirstAdmin);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyNameAr, setCompanyNameAr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void checkState({}).then((s) => setNeedsSetup(s.needsSetup));
  }, [checkState]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 12) {
      toast.error(t("كلمة المرور 12 حرفاً على الأقل", "Password must be at least 12 characters"));
      return;
    }
    setLoading(true);
    try {
      await bootstrap({ data: { identifier, password, fullName, companyNameAr } });
      await login(identifier, password);
      toast.success(t("تم إنشاء حساب المدير", "Administrator created"));
      navigate({ to: "/settings" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <Card className="w-full max-w-lg border-border/60 shadow-elegant">
        <CardContent className="p-8">
          <div className="mb-6 flex items-center gap-3">
            <img
              src="/brand/almugren-furniture-logo.jpeg"
              alt={t("شعار مصنع المقرن للأثاث", "AlMugren Furniture Factory logo")}
              className="h-16 w-16 rounded-xl bg-white object-cover shadow-card"
            />
            <div>
              <h1 className="text-xl font-bold">{t("تهيئة المنصة", "Platform setup")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("إنشاء أول مدير للنظام", "Create the first system administrator")}
              </p>
            </div>
          </div>

          {needsSetup === false ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t(
                  "تمت التهيئة مسبقاً والتسجيل العام مغلق. يتم إنشاء المستخدمين الجدد من قِبل المدير فقط.",
                  "Setup is already complete and public sign-up is closed. New users are created by an administrator only.",
                )}
              </div>
              <Button className="w-full" onClick={() => navigate({ to: "/login" })}>
                {t("الذهاب لتسجيل الدخول", "Go to sign in")}
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="s-identifier">{t("البريد الإلكتروني أو رقم جوال المدير", "Administrator email or mobile number")}</Label>
                <Input
                  id="s-identifier"
                  dir="ltr"
                  inputMode="email"
                  autoComplete="username"
                  placeholder={t("name@company.com أو 05xxxxxxxx", "name@company.com or +9665xxxxxxxx")}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t("سيُستخدم البريد أو الجوال نفسه لتسجيل الدخول لاحقاً.", "Use this same email or mobile number to sign in later.")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-pass">{t("كلمة المرور", "Password")}</Label>
                <Input
                  id="s-pass"
                  type="password"
                  dir="ltr"
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-name">{t("الاسم الكامل", "Full name")}</Label>
                <Input id="s-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-company">{t("اسم المنشأة", "Company name")}</Label>
                <Input
                  id="s-company"
                  value={companyNameAr}
                  onChange={(e) => setCompanyNameAr(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading || needsSetup === null} className="h-11 w-full gradient-primary font-semibold">
                {loading ? t("جاري الإنشاء...", "Creating...") : t("إنشاء حساب المدير", "Create administrator")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
