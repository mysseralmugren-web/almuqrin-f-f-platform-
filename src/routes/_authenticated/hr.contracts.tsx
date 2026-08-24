import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app/purchasing-ui";
import { Loading, ErrorState, useHrFail, riyal, today } from "@/components/app/hr-ui";
import { CONTRACT_STATUS, CONTRACT_TYPE } from "@/lib/hr-constants";
import { listContracts, createContract, setContractStatus, listEmployees, getHrAccess } from "@/lib/hr.functions";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/hr/contracts")({
  head: () => ({
    meta: [
      { title: "عقود الموظفين · AlMugren AI Factory OS" },
      { name: "description", content: "Employment contracts, salary structure, probation and approvals." },
      { property: "og:title", content: "عقود الموظفين · AlMugren AI Factory OS" },
      { property: "og:description", content: "Employment contracts and salary structure." },
    ],
  }),
  component: ContractsPage,
});

function ContractsPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useHrFail();
  const qc = useQueryClient();

  const fetchContracts = useServerFn(listContracts);
  const fetchEmployees = useServerFn(listEmployees);
  const fetchAccess = useServerFn(getHrAccess);
  const mk = useServerFn(createContract);
  const setStatus = useServerFn(setContractStatus);

  const access = useQuery({ queryKey: ["hr-access"], queryFn: () => fetchAccess({}) });
  const contracts = useQuery({ queryKey: ["hr-contracts"], queryFn: () => fetchContracts({}) });
  const employees = useQuery({ queryKey: ["hr-employees", "", "all"], queryFn: () => fetchEmployees({ data: {} }) });

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    employee_id: "", contract_type: "permanent", start_date: today(), end_date: "", probation_days: "90",
    basic_salary: "", housing_allowance: "0", transport_allowance: "0", other_allowance: "0",
    working_hours_per_day: "8", working_days_per_week: "6", annual_leave_days: "21", clauses_override: "",
  });

  const create = useMutation({
    mutationFn: () =>
      mk({
        data: {
          employee_id: f.employee_id,
          contract_type: f.contract_type as any,
          start_date: f.start_date,
          end_date: f.end_date || null,
          probation_days: Number(f.probation_days || 0),
          basic_salary: Number(f.basic_salary || 0),
          housing_allowance: Number(f.housing_allowance || 0),
          transport_allowance: Number(f.transport_allowance || 0),
          other_allowance: Number(f.other_allowance || 0),
          working_hours_per_day: Number(f.working_hours_per_day || 8),
          working_days_per_week: Number(f.working_days_per_week || 6),
          annual_leave_days: Number(f.annual_leave_days || 21),
          clauses_override: f.clauses_override || null,
        },
      }),
    onSuccess: () => {
      toast.success(t("تم إنشاء العقد كمسودة", "Contract created as draft"));
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["hr-contracts"] });
    },
    onError: fail,
  });

  const change = useMutation({
    mutationFn: (v: { id: string; status: string }) => setStatus({ data: v as any }),
    onSuccess: () => {
      toast.success(t("تم تحديث حالة العقد", "Contract status updated"));
      void qc.invalidateQueries({ queryKey: ["hr-contracts"] });
    },
    onError: fail,
  });

  const isHr = access.data?.isHr ?? false;

  return (
    <div className="space-y-4">
      {isHr ? (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />{t("عقد جديد", "New contract")}</Button>
        </div>
      ) : null}

      {contracts.isLoading ? (
        <Loading />
      ) : contracts.isError ? (
        <ErrorState message={t("تعذر تحميل العقود", "Could not load contracts")} />
      ) : (contracts.data ?? []).length === 0 ? (
        <EmptyState icon={<FileSignature className="h-6 w-6" />} title={t("لا توجد عقود", "No contracts")} hint={t("أنشئ عقدًا لموظف قائم.", "Create a contract for an existing employee.")} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم العقد", "Contract")}</TableHead>
                  <TableHead>{t("الموظف", "Employee")}</TableHead>
                  <TableHead>{t("النوع", "Type")}</TableHead>
                  <TableHead>{t("المدة", "Period")}</TableHead>
                  <TableHead>{t("الأساسي", "Basic")}</TableHead>
                  <TableHead>{t("الإجمالي", "Total")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(contracts.data ?? []).map((ct: any) => (
                  <TableRow key={ct.id}>
                    <TableCell className="font-mono text-xs">{ct.contract_number}</TableCell>
                    <TableCell>{ct.employees.employee_number} — {ct.employees.full_name_ar}</TableCell>
                    <TableCell>{ar ? CONTRACT_TYPE[ct.contract_type as keyof typeof CONTRACT_TYPE].ar : CONTRACT_TYPE[ct.contract_type as keyof typeof CONTRACT_TYPE].en}</TableCell>
                    <TableCell className="font-mono text-xs">{ct.start_date} → {ct.end_date ?? "—"}</TableCell>
                    <TableCell className="font-mono">{riyal(ct.basic_salary)}</TableCell>
                    <TableCell className="font-mono">
                      {riyal(Number(ct.basic_salary) + Number(ct.housing_allowance) + Number(ct.transport_allowance) + Number(ct.other_allowance))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ct.status === "active" ? "default" : "secondary"}>
                        {ar ? CONTRACT_STATUS[ct.status as keyof typeof CONTRACT_STATUS].ar : CONTRACT_STATUS[ct.status as keyof typeof CONTRACT_STATUS].en}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1 text-end">
                      {isHr && ct.status === "draft" ? (
                        <Button size="sm" variant="outline" onClick={() => change.mutate({ id: ct.id, status: "active" })}>
                          {t("تفعيل", "Activate")}
                        </Button>
                      ) : null}
                      {isHr && ct.status === "active" ? (
                        <Button size="sm" variant="ghost" onClick={() => change.mutate({ id: ct.id, status: "terminated" })}>
                          {t("إنهاء", "Terminate")}
                        </Button>
                      ) : null}
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/print/contract/$id" params={{ id: ct.id }}><Printer className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("عقد عمل جديد", "New employment contract")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("الموظف", "Employee")}</Label>
              <Select value={f.employee_id || undefined} onValueChange={(v) => setF({ ...f, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر الموظف", "Select employee")} /></SelectTrigger>
                <SelectContent>
                  {(employees.data ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.employee_number} — {e.full_name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("نوع العقد", "Contract type")}</Label>
              <Select value={f.contract_type} onValueChange={(v) => setF({ ...f, contract_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TYPE).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {[
              ["start_date", t("تاريخ البداية", "Start date"), "date"],
              ["end_date", t("تاريخ النهاية", "End date"), "date"],
              ["probation_days", t("فترة التجربة (أيام)", "Probation (days)"), "number"],
              ["basic_salary", t("الراتب الأساسي", "Basic salary"), "number"],
              ["housing_allowance", t("بدل السكن", "Housing allowance"), "number"],
              ["transport_allowance", t("بدل النقل", "Transport allowance"), "number"],
              ["other_allowance", t("بدلات أخرى", "Other allowances"), "number"],
              ["working_hours_per_day", t("ساعات العمل اليومية", "Hours/day"), "number"],
              ["working_days_per_week", t("أيام العمل الأسبوعية", "Days/week"), "number"],
              ["annual_leave_days", t("الإجازة السنوية (أيام)", "Annual leave (days)"), "number"],
            ].map(([k, label, type]) => (
              <div key={k} className="space-y-1.5">
                <Label>{label}</Label>
                <Input type={type} value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("البنود القانونية تُدار من إعدادات الموارد البشرية، ولا يُعد العقد معتمدًا نظاميًا تلقائيًا.", "Legal clauses are configured in HR settings; the contract is not automatically legally certified.")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button disabled={!f.employee_id || !f.basic_salary || create.isPending} onClick={() => create.mutate()}>{t("حفظ", "Save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

