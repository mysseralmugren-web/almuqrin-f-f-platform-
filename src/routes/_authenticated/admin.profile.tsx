import { createFileRoute } from "@tanstack/react-router";
import { Camera, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { initialsOf } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/profile")({
  head: () => ({
    meta: [
      { title: "User Profile · AlMugren AI Factory OS" },
      { name: "description", content: "Manage photo, contact details, language and time zone." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const t = useT();
  const { user } = useAuth();
  const name = user?.name || user?.username || "—";
  const nameAr = user?.nameAr || name;
  const username = user?.username || "—";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="shadow-card lg:col-span-1">
        <CardContent className="flex flex-col items-center p-6 text-center">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="gradient-primary text-xl text-primary-foreground">
                {initialsOf(name)}
              </AvatarFallback>
            </Avatar>
            <Button size="icon" variant="secondary" className="absolute -bottom-1 -end-1 h-8 w-8 rounded-full shadow-card">
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 text-lg font-bold">{nameAr}</div>
          <div className="text-sm text-muted-foreground">@{username}</div>
          <Badge className="mt-3" variant="secondary">{user?.jobTitleAr ?? "—"}</Badge>
          <Separator className="my-5" />
          <dl className="w-full space-y-2 text-start text-xs">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("المعرّف", "User ID")}</dt><dd className="max-w-44 truncate font-medium" dir="ltr">{user?.id ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("الفرع", "Branch")}</dt><dd className="font-medium">—</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("المنشأة", "Company ID")}</dt><dd className="max-w-44 truncate font-medium" dir="ltr">{user?.companyId ?? "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-card lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("بيانات الملف الشخصي", "Profile details")}</CardTitle>
          <CardDescription>{t("الاسم، اسم المستخدم، الجوال، اللغة والمنطقة الزمنية.", "Name, username, phone, language and time zone.")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("الاسم الكامل", "Full name")}</Label>
            <Input defaultValue={name} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("الاسم بالعربية", "Arabic name")}</Label>
            <Input defaultValue={nameAr} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("اسم المستخدم", "Username")}</Label>
            <Input defaultValue={username} dir="ltr" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label>{t("رقم الجوال", "Phone")}</Label>
            <Input defaultValue="+966 55 000 0000" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("اللغة", "Language")}</Label>
            <Select defaultValue="ar">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">{t("العربية", "Arabic")}</SelectItem>
                <SelectItem value="en">{t("الإنجليزية", "English")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("المنطقة الزمنية", "Time zone")}</Label>
            <Select defaultValue="riyadh">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="riyadh">(GMT+3) Asia/Riyadh</SelectItem>
                <SelectItem value="dubai">(GMT+4) Asia/Dubai</SelectItem>
                <SelectItem value="cairo">(GMT+2) Africa/Cairo</SelectItem>
                <SelectItem value="utc">(GMT+0) UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button variant="outline">{t("إلغاء", "Cancel")}</Button>
            <Button className="gradient-primary gap-2"><Save className="h-4 w-4" />{t("حفظ التغييرات", "Save changes")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
