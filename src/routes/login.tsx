import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { useT, useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, UserRound, Globe, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول · AlMugren AI Factory OS" },
      { name: "description", content: "Secure sign-in for AlMugren AI Factory OS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const { lang, setLang } = useTheme();
  const t = useT();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success(t("مرحباً بعودتك", "Welcome back"));
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.includes("Invalid login")
          ? t("بيانات الدخول غير صحيحة", "Invalid username or password")
          : err instanceof Error && err.message.includes("ACCOUNT_DISABLED")
            ? t("الحساب موقوف. راجع مدير النظام.", "This account is disabled. Contact an administrator.")
          : err instanceof Error
            ? err.message
            : String(err),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden gradient-primary lg:block">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_45%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <img
              src="/brand/almugren-furniture-logo.jpeg"
              alt={t("شعار مصنع المقرن للأثاث", "AlMugren Furniture Factory logo")}
              className="h-20 w-20 rounded-xl bg-white object-cover shadow-elegant"
            />
            <div>
              <div className="text-lg font-bold">
                {t("المقرن AI Factory OS", "AlMugren AI Factory OS")}
              </div>
              <div className="text-xs text-primary-foreground/70">
                {t("منظومة إدارة المصنع الذكية", "Intelligent Factory Operations Platform")}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              {t(
                "منظومة متكاملة لإدارة مصانع الأثاث بذكاء وكفاءة.",
                "One intelligent platform to run your furniture factory end-to-end.",
              )}
            </h2>
            <div className="grid gap-4">
              {[
                { ar: "ERP · CRM · MES · WMS في واجهة واحدة", en: "ERP · CRM · MES · WMS in one interface" },
                { ar: "ذكاء اصطناعي مدمج في كل الوحدات", en: "AI embedded across every module" },
                { ar: "أمان مؤسسي وصلاحيات دقيقة", en: "Enterprise security & granular roles" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-primary-foreground/85">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                  {t(f.ar, f.en)}
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} AlMugren Furniture · {t("جميع الحقوق محفوظة", "All rights reserved")}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <img
                src="/brand/almugren-furniture-logo.jpeg"
                alt={t("شعار مصنع المقرن للأثاث", "AlMugren Furniture Factory logo")}
                className="h-12 w-12 rounded-lg bg-white object-cover shadow-card"
              />
              <span className="text-sm font-bold">AlMugren AI</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ms-auto gap-2"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            >
              <Globe className="h-4 w-4" />
              {lang === "ar" ? "English" : "عربي"}
            </Button>
          </div>

          <Card className="border-border/60 shadow-elegant">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 space-y-1">
                <h1 className="text-2xl font-bold">
                  {t("تسجيل الدخول", "Sign in")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "استخدم بيانات الحساب المؤسسي للوصول إلى المنظومة.",
                    "Use your corporate account to access the platform.",
                  )}
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t("اسم المستخدم", "Username")}</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-11 ltr:pl-10 rtl:pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("كلمة المرور", "Password")}</Label>
                    <span className="text-xs text-muted-foreground">
                      {t("إعادة التعيين عبر مدير النظام", "Reset through the system administrator")}
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 ltr:pl-10 rtl:pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox defaultChecked />
                  {t("إبقاء الجلسة مفتوحة على هذا الجهاز", "Keep me signed in on this device")}
                </label>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full gradient-primary font-semibold shadow-elegant"
                >
                  {loading ? t("جاري الدخول...", "Signing in...") : t("تسجيل الدخول", "Sign in")}
                </Button>

                <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  {t(
                    "الاتصال محمي ومشفر. الوصول محكوم بالصلاحيات المؤسسية.",
                    "Encrypted connection. Access is governed by enterprise role policies.",
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/setup" className="font-medium text-primary hover:underline">
              {t("تهيئة أول مدير للنظام", "First-time administrator setup")}
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("للمساعدة، تواصل مع مدير النظام داخل المنشأة.", "For help, contact your internal system administrator.")}
          </p>
        </div>
      </div>
    </div>
  );
}
