import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Target, Flame, TrendingUp, Percent, MoreHorizontal, Pencil, Phone, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useTheme } from "@/lib/theme";
import { LEADS, LEAD_SOURCES, PIPELINE_STAGES, sar } from "@/lib/crm-data";

export const Route = createFileRoute("/_authenticated/crm/leads")({
  head: () => ({
    meta: [
      { title: "Leads · CRM · AlMugren AI Factory OS" },
      { name: "description", content: "Capture, qualify and track furniture project leads across Saudi Arabia." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const t = useT();
  const { lang } = useTheme();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");

  const open = LEADS.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const hot = LEADS.filter((l) => l.score >= 80).length;
  const total = open.reduce((s, l) => s + l.value, 0);
  const winRate = Math.round((LEADS.filter((l) => l.stage === "won").length / LEADS.length) * 100);

  const filtered = LEADS.filter(
    (l) =>
      (stage === "all" || l.stage === stage) &&
      [l.company, l.companyAr, l.contact, l.contactAr, l.id, l.owner].some((f) =>
        f.toLowerCase().includes(query.toLowerCase()),
      ),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Target} tone="primary" label={t("فرص مفتوحة", "Open leads")} value={String(open.length)} />
        <Stat icon={Flame} tone="warning" label={t("فرص ساخنة", "Hot leads")} value={String(hot)} />
        <Stat icon={TrendingUp} tone="success" label={t("القيمة المتوقعة (ر.س)", "Pipeline value (SAR)")} value={sar(total)} />
        <Stat icon={Percent} tone="accent" label={t("معدل الفوز", "Win rate")} value={`${winRate}%`} />
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">{t("العملاء المحتملون", "Leads directory")}</CardTitle>
            <CardDescription>
              {t("تسجيل الفرص، تأهيلها، وتحويلها إلى عملاء.", "Capture, qualify and convert leads into accounts.")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("ابحث بالجهة أو المسؤول...", "Search company or owner...")}
                className="h-9 w-60 ltr:pl-9 rtl:pr-9"
              />
            </div>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("كل المراحل", "All stages")}</SelectItem>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{t(s.ar, s.en)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <NewLeadDialog />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الجهة", "Company")}</TableHead>
                  <TableHead>{t("جهة الاتصال", "Contact")}</TableHead>
                  <TableHead>{t("المصدر", "Source")}</TableHead>
                  <TableHead>{t("المرحلة", "Stage")}</TableHead>
                  <TableHead>{t("القيمة (ر.س)", "Value (SAR)")}</TableHead>
                  <TableHead className="w-40">{t("التقييم", "Score")}</TableHead>
                  <TableHead className="text-end">{t("إجراءات", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const st = PIPELINE_STAGES.find((s) => s.key === l.stage)!;
                  const src = LEAD_SOURCES.find((s) => s.key === l.source);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="font-medium">{lang === "ar" ? l.companyAr : l.company}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{l.id} · {lang === "ar" ? l.cityAr : l.city}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{lang === "ar" ? l.contactAr : l.contact}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{l.phone}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{src ? t(src.ar, src.en) : "—"}</TableCell>
                      <TableCell><Badge className={st.tone + " hover:opacity-90"}>{t(st.ar, st.en)}</Badge></TableCell>
                      <TableCell className="font-medium" dir="ltr">{sar(l.value)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={l.score} className="h-1.5" />
                          <span className="w-8 text-xs text-muted-foreground">{l.score}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2"><Pencil className="h-4 w-4" />{t("تعديل", "Edit")}</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2"><Phone className="h-4 w-4" />{t("تسجيل مكالمة", "Log a call")}</DropdownMenuItem>
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

function NewLeadDialog() {
  const t = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-9 gap-2 gradient-primary"><Plus className="h-4 w-4" />{t("فرصة جديدة", "New lead")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("إضافة عميل محتمل", "Add a lead")}</DialogTitle>
          <DialogDescription>{t("بيانات أولية للفرصة البيعية.", "Basic details for the sales opportunity.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("اسم الجهة", "Company")} placeholder={t("مثال: فنادق نسما", "e.g. Nesma Hotels")} />
          <Field label={t("جهة الاتصال", "Contact person")} placeholder={t("الاسم الكامل", "Full name")} />
          <Field label={t("الجوال", "Mobile")} placeholder="+966 5X XXX XXXX" />
          <Field label={t("البريد الإلكتروني", "Email")} placeholder="name@company.sa" />
          <div className="space-y-1.5">
            <Label>{t("المصدر", "Source")}</Label>
            <Select defaultValue="website">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => <SelectItem key={s.key} value={s.key}>{t(s.ar, s.en)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("المرحلة", "Stage")}</Label>
            <Select defaultValue="new">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{t(s.ar, s.en)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("ملاحظات", "Notes")}</Label>
            <Textarea rows={3} placeholder={t("تفاصيل المشروع والاحتياج...", "Project scope and requirements...")} />
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

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input placeholder={placeholder} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    accent: "bg-accent/20 text-accent-foreground",
  };
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={"grid h-10 w-10 shrink-0 place-items-center rounded-lg " + tones[tone]}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold" dir="ltr">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

