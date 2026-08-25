import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT, useTheme } from "@/lib/theme";
import { listProjects, createProject, getProjectAlerts } from "@/lib/projects.functions";
import { listCustomers } from "@/lib/workflow.functions";
import { PROJECT_STATUS, PROJECT_PRIORITY } from "@/lib/projects-constants";
import { Loading, StatusChip, money, useProjectFail } from "@/components/app/projects-ui";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "سجل المشاريع · AlMugren AI Factory OS" },
      { name: "description", content: "Project register with status, priority, budget and delivery targets." },
    ],
  }),
  component: ProjectsIndex,
});

function ProjectsIndex() {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useProjectFail();
  const qc = useQueryClient();

  const fetchProjects = useServerFn(listProjects);
  const fetchAlerts = useServerFn(getProjectAlerts);
  const fetchCustomers = useServerFn(listCustomers);
  const addProject = useServerFn(createProject);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name_ar: "", customer_id: "", priority: "normal", budget_amount: "",
    start_date: "", target_end_date: "", site_address: "", city: "", description: "",
  });

  const { data: alerts = [] } = useQuery({ queryKey: ["project-alerts"], queryFn: () => fetchAlerts() });
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", search, status],
    queryFn: () => fetchProjects({ data: { search: search || undefined, status: status === "all" ? undefined : status } }),
  });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => fetchCustomers({}) });

  const create = useMutation({
    mutationFn: () =>
      addProject({
        data: {
          name_ar: form.name_ar,
          customer_id: form.customer_id,
          priority: form.priority as "low" | "normal" | "high" | "critical",
          budget_amount: Number(form.budget_amount) || 0,
          start_date: form.start_date || null,
          target_end_date: form.target_end_date || null,
          site_address: form.site_address || null,
          city: form.city || null,
          description: form.description || null,
        },
      }),
    onSuccess: () => {
      toast.success(t("تم إنشاء المشروع", "Project created"));
      setOpen(false);
      setForm({ name_ar: "", customer_id: "", priority: "normal", budget_amount: "", start_date: "", target_end_date: "", site_address: "", city: "", description: "" });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: fail,
  });

  return (
    <div className="space-y-5">
      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a: any) => (
            <Card key={a.kind} className="border-amber-500/30 bg-amber-500/5 shadow-card">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{ar ? a.ar : a.en}</div>
                  <div className="text-xs text-muted-foreground">{a.count}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("بحث برقم أو اسم المشروع", "Search by number or name")} className="ps-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("كل الحالات", "All statuses")}</SelectItem>
            {Object.entries(PROJECT_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary"><Plus className="h-4 w-4" />{t("مشروع جديد", "New project")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{t("مشروع جديد", "New project")}</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>{t("اسم المشروع", "Project name")}</Label>
                <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
              </div>
              <div>
                <Label>{t("العميل", "Customer")}</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("اختر العميل", "Select customer")} /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("الأولوية", "Priority")}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("الميزانية (ر.س)", "Budget (SAR)")}</Label>
                <Input type="number" min={0} dir="ltr" value={form.budget_amount} onChange={(e) => setForm({ ...form, budget_amount: e.target.value })} />
              </div>
              <div>
                <Label>{t("المدينة", "City")}</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>{t("تاريخ البدء", "Start date")}</Label>
                <Input type="date" dir="ltr" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>{t("التاريخ المستهدف", "Target end date")}</Label>
                <Input type="date" dir="ltr" value={form.target_end_date} onChange={(e) => setForm({ ...form, target_end_date: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("عنوان الموقع", "Site address")}</Label>
                <Input value={form.site_address} onChange={(e) => setForm({ ...form, site_address: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("الوصف", "Description")}</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="gradient-primary"
                disabled={!form.name_ar.trim() || !form.customer_id || create.isPending}
                onClick={() => create.mutate()}
              >
                {t("إنشاء", "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <Loading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رقم المشروع", "Project #")}</TableHead>
                  <TableHead>{t("الاسم", "Name")}</TableHead>
                  <TableHead>{t("العميل", "Customer")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead>{t("الأولوية", "Priority")}</TableHead>
                  <TableHead>{t("الميزانية", "Budget")}</TableHead>
                  <TableHead>{t("المستهدف", "Target")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      {t("لا توجد مشاريع بعد", "No projects yet")}
                    </TableCell>
                  </TableRow>
                )}
                {projects.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium" dir="ltr">{p.project_number}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{p.name_ar}</TableCell>
                    <TableCell>{p.customers?.name_ar ?? "—"}</TableCell>
                    <TableCell><StatusChip value={p.status} map={PROJECT_STATUS} /></TableCell>
                    <TableCell><StatusChip value={p.priority} map={PROJECT_PRIORITY} /></TableCell>
                    <TableCell dir="ltr">{money(p.budget_amount)}</TableCell>
                    <TableCell dir="ltr">{p.target_end_date ?? "—"}</TableCell>
                    <TableCell className="text-end">
                      <Button asChild variant="ghost" size="sm" className="gap-1">
                        <Link to="/projects/$id" params={{ id: p.id }}>
                          <ArrowLeftRight className="h-4 w-4" />{t("فتح", "Open")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

