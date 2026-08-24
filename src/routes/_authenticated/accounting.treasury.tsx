import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listBankAccounts, createBankAccount, listVouchers, createVoucher, confirmVoucher,
  listStatementLines, addStatementLine, reconcileStatementLine,
} from "@/lib/accounting.functions";
import { VOUCHER_STATUS, VOUCHER_TYPE } from "@/lib/accounting-constants";
import { EmptyState } from "@/components/app/purchasing-ui";
import { money, todayISO, useAccFail } from "@/components/app/accounting-ui";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/accounting/treasury")({
  head: () => ({
    meta: [
      { title: "الخزينة والبنوك · AlMugren AI Factory OS" },
      { name: "description", content: "Bank accounts, receipt and payment vouchers, transfers and bank reconciliation." },
      { property: "og:title", content: "الخزينة والبنوك · AlMugren AI Factory OS" },
      { property: "og:description", content: "Vouchers, transfers and bank reconciliation." },
    ],
  }),
  component: TreasuryPage,
});

function TreasuryPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useAccFail();
  const qc = useQueryClient();

  const fetchBanks = useServerFn(listBankAccounts);
  const fetchVouchers = useServerFn(listVouchers);
  const fetchLines = useServerFn(listStatementLines);
  const mkBank = useServerFn(createBankAccount);
  const mkVoucher = useServerFn(createVoucher);
  const confirm = useServerFn(confirmVoucher);
  const addLine = useServerFn(addStatementLine);
  const reconcile = useServerFn(reconcileStatementLine);

  const { data: banks = [] } = useQuery({ queryKey: ["banks"], queryFn: () => fetchBanks({}) });
  const { data: vouchers = [] } = useQuery({ queryKey: ["vouchers"], queryFn: () => fetchVouchers({}) });
  const { data: stmt = [] } = useQuery({ queryKey: ["stmt"], queryFn: () => fetchLines({}) });

  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState({ name: "", bank_name: "", iban: "" });
  const [vOpen, setVOpen] = useState(false);
  const [v, setV] = useState({ voucher_type: "receipt", voucher_date: todayISO(), amount: "", bank_account_id: "", to_bank_account_id: "", bank_reference: "", memo: "" });
  const [line, setLine] = useState({ bank_account_id: "", line_date: todayISO(), amount: "", reference: "", description: "" });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["vouchers"] });
    qc.invalidateQueries({ queryKey: ["stmt"] });
    qc.invalidateQueries({ queryKey: ["journal"] });
    qc.invalidateQueries({ queryKey: ["finance-overview"] });
  };

  const bankMut = useMutation({
    mutationFn: () => mkBank({ data: { name: bank.name.trim(), bank_name: bank.bank_name.trim() || null, iban: bank.iban.trim() || null } }),
    onSuccess: () => { toast.success(t("تم إضافة الحساب البنكي", "Bank account added")); setBankOpen(false); setBank({ name: "", bank_name: "", iban: "" }); qc.invalidateQueries({ queryKey: ["banks"] }); },
    onError: fail,
  });

  const vMut = useMutation({
    mutationFn: () => mkVoucher({
      data: {
        voucher_type: v.voucher_type as any,
        voucher_date: v.voucher_date,
        amount: Number(v.amount),
        bank_account_id: v.bank_account_id,
        to_bank_account_id: v.voucher_type === "transfer" ? v.to_bank_account_id || null : null,
        bank_reference: v.bank_reference.trim() || null,
        memo: v.memo.trim() || null,
      } as any,
    }),
    onSuccess: () => { toast.success(t("تم إنشاء السند", "Voucher created")); setVOpen(false); setV({ ...v, amount: "", bank_reference: "", memo: "" }); refresh(); },
    onError: fail,
  });

  const confirmVoucherAction = async (id: string, current: string | null) => {
    const ref = window.prompt(t("أدخل المرجع البنكي", "Enter the bank reference"), current ?? "");
    if (!ref || ref.trim().length < 2) return;
    try {
      await confirm({ data: { id, bank_reference: ref.trim() } });
      toast.success(t("تم تأكيد السند وترحيل قيده", "Voucher confirmed and posted"));
      refresh();
    } catch (e) { fail(e); }
  };

  const lineMut = useMutation({
    mutationFn: () => addLine({ data: { bank_account_id: line.bank_account_id, line_date: line.line_date, amount: Number(line.amount), reference: line.reference.trim() || null, description: line.description.trim() || null } as any }),
    onSuccess: () => { toast.success(t("تمت إضافة حركة كشف الحساب", "Statement line added")); setLine({ ...line, amount: "", reference: "", description: "" }); qc.invalidateQueries({ queryKey: ["stmt"] }); },
    onError: fail,
  });

  const bankList = banks as any[];
  const voucherList = vouchers as any[];
  const stmtList = stmt as any[];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" />{t("الحسابات البنكية", "Bank accounts")}</CardTitle>
            <Dialog open={bankOpen} onOpenChange={setBankOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("حساب بنكي", "Bank account")}</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5"><Label>{t("الاسم", "Name")}</Label><Input value={bank.name} onChange={(e) => setBank({ ...bank, name: e.target.value })} /></div>
                  <div className="grid gap-1.5"><Label>{t("البنك", "Bank")}</Label><Input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} /></div>
                  <div className="grid gap-1.5"><Label>IBAN</Label><Input dir="ltr" placeholder="SA…" value={bank.iban} onChange={(e) => setBank({ ...bank, iban: e.target.value.toUpperCase() })} /></div>
                  <Button onClick={() => bankMut.mutate()} disabled={bankMut.isPending || bank.name.trim().length < 2}>{t("حفظ", "Save")}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {bankList.length === 0 ? (
              <EmptyState icon={<Landmark className="h-6 w-6" />} title={t("لا توجد حسابات بنكية", "No bank accounts")} hint={t("السندات تحتاج حسابًا بنكيًا", "Vouchers require a bank account")} />
            ) : (
              <ul className="space-y-2 text-sm">
                {bankList.map((b) => (
                  <li key={b.id} className="rounded-lg border px-3 py-2">
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.bank_name ?? "—"} {b.iban ? <span dir="ltr" className="font-mono"> · {b.iban}</span> : null}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{t("سندات القبض والصرف والحوالات", "Receipt, payment & transfer vouchers")}</CardTitle>
            <Dialog open={vOpen} onOpenChange={setVOpen}>
              <DialogTrigger asChild><Button size="sm" disabled={bankList.length === 0}><Plus className="h-4 w-4" />{t("سند جديد", "New voucher")}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("سند خزينة", "Treasury voucher")}</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>{t("النوع", "Type")}</Label>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={v.voucher_type} onChange={(e) => setV({ ...v, voucher_type: e.target.value })}>
                      {Object.entries(VOUCHER_TYPE).map(([k, val]) => (<option key={k} value={k}>{ar ? val.ar : val.en}</option>))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5"><Label>{t("التاريخ", "Date")}</Label><Input type="date" value={v.voucher_date} onChange={(e) => setV({ ...v, voucher_date: e.target.value })} /></div>
                    <div className="grid gap-1.5"><Label>{t("المبلغ", "Amount")}</Label><Input type="number" min="0.01" step="0.01" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{t("الحساب البنكي", "Bank account")}</Label>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={v.bank_account_id} onChange={(e) => setV({ ...v, bank_account_id: e.target.value })}>
                      <option value="">{t("اختر", "Select")}</option>
                      {bankList.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                    </select>
                  </div>
                  {v.voucher_type === "transfer" ? (
                    <div className="grid gap-1.5">
                      <Label>{t("الحساب المستلم", "Destination account")}</Label>
                      <select className="h-10 rounded-md border bg-background px-3 text-sm" value={v.to_bank_account_id} onChange={(e) => setV({ ...v, to_bank_account_id: e.target.value })}>
                        <option value="">{t("اختر", "Select")}</option>
                        {bankList.filter((b) => b.id !== v.bank_account_id).map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                      </select>
                    </div>
                  ) : null}
                  <div className="grid gap-1.5"><Label>{t("المرجع البنكي", "Bank reference")}</Label><Input value={v.bank_reference} onChange={(e) => setV({ ...v, bank_reference: e.target.value })} /></div>
                  <div className="grid gap-1.5"><Label>{t("البيان", "Memo")}</Label><Input value={v.memo} onChange={(e) => setV({ ...v, memo: e.target.value })} /></div>
                  <Button onClick={() => vMut.mutate()} disabled={vMut.isPending || !v.bank_account_id || Number(v.amount) <= 0}>{t("حفظ كمسودة", "Save as draft")}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {voucherList.length === 0 ? (
              <EmptyState icon={<Landmark className="h-6 w-6" />} title={t("لا توجد سندات", "No vouchers")} hint={t("التأكيد يتطلب مرجعًا بنكيًا وينشئ قيدًا مرحّلًا", "Confirming requires a bank reference and posts a journal entry")} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t("الرقم", "Number")}</TableHead><TableHead>{t("النوع", "Type")}</TableHead><TableHead>{t("التاريخ", "Date")}</TableHead>
                    <TableHead className="text-end">{t("المبلغ", "Amount")}</TableHead><TableHead>{t("المرجع البنكي", "Bank ref")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead><TableHead />
                  </TableRow></TableHeader>
                  <TableBody>
                    {voucherList.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.voucher_number}</TableCell>
                        <TableCell>{ar ? VOUCHER_TYPE[row.voucher_type as "receipt"].ar : VOUCHER_TYPE[row.voucher_type as "receipt"].en}</TableCell>
                        <TableCell className="text-xs">{row.voucher_date}</TableCell>
                        <TableCell className="text-end tabular-nums">{money(row.amount)}</TableCell>
                        <TableCell className="text-xs">{row.bank_reference ?? "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className="border-0">{ar ? VOUCHER_STATUS[row.status as "draft"].ar : VOUCHER_STATUS[row.status as "draft"].en}</Badge></TableCell>
                        <TableCell className="text-end">
                          {row.status === "draft" ? (
                            <Button size="sm" variant="outline" onClick={() => confirmVoucherAction(row.id, row.bank_reference)}>
                              <Check className="h-4 w-4" />{t("تأكيد", "Confirm")}
                            </Button>
                          ) : null}
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

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4" />{t("التسوية البنكية", "Bank reconciliation")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-6">
            <select className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2" value={line.bank_account_id} onChange={(e) => setLine({ ...line, bank_account_id: e.target.value })}>
              <option value="">{t("الحساب البنكي", "Bank account")}</option>
              {bankList.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
            <Input type="date" value={line.line_date} onChange={(e) => setLine({ ...line, line_date: e.target.value })} />
            <Input type="number" step="0.01" placeholder={t("المبلغ (سالب للصرف)", "Amount (negative = out)")} value={line.amount} onChange={(e) => setLine({ ...line, amount: e.target.value })} />
            <Input placeholder={t("المرجع", "Reference")} value={line.reference} onChange={(e) => setLine({ ...line, reference: e.target.value })} />
            <Button onClick={() => lineMut.mutate()} disabled={lineMut.isPending || !line.bank_account_id || !line.amount}>
              <Plus className="h-4 w-4" />{t("إضافة حركة", "Add line")}
            </Button>
          </div>
          {stmtList.length === 0 ? (
            <EmptyState icon={<Link2 className="h-6 w-6" />} title={t("لا توجد حركات كشف حساب", "No statement lines")} hint={t("أدخل حركات البنك ثم طابقها مع السندات المؤكدة", "Enter bank lines, then match them to confirmed vouchers")} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t("التاريخ", "Date")}</TableHead><TableHead>{t("المرجع", "Reference")}</TableHead>
                  <TableHead className="text-end">{t("المبلغ", "Amount")}</TableHead><TableHead>{t("الحالة", "Status")}</TableHead><TableHead />
                </TableRow></TableHeader>
                <TableBody>
                  {stmtList.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.line_date}</TableCell>
                      <TableCell className="text-xs">{s.reference ?? s.description ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums">{money(s.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="border-0">{s.matched_voucher_id ? t("مطابقة", "Matched") : t("غير مطابقة", "Unmatched")}</Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <select
                          className="h-9 rounded-md border bg-background px-2 text-sm"
                          value={s.matched_voucher_id ?? ""}
                          onChange={async (e) => {
                            try {
                              await reconcile({ data: { id: s.id, voucher_id: e.target.value || null } });
                              toast.success(t("تم تحديث المطابقة", "Reconciliation updated"));
                              qc.invalidateQueries({ queryKey: ["stmt"] });
                            } catch (err) { fail(err); }
                          }}
                        >
                          <option value="">{t("بدون مطابقة", "Unmatched")}</option>
                          {voucherList.filter((x) => x.status === "confirmed").map((x) => (
                            <option key={x.id} value={x.id}>{x.voucher_number} · {money(x.amount)}</option>
                          ))}
                        </select>
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

