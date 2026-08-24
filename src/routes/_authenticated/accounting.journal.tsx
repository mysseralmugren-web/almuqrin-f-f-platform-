import { Fragment, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileStack, Plus, Trash2, Check, Undo2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listJournalEntries, createJournalEntry, postJournalEntry, deleteDraftEntry, reverseJournalEntry,
  getJournalEntry, listAccounts, listCostCenters,
} from "@/lib/accounting.functions";
import { JE_STATUS, SOURCE_LABELS } from "@/lib/accounting-constants";
import { EmptyState } from "@/components/app/purchasing-ui";
import { exportCsv, money, todayISO, useAccFail } from "@/components/app/accounting-ui";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/accounting/journal")({
  head: () => ({
    meta: [
      { title: "القيود اليومية · AlMugren AI Factory OS" },
      { name: "description", content: "Balanced journal entries with draft, posted and reversal control." },
      { property: "og:title", content: "القيود اليومية · AlMugren AI Factory OS" },
      { property: "og:description", content: "Balanced journal entries with posting and reversal control." },
    ],
  }),
  component: JournalPage,
});

type Line = { account_id: string; debit: string; credit: string; description: string; cost_center_id: string };
const emptyLine = (): Line => ({ account_id: "", debit: "", credit: "", description: "", cost_center_id: "" });

function JournalPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useAccFail();
  const qc = useQueryClient();

  const fetchEntries = useServerFn(listJournalEntries);
  const fetchAccounts = useServerFn(listAccounts);
  const fetchCenters = useServerFn(listCostCenters);
  const fetchEntry = useServerFn(getJournalEntry);
  const create = useServerFn(createJournalEntry);
  const post = useServerFn(postJournalEntry);
  const del = useServerFn(deleteDraftEntry);
  const reverse = useServerFn(reverseJournalEntry);

  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [head, setHead] = useState({ entry_date: todayISO(), memo: "", post: true });
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal", status],
    queryFn: () => fetchEntries({ data: status ? { status } : {} }),
  });
  const { data: accounts = [] } = useQuery({ queryKey: ["coa"], queryFn: () => fetchAccounts({}) });
  const { data: centers = [] } = useQuery({ queryKey: ["cost-centers"], queryFn: () => fetchCenters({}) });
  const { data: detail } = useQuery({
    queryKey: ["journal-entry", expanded],
    queryFn: () => fetchEntry({ data: { id: expanded! } }),
    enabled: !!expanded,
  });

  const postable = (accounts as any[]).filter((a) => a.is_postable);
  const rows = entries as any[];
  const totalDebit = lines.reduce((a, l) => a + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((a, l) => a + Number(l.credit || 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["journal"] });
    qc.invalidateQueries({ queryKey: ["finance-overview"] });
  };

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          entry_date: head.entry_date,
          memo: head.memo.trim(),
          post: head.post,
          lines: lines
            .filter((l) => l.account_id && (Number(l.debit || 0) > 0 || Number(l.credit || 0) > 0))
            .map((l) => ({
              account_id: l.account_id,
              debit: Number(l.debit || 0),
              credit: Number(l.credit || 0),
              description: l.description.trim() || null,
              cost_center_id: l.cost_center_id || null,
            })),
        },
      }),
    onSuccess: () => {
      toast.success(t("تم إنشاء القيد", "Entry created"));
      setOpen(false);
      setHead({ entry_date: todayISO(), memo: "", post: true });
      setLines([emptyLine(), emptyLine()]);
      refresh();
    },
    onError: fail,
  });

  const act = (fn: (v: any) => Promise<any>, msg: string) => async (id: string) => {
    try {
      await fn({ data: { id } });
      toast.success(msg);
      refresh();
    } catch (e) {
      fail(e);
    }
  };
  const doPost = act(post as any, t("تم ترحيل القيد", "Entry posted"));
  const doDelete = act(del as any, t("تم حذف المسودة", "Draft deleted"));
  const doReverse = act(reverse as any, t("تم عكس القيد", "Entry reversed"));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="h-4 w-4" />
            {t("القيود اليومية", "Journal entries")}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("كل الحالات", "All statuses")}</option>
              {Object.entries(JE_STATUS).map(([k, v]) => (<option key={k} value={k}>{ar ? v.ar : v.en}</option>))}
            </select>
            <Button variant="outline" size="sm" disabled={rows.length === 0}
              onClick={() => exportCsv("journal.csv", rows.map((r) => ({ number: r.entry_number, date: r.entry_date, memo: r.memo, debit: r.total_debit, credit: r.total_credit, status: r.status })))}>
              <Download className="h-4 w-4" />CSV
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />{t("قيد جديد", "New entry")}</Button></DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>{t("قيد يومية", "Journal entry")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-1.5"><Label>{t("التاريخ", "Date")}</Label><Input type="date" value={head.entry_date} onChange={(e) => setHead({ ...head, entry_date: e.target.value })} /></div>
                    <div className="grid gap-1.5 sm:col-span-2"><Label>{t("البيان", "Memo")}</Label><Input value={head.memo} onChange={(e) => setHead({ ...head, memo: e.target.value })} /></div>
                  </div>
                  <div className="max-h-[45vh] space-y-2 overflow-auto">
                    {lines.map((l, i) => (
                      <div key={i} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-12">
                        <select className="h-9 rounded-md border bg-background px-2 text-sm sm:col-span-4" value={l.account_id}
                          onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, account_id: e.target.value } : x)))}>
                          <option value="">{t("اختر الحساب", "Select account")}</option>
                          {postable.map((a) => (<option key={a.id} value={a.id}>{a.code} · {a.name_ar}</option>))}
                        </select>
                        <Input className="sm:col-span-2" type="number" min="0" step="0.01" placeholder={t("مدين", "Debit")} value={l.debit}
                          onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, debit: e.target.value, credit: "" } : x)))} />
                        <Input className="sm:col-span-2" type="number" min="0" step="0.01" placeholder={t("دائن", "Credit")} value={l.credit}
                          onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, credit: e.target.value, debit: "" } : x)))} />
                        <select className="h-9 rounded-md border bg-background px-2 text-sm sm:col-span-3" value={l.cost_center_id}
                          onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, cost_center_id: e.target.value } : x)))}>
                          <option value="">{t("بدون مركز تكلفة", "No cost center")}</option>
                          {(centers as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name_ar}</option>))}
                        </select>
                        <Button variant="ghost" size="icon" className="sm:col-span-1" onClick={() => setLines(lines.length > 2 ? lines.filter((_, j) => j !== i) : lines)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <Button variant="outline" size="sm" onClick={() => setLines([...lines, emptyLine()])}><Plus className="h-4 w-4" />{t("بند", "Line")}</Button>
                    <div className="flex gap-4 tabular-nums">
                      <span>{t("مدين", "Debit")}: <strong>{money(totalDebit)}</strong></span>
                      <span>{t("دائن", "Credit")}: <strong>{money(totalCredit)}</strong></span>
                      <span className={balanced ? "text-emerald-600" : "text-destructive"}>{balanced ? t("متوازن", "Balanced") : t("غير متوازن", "Unbalanced")}</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={head.post} onChange={(e) => setHead({ ...head, post: e.target.checked })} />
                    {t("ترحيل مباشر بعد الحفظ", "Post immediately after saving")}
                  </label>
                  <Button className="w-full" disabled={!balanced || head.memo.trim().length < 2 || createMut.isPending} onClick={() => createMut.mutate()}>
                    {t("حفظ القيد", "Save entry")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState icon={<FileStack className="h-6 w-6" />} title={isLoading ? t("جارٍ التحميل…", "Loading…") : t("لا توجد قيود", "No journal entries")} hint={t("القيود تُنشأ يدويًا أو عبر الترحيل الآلي للمستندات", "Entries come from manual capture or automated document posting")} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t("الرقم", "Number")}</TableHead><TableHead>{t("التاريخ", "Date")}</TableHead><TableHead>{t("البيان", "Memo")}</TableHead>
                  <TableHead>{t("المصدر", "Source")}</TableHead><TableHead className="text-end">{t("المبلغ", "Amount")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead><TableHead />
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <Fragment key={e.id}>
                      <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                        <TableCell className="font-mono text-xs">{e.entry_number}</TableCell>
                        <TableCell className="text-xs">{e.entry_date}</TableCell>
                        <TableCell className="max-w-[22rem] truncate">{e.memo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {SOURCE_LABELS[e.source_type ?? "manual"] ? (ar ? SOURCE_LABELS[e.source_type ?? "manual"]!.ar : SOURCE_LABELS[e.source_type ?? "manual"]!.en) : e.source_type}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">{money(e.total_debit)}</TableCell>
                        <TableCell><Badge variant="secondary" className="border-0">{ar ? JE_STATUS[e.status as "draft"].ar : JE_STATUS[e.status as "draft"].en}</Badge></TableCell>
                        <TableCell className="text-end" onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {e.status === "draft" ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => doPost(e.id)}><Check className="h-4 w-4" />{t("ترحيل", "Post")}</Button>
                                <Button size="sm" variant="ghost" onClick={() => doDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>
                              </>
                            ) : null}
                            {e.status === "posted" ? (
                              <Button size="sm" variant="outline" onClick={() => doReverse(e.id)}><Undo2 className="h-4 w-4" />{t("عكس", "Reverse")}</Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded === e.id && detail ? (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <Table>
                              <TableHeader><TableRow>
                                <TableHead>{t("الحساب", "Account")}</TableHead><TableHead>{t("الوصف", "Description")}</TableHead>
                                <TableHead className="text-end">{t("مدين", "Debit")}</TableHead><TableHead className="text-end">{t("دائن", "Credit")}</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                {((detail as any).journal_entry_lines ?? []).map((l: any) => (
                                  <TableRow key={l.id}>
                                    <TableCell className="text-xs">{l.chart_of_accounts?.code} · {l.chart_of_accounts?.name_ar}</TableCell>
                                    <TableCell className="text-xs">{l.description ?? "—"}</TableCell>
                                    <TableCell className="text-end tabular-nums">{money(l.debit)}</TableCell>
                                    <TableCell className="text-end tabular-nums">{money(l.credit)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
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

