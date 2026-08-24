import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Clock } from "lucide-react";
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
import { Loading, ErrorState, useHrFail, mins, today, monthStart } from "@/components/app/hr-ui";
import { ATTENDANCE_STATUS } from "@/lib/hr-constants";
import { listAttendance, saveAttendance, listShifts, saveShift, assignShift, listEmployees, getHrAccess } from "@/lib/hr.functions";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/hr/attendance")({
  head: () => ({
    meta: [
      { title: "الدوام والحضور · AlMugren AI Factory OS" },
      { name: "description", content: "Shifts, shift assignments and attendance with late and overtime calculation in Asia/Riyadh." },
      { property: "og:title", content: "الدوام والحضور · AlMugren AI Factory OS" },
      { property: "og:description", content: "Shifts and attendance records." },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useHrFail();
  const qc = useQueryClient();

  const fetchAtt = useServerFn(listAttendance);
  const fetchShifts = useServerFn(listShifts);
  const fetchEmployees = useServerFn(listEmployees);
  const fetchAccess = useServerFn(getHrAccess);
  const mkAtt = useServerFn(saveAttendance);
  const mkShift = useServerFn(saveShift);
  const mkAssign = useServerFn(assignShift);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [attOpen, setAttOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [a, setA] = useState({ employee_id: "", work_date: today(), check_in: "08:00", check_out: "17:00", status: "present", manual_reason: "" });
  const [s, setS] = useState({ code: "", name_ar: "", start_time: "08:00", end_time: "17:00", break_minutes: "60", grace_minutes: "10" });
  const [as, setAs] = useState({ employee_id: "", shift_id: "", start_date: today(), end_date: "" });

  const access = useQuery({ queryKey: ["hr-access"], queryFn: () => fetchAccess({}) });
  const shifts = useQuery({ queryKey: ["hr-shifts"], queryFn: () => fetchShifts({}) });
  const employees = useQuery({ queryKey: ["hr-employees", "", "all"], queryFn: () => fetchEmployees({ data: {} }) });
  const att = useQuery({ queryKey: ["hr-att", from, to], queryFn: () => fetchAtt({ data: { from, to } }) });

  const isHr = access.data?.isHr ?? false;
  const iso = (d: string, hm: string) => (hm ? new Date(`${d}T${hm}:00+03:00`).toISOString() : null);

  const saveAtt = useMutation({
    mutationFn: () =>
      mkAtt({
        data: {
          employee_id: a.employee_id,
          work_date: a.work_date,
          check_in: iso(a.work_date, a.check_in),
          check_out: iso(a.work_date, a.check_out),
          status: a.status as any,
          is_manual: true,
          manual_reason: a.manual_reason,
        },
      }),
    onSuccess: () => { toast.success(t("تم حفظ سجل الحضور", "Attendance saved")); setAttOpen(false); void qc.invalidateQueries({ queryKey: ["hr-att"] }); },
    onError: fail,
  });

  const createShift = useMutation({
    mutationFn: () => mkShift({ data: { ...s, break_minutes: Number(s.break_minutes), grace_minutes: Number(s.grace_minutes), crosses_midnight: s.end_time <= s.start_time, is_active: true } as any }),
    onSuccess: () => { toast.success(t("تم حفظ الوردية", "Shift saved")); setShiftOpen(false); void qc.invalidateQueries({ queryKey: ["hr-shifts"] }); },
    onError: fail,
  });

  const assign = useMutation({
    mutationFn: () => mkAssign({ data: { ...as, end_date: as.end_date || null } as any }),
    onSuccess: () => { toast.success(t("تم إسناد الوردية", "Shift assigned")); setAssignOpen(false); void qc.invalidateQueries({ queryKey: ["hr-shifts"] }); },
    onError: fail,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" />{t("الورديات", "Shifts")}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {(shifts.data?.shifts ?? []).map((sh: any) => (
            <Badge key={sh.id} variant="secondary" className="gap-1">
              {sh.name_ar} · {sh.start_time?.slice(0, 5)}–{sh.end_time?.slice(0, 5)}
            </Badge>
          ))}
          {(shifts.data?.shifts ?? []).length === 0 ? (
            <span className="text-sm text-muted-foreground">{t("لم تُعرّف ورديات بعد", "No shifts defined yet")}</span>
          ) : null}
          {isHr ? (
            <div className="ms-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShiftOpen(true)}>{t("وردية جديدة", "New shift")}</Button>
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>{t("إسناد وردية", "Assign shift")}</Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5"><Label>{t("من", "From")}</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t("إلى", "To")}</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        {isHr ? <Button className="gap-2" onClick={() => setAttOpen(true)}><Plus className="h-4 w-4" />{t("تسجيل حضور", "Record attendance")}</Button> : null}
      </div>

      {att.isLoading ? (
        <Loading />
      ) : att.isError ? (
        <ErrorState message={t("تعذر تحميل سجلات الحضور", "Could not load attendance")} />
      ) : (att.data ?? []).length === 0 ? (
        <EmptyState icon={<CalendarClock className="h-6 w-6" />} title={t("لا توجد سجلات حضور", "No attendance records")} hint={t("الاحتساب يتم في الخادم بتوقيت الرياض.", "Calculations run on the server in Asia/Riyadh time.")} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("التاريخ", "Date")}</TableHead>
                  <TableHead>{t("الموظف", "Employee")}</TableHead>
                  <TableHead>{t("الحضور", "In")}</TableHead>
                  <TableHead>{t("الانصراف", "Out")}</TableHead>
                  <TableHead>{t("التأخير", "Late")}</TableHead>
                  <TableHead>{t("الإضافي", "Overtime")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(att.data ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.work_date}</TableCell>
                    <TableCell>{r.employees.employee_number} — {r.employees.full_name_ar}</TableCell>
                    <TableCell className="font-mono text-xs">{r.check_in ? new Date(r.check_in).toLocaleTimeString("en-GB", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.check_out ? new Date(r.check_out).toLocaleTimeString("en-GB", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                    <TableCell className="font-mono">{mins(r.late_minutes)}</TableCell>
                    <TableCell className="font-mono">{mins(r.overtime_minutes)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "absent" ? "destructive" : r.status === "late" ? "outline" : "secondary"}>
                        {ar ? ATTENDANCE_STATUS[r.status as keyof typeof ATTENDANCE_STATUS].ar : ATTENDANCE_STATUS[r.status as keyof typeof ATTENDANCE_STATUS].en}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={attOpen} onOpenChange={setAttOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("تسجيل/تعديل حضور", "Record attendance")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("الموظف", "Employee")}</Label>
              <Select value={a.employee_id || undefined} onValueChange={(v) => setA({ ...a, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>
                  {(employees.data ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employee_number} — {e.full_name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5"><Label>{t("التاريخ", "Date")}</Label><Input type="date" value={a.work_date} onChange={(e) => setA({ ...a, work_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("الحضور", "In")}</Label><Input type="time" value={a.check_in} onChange={(e) => setA({ ...a, check_in: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("الانصراف", "Out")}</Label><Input type="time" value={a.check_out} onChange={(e) => setA({ ...a, check_out: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("الحالة", "Status")}</Label>
              <Select value={a.status} onValueChange={(v) => setA({ ...a, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTENDANCE_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("سبب التسجيل اليدوي", "Manual reason")}</Label>
              <Input value={a.manual_reason} onChange={(e) => setA({ ...a, manual_reason: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAttOpen(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button disabled={!a.employee_id || !a.manual_reason || saveAtt.isPending} onClick={() => saveAtt.mutate()}>{t("حفظ", "Save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("وردية جديدة", "New shift")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>{t("الرمز", "Code")}</Label><Input value={s.code} onChange={(e) => setS({ ...s, code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("الاسم", "Name")}</Label><Input value={s.name_ar} onChange={(e) => setS({ ...s, name_ar: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("البداية", "Start")}</Label><Input type="time" value={s.start_time} onChange={(e) => setS({ ...s, start_time: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("النهاية", "End")}</Label><Input type="time" value={s.end_time} onChange={(e) => setS({ ...s, end_time: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("الاستراحة (دقيقة)", "Break (min)")}</Label><Input type="number" value={s.break_minutes} onChange={(e) => setS({ ...s, break_minutes: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("سماح التأخير (دقيقة)", "Grace (min)")}</Label><Input type="number" value={s.grace_minutes} onChange={(e) => setS({ ...s, grace_minutes: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShiftOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button disabled={!s.code || s.name_ar.length < 2 || createShift.isPending} onClick={() => createShift.mutate()}>{t("حفظ", "Save")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("إسناد وردية", "Assign shift")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("الموظف", "Employee")}</Label>
              <Select value={as.employee_id || undefined} onValueChange={(v) => setAs({ ...as, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>{(employees.data ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employee_number} — {e.full_name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("الوردية", "Shift")}</Label>
              <Select value={as.shift_id || undefined} onValueChange={(v) => setAs({ ...as, shift_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>{(shifts.data?.shifts ?? []).map((sh: any) => <SelectItem key={sh.id} value={sh.id}>{sh.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>{t("من", "From")}</Label><Input type="date" value={as.start_date} onChange={(e) => setAs({ ...as, start_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("إلى", "To")}</Label><Input type="date" value={as.end_date} onChange={(e) => setAs({ ...as, end_date: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button disabled={!as.employee_id || !as.shift_id || assign.isPending} onClick={() => assign.mutate()}>{t("حفظ", "Save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

