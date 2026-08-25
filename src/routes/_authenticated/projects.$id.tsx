import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT, useTheme } from "@/lib/theme";
import { PROJECT_STATUS, PROJECT_PRIORITY } from "@/lib/projects-constants";
import { Loading, StatusChip, Progress, money, useProjectFail } from "@/components/app/projects-ui";
import { getProject, setProjectStatus, upsertMilestone } from "@/lib/projects.functions";
import { SurveyTab } from "@/components/app/project/survey-tab";
import { ApprovalsTab } from "@/components/app/project/approvals-tab";
import { TasksTab } from "@/components/app/project/tasks-tab";
import { HandoverTab } from "@/components/app/project/handover-tab";
import { CommsTab } from "@/components/app/project/comms-tab";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({
    meta: [
      { title: "ملف المشروع · AlMugren AI Factory OS" },
      { name: "description", content: "Project file: survey, approvals, tasks, handover, snags and communications." },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = useParams({ from: "/_authenticated/projects/$id" });
  const t = useT();
  const ar = useTheme().lang === "ar";
  const fail = useProjectFail();
  const qc = useQueryClient();

  const fetchProject = useServerFn(getProject);
  const setStatus = useServerFn(setProjectStatus);
  const saveMilestone = useServerFn(upsertMilestone);

  const [exception, setException] = useState("");
  const [ms, setMs] = useState({ title_ar: "", planned_date: "" });

  const { data, isLoading } = useQuery({ queryKey: ["project", id], queryFn: () => fetchProject({ data: { id } }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["project", id] });

  const mStatus = useMutation({
    mutationFn: (v: { status: string; note?: string }) => setStatus({ data: { id, status: v.status as any, closure_exception_note: v.note ?? null } }),
    onSuccess: () => { toast.success(t("تم تحديث حالة المشروع", "Project status updated")); refresh(); },
    onError: fail,
  });
  const mMilestone = useMutation({
    mutationFn: (v: any) => saveMilestone({ data: v }),
    onSuccess: () => { setMs({ title_ar: "", planned_date: "" }); refresh(); },
    onError: fail,
  });

  if (isLoading || !data) return <Loading />;
  const p: any = data.project;
  const milestones: any[] = data.milestones ?? [];
  const mos: any[] = data.manufacturing_orders ?? [];
  const overall = milestones.length
    ? Math.round(milestones.reduce((s, m) => s + Number(m.progress_percent ?? 0), 0) / milestones.length)
    : 0;

  return (
    <div className="space-y-5">
      <Card className="shadow-card">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{p.name_ar}</h2>
              <span className="text-xs text-muted-foreground" dir="ltr">{p.project_number}</span>
              <StatusChip value={p.priority} map={PROJECT_PRIORITY} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {p.customers?.name_ar} · {p.city ?? "—"} · <span dir="ltr">{p.customers?.phone ?? ""}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{p.site_address ?? "—"}</div>
            <div className="mt-3 max-w-sm">
              <Progress value={overall} />
              <div className="mt-1 text-xs text-muted-foreground" dir="ltr">{overall}%</div>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="text-xs text-muted-foreground">{t("الميزانية", "Budget")}</div>
            <div dir="ltr">{money(p.budget_amount)} SAR</div>
            <div className="text-xs text-muted-foreground">{t("المستهدف", "Target")}</div>
            <div dir="ltr">{p.target_end_date ?? "—"}</div>
            {p.sales_orders?.order_number && (
              <>
                <div className="text-xs text-muted-foreground">{t("أمر البيع", "Sales order")}</div>
                <div dir="ltr">{p.sales_orders.order_number}</div>
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("حالة المشروع", "Project status")}</Label>
            <Select value={p.status} onValueChange={(v) => mStatus.mutate({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PROJECT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{ar ? v.ar : v.en}</SelectItem>)}</SelectContent>
            </Select>
            <Dialog>
              <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full">{t("إغلاق باستثناء موثّق", "Close with documented exception")}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("استثناء إغلاق المشروع", "Closure exception")}</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">
                  {t("الإغلاق مع وجود مهام حرجة أو ملاحظات حرجة مفتوحة يتطلب توثيق سبب معتمد.", "Closing with open critical tasks or snags requires a documented approved reason.")}
                </p>
                <Input value={exception} onChange={(e) => setException(e.target.value)} placeholder={t("سبب الاستثناء", "Exception reason")} />
                <DialogFooter>
                  <Button className="gradient-primary" disabled={!exception.trim()} onClick={() => mStatus.mutate({ status: "completed", note: exception })}>
                    {t("إغلاق المشروع", "Close project")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {p.closure_exception_note && <div className="text-xs text-amber-600">{t("استثناء", "Exception")}: {p.closure_exception_note}</div>}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">{t("نظرة عامة", "Overview")}</TabsTrigger>
          <TabsTrigger value="survey">{t("المعاينة والقياسات", "Survey")}</TabsTrigger>
          <TabsTrigger value="approvals">{t("الرسومات والاعتمادات", "Drawings & approvals")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("المهام والساعات", "Tasks & time")}</TabsTrigger>
          <TabsTrigger value="handover">{t("الاستلام والملاحظات", "Handover & snags")}</TabsTrigger>
          <TabsTrigger value="comms">{t("سجل التواصل", "Communications")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-5">
          <Card className="shadow-card">
            <CardContent className="space-y-3 p-5">
              <div className="font-semibold">{t("المراحل الرئيسية", "Milestones")}</div>
              <div className="flex flex-wrap items-end gap-2">
                <Input className="w-56" placeholder={t("عنوان المرحلة", "Milestone")} value={ms.title_ar} onChange={(e) => setMs({ ...ms, title_ar: e.target.value })} />
                <Input className="w-44" type="date" dir="ltr" value={ms.planned_date} onChange={(e) => setMs({ ...ms, planned_date: e.target.value })} />
                <Button
                  size="sm"
                  className="gradient-primary"
                  disabled={!ms.title_ar.trim()}
                  onClick={() => mMilestone.mutate({ project_id: id, title_ar: ms.title_ar, planned_date: ms.planned_date || null, progress_percent: 0, sort_order: milestones.length })}
                >
                  {t("إضافة", "Add")}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("المرحلة", "Milestone")}</TableHead>
                    <TableHead>{t("المخطط", "Planned")}</TableHead>
                    <TableHead>{t("الإنجاز %", "Progress %")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">{t("لا توجد مراحل", "No milestones")}</TableCell></TableRow>}
                  {milestones.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.title_ar}</TableCell>
                      <TableCell dir="ltr">{m.planned_date ?? "—"}</TableCell>
                      <TableCell className="w-40">
                        <Input
                          type="number" min={0} max={100} dir="ltr" className="h-8"
                          defaultValue={m.progress_percent}
                          onBlur={(e) => mMilestone.mutate({ id: m.id, project_id: id, title_ar: m.title_ar, planned_date: m.planned_date, progress_percent: Number(e.target.value) || 0, sort_order: m.sort_order })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="space-y-3 p-5">
              <div className="font-semibold">{t("أوامر التصنيع المرتبطة", "Linked manufacturing orders")}</div>
              {mos.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t("لا توجد أوامر تصنيع مرتبطة", "No linked manufacturing orders")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("رقم الأمر", "MO #")}</TableHead>
                      <TableHead>{t("الوصف", "Description")}</TableHead>
                      <TableHead>{t("الكمية", "Qty")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell dir="ltr">{m.manufacturing_orders?.mo_number}</TableCell>
                        <TableCell>{m.manufacturing_orders?.description ?? "—"}</TableCell>
                        <TableCell dir="ltr">{m.manufacturing_orders?.quantity}</TableCell>
                        <TableCell>{m.manufacturing_orders?.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="survey" className="mt-4"><SurveyTab projectId={id} /></TabsContent>
        <TabsContent value="approvals" className="mt-4"><ApprovalsTab projectId={id} /></TabsContent>
        <TabsContent value="tasks" className="mt-4"><TasksTab projectId={id} /></TabsContent>
        <TabsContent value="handover" className="mt-4"><HandoverTab projectId={id} /></TabsContent>
        <TabsContent value="comms" className="mt-4"><CommsTab projectId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}

