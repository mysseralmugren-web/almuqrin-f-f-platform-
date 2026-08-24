import { createFileRoute } from "@tanstack/react-router";
import { Shield, Plus, MoreHorizontal, Pencil, Trash2, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT, useTheme } from "@/lib/theme";
import { ROLES, PERMISSIONS } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({ meta: [{ title: "Roles · AlMugren AI Factory OS" }] }),
  component: RolesPage,
});

function RolesPage() {
  const t = useT();
  const { lang } = useTheme();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {ROLES.map((r) => (
        <Card key={r.key} className="shadow-card transition hover:shadow-elegant">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${r.tone}`}>
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{r.level}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Pencil className="me-2 h-4 w-4" />{t("تعديل الدور", "Edit role")}</DropdownMenuItem>
                    <DropdownMenuItem><KeyRound className="me-2 h-4 w-4" />{t("إدارة الصلاحيات", "Manage permissions")}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="me-2 h-4 w-4" />{t("حذف", "Delete")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="mt-4 text-lg font-bold">{lang === "ar" ? r.ar : r.en}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t(`${r.users} مستخدم`, `${r.users} user${r.users === 1 ? "" : "s"}`)}
            </div>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-1.5">
              {PERMISSIONS.slice(0, 4).map((p) => (
                <Badge key={p.key} variant="secondary" className="text-[10px]">
                  {lang === "ar" ? p.ar : p.en}
                </Badge>
              ))}
              <Badge variant="outline" className="text-[10px]">+2</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card className="flex items-center justify-center border-dashed shadow-card">
        <Button variant="ghost" className="h-full w-full flex-col gap-2 py-10 text-muted-foreground">
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">{t("إضافة دور مخصص", "Add custom role")}</span>
        </Button>
      </Card>
    </div>
  );
}

