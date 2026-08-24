import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus, Search, MoreHorizontal, Pencil, Ban, Trash2, Upload, KeyRound,
  CheckCircle2, XCircle, Clock, Users as UsersIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useTheme } from "@/lib/theme";
import { USERS, ROLES, BRANCHES, COMPANIES, initialsOf } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users · AlMugren AI Factory OS" }] }),
  component: UsersPage,
});

function StatusBadge({ status }: { status: string }) {
  const t = useT();
  if (status === "active")
    return <Badge className="gap-1 bg-success/10 text-success hover:bg-success/15"><CheckCircle2 className="h-3 w-3" />{t("نشط", "Active")}</Badge>;
  if (status === "disabled")
    return <Badge className="gap-1 bg-muted text-muted-foreground hover:bg-muted"><XCircle className="h-3 w-3" />{t("معطل", "Disabled")}</Badge>;
  return <Badge className="gap-1 bg-warning/10 text-warning hover:bg-warning/15"><Clock className="h-3 w-3" />{t("قيد التفعيل", "Pending")}</Badge>;
}

function UsersPage() {
  const t = useT();
  const { lang } = useTheme();
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const active = USERS.filter((u) => u.status === "active").length;
  const pending = USERS.filter((u) => u.status === "pending").length;
  const disabled = USERS.filter((u) => u.status === "disabled").length;

  const filtered = USERS.filter((u) =>
    [u.name, u.nameAr, u.username, u.role, u.roleAr].some((f) =>
      f.toLowerCase().includes(query.toLowerCase()),
    ),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label={t("إجمالي المستخدمين", "Total Users")} value={USERS.length} tone="primary" icon={UsersIcon} />
        <MiniStat label={t("النشطون", "Active")} value={active} tone="success" icon={CheckCircle2} />
        <MiniStat label={t("قيد التفعيل", "Pending")} value={pending} tone="warning" icon={Clock} />
        <MiniStat label={t("معطلون", "Disabled")} value={disabled} tone="muted" icon={XCircle} />
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">{t("قائمة المستخدمين", "Users directory")}</CardTitle>
            <CardDescription>
              {t("إدارة كاملة للحسابات والأدوار وحالة التفعيل.", "Full account, role and activation management.")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("ابحث بالاسم أو اسم المستخدم...", "Search name or username...")}
                className="h-9 w-64 ltr:pl-9 rtl:pr-9"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("كل الأدوار", "All roles")}</SelectItem>
                {ROLES.map((r) => <SelectItem key={r.key} value={r.key}>{lang === "ar" ? r.ar : r.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" />{t("استيراد", "Import")}</Button>
            <NewUserDialog />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox /></TableHead>
                  <TableHead>{t("المستخدم", "User")}</TableHead>
                  <TableHead>{t("الدور", "Role")}</TableHead>
                  <TableHead>{t("الفرع", "Branch")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead>{t("آخر دخول", "Last login")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/40">
                    <TableCell><Checkbox /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                            {initialsOf(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 leading-tight">
                          <div className="truncate text-sm font-semibold">
                            {lang === "ar" ? u.nameAr : u.name}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">@{u.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/20 text-xs">
                        {lang === "ar" ? u.roleAr : u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lang === "ar" ? u.branch : u.branchEn}
                    </TableCell>
                    <TableCell><StatusBadge status={u.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.lastLogin}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <EditUserDialog userLabel={lang === "ar" ? u.nameAr : u.name} username={u.username} />
                          <DropdownMenuItem><KeyRound className="me-2 h-4 w-4" />{t("إعادة تعيين كلمة المرور", "Reset password")}</DropdownMenuItem>
                          <DropdownMenuItem><Ban className="me-2 h-4 w-4" />{t("تعطيل", "Disable")}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={(e) => { e.preventDefault(); setConfirmDelete(u.id); }}
                          >
                            <Trash2 className="me-2 h-4 w-4" />{t("حذف", "Delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span>{t(`إظهار ${filtered.length} من ${USERS.length}`, `Showing ${filtered.length} of ${USERS.length}`)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>{t("السابق", "Previous")}</Button>
              <Button variant="outline" size="sm">{t("التالي", "Next")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("تأكيد الحذف", "Confirm deletion")}</DialogTitle>
            <DialogDescription>
              {t(
                "سيتم حذف هذا المستخدم نهائياً. لا يمكن التراجع عن هذا الإجراء.",
                "This user will be permanently removed. This action cannot be undone.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>{t("إلغاء", "Cancel")}</Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(null)}>{t("حذف نهائي", "Delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "primary" | "success" | "warning" | "muted"; icon: typeof UsersIcon }) {
  const map: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${map[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewUserDialog() {
  const t = useT();
  const { lang } = useTheme();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 gradient-primary font-semibold shadow-elegant">
          <Plus className="h-4 w-4" />
          {t("مستخدم جديد", "New user")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("إنشاء مستخدم جديد", "Create a new user")}</DialogTitle>
          <DialogDescription>
            {t("أدخل بيانات المستخدم وحدد الدور والشركة والفرع.", "Enter user details and assign role, company and branch.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("الاسم الكامل", "Full name")}</Label>
            <Input placeholder={t("مثال: عبدالله المقرن", "e.g. Abdullah Al-Mugren")} />
          </div>
          <div className="space-y-2">
            <Label>{t("اسم المستخدم", "Username")}</Label>
            <Input dir="ltr" placeholder="user_name" autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label>{t("الجوال", "Phone")}</Label>
            <Input dir="ltr" placeholder="+966 5X XXX XXXX" />
          </div>
          <div className="space-y-2">
            <Label>{t("الشركة", "Company")}</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder={t("اختر الشركة", "Select company")} /></SelectTrigger>
              <SelectContent>
                {COMPANIES.map((c) => <SelectItem key={c.id} value={c.id}>{lang === "ar" ? c.ar : c.en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("الفرع", "Branch")}</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder={t("اختر الفرع", "Select branch")} /></SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => <SelectItem key={b.en} value={b.en}>{lang === "ar" ? b.ar : b.en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("الدور", "Role")}</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder={t("اختر الدور", "Select role")} /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.key} value={r.key}>{lang === "ar" ? r.ar : r.en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div>
              <div className="text-sm font-medium">{t("إجبار تغيير كلمة المرور", "Require password change")}</div>
              <div className="text-xs text-muted-foreground">{t("يغيّر المستخدم كلمة المرور عند أول دخول.", "The user changes the password at first sign-in.")}</div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">{t("إلغاء", "Cancel")}</Button>
          <Button className="gradient-primary">{t("إنشاء المستخدم", "Create user")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ userLabel, username }: { userLabel: string; username: string }) {
  const t = useT();
  const { lang } = useTheme();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Pencil className="me-2 h-4 w-4" />{t("تعديل", "Edit")}
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("تعديل المستخدم", "Edit user")}</DialogTitle>
          <DialogDescription>{userLabel} · @{username}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("الاسم الكامل", "Full name")}</Label>
            <Input defaultValue={userLabel} />
          </div>
          <div className="space-y-2">
            <Label>{t("اسم المستخدم", "Username")}</Label>
            <Input dir="ltr" defaultValue={username} readOnly />
          </div>
          <div className="space-y-2">
            <Label>{t("الدور", "Role")}</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder={t("اختر الدور", "Select role")} /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.key} value={r.key}>{lang === "ar" ? r.ar : r.en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div>
              <div className="text-sm font-medium">{t("الحساب مفعّل", "Account active")}</div>
              <div className="text-xs text-muted-foreground">{t("يمكن للمستخدم تسجيل الدخول.", "User can sign in.")}</div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">{t("إلغاء", "Cancel")}</Button>
          <Button className="gradient-primary">{t("حفظ", "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
