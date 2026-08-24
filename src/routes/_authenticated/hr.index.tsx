import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Search, IdCard, Building2, ShieldAlert, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app/purchasing-ui";
import { Loading, ErrorState, useHrFail, mask, today } from "@/components/app/hr-ui";
import { EMPLOYMENT_STATUS, HR_DOC_TYPE } from "@/lib/hr-constants";
import {
  listEmployees, createEmployee, updateEmployee, getEmployee, listOrg,
  saveDepartment, saveJobTitle, saveWorkLocation, getHrAccess, listExpiringDocuments,
} from "@/lib/hr.functions";
import { useT, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/hr/")({
  head: () => ({
    meta: [
      { title: "ملفات الموظفين · AlMugren AI Factory OS" },
      { name: "description", content: "Employee master file, organisation structure and document expiry alerts." },
      { property: "og:title", content: "ملفات الموظفين · AlMugren AI Factory OS" },
      { property: "og:description", content: "Employee master file and organisation structure." },
    ],
  }),
  component: EmployeesPage,
});

const emptyEmp = {
  full_name_ar: "", full_name_en: "", nationality: "", id_type: "iqama", id_issue_date: "", id_expiry_date: "",
  phone: "", email: "", city: "", address: "", department_id: "", job_title_id: "", work_location_id: "",
  manager_id: "", join_date: today(), status: "active", national_id: "", bank_name: "", iban: "", notes: "",
};

function EmployeesPage() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useHrFail();
  const qc = useQueryClient();

  const fetchEmployees = useServerFn(listEmployees);
  const fetchOrg = useServerFn(listOrg);
  const fetchAccess = useServerFn(getHrAccess);
  const fetchOne = useServerFn(getEmployee);
  const fetchExpiring = useServerFn(listExpiringDocuments);
  const mkEmployee = useServerFn(createEmployee);
  const upEmployee = useServerFn(updateEmployee);
  const mkDep = useServerFn(saveDepartment);
  const mkJob = useServerFn(saveJobTitle);
  const mkLoc = useServerFn(saveWorkLocation);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyEmp });
  const [editId, setEditId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [orgOpen, setOrgOpen] = useState(false);
  const [org, setOrg] = useState({ kind: "department", code: "", name_ar: "" });

  const access = useQuery({ queryKey: ["hr-access"], queryFn: () => fetchAccess({}) });
  const orgQ = useQuery({ queryKey: ["hr-org"], queryFn: () => fetchOrg({}) });
  const employees = useQuery({
    queryKey: ["hr-employees", q, status],
    queryFn: () => fetchEmployees({ data: { q: q || undefined, status: status === "all" ? undefined : status } }),
  });
  const expiring = useQuery({ queryKey: ["hr-expiring"], queryFn: () => fetchExpiring({ data: { days: 60 } }) });
  const detail = useQuery({
    queryKey: ["hr-employee", viewId],
    queryFn: () => fetchOne({ data: { id: viewId! } }),
    enabled: !!viewId,
  });

  const isHr = access.data?.isHr ?? false;
  const depMap = useMemo(
    () => Object.fromEntries((orgQ.data?.departments ?? []).map((d: any) => [d.id, d.name_ar])),
    [orgQ.data],
  );
  const jobMap = useMemo(
    () => Object.fromEntries((orgQ.data?.job_titles ?? []).map((d: any) => [d.id, d.name_ar])),
    [orgQ.data],
  );

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["hr-employees"] });
    void qc.invalidateQueries({ queryKey: ["hr-expiring"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) payload[k] = v === "" ? null : v;
      payload["full_name_ar"] = form["full_name_ar"];
      payload["join_date"] = form["join_date"];
      payload["status"] = form["status"];
      if (editId) return upEmployee({ data: { id: editId, ...payload } as any });
      return mkEmployee({ data: payload as any });
    },
    onSuccess: () => {
      toast.success(t("تم حفظ ملف الموظف", "Employee saved"));
      setOpen(false);
      setEditId(null);
      setForm({ ...emptyEmp });
      refresh();
    },
    onError: fail,
  });

  const saveOrg = useMutation({
    mutationFn: async () => {
      const payload = { code: org.code, name_ar: org.name_ar, is_active: true };
      if (org.kind === "department") return mkDep({ data: payload as any });
      if (org.kind === "job_title") return mkJob({ data: payload as any });
      return mkLoc({ data: payload as any });
    },
    onSuccess: () => {
      toast.success(t("تم الحفظ", "Saved"));
      setOrgOpen(false);
      setOrg({ kind: "department", code: "", name_ar: "" });
      void qc.invalidateQueries({ queryKey: ["hr-org"] });
    },
    onError: fail,
  });

  const alerts =
    (expiring.data?.documents.length ?? 0) + (expiring.data?.identities.length ?? 0) + (expiring.data?.contracts.length ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: t("إجمالي الموظفين", "Employees"), value: employees.data?.length ?? 0 },
          { label: t("على رأس العمل", "Active"), value: (employees.data ?? []).filter((e: any) => e.status === "active").length },
          { label: t("الأقسام", "Departments"), value: orgQ.data?.departments.length ?? 0 },
          { label: t("تنبيهات انتهاء", "Expiry alerts"), value: alerts },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              {t("مستندات وهويات وعقود قاربت على الانتهاء (60 يومًا)", "Documents, IDs and contracts expiring within 60 days")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {expiring.data?.identities.map((e: any) => (
              <div key={`id-${e.id}`}>
                {e.employee_number} — {e.full_name_ar} · {t("انتهاء الهوية/الإقامة", "ID expiry")}: {e.id_expiry_date}
              </div>
            ))}
            {expiring.data?.contracts.map((c: any) => (
              <div key={`ct-${c.id}`}>
                {c.employees.employee_number} — {c.employees.full_name_ar} · {t("انتهاء العقد", "Contract end")}: {c.end_date}
              </div>
            ))}
            {expiring.data?.documents.map((d: any) => (
              <div key={`doc-${d.id}`}>
                {d.employees.employee_number} — {d.employees.full_name_ar} · {d.title}: {d.expiry_date}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-muted-foreground start-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("بحث بالاسم أو رقم الموظف", "Search name or number")} className="ps-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("كل الحالات", "All statuses")}</SelectItem>
            {Object.entries(EMPLOYMENT_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isHr ? (
          <>
            <Button variant="outline" onClick={() => setOrgOpen(true)} className="gap-2">
              <Building2 className="h-4 w-4" />{t("الهيكل التنظيمي", "Org structure")}
            </Button>
            <Button onClick={() => { setEditId(null); setForm({ ...emptyEmp }); setOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />{t("موظف جديد", "New employee")}
            </Button>
          </>
        ) : null}
      </div>

      {employees.isLoading ? (
        <Loading label={t("جارٍ التحميل", "Loading")} />
      ) : employees.isError ? (
        <ErrorState message={t("تعذر تحميل قائمة الموظفين", "Could not load employees")} />
      ) : (employees.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={t("لا يوجد موظفون", "No employees yet")}
          hint={t("أضف أول موظف لبدء إدارة الملفات والعقود.", "Add the first employee to start managing files and contracts.")}
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الرقم", "No.")}</TableHead>
                  <TableHead>{t("الاسم", "Name")}</TableHead>
                  <TableHead>{t("القسم", "Department")}</TableHead>
                  <TableHead>{t("المسمى", "Job title")}</TableHead>
                  <TableHead>{t("الجنسية", "Nationality")}</TableHead>
                  <TableHead>{t("الانضمام", "Join date")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(employees.data ?? []).map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.employee_number}</TableCell>
                    <TableCell className="font-medium">{ar ? e.full_name_ar : e.full_name_en || e.full_name_ar}</TableCell>
                    <TableCell>{depMap[e.department_id] ?? "—"}</TableCell>
                    <TableCell>{jobMap[e.job_title_id] ?? "—"}</TableCell>
                    <TableCell>{e.nationality ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{e.join_date}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "active" ? "default" : "secondary"}>
                        {ar ? EMPLOYMENT_STATUS[e.status as keyof typeof EMPLOYMENT_STATUS]?.ar : EMPLOYMENT_STATUS[e.status as keyof typeof EMPLOYMENT_STATUS]?.en}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="ghost" onClick={() => setViewId(e.id)} className="gap-1">
                        <Eye className="h-4 w-4" />{t("عرض", "View")}
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
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? t("تعديل ملف الموظف", "Edit employee") : t("موظف جديد", "New employee")}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["full_name_ar", t("الاسم بالعربية", "Full name (AR)")],
              ["full_name_en", t("الاسم بالإنجليزية", "Full name (EN)")],
              ["nationality", t("الجنسية", "Nationality")],
              ["phone", t("الجوال", "Phone")],
              ["email", t("البريد الإلكتروني", "Email")],
              ["city", t("المدينة", "City")],
            ].map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label>{label}</Label>
                <Input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>{t("نوع الهوية", "ID type")}</Label>
              <Select value={form["id_type"] ?? ""} onValueChange={(v) => setForm({ ...form, id_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["national_id", "iqama", "passport", "visa", "other"].map((k) => (
                    <SelectItem key={k} value={k}>{ar ? HR_DOC_TYPE[k as keyof typeof HR_DOC_TYPE].ar : HR_DOC_TYPE[k as keyof typeof HR_DOC_TYPE].en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("رقم الهوية/الإقامة", "ID number")}</Label>
              <Input value={form["national_id"] ?? ""} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("تاريخ إصدار الهوية", "ID issue date")}</Label>
              <Input type="date" value={form["id_issue_date"] ?? ""} onChange={(e) => setForm({ ...form, id_issue_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("تاريخ انتهاء الهوية", "ID expiry date")}</Label>
              <Input type="date" value={form["id_expiry_date"] ?? ""} onChange={(e) => setForm({ ...form, id_expiry_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("القسم", "Department")}</Label>
              <Select value={form["department_id"] || undefined} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>
                  {(orgQ.data?.departments ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("المسمى الوظيفي", "Job title")}</Label>
              <Select value={form["job_title_id"] || undefined} onValueChange={(v) => setForm({ ...form, job_title_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>
                  {(orgQ.data?.job_titles ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("موقع العمل", "Work location")}</Label>
              <Select value={form["work_location_id"] || undefined} onValueChange={(v) => setForm({ ...form, work_location_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>
                  {(orgQ.data?.work_locations ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name_ar}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("المدير المباشر", "Direct manager")}</Label>
              <Select value={form["manager_id"] || undefined} onValueChange={(v) => setForm({ ...form, manager_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("اختر", "Select")} /></SelectTrigger>
                <SelectContent>
                  {(employees.data ?? []).filter((e: any) => e.id !== editId).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.employee_number} — {e.full_name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("تاريخ الانضمام", "Join date")}</Label>
              <Input type="date" value={form["join_date"] ?? ""} onChange={(e) => setForm({ ...form, join_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("الحالة", "Status")}</Label>
              <Select value={form["status"] ?? "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYMENT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("اسم البنك", "Bank name")}</Label>
              <Input value={form["bank_name"] ?? ""} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>IBAN</Label>
              <Input value={form["iban"] ?? ""} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("العنوان", "Address")}</Label>
              <Input value={form["address"] ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("ملاحظات", "Notes")}</Label>
              <Textarea value={form["notes"] ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("رقم الهوية والحساب البنكي يُخزّنان في سجل محمي لا يطّلع عليه إلا الموارد البشرية.", "ID number and bank details are stored in a protected record visible to HR only.")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button disabled={!form["full_name_ar"] || !form["join_date"] || save.isPending} onClick={() => save.mutate()}>
              {t("حفظ", "Save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewId} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("ملف الموظف", "Employee file")}</DialogTitle></DialogHeader>
          {detail.isLoading ? <Loading /> : detail.data ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label={t("الرقم الوظيفي", "Number")} value={detail.data.employee.employee_number} />
                <Info label={t("الاسم", "Name")} value={detail.data.employee.full_name_ar} />
                <Info label={t("الجنسية", "Nationality")} value={detail.data.employee.nationality} />
                <Info label={t("الجوال", "Phone")} value={detail.data.employee.phone} />
                <Info label={t("البريد", "Email")} value={detail.data.employee.email} />
                <Info label={t("تاريخ الانضمام", "Join date")} value={detail.data.employee.join_date} />
                <Info label={t("انتهاء الهوية", "ID expiry")} value={detail.data.employee.id_expiry_date} />
                <Info label={t("الحالة", "Status")} value={ar ? EMPLOYMENT_STATUS[detail.data.employee.status as keyof typeof EMPLOYMENT_STATUS]?.ar : detail.data.employee.status} />
              </div>
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <IdCard className="h-4 w-4" />{t("بيانات محمية", "Protected data")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Info label={t("رقم الهوية", "ID number")} value={mask(detail.data.sensitive?.national_id)} />
                  <Info label="IBAN" value={mask(detail.data.sensitive?.iban)} />
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">{t("العقود", "Contracts")}</div>
                {detail.data.contracts.length === 0 ? (
                  <p className="text-muted-foreground">{t("لا توجد عقود", "No contracts")}</p>
                ) : detail.data.contracts.map((ct: any) => (
                  <div key={ct.id} className="flex justify-between border-b py-1">
                    <span className="font-mono text-xs">{ct.contract_number}</span>
                    <span>{ct.start_date} → {ct.end_date ?? "—"}</span>
                    <Badge variant="secondary">{ct.status}</Badge>
                  </div>
                ))}
              </div>
              {isHr ? (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const e = detail.data!.employee;
                      setEditId(e.id);
                      setForm({
                        ...emptyEmp,
                        ...Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v == null ? "" : String(v)])),
                        national_id: detail.data!.sensitive?.national_id ?? "",
                        bank_name: detail.data!.sensitive?.bank_name ?? "",
                        iban: detail.data!.sensitive?.iban ?? "",
                      } as Record<string, string>);
                      setViewId(null);
                      setOpen(true);
                    }}
                  >
                    {t("تعديل", "Edit")}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={orgOpen} onOpenChange={setOrgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("إضافة عنصر تنظيمي", "Add org item")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("النوع", "Type")}</Label>
              <Select value={org.kind} onValueChange={(v) => setOrg({ ...org, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">{t("قسم", "Department")}</SelectItem>
                  <SelectItem value="job_title">{t("مسمى وظيفي", "Job title")}</SelectItem>
                  <SelectItem value="work_location">{t("موقع عمل", "Work location")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("الرمز", "Code")}</Label>
              <Input value={org.code} onChange={(e) => setOrg({ ...org, code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("الاسم بالعربية", "Name (AR)")}</Label>
              <Input value={org.name_ar} onChange={(e) => setOrg({ ...org, name_ar: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOrgOpen(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button disabled={!org.code || org.name_ar.length < 2 || saveOrg.isPending} onClick={() => saveOrg.mutate()}>
                {t("حفظ", "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}

