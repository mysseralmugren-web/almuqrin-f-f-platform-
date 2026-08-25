import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useTheme } from "@/lib/theme";
import { ROLES, PERMISSIONS, MODULES_LIST } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/permissions")({
  head: () => ({ meta: [{ title: "Permissions · AlMugren AI Factory OS" }] }),
  component: PermissionsPage,
});

function PermissionsPage() {
  const t = useT();
  const { lang } = useTheme();
  const [role, setRole] = useState(ROLES[3].key);
  const active = ROLES.find((r) => r.key === role) ?? ROLES[0];
  const isOn = (m: number, p: number) => (m * 7 + p * 3) % 4 !== 0;

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">{t("مصفوفة الصلاحيات", "Permissions matrix")}</CardTitle>
          <CardDescription>
            {t("تحكم دقيق لكل دور عبر جميع الوحدات.", "Granular control per role across every module.")}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{t("الدور", "Role")}</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r.key} value={r.key}>{lang === "ar" ? r.ar : r.en}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="gradient-primary">{t("حفظ", "Save")}</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">{t("الوحدة", "Module")}</TableHead>
                {PERMISSIONS.map((p) => (
                  <TableHead key={p.key} className="text-center text-xs">
                    {lang === "ar" ? p.ar : p.en}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULES_LIST.map((m, mi) => (
                <TableRow key={m.en}>
                  <TableCell className="font-medium">{lang === "ar" ? m.ar : m.en}</TableCell>
                  {PERMISSIONS.map((p, pi) => (
                    <TableCell key={p.key} className="text-center">
                      <Checkbox defaultChecked={isOn(mi, pi)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <span>{t(`الدور: ${lang === "ar" ? active.ar : active.en}`, `Role: ${lang === "ar" ? active.ar : active.en}`)}</span>
          <span>{t("آخر تحديث: اليوم 08:14", "Last updated: today 08:14")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

