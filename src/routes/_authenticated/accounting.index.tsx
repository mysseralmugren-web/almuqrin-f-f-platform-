import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listAccounts, createAccount, seedChartOfAccounts, financeOverview } from "@/lib/accounting.functions";
import { ACCOUNT_TYPE } from "@/lib/accounting-constants";
import { EmptyState } from "@/components/app/purchasing-ui";
import { exportCsv, money, useAccFail } from "@/components/app/accounting-ui";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/accounting/")({
  head: () => ({
    meta: [
      { title: "دليل الحسابات · AlMugren AI Factory OS" },
      { name: "description", content: "Multi-level company chart of accounts with postable leaf accounts." },
      { property: "og:title", content: "دليل الحسابات · AlMugren AI Factory OS" },
      { property: "og:description", content: "Company chart of accounts and finance readiness." },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useAccFail();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name_ar: "", name_en: "", account_type: "asset", parent_id: "" });

  const fetchAccounts = useServerFn(listAccounts);
  const fetchOverview = useServerFn(financeOverview);
  const create = useServerFn(createAccount);
  const seed = useServerFn(seedChartOfAccounts);

  const { data: accounts = [], isLoading } = useQuery({ queryKey: ["coa"], queryFn: () => fetchAccounts({}) });
  const { data: overview } = useQuery({ queryKey: ["finance-overview"], queryFn: () => fetchOverview({}) });
  const list = accounts as any[];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["coa"] });
    qc.invalidateQueries({ queryKey: ["finance-overview"] });
  };

  const addMut = useMutation({
    mutationFn: (v: any) => create({ data: v }),
    onSuccess: () => {
      toast.success(t("تم إنشاء الحساب", "Account created"));
      setOpen(false);
      setForm({ code: "", name_ar: "", name_en: "", account_type: "asset", parent_id: "" });
      invalidate();
    },
    onError: fail,
  });

  const seedMut = useMutation({
    mutationFn: () => seed({}),
    onSuccess: (r: any) => {
      toast.success(t(`تم إنشاء ${r.created} حسابًا`, `${r.created} accounts created`));
      invalidate();
    },
    onError: fail,
  });

  const depthOf = (a: any): number => {
    let d = 0;
    let cur = a.parent_id;
    while (cur && d < 10) {
      cur = list.find((x) => x.id === cur)?.parent_id;
      d += 1;
    }
    return d;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { ar: "عدد الحسابات", en: "Accounts", v: overview?.accounts ?? 0 },
          { ar: "فترات مفتوحة", en: "Open periods", v: overview?.open_periods ?? 0 },
          { ar: "قيود مرحّلة", en: "Posted entries", v: overview?.posted_entries ?? 0 },
          { ar: "قيمة المرحّل", en: "Posted value", v: money(overview?.posted_value ?? 0) },
        ].map((c) => (
          <Card key={c.en}>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground">{t(c.ar, c.en)}</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{c.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {overview && !overview.mapping_complete ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-5 text-sm">
            {t(
              "ربط الحسابات غير مكتمل — لن يعمل الترحيل الآلي قبل تحديد حسابات الذمم والضريبة والإيرادات والنقدية من صفحة الإعدادات المحاسبية.",
              "Account mapping is incomplete — automated posting stays disabled until receivables, VAT, revenue and cash accounts are mapped in Setup.",
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            {t("دليل الحسابات", "Chart of accounts")}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCsv("chart-of-accounts.csv", list.map((a) => ({ code: a.code, name_ar: a.name_ar, name_en: a.name_en, type: a.account_type, postable: a.is_postable })))
              }
              disabled={list.length === 0}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            {list.length === 0 ? (
              <Button size="sm" variant="secondary" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
                <Sparkles className="h-4 w-4" />
                {t("إنشاء دليل حسابات قياسي", "Create standard chart")}
              </Button>
            ) : null}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  {t("حساب جديد", "New account")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("إضافة حساب", "Add account")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>{t("رمز الحساب", "Code")}</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{t("الاسم بالعربية", "Arabic name")}</Label>
                    <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{t("الاسم بالإنجليزية", "English name")}</Label>
                    <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{t("النوع", "Type")}</Label>
                    <select
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.account_type}
                      onChange={(e) => setForm({ ...form, account_type: e.target.value })}
                    >
                      {Object.entries(ACCOUNT_TYPE).map(([k, v]) => (
                        <option key={k} value={k}>
                          {ar ? v.ar : v.en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{t("الحساب الأب (اختياري)", "Parent (optional)")}</Label>
                    <select
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.parent_id}
                      onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                    >
                      <option value="">{t("بدون", "None")}</option>
                      {list
                        .filter((a) => a.account_type === form.account_type)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} · {a.name_ar}
                          </option>
                        ))}
                    </select>
                  </div>
                  <Button
                    onClick={() =>
                      addMut.mutate({
                        code: form.code.trim(),
                        name_ar: form.name_ar.trim(),
                        name_en: form.name_en.trim() || null,
                        account_type: form.account_type,
                        parent_id: form.parent_id || null,
                      })
                    }
                    disabled={addMut.isPending || !form.code.trim() || form.name_ar.trim().length < 2}
                  >
                    {t("حفظ", "Save")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title={isLoading ? t("جارٍ التحميل…", "Loading…") : t("لا توجد حسابات بعد", "No accounts yet")}
              hint={t("ابدأ بدليل حسابات قياسي ثم عدّله حسب المنشأة", "Start from the standard chart, then adapt it")}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("الرمز", "Code")}</TableHead>
                    <TableHead>{t("اسم الحساب", "Account")}</TableHead>
                    <TableHead>{t("النوع", "Type")}</TableHead>
                    <TableHead>{t("قابل للترحيل", "Postable")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.code}</TableCell>
                      <TableCell style={{ paddingInlineStart: `${depthOf(a) * 18 + 12}px` }}>
                        <span className="font-medium">{a.name_ar}</span>
                        {a.name_en ? <span className="ms-2 text-xs text-muted-foreground">{a.name_en}</span> : null}
                      </TableCell>
                      <TableCell>{ar ? ACCOUNT_TYPE[a.account_type as keyof typeof ACCOUNT_TYPE].ar : ACCOUNT_TYPE[a.account_type as keyof typeof ACCOUNT_TYPE].en}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="border-0">
                          {a.is_postable ? t("نعم", "Yes") : t("حساب رئيسي", "Parent")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

