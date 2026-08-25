import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, KeyRound, Smartphone, Monitor, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/admin/security")({
  head: () => ({
    meta: [
      { title: "Security · AlMugren AI Factory OS" },
      { name: "description", content: "Two-factor authentication, password reset, login history and audit log." },
    ],
  }),
  component: SecurityPage,
});

const LOGINS = [
  { user: "Faisal Al-Mugren", ip: "51.36.12.44", device: "Chrome · macOS", city: "Riyadh", cityAr: "الرياض", when: "2m", ok: true },
  { user: "Sara Al-Otaibi", ip: "188.55.9.10", device: "Safari · iPhone", city: "Jeddah", cityAr: "جدة", when: "12m", ok: true },
  { user: "Khalid Al-Dossari", ip: "37.224.7.91", device: "Edge · Windows", city: "Riyadh", cityAr: "الرياض", when: "1h", ok: false },
  { user: "Yousef Al-Malki", ip: "95.185.3.7", device: "Chrome · Android", city: "Al-Kharj", cityAr: "الخرج", when: "3h", ok: true },
];

const AUDIT = [
  { actor: "Faisal Al-Mugren", ar: "أنشأ مستخدماً جديداً", en: "Created a new user", target: "U-011", when: "08:14" },
  { actor: "Nawaf Al-Harbi", ar: "عدّل صلاحيات دور المبيعات", en: "Updated Sales role permissions", target: "sales_mgr", when: "09:02" },
  { actor: "Layla Al-Ghamdi", ar: "عطّل حساب مستخدم", en: "Disabled a user account", target: "U-006", when: "10:41" },
  { actor: "System", ar: "تدوير مفاتيح الجلسات", en: "Rotated session keys", target: "—", when: "11:00" },
];

function SecurityPage() {
  const t = useT();
  const { lang } = useTheme();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />{t("المصادقة الثنائية", "Two-factor authentication")}</CardTitle>
              <CardDescription>{t("جاهزة للتفعيل عبر تطبيق المصادقة أو الرسائل.", "Ready to enable via authenticator app or SMS.")}</CardDescription>
            </div>
            <Badge variant="outline">{t("جاهز", "Ready")}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">{t("تطبيق المصادقة (TOTP)", "Authenticator app (TOTP)")}</div>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">{t("رمز عبر الرسائل القصيرة", "SMS one-time code")}</div>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="text-sm font-medium">{t("إلزام المصادقة الثنائية للمدراء", "Enforce 2FA for managers")}</div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-primary" />{t("كلمة المرور", "Password")}</CardTitle>
            <CardDescription>{t("تغيير كلمة المرور أو إرسال رابط إعادة التعيين.", "Change the password or send a reset link.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("كلمة المرور الحالية", "Current password")}</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("كلمة المرور الجديدة", "New password")}</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("تأكيد كلمة المرور", "Confirm password")}</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline">{t("إرسال رابط إعادة التعيين", "Send reset link")}</Button>
              <Button className="gradient-primary">{t("تحديث كلمة المرور", "Update password")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-primary" />{t("سجل تسجيل الدخول", "Login history")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("المستخدم", "User")}</TableHead>
                  <TableHead>{t("الجهاز", "Device")}</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>{t("الموقع", "Location")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead className="text-end">{t("منذ", "When")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LOGINS.map((l) => (
                  <TableRow key={l.ip}>
                    <TableCell className="font-medium">{l.user}</TableCell>
                    <TableCell className="text-muted-foreground">{l.device}</TableCell>
                    <TableCell dir="ltr" className="text-muted-foreground">{l.ip}</TableCell>
                    <TableCell>{lang === "ar" ? l.cityAr : l.city}</TableCell>
                    <TableCell>
                      <Badge variant={l.ok ? "secondary" : "destructive"} className="text-[10px]">
                        {l.ok ? t("ناجح", "Success") : t("فاشل", "Failed")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end text-muted-foreground">{l.when}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("سجل التدقيق", "Audit log")}</CardTitle>
          <CardDescription>{t("كل إجراء حسّاس يُسجَّل مع المستخدم والوقت.", "Every sensitive action is recorded with actor and time.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {AUDIT.map((a, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                {a.actor.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{a.actor}</div>
                <div className="text-xs text-muted-foreground">{t(a.ar, a.en)} · <span dir="ltr">{a.target}</span></div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">{a.when}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
