import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle2, RefreshCw, Printer } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/theme";
import { SURVEY_STATUS } from "@/lib/projects-constants";
import { Loading, StatusChip, useProjectFail } from "@/components/app/projects-ui";
import {
  listSurveys, createSurvey, updateSurvey, approveSurvey, reviseSurvey, addMeasurement, deleteMeasurement,
} from "@/lib/projects.functions";

export function SurveyTab({ projectId }: { projectId: string }) {
  const t = useT();
  const fail = useProjectFail();
  const qc = useQueryClient();
  const fetchSurveys = useServerFn(listSurveys);
  const add = useServerFn(createSurvey);
  const upd = useServerFn(updateSurvey);
  const approve = useServerFn(approveSurvey);
  const revise = useServerFn(reviseSurvey);
  const addM = useServerFn(addMeasurement);
  const delM = useServerFn(deleteMeasurement);

  const today = new Date().toISOString().slice(0, 10);
  const [visitDate, setVisitDate] = useState(today);
  const [open, setOpen] = useState(false);
  const [m, setM] = useState({ survey: "", area_name: "", item_description: "", length_value: "", width_value: "", height_value: "", unit: "mm", quantity: "1" });
  const [approver, setApprover] = useState("");

  const { data: surveys = [], isLoading } = useQuery({ queryKey: ["surveys", projectId], queryFn: () => fetchSurveys({ data: { project_id: projectId } }) });
  const done = () => qc.invalidateQueries({ queryKey: ["surveys", projectId] });

  const mCreate = useMutation({ mutationFn: () => add({ data: { project_id: projectId, visit_date: visitDate } }), onSuccess: () => { toast.success(t("تم إنشاء المعاينة", "Survey created")); done(); }, onError: fail });
  const mMeasure = useMutation({
    mutationFn: () =>
      addM({
        data: {
          site_survey_id: m.survey,
          area_name: m.area_name,
          item_description: m.item_description,
          length_value: m.length_value ? Number(m.length_value) : null,
          width_value: m.width_value ? Number(m.width_value) : null,
          height_value: m.height_value ? Number(m.height_value) : null,
          unit: m.unit,
          quantity: Number(m.quantity) || 1,
        },
      }),
    onSuccess: () => { setOpen(false); done(); },
    onError: fail,
  });
  const mApprove = useMutation({ mutationFn: (id: string) => approve({ data: { id, customer_approved_by: approver } }), onSuccess: () => { toast.success(t("تم اعتماد المعاينة", "Survey approved")); done(); }, onError: fail });
  const mSubmit = useMutation({ mutationFn: (id: string) => upd({ data: { id, status: "submitted" } }), onSuccess: done, onError: fail });
  const mRevise = useMutation({ mutationFn: (id: string) => revise({ data: { id, visit_date: today, reason: null } }), onSuccess: () => { toast.success(t("تم إنشاء مراجعة جديدة", "New revision created")); done(); }, onError: fail });
  const mDel = useMutation({ mutationFn: (id: string) => delM({ data: { id } }), onSuccess: done, onError: fail });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>{t("تاريخ الزيارة", "Visit date")}</Label>
          <Input type="date" dir="ltr" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-[180px]" />
        </div>
        <Button className="gap-2 gradient-primary" onClick={() => mCreate.mutate()} disabled={mCreate.isPending}>
          <Plus className="h-4 w-4" />{t("معاينة موقع جديدة", "New site survey")}
        </Button>
      </div>

      {surveys.length === 0 && <Card className="shadow-card"><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("لا توجد معاينات", "No surveys yet")}</CardContent></Card>}

      {surveys.map((s: any) => {
        const locked = s.status === "customer_approved" || s.status === "superseded";
        return (
          <Card key={s.id} className="shadow-card">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold" dir="ltr">{s.survey_number}</span>
                    <span className="text-xs text-muted-foreground">{t("مراجعة", "Rev")} {s.revision}</span>
                    <StatusChip value={s.status} map={SURVEY_STATUS} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground" dir="ltr">{s.visit_date}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link to="/print/project/$kind/$id" params={{ kind: "survey", id: s.id }}><Printer className="h-4 w-4" />{t("طباعة", "Print")}</Link>
                  </Button>
                  {s.status === "draft" && <Button size="sm" variant="outline" onClick={() => mSubmit.mutate(s.id)}>{t("تقديم للعميل", "Submit")}</Button>}
                  {s.status === "submitted" && (
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" className="gap-1 gradient-primary"><CheckCircle2 className="h-4 w-4" />{t("اعتماد العميل", "Customer approval")}</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>{t("اعتماد المعاينة", "Approve survey")}</DialogTitle></DialogHeader>
                        <Label>{t("اسم ممثل العميل", "Customer representative")}</Label>
                        <Input value={approver} onChange={(e) => setApprover(e.target.value)} />
                        <DialogFooter>
                          <Button className="gradient-primary" disabled={!approver.trim()} onClick={() => mApprove.mutate(s.id)}>{t("اعتماد", "Approve")}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {s.status === "customer_approved" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => mRevise.mutate(s.id)}>
                      <RefreshCw className="h-4 w-4" />{t("مراجعة جديدة", "New revision")}
                    </Button>
                  )}
                  {!locked && (
                    <Dialog open={open && m.survey === s.id} onOpenChange={(v) => { setOpen(v); if (v) setM({ ...m, survey: s.id }); }}>
                      <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" />{t("قياس", "Measurement")}</Button></DialogTrigger>
                      <DialogContent className="max-w-xl">
                        <DialogHeader><DialogTitle>{t("إضافة قياس", "Add measurement")}</DialogTitle></DialogHeader>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div><Label>{t("المنطقة", "Area")}</Label><Input value={m.area_name} onChange={(e) => setM({ ...m, area_name: e.target.value })} /></div>
                          <div><Label>{t("الوصف", "Item")}</Label><Input value={m.item_description} onChange={(e) => setM({ ...m, item_description: e.target.value })} /></div>
                          <div><Label>{t("الطول", "Length")}</Label><Input type="number" dir="ltr" value={m.length_value} onChange={(e) => setM({ ...m, length_value: e.target.value })} /></div>
                          <div><Label>{t("العرض", "Width")}</Label><Input type="number" dir="ltr" value={m.width_value} onChange={(e) => setM({ ...m, width_value: e.target.value })} /></div>
                          <div><Label>{t("الارتفاع", "Height")}</Label><Input type="number" dir="ltr" value={m.height_value} onChange={(e) => setM({ ...m, height_value: e.target.value })} /></div>
                          <div><Label>{t("الوحدة", "Unit")}</Label><Input value={m.unit} onChange={(e) => setM({ ...m, unit: e.target.value })} /></div>
                          <div><Label>{t("الكمية", "Quantity")}</Label><Input type="number" dir="ltr" value={m.quantity} onChange={(e) => setM({ ...m, quantity: e.target.value })} /></div>
                        </div>
                        <DialogFooter>
                          <Button className="gradient-primary" disabled={!m.area_name.trim() || !m.item_description.trim()} onClick={() => mMeasure.mutate()}>{t("إضافة", "Add")}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {!locked && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Textarea rows={2} placeholder={t("ظروف الموقع", "Site conditions")} defaultValue={s.site_conditions ?? ""} onBlur={(e) => upd({ data: { id: s.id, site_conditions: e.target.value } }).then(done).catch(fail)} />
                  <Textarea rows={2} placeholder={t("المخاطر والملاحظات الفنية", "Risks")} defaultValue={s.risks ?? ""} onBlur={(e) => upd({ data: { id: s.id, risks: e.target.value } }).then(done).catch(fail)} />
                  <Textarea rows={2} placeholder={t("ملاحظات", "Notes")} defaultValue={s.notes ?? ""} onBlur={(e) => upd({ data: { id: s.id, notes: e.target.value } }).then(done).catch(fail)} />
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("المنطقة", "Area")}</TableHead>
                    <TableHead>{t("الوصف", "Item")}</TableHead>
                    <TableHead>{t("الأبعاد", "Dimensions")}</TableHead>
                    <TableHead>{t("الكمية", "Qty")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(s.site_measurements ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">{t("لا توجد قياسات", "No measurements")}</TableCell></TableRow>
                  )}
                  {(s.site_measurements ?? []).map((x: any) => (
                    <TableRow key={x.id}>
                      <TableCell>{x.area_name}</TableCell>
                      <TableCell>{x.item_description}</TableCell>
                      <TableCell dir="ltr">{[x.length_value, x.width_value, x.height_value].filter(Boolean).join(" × ")} {x.unit}</TableCell>
                      <TableCell dir="ltr">{x.quantity}</TableCell>
                      <TableCell className="text-end">
                        {!locked && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => mDel.mutate(x.id)}><Trash2 className="h-4 w-4" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

