import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Phone, Plus, Search, ShieldCheck, UserRound, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type Role } from "@/lib/auth";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "حسابات الأدوار · منصة المقرن" }] }),
  component: UsersPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

type RoleRow = { user_id: string; role: Role };

const ASSIGNABLE_ROLES: Role[] = [
  "general_manager",
  "sales_manager",
  "sales_employee",
  "production_manager",
  "warehouse_manager",
  "purchasing_manager",
  "accountant",
  "hr",
  "designer",
  "technician",
  "project_manager",
  "quality_manager",
  "installer",
  "customer_portal",
];

function UsersPage() {
  const t = useT();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roleRows, setRoleRows] = useState<RoleRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("id,full_name,phone,is_active,created_at")
        .eq("company_id", user.companyId)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("user_roles")
        .select("user_id,role")
        .eq("company_id", user.companyId),
    ]);
    setLoading(false);
    const error = profilesRes.error || rolesRes.error;
    if (error) {
      toast.error("تعذر تحميل حسابات الأدوار");
      return;
    }
    setProfiles((profilesRes.data ?? []) as Profile[]);
    setRoleRows((rolesRes.data ?? []) as RoleRow[]);
  }, [user?.companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rolesByUser = useMemo(() => {
    const map = new Map<string, Role[]>();
    for (const row of roleRows) {
      map.set(row.user_id, [...(map.get(row.user_id) ?? []), row.role]);
    }
    return map;
  }, [roleRows]);

  const filtered = profiles.filter((profile) => {
    const roles = rolesByUser.get(profile.id) ?? [];
    const text = [profile.full_name, profile.phone, ...roles.map((role) => ROLE_LABELS[role].ar)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  const active = profiles.filter((profile) => profile.is_active).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={UsersIcon} label={t("إجمالي الحسابات", "Total accounts")} value={profiles.length} />
        <Metric icon={Check} label={t("الحسابات النشطة", "Active accounts")} value={active} />
        <Metric icon={ShieldCheck} label={t("الأدوار المرتبطة", "Role assignments")} value={roleRows.length} />
      </div>

      <Card className="shadow-card">
        <CardHeader className="gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t("تسجيل حسابات الأدوار", "Register role accounts")}</CardTitle>
            <CardDescription className="mt-2">
              {t(
                "التسجيل بالاسم ورقم الجوال، ثم اختيار الدور الذي يحدد لوحات العمل والصلاحيات.",
                "Register with name and mobile number, then assign the role controlling workspaces and permissions.",
              )}
            </CardDescription>
          </div>
          <CreateRoleAccountDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={load} />
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("ابحث بالاسم أو رقم الجوال أو الدور", "Search name, phone or role")}
              className="ltr:pl-9 rtl:pr-9"
            />
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t("جارٍ تحميل الحسابات…", "Loading accounts…")}
            </div>
          ) : filtered.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {filtered.map((profile) => {
                const roles = rolesByUser.get(profile.id) ?? [];
                return (
                  <article key={profile.id} className="rounded-2xl border border-border/80 p-4 transition hover:border-primary/30 hover:shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{profile.full_name || t("حساب بلا اسم", "Unnamed account")}</h2>
                          <Badge className={profile.is_active ? "bg-success/10 text-success hover:bg-success/15" : ""} variant={profile.is_active ? "secondary" : "outline"}>
                            {profile.is_active ? t("نشط", "Active") : t("غير نشط", "Inactive")}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground" dir="ltr">
                          <Phone className="h-3.5 w-3.5" />
                          {profile.phone || "—"}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {roles.length ? roles.map((role) => (
                            <Badge key={role} variant="outline" className="border-primary/20">
                              {ROLE_LABELS[role].ar}
                            </Badge>
                          )) : (
                            <Badge variant="outline">{t("بلا دور", "No role")}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t("لا توجد حسابات مطابقة.", "No matching accounts.")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateRoleAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const t = useT();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("sales_employee");
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [copied, setCopied] = useState(false);

  function reset() {
    setFullName("");
    setPhone("");
    setRole("sales_employee");
    setTemporaryPassword("");
    setCopied(false);
  }

  async function createAccount() {
    if (fullName.trim().length < 2) {
      toast.error("أدخل اسم الموظف");
      return;
    }
    if (!/^(?:\+?966|0)?5\d{8}$/.test(phone.replace(/[\s-]/g, ""))) {
      toast.error("أدخل رقم جوال سعودي صحيحاً");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke("role-account-admin", {
      body: { fullName, phone, role },
    });
    setSaving(false);

    if (error || !data?.temporaryPassword) {
      toast.error(data?.error || error?.message || "تعذر إنشاء الحساب");
      return;
    }

    setTemporaryPassword(data.temporaryPassword);
    toast.success("تم إنشاء الحساب وتفعيله");
    await onCreated();
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    toast.success("تم نسخ كلمة المرور المؤقتة");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />{t("تسجيل حساب دور", "Register role account")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("حساب موظف جديد", "New employee account")}</DialogTitle>
          <DialogDescription>
            {t("أدخل الاسم والجوال وحدد الدور. سيظهر رمز دخول مؤقت مرة واحدة.", "Enter name, phone and role. A temporary password appears once.")}
          </DialogDescription>
        </DialogHeader>

        {temporaryPassword ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <div className="text-sm font-semibold text-success">{t("تم إنشاء الحساب وتفعيله", "Account created and activated")}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("سلّم الموظف رقم جواله وكلمة المرور التالية:", "Give the employee their phone number and this password:")}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-background px-3 py-2 text-center text-base font-bold tracking-wider" dir="ltr">{temporaryPassword}</code>
                <Button type="button" variant="outline" size="icon" onClick={copyPassword} aria-label={t("نسخ كلمة المرور", "Copy password")}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{t("تم", "Done")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="role-full-name">{t("اسم الموظف", "Employee name")}</Label>
                <Input id="role-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={t("الاسم الكامل", "Full name")} autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-phone">{t("رقم الجوال", "Mobile number")}</Label>
                <Input id="role-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="05xxxxxxxx" inputMode="tel" autoComplete="tel" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t("الدور", "Role")}</Label>
                <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((item) => (
                      <SelectItem key={item} value={item}>{ROLE_LABELS[item].ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button onClick={createAccount} disabled={saving}>
                {saving ? t("جارٍ إنشاء الحساب…", "Creating account…") : t("إنشاء وتفعيل", "Create and activate")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersIcon; label: string; value: number }) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div><div className="text-xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
      </CardContent>
    </Card>
  );
}
