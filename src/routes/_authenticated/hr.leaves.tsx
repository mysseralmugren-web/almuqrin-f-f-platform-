import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plane, Plus, Check, X } from "lucide-react";
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
import { Loading, ErrorState, useHrFail, today } from "@/components/app/hr-ui";
import { LEAVE_STATUS } from "@/lib/hr-constants";
import {
  listLeaveData, saveLeaveType, saveLeaveBalance, createLeaveRequest, setLeaveStatus, listEmployees, getHrAccess,
} from "@/lib/hr.functions";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/hr/leaves")({
  head: () => ({
    meta: [
      { title: "الإجازات وأرصدتها · AlMugren AI Factory OS" },
      { name: "description", content: "Leave types, yearly balances, requests and approval workflow." },
      { property: "og:title", content: "الإجازات وأرصدتها · AlMugren AI Factory OS" },
      { property: "og:description", content: "Leave balances and approval workflow." },
    ],
  }),
  component: LeavesPage,
});

function LeavesPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useHrFail();
  const qc = useQueryClient();

  const fetchData = useServerFn(listLeaveData);
  const fetchEmployees = useServerFn(listEmployees);
  const fetchAccess = useServerFn(getHrAccess);
  const mkType = useServerFn(saveLeaveType);
  const mkBalance = useServerFn(saveLeaveBalance);
  const mkRequest = useServerFn(createLeaveRequest);
  const setStatus = useServerFn(setLeaveStatus);

  const year = new Date().getUTCFullYear();
  const access = useQuery({ queryKey: ["hr-access"], queryFn: () => fetchAccess({}) });
  const data = useQuery({ queryKey: ["hr-leaves", year], queryFn: () => fetchData({ data: { year } }) });
  const employees = useQuery({ queryKey: ["hr-employees", "", "all"], queryFn: () => fetchEmployees({ data: {} }) });

  const isHr = access.data?.isHr ?? false;
  const [typeOpen, setTypeOpen] = useState(false);
  const [balOpen, setBalOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [ty, setTy] = useState({ code: "", name_ar: "", default_days_per_year: "0", is_paid: true });
  const [bal, setBal] = useState({ employee_id: "", leave_type_id: "", entitled_days: "", carried_days: "0" });
  const [req, setReq] = useState({ employee_id: "", leave_type_id: "", start_date: today(), end_date: today(), reason: "" });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["hr-leaves"] });

  const createType = useMutation({
    mutationFn: () => mkType({ data: { ...ty, default_days_per_year: Number(ty.default_days_per_year), requires_attachment: false, allow_carry_over: false, max_carry_over_days: 0, is_active: true } as any }),
    onSuccess: () => { toast.success(t("تم الحفظ", "Saved")); setTypeOpen(false); refresh(); }, onError: fail,
  });
  const createBal = useMutation({
    mutationFn: () => mkBalance({ data: { ...bal, year, entitled_days: Number(bal.entitled_days), carried_days: Number(bal.carried_days) } as any }),
    onSuccess: () => { toast.success(t("تم تحديث الرصيد", "Balance updated")); setBalOpen(false); refresh(); }, onError: fail,
  });
  const createReq = useMutation({
    mutationFn: () => mkRequest({ data: { ...req, employee_id: req.employee_id || undefined, reason: req.reason || null } as any }),
    onSuccess: () => { toast.success(t("تم تقديم الطلب", "Request submitted")); setReqOpen(false); refresh(); }, onError: fail,
  });
  const decide = useMutation({
    mutationFn: (v: { id: string; status: string }) => setStatus({ data: v as any }),
    onSuccess: () => { toast.success(t("تم تحديث الطلب", "Request updated")); refresh(); }, onError: fail,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        {isHr ? (
          <>
            <Button variant="outline" onClick={() => setTypeOpen(true)}>{t("نوع إجازة", "Leave type")}</Button>
            <Button variant="outline" onClick={() => setBalOpen(true)}>{t("رصيد إجازة", "Leave balance")}</Button>
          </>
        ) : null}
        <Button className="gap-2" onClick={() => setReqOpen(true)}><Plus className="h-4 w-4" />{t("طلب إجازة", "Leave request")}</Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{t(`أرصدة ${year}`, `${year} balances`)}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {(data.data?.balances ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("لا توجد أرصدة معرّفة", "No balances defined")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الموظف", "Employee")}</TableHead>
                  <TableHead>{t("المستحق", "Entitled")}</TableHead>
                  <TableHead>{t("المرحّل", "Carried")}</TableHead>
                  <TableHead>{t("المستخدم", "Used")}</TableHead>
                  <TableHead>{t("المتاح", "Available")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.data?.balances ?? []).map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.employees.employee_number} — {b.employees.full_name_ar}</TableCell>
                    <TableCell className="font-mono">{b.entitled_days}</TableCell>
                    <TableCell className="font-mono">{b.carried_days}</TableCell>
                    <TableCell className="font-mono">{b.used_days}</TableCell>
                    <TableCell className="font-mono font-semibold">{Number(b.entitled_days) + Number(b.carried_days) - Number(b.used_days)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data.isLoading ? (
        <Loading />
      ) : data.isError ? (
        <ErrorState message={t("تعذر تحميل الإجازات", "Could not load leaves")} />
      ) : (data.data?.requests ?? []).length === 0 ? (
        <EmptyState icon={<Plane className="h-6 w-6" />} title={t("لا توجد طلبات إجازة", "No leave requests")} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الطلب", "Request")}</TableHead>
                  <TableHead>{t("الموظف", "Employee")}</TableHead>
                  <TableHead>{t("النوع", "Type")}</TableHead>
                  <TableHead>{t("الفترة", "Period")}</TableHead>
                  <TableHead>{t("الأيام", "Days")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.data?.requests ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                    <TableCell>{r.employees.employee_number} — {r.employees.full_name_ar}</TableCell>
                    <TableCell>{r.leave_types.name_ar}</TableCell>
                    <TableCell className="font-mono text-xs">{r.start_date} → {r.end_date}</TableCell>
                    <TableCell className="font-mono">{r.days}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                        {ar ? LEAVE_STATUS[r.status as keyof typeof LEAVE_STATUS].ar : LEAVE_STATUS[r.status as keyof typeof LEAVE_STATUS].en}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1 text-end">
                      {r.status === "submitted" ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: r.id, status: "approved" })}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: r.id, status: "rejected" })}><X className="h-4 w-4" /></Button>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("نوع إجازة", "Leave type")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>{t("الرمز", "Code")}</Label><Input value={ty.code} onChange={(e) => setTy({ ...ty, code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("الاسم", "Name")}</Label><Input value={ty.name_ar} onChange={(e) => setTy({ ...ty, name_ar: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("الأيام الافتراضية سنويًا", "Default days/year")}</Label><Input type="number" value={ty.default_days_per_year} onChange={(e) => setTy({ ...ty, default_days_per_year: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTypeOpen(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button disabled={!ty.code || ty.name_ar.length < 2 || createType.isPending} onClick={() => createType.mutate()}>{t("حفظ", "Save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={balOpen} onOpenChange={setBalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("رصيد إجازة", "Leave balance")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("الموظف", "Employee")}</Label>
              <Select value={bal.employee_id || undefined} onValueChange={(v) => setBal({ ...bal, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>{(employees.data ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employee_number} — {e.full_name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("نوع الإجازة", "Leave type")}</Label>
              <Select value={bal.leave_type_id || undefined} onValueChange={(v) => setBal({ ...bal, leave_type_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>{(data.data?.types ?? []).map((ty2: any) => <SelectItem key={ty2.id} value={ty2.id}>{ty2.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>{t("المستحق", "Entitled")}</Label><Input type="number" value={bal.entitled_days} onChange={(e) => setBal({ ...bal, entitled_days: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("المرحّل", "Carried")}</Label><Input type="number" value={bal.carried_days} onChange={(e) => setBal({ ...bal, carried_days: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBalOpen(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button disabled={!bal.employee_id || !bal.leave_type_id || !bal.entitled_days || createBal.isPending} onClick={() => createBal.mutate()}>{t("حفظ", "Save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("طلب إجازة", "Leave request")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {isHr ? (
              <div className="space-y-1.5">
                <Label>{t("الموظف", "Employee")}</Label>
                <Select value={req.employee_id || undefined} onValueChange={(v) => setReq({ ...req, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("نفسي", "Myself")} /></SelectTrigger>
                  <SelectContent>{(employees.data ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employee_number} — {e.full_name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>{t("نوع الإجازة", "Leave type")}</Label>
              <Select value={req.leave_type_id || undefined} onValueChange={(v) => setReq({ ...req, leave_type_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>{(data.data?.types ?? []).map((ty2: any) => <SelectItem key={ty2.id} value={ty2.id}>{ty2.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>{t("من", "From")}</Label><Input type="date" value={req.start_date} onChange={(e) => setReq({ ...req, start_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("إلى", "To")}</Label><Input type="date" value={req.end_date} onChange={(e) => setReq({ ...req, end_date: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>{t("السبب", "Reason")}</Label><Input value={req.reason} onChange={(e) => setReq({ ...req, reason: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReqOpen(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button disabled={!req.leave_type_id || createReq.isPending} onClick={() => createReq.mutate()}>{t("تقديم", "Submit")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

