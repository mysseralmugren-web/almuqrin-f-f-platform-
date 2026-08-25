import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, Building2, Wallet, ReceiptText, MoreHorizontal, Pencil, Eye, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useTheme } from "@/lib/theme";
import { CUSTOMERS, SEGMENTS, sar } from "@/lib/crm-data";
import { initialsOf } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/crm/customers")({
  head: () => ({
    meta: [
      { title: "Customer Accounts · CRM · AlMugren AI Factory OS" },
      { name: "description", content: "Customer master accounts, segments, revenue and outstanding balances." },
    ],
  }),
  component: AccountsPage,
});

const STATUS = {
  active: { ar: "نشط", en: "Active", tone: "bg-success/10 text-success" },
  hold: { ar: "موقوف ائتمانياً", en: "Credit hold", tone: "bg-warning/10 text-warning" },
  prospect: { ar: "مرتقب", en: "Prospect", tone: "bg-muted text-muted-foreground" },
} as const;

function AccountsPage() {
  const t = useT();
  const { lang } = useTheme();
  const [query, setQuery] = useState("");
  const [seg, setSeg] = useState("all");

  const revenue = CUSTOMERS.reduce((s, c) => s + c.revenue, 0);
  const balance = CUSTOMERS.reduce((s, c) => s + c.balance, 0);

  const filtered = CUSTOMERS.filter(
    (c) =>
      (seg === "all" || c.segment === seg) &&
      [c.name, c.nameAr, c.id, c.owner].some((f) => f.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
            <div><div className="text-xs text-muted-foreground">{t("إجمالي العملاء", "Total accounts")}</div><div className="text-xl font-bold">{CUSTOMERS.length}</div></div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-success/10 text-success"><ReceiptText className="h-5 w-5" /></div>
            <div><div className="text-xs text-muted-foreground">{t("إجمالي الإيرادات (ر.س)", "Lifetime revenue (SAR)")}</div><div className="text-xl font-bold" dir="ltr">{sar(revenue)}</div></div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-warning/10 text-warning"><Wallet className="h-5 w-5" /></div>
            <div><div className="text-xs text-muted-foreground">{t("أرصدة مستحقة (ر.س)", "Outstanding (SAR)")}</div><div className="text-xl font-bold" dir="ltr">{sar(balance)}</div></div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">{t("حسابات العملاء", "Customer accounts")}</CardTitle>
            <CardDescription>{t("البيانات الأساسية للعملاء وقطاعاتهم.", "Customer master data and segments.")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ابحث عن عميل...", "Search accounts...")} className="h-9 w-56 ltr:pl-9 rtl:pr-9" />
            </div>
            <Select value={seg} onValueChange={setSeg}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("كل القطاعات", "All segments")}</SelectItem>
                {SEGMENTS.map((s) => <SelectItem key={s.key} value={s.key}>{t(s.ar, s.en)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="h-9 gap-2 gradient-primary"><Plus className="h-4 w-4" />{t("عميل جديد", "New account")}</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("العميل", "Account")}</TableHead>
                  <TableHead>{t("القطاع", "Segment")}</TableHead>
                  <TableHead>{t("المدينة", "City")}</TableHead>
                  <TableHead>{t("الرقم الضريبي", "VAT no.")}</TableHead>
                  <TableHead>{t("الطلبات", "Orders")}</TableHead>
                  <TableHead>{t("الإيرادات (ر.س)", "Revenue (SAR)")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead className="text-end">{t("إجراءات", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const st = STATUS[c.status];
                  const sg = SEGMENTS.find((s) => s.key === c.segment);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-xs text-primary">{initialsOf(c.name)}</AvatarFallback></Avatar>
                          <div>
                            <div className="font-medium">{lang === "ar" ? c.nameAr : c.name}</div>
                            <div className="text-xs text-muted-foreground" dir="ltr">{c.id} · {c.owner}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{sg ? t(sg.ar, sg.en) : "—"}</TableCell>
                      <TableCell>{lang === "ar" ? c.cityAr : c.city}</TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">{c.vat}</TableCell>
                      <TableCell>{c.orders}</TableCell>
                      <TableCell className="font-medium" dir="ltr">{sar(c.revenue)}</TableCell>
                      <TableCell><Badge className={st.tone + " hover:opacity-90"}>{t(st.ar, st.en)}</Badge></TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" />{t("عرض الملف", "View profile")}</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2"><Pencil className="h-4 w-4" />{t("تعديل", "Edit")}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />{t("حذف", "Delete")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

