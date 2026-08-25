import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Plus, MapPin, Network, Building, MoreHorizontal, Users as UsersIcon, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT, useTheme } from "@/lib/theme";
import { COMPANIES, BRANCHES, DEPARTMENTS, USERS, initialsOf } from "@/lib/admin-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/admin/companies")({
  head: () => ({ meta: [{ title: "Companies · AlMugren AI Factory OS" }] }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const t = useT();
  const { lang } = useTheme();
  const [selected, setSelected] = useState(COMPANIES[0].id);
  const company = COMPANIES.find((c) => c.id === selected) ?? COMPANIES[0];

  return (
    <div className="space-y-4">
      {/* Tenants */}
      <div className="grid gap-4 lg:grid-cols-3">
        {COMPANIES.map((c) => {
          const isActive = c.id === selected;
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={
                "group text-start rounded-xl border p-5 shadow-card transition " +
                (isActive
                  ? "border-primary bg-card ring-2 ring-primary/20"
                  : "border-border bg-card hover:shadow-elegant")
              }
            >
              <div className="flex items-center justify-between">
                <div className={"grid h-12 w-12 place-items-center rounded-xl " + (isActive ? "gradient-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                  <Building2 className="h-5 w-5" />
                </div>
                <Badge
                  className={
                    c.tenantType === "primary"
                      ? "bg-accent/20 text-accent-foreground hover:bg-accent/30"
                      : "bg-muted text-muted-foreground hover:bg-muted"
                  }
                >
                  {c.tenantType === "primary" ? t("مستأجر رئيسي", "Primary tenant") : t("شركة تابعة", "Subsidiary")}
                </Badge>
              </div>
              <div className="mt-4 text-base font-bold">{lang === "ar" ? c.ar : c.en}</div>
              <div className="mt-1 text-xs text-muted-foreground">{lang === "ar" ? c.cityAr : c.city}</div>
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniMetric value={c.branches} label={t("فروع", "Branches")} />
                <MiniMetric value={c.departments} label={t("أقسام", "Depts")} />
                <MiniMetric value={c.users} label={t("مستخدمون", "Users")} />
              </div>
              <div className="mt-4 flex items-center justify-end text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                {t("عرض التفاصيل", "View details")}
                <ChevronRight className="ms-1 h-3.5 w-3.5 rtl:rotate-180" />
              </div>
            </button>
          );
        })}
        <NewCompanyCard />
      </div>

      {/* Selected tenant details */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4 text-primary" />
              {t("ملف الشركة", "Company profile")}
            </CardTitle>
            <CardDescription>{lang === "ar" ? company.ar : company.en}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label={t("السجل التجاري", "Commercial reg.")} value={company.cr} />
            <Field label={t("الرقم الضريبي", "VAT number")} value={company.vat} />
            <Field label={t("المدينة", "City")} value={lang === "ar" ? company.cityAr : company.city} />
            <Field label={t("النوع", "Type")} value={company.tenantType === "primary" ? t("مستأجر رئيسي", "Primary") : t("شركة تابعة", "Subsidiary")} />
            <Button variant="outline" className="mt-2 w-full gap-2"><Pencil className="h-4 w-4" />{t("تعديل بيانات الشركة", "Edit company")}</Button>
          </CardContent>
        </Card>

        {/* Branches */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="h-4 w-4 text-primary" />
                {t("الفروع", "Branches")}
              </CardTitle>
              <CardDescription>{t("جميع الفروع والمصانع لهذه الشركة.", "All branches and plants for this company.")}</CardDescription>
            </div>
            <Button size="sm" className="gap-2 gradient-primary"><Plus className="h-4 w-4" />{t("فرع", "Branch")}</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {BRANCHES.map((b) => (
              <div key={b.en} className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/40">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent-foreground">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{lang === "ar" ? b.ar : b.en}</div>
                    <div className="text-[11px] text-muted-foreground">{b.city} · {b.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-end sm:block">
                    <div className="text-sm font-bold">{b.employees}</div>
                    <div className="text-[10px] text-muted-foreground">{t("موظف", "employees")}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Pencil className="me-2 h-4 w-4" />{t("تعديل", "Edit")}</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="me-2 h-4 w-4" />{t("حذف", "Delete")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Departments */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building className="h-4 w-4 text-primary" />
                {t("الأقسام", "Departments")}
              </CardTitle>
              <CardDescription>{t("الهيكل التنظيمي لهذه الشركة.", "Organizational structure for this company.")}</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" />{t("قسم", "Department")}</Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {DEPARTMENTS.map((d) => (
                <div key={d.en} className="rounded-lg border p-4 transition hover:shadow-card">
                  <div className="text-sm font-semibold">{lang === "ar" ? d.ar : d.en}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t("مسؤول:", "Head:")} {d.head}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">{d.count} {t("موظف", "staff")}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users of tenant */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersIcon className="h-4 w-4 text-primary" />
              {t("مستخدمو الشركة", "Company users")}
            </CardTitle>
            <CardDescription>{t("أحدث المستخدمين لهذا المستأجر.", "Latest users for this tenant.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {USERS.slice(0, 6).map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                    {initialsOf(u.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-semibold">{lang === "ar" ? u.nameAr : u.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{lang === "ar" ? u.roleAr : u.role}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{lang === "ar" ? u.branch : u.branchEn}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function MiniMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md bg-muted/40 py-2">
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function NewCompanyCard() {
  const t = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-muted-foreground shadow-card transition hover:bg-muted/40">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold">{t("إضافة شركة", "Add company")}</span>
          <span className="text-[11px]">{t("مستأجر جديد", "New tenant")}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("إنشاء شركة جديدة", "Create a new company")}</DialogTitle>
          <DialogDescription>
            {t("أضف مستأجراً جديداً ضمن هيكل الشركات.", "Add a new tenant to your multi-tenant structure.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("اسم الشركة", "Company name")}</Label>
            <Input placeholder={t("مثال: المقرن للتصنيع", "e.g. AlMugren Manufacturing")} />
          </div>
          <div className="space-y-2">
            <Label>{t("السجل التجاري", "Commercial reg.")}</Label>
            <Input dir="ltr" placeholder="1010XXXXXX" />
          </div>
          <div className="space-y-2">
            <Label>{t("الرقم الضريبي", "VAT number")}</Label>
            <Input dir="ltr" placeholder="3001XXXXXXXXX03" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("العنوان", "Address")}</Label>
            <Input placeholder={t("طريق الملك فهد، الرياض", "King Fahd Rd, Riyadh")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">{t("إلغاء", "Cancel")}</Button>
          <Button className="gradient-primary">{t("إنشاء الشركة", "Create company")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

