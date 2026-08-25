import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, Calculator, CheckCircle2, BookOpen, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app/purchasing-ui";
import { Loading, ErrorState, useHrFail, riyal } from "@/components/app/hr-ui";
import { PAYROLL_STATUS } from "@/lib/hr-constants";
import {
  listPayroll, createPayrollPeriod, generatePayrollRun, approvePayrollRun, postPayrollRun,
  getPayrollRun, buildWpsExport, createPayrollAdjustment, listEmployees, getHrAccess,
} from "@/lib/hr.functions";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/hr/payroll")({
  head: () => ({
    meta: [
      { title: "الرواتب والمسيّرات · AlMugren AI Factory OS" },
      { name: "description", content: "Payroll periods, runs, adjustments, GOSI, WPS preparation and accounting posting." },
      { property: "og:title", content: "الرواتب والمسيّرات · AlMugren AI Factory OS" },
      { property: "og:description", content: "Payroll runs, GOSI and accounting posting." },
    ],
  }),
  component: PayrollPage,
});

function PayrollPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useHrFail();
  const qc = useQueryClient();

  const fetchPayroll = useServerFn(listPayroll);
  const fetchRun = useServerFn(getPayrollRun);
  const fetchEmployees = useServerFn(listEmployees);
  const fetchAccess = useServerFn(getHrAccess);
  const mkPeriod = useServerFn(createPayrollPeriod);
  const mkRun = useServerFn(generatePayrollRun);
  const approve = useServerFn(approvePayrollRun);
  const post = useServerFn(postPayrollRun);
  const wps = useServerFn(buildWpsExport);
  const mkAdj = useServerFn(createPayrollAdjustment);

  const access = useQuery({ queryKey: ["hr-access"], queryFn: () => fetchAccess({}) });
  const payroll = useQuery({ queryKey: ["hr-payroll"], queryFn: () => fetchPayroll({}) });
  const employees = useQuery({ queryKey: ["hr-employees", "", "all"], queryFn: () => fetchEmployees({ data: {} }) });

  const [runId, setRunId] = useState<string | null>(null);
  const run = useQuery({ queryKey: ["hr-run", runId], queryFn: () => fetchRun({ data: { id: runId! } }), enabled: !!runId });

  const now = new Date();
  const [periodOpen, setPeriodOpen] = useState(false);
  const [p, setP] = useState({ year: String(now.getUTCFullYear()), month: String(now.getUTCMonth() + 1) });
  const [adjOpen, setAdjOpen] = useState(false);
  const [adj, setAdj] = useState({ employee_id: "", kind: "deduction", label: "", amount: "" });

  const isPayroll = access.data?.isPayroll ?? false;
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["hr-payroll"] });
    void qc.invalidateQueries({ queryKey: ["hr-run"] });
  };

  const addPeriod = useMutation({
    mutationFn: () => mkPeriod({ data: { year: Number(p.year), month: Number(p.month) } }),
    onSuccess: () => { toast.success(t("تم إنشاء الفترة", "Period created")); setPeriodOpen(false); refresh(); }, onError: fail,
  });
  const generate = useMutation({
    mutationFn: (period_id: string) => mkRun({ data: { period_id } }),
    onSuccess: (r: any) => { toast.success(t(`تم احتساب ${r.employees} موظفًا`, `Calculated ${r.employees} employees`)); setRunId(r.id); refresh(); }, onError: fail,
  });
  const doApprove = useMutation({
    mutationFn: (id: string) => approve({ data: { id } }),
    onSuccess: () => { toast.success(t("تم اعتماد المسيّر وتجميد بياناته", "Run approved and frozen")); refresh(); }, onError: fail,
  });
  const doPost = useMutation({
    mutationFn: (id: string) => post({ data: { id } }),
    onSuccess: (r: any) => { toast.success(t(`تم الترحيل بالقيد ${r.entry_number}`, `Posted as ${r.entry_number}`)); refresh(); }, onError: fail,
  });
  const addAdj = useMutation({
    mutationFn: () => mkAdj({ data: { ...adj, amount: Number(adj.amount) } as any }),
    onSuccess: () => { toast.success(t("تمت إضافة التسوية", "Adjustment added")); setAdjOpen(false); refresh(); }, onError: fail,
  });
  const exportWps = useMutation({
    mutationFn: (run_id: string) => wps({ data: { run_id } }),
    onSuccess: (res: any) => {
      const headers = ["employee_number", "employee_name", "iban", "basic_salary", "housing_allowance", "other_earnings", "deductions", "net_pay"];
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [headers.join(","), ...res.rows.map((r: any) => headers.map((h) => esc(r[h])).join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `WPS-${res.period}.csv`;
      a.click();
      toast.info(res.disclaimer);
    },
    onError: fail,
  });

  if (!isPayroll && !access.isLoading) {
    return <ErrorState message={t("بيانات الرواتب مقصورة على المخوّلين", "Payroll data is restricted to authorised roles")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setAdjOpen(true)}>{t("تسوية/سلفة", "Adjustment")}</Button>
        <Button className="gap-2" onClick={() => setPeriodOpen(true)}><Plus className="h-4 w-4" />{t("فترة رواتب", "Payroll period")}</Button>
      </div>

      {payroll.isLoading ? (
        <Loading />
      ) : payroll.isError ? (
        <ErrorState message={t("تعذر تحميل بيانات الرواتب", "Could not load payroll data")} />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("فترات الرواتب", "Payroll periods")}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {(payroll.data?.periods ?? []).length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">{t("لم تُنشأ فترات بعد", "No periods created yet")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("الفترة", "Period")}</TableHead>
                      <TableHead>{t("من", "From")}</TableHead>
                      <TableHead>{t("إلى", "To")}</TableHead>
                      <TableHead>{t("تاريخ الصرف", "Pay date")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payroll.data?.periods ?? []).map((pr: any) => (
                      <TableRow key={pr.id}>
                        <TableCell className="font-mono">{pr.year}-{String(pr.month).padStart(2, "0")}</TableCell>
                        <TableCell className="font-mono text-xs">{pr.start_date}</TableCell>
                        <TableCell className="font-mono text-xs">{pr.end_date}</TableCell>
                        <TableCell className="font-mono text-xs">{pr.pay_date ?? "—"}</TableCell>
                        <TableCell className="text-end">
                          <Button size="sm" variant="outline" className="gap-1" disabled={generate.isPending} onClick={() => generate.mutate(pr.id)}>
                            <Calculator className="h-4 w-4" />{t("احتساب المسيّر", "Calculate run")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {(payroll.data?.runs ?? []).length === 0 ? (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title={t("لا توجد مسيّرات رواتب", "No payroll runs")} hint={t("أنشئ فترة ثم احتسب المسيّر من العقود السارية.", "Create a period, then calculate the run from active contracts.")} />
          ) : (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{t("المسيّرات", "Payroll runs")}</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("المسيّر", "Run")}</TableHead>
                      <TableHead>{t("الموظفون", "Employees")}</TableHead>
                      <TableHead>{t("الإجمالي", "Gross")}</TableHead>
                      <TableHead>{t("الخصومات", "Deductions")}</TableHead>
                      <TableHead>{t("الصافي", "Net")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payroll.data?.runs ?? []).map((r: any) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setRunId(r.id)}>
                        <TableCell className="font-mono text-xs">{r.run_number}</TableCell>
                        <TableCell className="font-mono">{r.employee_count}</TableCell>
                        <TableCell className="font-mono">{riyal(r.total_gross)}</TableCell>
                        <TableCell className="font-mono">{riyal(r.total_deductions)}</TableCell>
                        <TableCell className="font-mono font-semibold">{riyal(r.total_net)}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "approved" || r.status === "paid" ? "default" : "secondary"}>
                            {ar ? PAYROLL_STATUS[r.status as keyof typeof PAYROLL_STATUS].ar : PAYROLL_STATUS[r.status as keyof typeof PAYROLL_STATUS].en}
                          </Badge>
                        </TableCell>
                        <TableCell className="space-x-1 text-end" onClick={(e) => e.stopPropagation()}>
                          {r.status === "calculated" ? (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => doApprove.mutate(r.id)}>
                              <CheckCircle2 className="h-4 w-4" />{t("اعتماد", "Approve")}
                            </Button>
                          ) : null}
                          {r.status === "approved" && !r.journal_entry_id ? (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => doPost.mutate(r.id)}>
                              <BookOpen className="h-4 w-4" />{t("ترحيل محاسبي", "Post to GL")}
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => exportWps.mutate(r.id)}>
                            <Download className="h-4 w-4" />WPS
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!runId} onOpenChange={(o) => !o && setRunId(null)}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("تفاصيل المسيّر", "Payroll run details")}</DialogTitle></DialogHeader>
          {run.isLoading ? <Loading /> : run.data ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("الموظف", "Employee")}</TableHead>
                    <TableHead>{t("الأساسي", "Basic")}</TableHead>
                    <TableHead>{t("البدلات", "Allowances")}</TableHead>
                    <TableHead>{t("الإضافي", "Overtime")}</TableHead>
                    <TableHead>{t("التأمينات", "GOSI")}</TableHead>
                    <TableHead>{t("الخصومات", "Deductions")}</TableHead>
                    <TableHead>{t("الصافي", "Net")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.data.items.map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.employees.employee_number} — {it.employees.full_name_ar}</TableCell>
                      <TableCell className="font-mono">{riyal(it.basic_salary)}</TableCell>
                      <TableCell className="font-mono">{riyal(Number(it.housing_allowance) + Number(it.transport_allowance) + Number(it.other_allowance))}</TableCell>
                      <TableCell className="font-mono">{riyal(it.overtime_amount)}</TableCell>
                      <TableCell className="font-mono">{riyal(it.gosi_employee)}</TableCell>
                      <TableCell className="font-mono">{riyal(it.total_deductions)}</TableCell>
                      <TableCell className="font-mono font-semibold">{riyal(it.net_pay)}</TableCell>
                      <TableCell className="text-end">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/print/payslip/$id" params={{ id: it.id }}><Printer className="h-4 w-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("فترة رواتب جديدة", "New payroll period")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("السنة", "Year")}</Label><Input type="number" value={p.year} onChange={(e) => setP({ ...p, year: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("الشهر", "Month")}</Label><Input type="number" min={1} max={12} value={p.month} onChange={(e) => setP({ ...p, month: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPeriodOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button disabled={addPeriod.isPending} onClick={() => addPeriod.mutate()}>{t("حفظ", "Save")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("تسوية أو سلفة", "Adjustment or advance")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("الموظف", "Employee")}</Label>
              <Select value={adj.employee_id || undefined} onValueChange={(v) => setAdj({ ...adj, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>{(employees.data ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employee_number} — {e.full_name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("النوع", "Kind")}</Label>
              <Select value={adj.kind} onValueChange={(v) => setAdj({ ...adj, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowance">{t("بدل إضافي", "Allowance")}</SelectItem>
                  <SelectItem value="deduction">{t("خصم", "Deduction")}</SelectItem>
                  <SelectItem value="advance">{t("سلفة", "Advance")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("الوصف", "Label")}</Label><Input value={adj.label} onChange={(e) => setAdj({ ...adj, label: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("المبلغ", "Amount")}</Label><Input type="number" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjOpen(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button disabled={!adj.employee_id || adj.label.length < 2 || !adj.amount || addAdj.isPending} onClick={() => addAdj.mutate()}>{t("حفظ", "Save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

