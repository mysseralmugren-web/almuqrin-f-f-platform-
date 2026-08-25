import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Link2, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT, useTheme } from "@/lib/theme";
import { TASK_STATUS, PROJECT_PRIORITY } from "@/lib/projects-constants";
import { Loading, StatusChip, Progress, CriticalBadge, money, useProjectFail } from "@/components/app/projects-ui";
import {
  listTasks, upsertTask, addTaskDependency, removeTaskDependency, logTime, listTimeEntries, getProjectCostSummary,
} from "@/lib/projects.functions";

export function TasksTab({ projectId }: { projectId: string }) {
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useProjectFail();
  const qc = useQueryClient();

  const fetchTasks = useServerFn(listTasks);
  const save = useServerFn(upsertTask);
  const addDep = useServerFn(addTaskDependency);
  const delDep = useServerFn(removeTaskDependency);
  const addTime = useServerFn(logTime);
  const fetchTime = useServerFn(listTimeEntries);
  const fetchCost = useServerFn(getProjectCostSummary);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ title_ar: "", planned_start: "", planned_end: "", planned_hours: "", priority: "normal", is_critical: false });
  const [dep, setDep] = useState({ task_id: "", depends_on_task_id: "" });
  const [time, setTime] = useState({ task_id: "", work_date: today, hours: "", hourly_cost: "", notes: "" });

  const tasksQ = useQuery({ queryKey: ["tasks", projectId], queryFn: () => fetchTasks({ data: { project_id: projectId } }) });
  const timeQ = useQuery({ queryKey: ["time", projectId], queryFn: () => fetchTime({ data: { project_id: projectId } }) });
  const costQ = useQuery({ queryKey: ["cost", projectId], queryFn: () => fetchCost({ data: { project_id: projectId } }), retry: false });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    qc.invalidateQueries({ queryKey: ["time", projectId] });
    qc.invalidateQueries({ queryKey: ["cost", projectId] });
  };

  const mCreate = useMutation({
    mutationFn: () =>
      save({
        data: {
          project_id: projectId,
          title_ar: form.title_ar,
          planned_start: form.planned_start || null,
          planned_end: form.planned_end || null,
          planned_hours: Number(form.planned_hours) || 0,
          priority: form.priority as any,
          is_critical: form.is_critical,
          status: "todo",
          progress_percent: 0,
        },
      }),
    onSuccess: () => { setForm({ title_ar: "", planned_start: "", planned_end: "", planned_hours: "", priority: "normal", is_critical: false }); refresh(); },
    onError: fail,
  });
  const mPatch = useMutation({ mutationFn: (v: any) => save({ data: v }), onSuccess: refresh, onError: fail });
  const mDep = useMutation({ mutationFn: () => addDep({ data: dep }), onSuccess: () => { toast.success(t("تمت إضافة الاعتمادية", "Dependency added")); setDep({ task_id: "", depends_on_task_id: "" }); refresh(); }, onError: fail });
  const mDelDep = useMutation({ mutationFn: (id: string) => delDep({ data: { id } }), onSuccess: refresh, onError: fail });
  const mTime = useMutation({
    mutationFn: () => addTime({ data: { project_id: projectId, task_id: time.task_id || null, work_date: time.work_date, hours: Number(time.hours), hourly_cost: Number(time.hourly_cost) || 0, notes: time.notes || null } }),
    onSuccess: () => { setTime({ task_id: "", work_date: today, hours: "", hourly_cost: "", notes: "" }); refresh(); },
    onError: fail,
  });

  if (tasksQ.isLoading) return <Loading />;
  const tasks: any[] = tasksQ.data?.tasks ?? [];
  const deps: any[] = tasksQ.data?.dependencies ?? [];
  const titleOf = (id: string) => tasks.find((x) => x.id === id)?.title_ar ?? "—";

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-6">
          <div className="sm:col-span-2"><Label>{t("عنوان المهمة", "Task title")}</Label><Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} /></div>
          <div><Label>{t("من", "Start")}</Label><Input type="date" dir="ltr" value={form.planned_start} onChange={(e) => setForm({ ...form, planned_start: e.target.value })} /></div>
          <div><Label>{t("إلى", "End")}</Label><Input type="date" dir="ltr" value={form.planned_end} onChange={(e) => setForm({ ...form, planned_end: e.target.value })} /></div>
          <div><Label>{t("ساعات مخططة", "Planned hrs")}</Label><Input type="number" dir="ltr" value={form.planned_hours} onChange={(e) => setForm({ ...form, planned_hours: e.target.value })} /></div>
          <div>
            <Label>{t("الأولوية", "Priority")}</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PROJECT_PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-3">
            <Switch checked={form.is_critical} onCheckedChange={(v) => setForm({ ...form, is_critical: v })} />
            <span className="text-sm">{t("مهمة حرجة (تمنع إغلاق المشروع)", "Critical task (blocks project closure)")}</span>
          </div>
          <div className="sm:col-span-3 sm:text-end">
            <Button className="gap-2 gradient-primary" disabled={!form.title_ar.trim()} onClick={() => mCreate.mutate()}><Plus className="h-4 w-4" />{t("إضافة مهمة", "Add task")}</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("المهمة", "Task")}</TableHead>
                <TableHead>{t("المدة", "Dates")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
                <TableHead>{t("الإنجاز", "Progress")}</TableHead>
                <TableHead>{t("ساعات فعلية", "Actual hrs")}</TableHead>
                <TableHead>{t("تعتمد على", "Depends on")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{t("لا توجد مهام", "No tasks")}</TableCell></TableRow>}
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{task.title_ar}</span>
                      {task.is_critical && <CriticalBadge ar={ar} />}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs" dir="ltr">{task.planned_start ?? "—"} → {task.planned_end ?? "—"}</TableCell>
                  <TableCell>
                    <Select value={task.status} onValueChange={(v) => mPatch.mutate({ id: task.id, project_id: projectId, title_ar: task.title_ar, status: v, progress_percent: v === "done" ? 100 : task.progress_percent, is_critical: task.is_critical, priority: task.priority })}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(TASK_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="w-[140px]">
                    <Progress value={Number(task.progress_percent ?? 0)} />
                    <div className="mt-1 text-[11px] text-muted-foreground" dir="ltr">{task.progress_percent}%</div>
                  </TableCell>
                  <TableCell dir="ltr">{Number(task.actual_hours ?? 0)}</TableCell>
                  <TableCell className="space-y-1">
                    {deps.filter((d) => d.task_id === task.id).map((d) => (
                      <div key={d.id} className="flex items-center gap-1 text-xs">
                        <Link2 className="h-3 w-3" />{titleOf(d.depends_on_task_id)}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => mDelDep.mutate(d.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardContent className="space-y-3 p-5">
            <div className="font-semibold">{t("اعتماديات المهام", "Task dependencies")}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={dep.task_id} onValueChange={(v) => setDep({ ...dep, task_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("المهمة", "Task")} /></SelectTrigger>
                <SelectContent>{tasks.map((x) => <SelectItem key={x.id} value={x.id}>{x.title_ar}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={dep.depends_on_task_id} onValueChange={(v) => setDep({ ...dep, depends_on_task_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("تعتمد على", "Depends on")} /></SelectTrigger>
                <SelectContent>{tasks.map((x) => <SelectItem key={x.id} value={x.id}>{x.title_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button size="sm" className="gap-1 gradient-primary" disabled={!dep.task_id || !dep.depends_on_task_id} onClick={() => mDep.mutate()}>
              <Link2 className="h-4 w-4" />{t("ربط", "Link")}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" />{t("ساعات العمل والتكلفة", "Work hours & cost")}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={time.task_id} onValueChange={(v) => setTime({ ...time, task_id: v })}>
                <SelectTrigger><SelectValue placeholder={t("المهمة (اختياري)", "Task (optional)")} /></SelectTrigger>
                <SelectContent>{tasks.map((x) => <SelectItem key={x.id} value={x.id}>{x.title_ar}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" dir="ltr" value={time.work_date} onChange={(e) => setTime({ ...time, work_date: e.target.value })} />
              <Input type="number" step="0.25" dir="ltr" placeholder={t("ساعات", "Hours")} value={time.hours} onChange={(e) => setTime({ ...time, hours: e.target.value })} />
              <Input type="number" dir="ltr" placeholder={t("تكلفة الساعة", "Hourly cost")} value={time.hourly_cost} onChange={(e) => setTime({ ...time, hourly_cost: e.target.value })} />
            </div>
            <Button size="sm" className="gap-1 gradient-primary" disabled={!time.hours} onClick={() => mTime.mutate()}><Plus className="h-4 w-4" />{t("تسجيل", "Log")}</Button>

            {costQ.data && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm sm:grid-cols-4">
                <div><div className="text-xs text-muted-foreground">{t("ساعات", "Hours")}</div><div dir="ltr">{costQ.data.labour_hours}</div></div>
                <div><div className="text-xs text-muted-foreground">{t("تكلفة العمالة", "Labour cost")}</div><div dir="ltr">{money(costQ.data.labour_cost)}</div></div>
                <div><div className="text-xs text-muted-foreground">{t("تكلفة الخدمة", "Service cost")}</div><div dir="ltr">{money(costQ.data.service_cost)}</div></div>
                <div><div className="text-xs text-muted-foreground">{t("الميزانية", "Budget")}</div><div dir="ltr">{money(costQ.data.budget_amount)}</div></div>
              </div>
            )}

            <div className="max-h-48 overflow-auto text-xs">
              {(timeQ.data ?? []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border-b py-1">
                  <span>{r.project_tasks?.title_ar ?? t("عام", "General")}</span>
                  <span dir="ltr">{r.work_date} · {r.hours}h · {money(r.total_cost)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

