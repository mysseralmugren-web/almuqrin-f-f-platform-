import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package2, Plus, Undo2, Printer } from "lucide-react";
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
import { CUSTODY_STATUS } from "@/lib/hr-constants";
import { listCustodies, createCustody, setCustodyStatus, listEmployees, getHrAccess } from "@/lib/hr.functions";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/hr/custody")({
  head: () => ({
    meta: [
      { title: "عهد الموظفين · AlMugren AI Factory OS" },
      { name: "description", content: "Tools, devices and SIM custodies with issue and return records." },
      { property: "og:title", content: "عهد الموظفين · AlMugren AI Factory OS" },
      { property: "og:description", content: "Issue and return of employee custodies." },
    ],
  }),
  component: CustodyPage,
});

const CATEGORIES = [
  { k: "tool", ar: "أداة", en: "Tool" },
  { k: "device", ar: "جهاز", en: "Device" },
  { k: "sim", ar: "شريحة جوال", en: "SIM card" },
  { k: "vehicle", ar: "مركبة", en: "Vehicle" },
  { k: "uniform", ar: "زي", en: "Uniform" },
  { k: "other", ar: "أخرى", en: "Other" },
];

function CustodyPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useHrFail();
  const qc = useQueryClient();

  const fetchList = useServerFn(listCustodies);
  const fetchEmployees = useServerFn(listEmployees);
  const fetchAccess = useServerFn(getHrAccess);
  const mk = useServerFn(createCustody);
  const setStatus = useServerFn(setCustodyStatus);

  const access = useQuery({ queryKey: ["hr-access"], queryFn: () => fetchAccess({}) });
  const list = useQuery({ queryKey: ["hr-custodies"], queryFn: () => fetchList({ data: {} }) });
  const employees = useQuery({ queryKey: ["hr-employees", "", "all"], queryFn: () => fetchEmployees({ data: {} }) });
  const isHr = access.data?.isHr ?? false;

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ employee_id: "", category: "tool", item_name: "", serial_number: "", quantity: "1", estimated_value: "0", issued_date: today(), notes: "" });

  const create = useMutation({
    mutationFn: () => mk({ data: { ...f, quantity: Number(f.quantity), estimated_value: Number(f.estimated_value), serial_number: f.serial_number || null, notes: f.notes || null } as any }),
    onSuccess: () => { toast.success(t("تم تسجيل العهدة", "Custody recorded")); setOpen(false); void qc.invalidateQueries({ queryKey: ["hr-custodies"] }); },
    onError: fail,
  });
  const ret = useMutation({
    mutationFn: (id: string) => setStatus({ data: { id, status: "returned", returned_date: today() } as any }),
    onSuccess: () => { toast.success(t("تم الاسترداد", "Returned")); void qc.invalidateQueries({ queryKey: ["hr-custodies"] }); },
    onError: fail,
  });

  return (
    <div className="space-y-4">
      {isHr ? (
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" />{t("طباعة محضر", "Print record")}</Button>
          <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t("تسليم عهدة", "Issue custody")}</Button>
        </div>
      ) : null}

      {list.isLoading ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState message={t("تعذر تحميل العهد", "Could not load custodies")} />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState icon={<Package2 className="h-6 w-6" />} title={t("لا توجد عهد مسجلة", "No custodies recorded")} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرقم", "No.")}</TableHead>
                  <TableHead>{t("الموظف", "Employee")}</TableHead>
                  <TableHead>{t("الصنف", "Item")}</TableHead>
                  <TableHead>{t("الرقم التسلسلي", "Serial")}</TableHead>
                  <TableHead>{t("القيمة", "Value")}</TableHead>
                  <TableHead>{t("التسليم", "Issued")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(list.data ?? []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.custody_number}</TableCell>
                    <TableCell>{c.employees.employee_number} — {c.employees.full_name_ar}</TableCell>
                    <TableCell>{c.item_name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.serial_number ?? "—"}</TableCell>
                    <TableCell className="font-mono">{riyal(c.estimated_value)}</TableCell>
                    <TableCell className="font-mono text-xs">{c.issued_date}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "issued" ? "default" : "secondary"}>
                        {ar ? CUSTODY_STATUS[c.status as keyof typeof CUSTODY_STATUS].ar : CUSTODY_STATUS[c.status as keyof typeof CUSTODY_STATUS].en}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      {isHr && c.status === "issued" ? (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => ret.mutate(c.id)}>
                          <Undo2 className="h-4 w-4" />{t("استرداد", "Return")}
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("تسليم عهدة", "Issue custody")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("الموظف", "Employee")}</Label>
              <Select value={f.employee_id || undefined} onValueChange={(v) => setF({ ...f, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>{(employees.data ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employee_number} — {e.full_name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("الفئة", "Category")}</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.k} value={c.k}>{ar ? c.ar : c.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t("اسم الصنف", "Item name")}</Label><Input value={f.item_name} onChange={(e) => setF({ ...f, item_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>{t("الرقم التسلسلي", "Serial")}</Label><Input value={f.serial_number} onChange={(e) => setF({ ...f, serial_number: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>{t("القيمة التقديرية", "Estimated value")}</Label><Input type="number" value={f.estimated_value} onChange={(e) => setF({ ...f, estimated_value: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>{t("تاريخ التسليم", "Issue date")}</Label><Input type="date" value={f.issued_date} onChange={(e) => setF({ ...f, issued_date: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button disabled={!f.employee_id || f.item_name.length < 2 || create.isPending} onClick={() => create.mutate()}>{t("حفظ", "Save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

